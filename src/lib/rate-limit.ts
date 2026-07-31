import 'server-only';
import { env } from '@/lib/env';

/**
 * In-process fixed-window rate limiter.
 *
 * Deliberately simple and honest about its scope: it is per-instance, so on a
 * multi-instance deployment the effective limit is per instance. It exists to
 * stop a single client hammering the expensive endpoints, not as a billing
 * control — the database-backed quota in `quota.ts` is the real ceiling and is
 * unaffected by instance count.
 *
 * DEPLOYMENT.md documents how to move this to a shared store if needed.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Amortised cleanup so the map cannot grow without bound.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, limit, resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    limit,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

const HOUR = 60 * 60 * 1000;

export function limitAnalysisCreation(userId: string): RateLimitResult {
  return rateLimit(`analysis:${userId}`, env.rateLimitAnalysisPerHour, HOUR);
}

export function limitSourceFetch(userId: string): RateLimitResult {
  return rateLimit(`fetch:${userId}`, env.rateLimitFetchPerHour, HOUR);
}

export function limitShareView(token: string): RateLimitResult {
  return rateLimit(`share:${token}`, 120, HOUR);
}

/** Resets all buckets. Test-only. */
export function __resetRateLimits(): void {
  buckets.clear();
}
