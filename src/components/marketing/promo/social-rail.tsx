'use client';

import { ChevronLeft } from 'lucide-react';
import { usePromo, useScrolledPast } from './promo-provider';
import { TOKEN } from '@/content/token';
import { cn } from '@/lib/utils';

const KEY = 'rail.social';

/**
 * Fixed left-edge rail.
 *
 * Ambient rather than interruptive: it sits in the gutter, never overlays
 * content, and appears only after the visitor has scrolled past the hero, so the
 * first impression stays uncluttered.
 *
 * The `2xl` gate is load-bearing, not a guess. `.shell` caps at 88rem with 3.5rem
 * of inline padding, so a viewport has to exceed 88rem before any gutter exists
 * at all — below 1536px the rail would land on top of the body copy.
 */

type RailLink = {
  label: string;
  href: string;
  glyph: React.ReactNode;
  tone: 'ink' | 'ember' | 'marine';
};

const LINKS: RailLink[] = [
  {
    label: 'Founder on X',
    href: 'https://x.com/danreecer_',
    tone: 'ink',
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M18.9 2.3h3.4l-7.4 8.5 8.7 11.5h-6.8l-5.3-7-6.1 7H2l7.9-9.1L1.6 2.3h7l4.8 6.4zm-1.2 17.9h1.9L7.4 4.2H5.4z" />
      </svg>
    ),
  },
  {
    label: 'Product Hunt',
    href: 'https://www.producthunt.com/products/routefold?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-routefold',
    tone: 'ember',
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.3 5.5h3.05a3.35 3.35 0 010 6.7H12.2v3.3h-1.5V7.5zm1.5 1.5v3.7h1.55a1.85 1.85 0 000-3.7H12.2z" />
      </svg>
    ),
  },
  {
    label: 'Backed by ZeFi',
    href: 'https://www.zefi.ae',
    tone: 'marine',
    glyph: <span className="text-[0.6875rem] font-bold leading-none">Z</span>,
  },
  {
    label: `${TOKEN.symbol} on ${TOKEN.chain} — verify the contract`,
    href: TOKEN.links.solscan,
    tone: 'ember',
    glyph: <span className="text-[0.5625rem] font-bold leading-none">◎</span>,
  },
  {
    label: 'Featured on Orynth',
    href: TOKEN.links.orynth,
    tone: 'ink',
    glyph: <span className="text-[0.6875rem] font-bold leading-none">O</span>,
  },
];

export function SocialRail() {
  const { hydrated, isDismissed, dismiss } = usePromo();
  const visible = useScrolledPast(0.7);

  if (!hydrated || isDismissed(KEY)) return null;

  return (
    <aside
      aria-label="Routefold links"
      className={cn(
        'fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 2xl:block',
        'transition-all duration-500',
        visible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0 pointer-events-none',
      )}
    >
      <div className="frost frost-sheen flex flex-col items-center gap-1 rounded-full p-1.5">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            aria-label={link.label}
            className={cn(
              'group relative flex size-9 items-center justify-center rounded-full transition-colors',
              link.tone === 'ember'
                ? 'text-ember-deep hover:bg-ember-wash'
                : link.tone === 'marine'
                  ? 'text-marine hover:bg-marine/10'
                  : 'text-ink hover:bg-ink/[0.06]',
            )}
          >
            {link.glyph}
            <span
              className={cn(
                'pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full',
                'frost px-2.5 py-1 text-[0.6875rem] text-ink-dim opacity-0 transition-opacity',
                'group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {link.label}
            </span>
          </a>
        ))}

        <span className="my-0.5 h-px w-5 bg-line" aria-hidden="true" />

        <button
          type="button"
          onClick={() => dismiss(KEY)}
          aria-label="Hide links rail"
          className="flex size-7 items-center justify-center rounded-full text-ink-ghost transition-colors hover:bg-ink/[0.06] hover:text-ink-faint"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>
    </aside>
  );
}
