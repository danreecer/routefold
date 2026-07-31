import 'server-only';
import { lookup } from 'node:dns/promises';
import { env } from '@/lib/env';
import { guardResolvedAddresses, guardUrl } from './url-guard';
import { contentHash, extractReadableContent, type ExtractedContent } from './extract';

/**
 * Server-side source retrieval.
 *
 * Retrieval is behind a provider interface so a hosted crawling service can be
 * dropped in later. The built-in provider is complete and is the default — no
 * external service is required for Routefold to work.
 *
 * Security posture:
 *  - http/https only, no credentials, restricted ports (url-guard)
 *  - DNS resolution checked against private/loopback/link-local ranges
 *  - every redirect target re-validated from scratch
 *  - hard byte ceiling enforced while streaming, not after
 *  - strict wall-clock timeout with AbortController
 *  - content-type allow-list; binary responses refused
 *  - scripts/styles/markup stripped; output is plain text only
 */

export type RetrievalStatusCode =
  | 'SUCCESS'
  | 'BLOCKED'
  | 'TIMEOUT'
  | 'UNSUPPORTED_CONTENT'
  | 'TOO_LARGE'
  | 'NOT_FOUND'
  | 'ERROR';

export type RetrievalResult = {
  sourceUrl: string;
  resolvedUrl: string | null;
  status: RetrievalStatusCode;
  /** User-facing explanation. Never contains internal detail or stack traces. */
  message: string;
  content: ExtractedContent | null;
  contentHash: string | null;
  byteSize: number | null;
  retrievedAt: Date;
};

export interface RetrievalProvider {
  readonly name: string;
  fetchUrl(url: string, signal?: AbortSignal): Promise<RetrievalResult>;
}

const ALLOWED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain', 'text/markdown'];

function failure(
  sourceUrl: string,
  status: RetrievalStatusCode,
  message: string,
): RetrievalResult {
  return {
    sourceUrl,
    resolvedUrl: null,
    status,
    message,
    content: null,
    contentHash: null,
    byteSize: null,
    retrievedAt: new Date(),
  };
}

/** Resolves a hostname and rejects if any returned address is non-public. */
async function assertPublicHost(hostname: string): Promise<string | null> {
  if (env.allowPrivateNetworkFetch) return null;

  // IP literals were already classified by guardUrl; resolving them is a no-op.
  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    const addresses = records.map((record) => record.address);
    const problem = guardResolvedAddresses(addresses);
    return problem && !problem.ok ? problem.message : null;
  } catch {
    return 'That hostname could not be resolved.';
  }
}

/**
 * Reads a response body with a hard byte ceiling, aborting mid-stream rather
 * than buffering an unbounded amount first.
 */
async function readBounded(
  response: Response,
  maxBytes: number,
): Promise<{ ok: true; text: string; byteSize: number } | { ok: false }> {
  const body = response.body;
  if (!body) return { ok: true, text: '', byteSize: 0 };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    ok: true,
    text: new TextDecoder('utf-8', { fatal: false }).decode(merged),
    byteSize: total,
  };
}

/**
 * The built-in provider. Follows redirects manually so each hop is re-validated.
 */
export class BuiltInRetrievalProvider implements RetrievalProvider {
  readonly name = 'builtin-html';

  async fetchUrl(rawUrl: string, externalSignal?: AbortSignal): Promise<RetrievalResult> {
    const guard = guardUrl(rawUrl, { allowPrivateNetwork: env.allowPrivateNetworkFetch });
    if (!guard.ok) {
      return failure(rawUrl, 'BLOCKED', guard.message);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.fetchTimeoutMs);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    let currentUrl = guard.url;
    let redirects = 0;

    try {
      for (;;) {
        const dnsProblem = await assertPublicHost(currentUrl.hostname);
        if (dnsProblem) {
          return failure(rawUrl, 'BLOCKED', dnsProblem);
        }

        const response = await fetch(currentUrl.toString(), {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
            'accept-language': 'en',
            'user-agent':
              'Routefold/1.0 (+https://routefold.app; source retrieval for user-submitted URLs)',
          },
          cache: 'no-store',
        });

        // Manual redirect handling: re-validate every hop.
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            return failure(rawUrl, 'ERROR', 'The server returned a redirect without a destination.');
          }
          redirects += 1;
          if (redirects > env.fetchMaxRedirects) {
            return failure(rawUrl, 'ERROR', `Too many redirects (limit ${env.fetchMaxRedirects}).`);
          }
          let next: URL;
          try {
            next = new URL(location, currentUrl);
          } catch {
            return failure(rawUrl, 'ERROR', 'The server returned an invalid redirect destination.');
          }
          const hopGuard = guardUrl(next.toString(), {
            allowPrivateNetwork: env.allowPrivateNetworkFetch,
          });
          if (!hopGuard.ok) {
            return failure(rawUrl, 'BLOCKED', `Redirect blocked: ${hopGuard.message}`);
          }
          currentUrl = hopGuard.url;
          continue;
        }

