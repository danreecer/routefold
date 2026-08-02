'use client';

import { ArrowRight, X } from 'lucide-react';
import { usePromo } from './promo-provider';
import { cn } from '@/lib/utils';

const KEY = 'announcement.launch';

/**
 * Launch and backing bar.
 *
 * Sits under the contract-address bar, in the document flow rather than
 * overlaying, so it never covers content and never causes layout shift once
 * dismissed. Renders nothing until the provider has hydrated, which prevents a
 * dismissed bar flashing on reload.
 */
export function AnnouncementBar() {
  const { hydrated, isDismissed, dismiss } = usePromo();

  if (!hydrated || isDismissed(KEY)) return null;

  return (
    <div className={cn('relative isolate overflow-hidden border-b border-line bg-white/70')}>
      <div className="shell flex items-center justify-center gap-x-4 gap-y-1 py-2 pr-8">
        <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[0.8125rem] text-ink-dim">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ember/30 bg-ember-wash px-2.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ember-deep">
            Live on Product Hunt
          </span>
          <span className="hidden sm:inline">
            Routefold is in private beta and backed by{' '}
            <a
              href="https://www.zefi.ae"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline decoration-ember/40 underline-offset-4 transition-colors hover:text-ember-deep"
            >
              ZeFi
            </a>
            .
          </span>
          <a
            href="https://www.producthunt.com/products/routefold?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-routefold"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-ember-deep transition-colors hover:text-ember"
          >
            Support the launch
            <ArrowRight className="size-3" aria-hidden="true" />
          </a>
        </p>
      </div>

      <button
        type="button"
        onClick={() => dismiss(KEY)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-white/70 hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
