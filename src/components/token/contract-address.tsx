import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CopyButton } from '@/components/report/copy-button';
import { TOKEN } from '@/content/token';
import { cn } from '@/lib/utils';

/**
 * The RFOLD contract address.
 *
 * A contract address on a public site is a phishing target: the attack is a
 * near-identical string on a lookalike page. Three decisions follow from that,
 * and they apply to every variant:
 *
 *  1. The address is *always* rendered in full. Never truncated, never
 *     middle-ellipsised. A reader cannot compare what they cannot see, and
 *     `GCos…yory` matches thousands of forgeries.
 *  2. Copy always yields the complete address from a single constant, so what
 *     is copied cannot drift from what is displayed.
 *  3. Every instance links to a block explorer, so the claims beside it are
 *     checkable in one click rather than taken on trust.
 */

type Size = 'lg' | 'md' | 'sm';

const ADDRESS_TEXT: Record<Size, string> = {
  lg: 'text-[0.9375rem] md:text-[1.0625rem]',
  md: 'text-[0.8125rem]',
  sm: 'text-[0.6875rem]',
};

export function ContractAddress({
  size = 'md',
  className,
  showExplorer = true,
}: {
  size?: Size;
  className?: string;
  showExplorer?: boolean;
}) {
  return (
    <div
      className={cn(
        'frost-strong flex flex-col gap-3 rounded-[16px] p-3 sm:flex-row sm:items-center sm:gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-ink-ghost">
          {TOKEN.symbol} contract address · {TOKEN.chain}
        </span>
        {/* `break-all` rather than truncation — see the note above. */}
        <code
          className={cn(
            'break-all font-mono font-medium leading-snug text-ink',
            ADDRESS_TEXT[size],
          )}
        >
          {TOKEN.mint}
        </code>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CopyButton
          value={TOKEN.mint}
          label="Copy"
          successLabel="Copied"
          variant="outline"
          size="sm"
        />
        {showExplorer ? (
          <Link
            href={TOKEN.links.solscan}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ink-faint transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            Verify
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Single-line variant for dense chrome — footers, sidebars, sticky bars.
 * Still shows the address in full; it wraps rather than truncating.
 */
export function ContractAddressInline({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <span className="inline-flex items-center gap-1 font-mono text-[0.5625rem] uppercase tracking-[0.11em] text-ember-deep">
        <ShieldCheck className="size-3" aria-hidden="true" />
        {TOKEN.symbol} CA
      </span>
      <code className="min-w-0 break-all font-mono text-[0.6875rem] text-ink-dim">
        {TOKEN.mint}
      </code>
      <CopyButton
        value={TOKEN.mint}
        label="Copy contract address"
        successLabel="Copied"
        variant="ghost"
        size="icon-sm"
      />
    </div>
  );
}
