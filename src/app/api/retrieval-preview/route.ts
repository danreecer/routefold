import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { guardMutation, rateLimitResponse, readJson, toErrorResponse } from '@/lib/api';
import { requireUserProfile } from '@/lib/auth';
import { limitSourceFetch } from '@/lib/rate-limit';
import { retrieveSource } from '@/lib/retrieval/fetcher';
import { guardUrl } from '@/lib/retrieval/url-guard';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

/**
 * Retrieval preview used by the wizard.
 *
 * Lets a user find out immediately whether their URL can be read, rather than
 * discovering it half way through an analysis. Returns only a short excerpt,
 * never the full extracted text, so this endpoint cannot be used as a general
 * fetch proxy.
 */
export async function POST(request: NextRequest) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const profile = await requireUserProfile();

    const limit = limitSourceFetch(profile.id);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    const { url } = bodySchema.parse(await readJson(request, 8_000));

    // Validate before any network access so an obviously bad URL costs nothing.
    const checked = guardUrl(url, { allowPrivateNetwork: env.allowPrivateNetworkFetch });
    if (!checked.ok) {
      return NextResponse.json({
        ok: false,
        status: 'BLOCKED',
        message: checked.message,
      });
    }

    const result = await retrieveSource(url, request.signal);

    return NextResponse.json({
      ok: result.status === 'SUCCESS',
      status: result.status,
      message: result.message,
      title: result.content?.title ?? null,
      description: result.content?.description ?? null,
      wordCount: result.content?.wordCount ?? 0,
      excerpt: result.content?.text.slice(0, 400) ?? null,
      discoveredDocLinks: result.content?.discoveredDocLinks.slice(0, 4) ?? [],
      resolvedUrl: result.resolvedUrl,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
