'use client';

import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RoutefoldMark } from '@/components/brand/logo';
import { usePromo, useScrolledPast } from './promo-provider';
import { cn } from '@/lib/utils';

const KEY = 'bar.sticky-cta';

/**
 * Sticky bottom bar.
 *
 * Appears once the visitor is past the hero — by which point they have read the
 * pitch and the CTA is a reminder rather than an interruption. Fixed to the
 * bottom with its own safe-area padding so it clears the iOS home indicator, and
 * the page gets matching bottom padding so it never covers the footer.
 */
export function StickyCtaBar() {
  const { hydrated, isDismissed, dismiss } = usePromo();
  const visible = useScrolledPast(1.2);

  if (!hydrated || isDismissed(KEY)) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 transition-transform duration-500',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="frost-strong border-x-0 border-b-0 border-t border-line">
        <div className="shell flex items-center gap-4 py-3">
          <RoutefoldMark className="hidden size-9 sm:block" />

          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[0.875rem] font-medium text-ink">
              Model your next chain before you move.
            </p>
            <p className="truncate text-xs text-ink-faint">
              Free during private beta · five reports included · no card required
            </p>
          </div>

          <Button asChild size="sm" variant="accent" className="shrink-0">
            <Link href="/app/new">
              <span className="hidden sm:inline">Analyze a product</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight />
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => dismiss(KEY)}
            aria-label="Dismiss this bar"
            className="shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
