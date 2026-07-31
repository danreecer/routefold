import 'server-only';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { CHAIN_KNOWLEDGE_BASE } from './knowledge-base';
import type { EnrichedChain, LiveChainMetrics, LiveMetricStatus } from './types';

/**
 * Optional enrichment of the local knowledge base with public DeFiLlama data.
 *
 * Rules this module follows, in order:
 *  1. If the cached snapshot is fresh, use it (status "cached" once past its TTL
 *     window is re-marked, "live" if it was just fetched).
 *  2. Otherwise attempt a fetch. On success, persist and mark "live".
 *  3. On failure, fall back to the most recent stored snapshot and mark "cached".
 *  4. If there has never been a snapshot, mark "unavailable" and report null —
 *     never invent a number.
 *
 * Every consumer displays the status and timestamp next to the value.
 */

const SOURCE = 'defillama.chains';
const DEFILLAMA_CHAINS_URL = 'https://api.llama.fi/v2/chains';

type LlamaChain = {
  name?: unknown;
  tvl?: unknown;
  gecko_id?: unknown;
  chainId?: unknown;
};

type SnapshotPayload = Record<string, { tvlUsd: number | null }>;

function parseLlamaResponse(data: unknown): SnapshotPayload | null {
  if (!Array.isArray(data)) return null;
  const wanted = new Map(
    CHAIN_KNOWLEDGE_BASE.filter((c) => c.defillamaId).map((c) => [c.defillamaId as string, c.slug]),
  );
  const payload: SnapshotPayload = {};
  for (const entry of data as LlamaChain[]) {
    if (!entry || typeof entry.name !== 'string') continue;
    const slug = wanted.get(entry.name);
    if (!slug) continue;
    const tvl = typeof entry.tvl === 'number' && Number.isFinite(entry.tvl) ? entry.tvl : null;
    payload[slug] = { tvlUsd: tvl };
  }
  return Object.keys(payload).length > 0 ? payload : null;
}

async function fetchFromSource(signal: AbortSignal): Promise<SnapshotPayload | null> {
  const response = await fetch(DEFILLAMA_CHAINS_URL, {
    signal,
    headers: { accept: 'application/json', 'user-agent': 'Routefold/1.0 (+https://routefold.app)' },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return null;
  return parseLlamaResponse(await response.json());
}

type SnapshotResult = {
  payload: SnapshotPayload;
  status: LiveMetricStatus;
  fetchedAt: string | null;
};

async function readStoredSnapshot(): Promise<SnapshotResult | null> {
  try {
    const row = await prisma.externalDataSnapshot.findUnique({ where: { source: SOURCE } });
    if (!row) return null;
    return {
      payload: row.payload as SnapshotPayload,
      status: row.expiresAt.getTime() > Date.now() ? 'live' : 'cached',
      fetchedAt: row.fetchedAt.toISOString(),
    };
  } catch {
    // Database unavailable — the caller degrades to "unavailable".
    return null;
  }
}

/**
 * Returns the current chain-metric snapshot, honouring the cache and degrading
 * gracefully. Never throws.
 */
export async function getChainMetricSnapshot(): Promise<SnapshotResult> {
  const empty: SnapshotResult = { payload: {}, status: 'unavailable', fetchedAt: null };

  if (!env.defillamaEnabled) {
    const stored = await readStoredSnapshot();
    return stored ? { ...stored, status: 'cached' } : empty;
  }

  const stored = await readStoredSnapshot();
  if (stored && stored.status === 'live') return stored;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const payload = await fetchFromSource(controller.signal);
    if (payload) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + env.chainDataCacheTtlSeconds * 1000);
      try {
        await prisma.externalDataSnapshot.upsert({
          where: { source: SOURCE },
          create: { source: SOURCE, payload, status: 'live', fetchedAt: now, expiresAt },
          update: { payload, status: 'live', fetchedAt: now, expiresAt },
        });
      } catch {
        // Persisting is best-effort; the fetched value is still usable.
      }
      return { payload, status: 'live', fetchedAt: now.toISOString() };
    }
  } catch {
    // Network failure or timeout — fall through to the cached snapshot.
  } finally {
    clearTimeout(timeout);
  }

  return stored ? { ...stored, status: 'cached' } : empty;
}

/** Knowledge base + live metrics, with provenance attached to every record. */
export async function getEnrichedChains(): Promise<EnrichedChain[]> {
  const snapshot = await getChainMetricSnapshot();
  return CHAIN_KNOWLEDGE_BASE.map((chain) => {
    const entry = snapshot.payload[chain.slug];
    const live: LiveChainMetrics = {
      slug: chain.slug,
      tvlUsd: entry?.tvlUsd ?? null,
      stablecoinUsd: null,
      source: 'DeFiLlama',
      status: entry ? snapshot.status : 'unavailable',
      fetchedAt: entry ? snapshot.fetchedAt : null,
    };
    return { ...chain, live };
  });
}

/** Synchronous, database-free variant used by the scoring engine and tests. */
export function getSeededChains(): EnrichedChain[] {
  return CHAIN_KNOWLEDGE_BASE.map((chain) => ({
    ...chain,
    live: {
      slug: chain.slug,
      tvlUsd: null,
      stablecoinUsd: null,
      source: 'DeFiLlama',
      status: 'seeded' as LiveMetricStatus,
      fetchedAt: null,
    },
  }));
}

export function formatUsdCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
