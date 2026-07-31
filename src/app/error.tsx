'use client';

import * as React from 'react';
import Link from 'next/link';
import { RoutefoldMark } from '@/components/brand/logo';
import { PoweredByZefi } from '@/components/brand/powered-by';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // The full error is already captured server-side; this records the client
    // digest so a support request can be correlated to a server log line.
    console.error('[routefold] render error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-20">
      <div className="grid-field field-mask absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative flex max-w-lg flex-col items-center gap-8 text-center">
        <RoutefoldMark className="size-14" />

        <div className="flex flex-col gap-3">
          <span className="eyebrow">Something went wrong</span>
          <h1 className="text-headline font-medium text-ink">This page could not be rendered</h1>
          <p className="text-[0.9375rem] leading-relaxed text-ink-dim">
            The error has been logged. Nothing was charged against your usage quota, and your saved
            reports are unaffected.
          </p>
          {error.digest ? (
            <p className="font-mono text-[0.6875rem] text-ink-ghost">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/app">Back to dashboard</Link>
          </Button>
        </div>

        <PoweredByZefi className="mt-2" />
      </div>
    </div>
  );
}