        if (response.status === 404 || response.status === 410) {
          return failure(rawUrl, 'NOT_FOUND', 'That page could not be found (HTTP 404).');
        }

        if (!response.ok) {
          return failure(
            rawUrl,
            'ERROR',
            `The server responded with HTTP ${response.status}.`,
          );
        }

        const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
        const isAllowed = ALLOWED_CONTENT_TYPES.some((type) => contentType.includes(type));
        if (contentType.length > 0 && !isAllowed) {
          return failure(
            rawUrl,
            'UNSUPPORTED_CONTENT',
            `Routefold reads HTML and plain text. That URL returned ${contentType.split(';')[0]}.`,
          );
        }

        const declaredLength = Number(response.headers.get('content-length') ?? '0');
        if (declaredLength > env.fetchMaxBytes) {
          return failure(
            rawUrl,
            'TOO_LARGE',
            `That page is larger than the ${Math.round(env.fetchMaxBytes / 1000)} kB retrieval limit.`,
          );
        }

        const body = await readBounded(response, env.fetchMaxBytes);
        if (!body.ok) {
          return failure(
            rawUrl,
            'TOO_LARGE',
            `That page is larger than the ${Math.round(env.fetchMaxBytes / 1000)} kB retrieval limit.`,
          );
        }

        const content = extractReadableContent(body.text, currentUrl.toString());

        if (content.wordCount < 20) {
          return {
            sourceUrl: rawUrl,
            resolvedUrl: currentUrl.toString(),
            status: 'UNSUPPORTED_CONTENT',
            message:
              'That page returned almost no readable text. It may render entirely client-side — paste a description instead.',
            content,
            contentHash: null,
            byteSize: body.byteSize,
            retrievedAt: new Date(),
          };
        }

        return {
          sourceUrl: rawUrl,
          resolvedUrl: currentUrl.toString(),
          status: 'SUCCESS',
          message: 'Retrieved successfully.',
          content,
          contentHash: await contentHash(content.text),
          byteSize: body.byteSize,
          retrievedAt: new Date(),
        };
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        return failure(
          rawUrl,
          'TIMEOUT',
          `That page did not respond within ${Math.round(env.fetchTimeoutMs / 1000)} seconds.`,
        );
      }
      // Never surface the raw network error to the browser.
      console.error('[retrieval] fetch failed', {
        host: currentUrl.hostname,
        error: error instanceof Error ? error.message : 'unknown',
      });
      return failure(rawUrl, 'ERROR', 'That URL could not be retrieved.');
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }
}

let provider: RetrievalProvider = new BuiltInRetrievalProvider();

/** Swaps the provider. Used by tests and by a future hosted crawler. */
export function setRetrievalProvider(next: RetrievalProvider): void {
  provider = next;
}

export function getRetrievalProvider(): RetrievalProvider {
  return provider;
}

export async function retrieveSource(url: string, signal?: AbortSignal): Promise<RetrievalResult> {
  return provider.fetchUrl(url, signal);
}

/** Retrieves several URLs concurrently; a failure on one never fails the others. */
export async function retrieveSources(
  urls: Array<{ url: string; kind: string }>,
  signal?: AbortSignal,
): Promise<Array<RetrievalResult & { kind: string }>> {
  const settled = await Promise.allSettled(
    urls.map(async (entry) => ({ ...(await retrieveSource(entry.url, signal)), kind: entry.kind })),
  );
  return settled.map((outcome, index) => {
    const entry = urls[index];
    if (outcome.status === 'fulfilled') return outcome.value;
    return {
      ...failure(entry?.url ?? '', 'ERROR', 'That URL could not be retrieved.'),
      kind: entry?.kind ?? 'website',
    };
  });
}
