import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CopyButton } from '@/components/report/copy-button';
import { TOKEN } from '@/content/token';
import { cn } from '@/lib/utils';

/**
 * Contract-address bar — the top strip of every page.
 *
 * Deliberately not dismissible and not gated on hydration: the address is the
 * one piece of information a reader most needs to get from the source rather
 * than from a reply or a search result, so it ships in the server-rendered HTML
 * and stays put.
 *
 * Below `md` the address itself is not rendered. Its 44 characters do not fit,
 * and a *truncated* address is worse than none — a middle-ellipsised string is
 * precisely what a lookalike forgery survives. Small screens get the label, a
 * copy button that yields the complete string, and a link to the full display.
 */
export function TokenBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative isolate border-b border-ember/25',
        'bg-gradient-to-r from-ember-wash via-white to-ember-wash',
        className,
      )}
    >
      <div className="shell flex items-center justify-center gap-x-3 gap-y-1 py-2">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ember/30 bg-white/80 px-2.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.1em] text-ember-deep">
            ${TOKEN.symbol} · {TOKEN.chain}
          </span>

          <code className="hidden font-mono text-[0.75rem] font-medium tracking-tight text-ink lg:inline">
            {TOKEN.mint}
          </code>

          <span className="flex shrink-0 items-center gap-1">
            <CopyButton
              value={TOKEN.mint}
              label="Copy contract address"
              successLabel="Copied"
              variant="ghost"
              size="icon-sm"
            />
            <Link
              href="/#token"
              className="inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ember-deep transition-colors hover:text-ember lg:hidden"
            >
              Contract address
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
            <a
              href={TOKEN.links.solscan}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ember-deep transition-colors hover:text-ember lg:inline-flex"
            >
              Verify
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
