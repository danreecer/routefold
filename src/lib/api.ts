import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { AuthNotConfiguredError, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { DatabaseUnavailableError } from '@/lib/db';
import { QuotaExceededError } from '@/lib/quota';
import { AiConfigurationError, AiGenerationError } from '@/lib/ai/client';

/**
 * Shared route-handler helpers.
 *
 * Two responsibilities:
 *  1. Turn every internal error into a typed, safe JSON body. Stack traces,
 *     Prisma messages and upstream provider text never cross the boundary.
 *  2. Enforce the request-shape rules that make CSRF impractical: mutations must
 *     be POST/PATCH/DELETE with a JSON content type, which a cross-site HTML
 *     form cannot produce without a preflight the browser will block.
 */

export type ApiErrorBody = { error: string; message: string; detail?: unknown };

export function apiError(
  code: string,
  message: string,
  status: number,
  detail?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: code, message, ...(detail ? { detail } : {}) }, { status });
}

/** Maps a thrown error to a safe response. Logs the real cause server-side. */
export function toErrorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ZodError) {
    return apiError('VALIDATION_FAILED', 'Some fields are invalid.', 422, {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  if (error instanceof UnauthorizedError) {
    return apiError('UNAUTHORIZED', error.message, 401);
  }
  if (error instanceof ForbiddenError) {
    // 404 rather than 403: confirming existence would leak that an id is real.
    return apiError('NOT_FOUND', 'That does not exist or is not yours.', 404);
  }
  if (error instanceof AuthNotConfiguredError) {
    return apiError('AUTH_NOT_CONFIGURED', error.message, 503);
  }
  if (error instanceof QuotaExceededError) {
    return apiError('QUOTA_EXCEEDED', error.message, 429);
  }
  if (error instanceof AiConfigurationError) {
    return apiError(
      'AI_NOT_CONFIGURED',
      'Analysis is not configured on this deployment.',
      503,
    );
  }
  if (error instanceof AiGenerationError) {
    return apiError(error.code, error.message, error.code === 'AI_RATE_LIMITED' ? 429 : 502);
  }
  if (error instanceof DatabaseUnavailableError) {
    return apiError('DATABASE_UNAVAILABLE', 'The database is not reachable right now.', 503);
  }

  console.error('[api] unhandled error', error);
  return apiError('INTERNAL', 'Something went wrong. Nothing was charged against your quota.', 500);
}

/**
 * Rejects mutating requests that do not look like a same-origin fetch.
 * Returns null when the request is acceptable.
 */
export function guardMutation(request: NextRequest): NextResponse<ApiErrorBody> | null {
  const contentType = request.headers.get('content-type') ?? '';
  const hasBody = request.method !== 'DELETE';
  if (hasBody && !contentType.includes('application/json')) {
    return apiError('UNSUPPORTED_MEDIA_TYPE', 'Requests must send application/json.', 415);
  }

  // Fetch metadata is set by the browser and cannot be forged by page script.
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return apiError('CROSS_ORIGIN_BLOCKED', 'Cross-origin mutations are not permitted.', 403);
  }

  return null;
}

/** Parses a JSON body with a hard size ceiling. */
export async function readJson(request: NextRequest, maxBytes = 512_000): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) {
    throw new PayloadTooLargeError();
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new PayloadTooLargeError();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MalformedJsonError();
  }
}

export class PayloadTooLargeError extends Error {
  override readonly name = 'PayloadTooLargeError';
  constructor() {
    super('That request body is too large.');
  }
}

export class MalformedJsonError extends Error {
  override readonly name = 'MalformedJsonError';
  constructor() {
    super('The request body was not valid JSON.');
  }
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse<ApiErrorBody> {
  const response = apiError(
    'RATE_LIMITED',
    `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
    429,
  );
  response.headers.set('retry-after', String(retryAfterSeconds));
  return response;
}

/** Newline-delimited JSON stream used for pipeline progress. */
export function ndjsonStream(
  run: (emit: (event: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await run(emit);
      } catch (error) {
        console.error('[stream] run failed', error);
        emit({
          type: 'error',
          code: 'INTERNAL',
          message: 'The analysis failed unexpectedly.',
        });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
