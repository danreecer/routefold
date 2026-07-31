import { cn, formatScore } from '@/lib/utils';
import { CATEGORY_DEFINITIONS } from '@/lib/scoring/types';

/**
 * Product mockup.
 *
 * An original composition in the product's own design language, not a
 * screenshot — so it stays correct when the real UI changes, needs no capture
 * step, and carries no risk of leaking real report content.
 *
 * The numbers shown are labelled as illustrative and are structural, not
 * fabricated results: the categories and their point allocations come straight
 * from the real methodology constants, so the shape of what a scorecard looks
 * like is accurate even though the specific totals are for display.
 */

const ROWS = [
  { name: 'Avalanche C-Chain', score: 87.6, rank: 1, tone: 'primary' as const },
  { name: 'Arbitrum One', score: 86.5, rank: 2, tone: 'secondary' as const },
  { name: 'Base', score: 79.2, rank: 3, tone: 'secondary' as const },
  { name: 'OP Mainnet', score: 75.4, rank: 4, tone: 'muted' as const },
  { name: 'Polygon PoS', score: 71.2, rank: 5, tone: 'muted' as const },
];

export function AppMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn('frost-strong frost-sheen overflow-hidden rounded-[18px]', className)}
      aria-hidden="true"
    >
      {/* Window chrome — the mockup's own frame, distinct from the real app. */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-stone" />
          <span className="size-2 rounded-full bg-stone" />
          <span className="size-2 rounded-full bg-stone" />
        </span>
        <span className="ml-2 truncate font-mono text-[0.625rem] text-ink-ghost">
          routefold.app / report / chain scorecard
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[0.8125rem] font-semibold text-ink">Chain scorecard</p>
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.09em] text-ink-ghost">
            base · adj · final
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {ROWS.map((row) => (
            <div key={row.name} className="flex items-center gap-3">
              <span className="w-4 shrink-0 font-mono text-[0.5625rem] text-ink-ghost">
                {String(row.rank).padStart(2, '0')}
              </span>
              <span className="w-28 shrink-0 truncate text-[0.6875rem] text-ink-dim">
                {row.name}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    row.tone === 'primary'
                      ? 'bg-gradient-to-r from-ember to-ember-bright'
                      : row.tone === 'secondary'
                        ? 'bg-ember/45'
                        : 'bg-stone',
                  )}
                  style={{ width: `${row.score}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[0.6875rem] font-medium text-ink">
                {formatScore(row.score)}
              </span>
            </div>
          ))}
        </div>

        <div className="rule-fade" />

        {/* Category allocation — real methodology constants. */}
        <div className="grid grid-cols-5 gap-1.5">
          {CATEGORY_DEFINITIONS.map((category) => (
            <div key={category.key} className="rounded-[8px] border border-line bg-white/60 p-2">
              <p className="font-mono text-[0.625rem] font-medium text-ink">
                {category.basePoints}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.5rem] leading-tight text-ink-ghost">
                {category.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[0.5625rem] leading-relaxed text-ink-ghost">
          Illustrative interface preview. Category allocations are the real published methodology.
        </p>
      </div>
    </div>
  );
}
