import { cn } from '@/lib/utils';
import type { ChainRecord, ExecutionEnvironment } from '@/lib/chains/types';

/**
 * Ecosystem marks.
 *
 * Two modes, resolved per chain:
 *
 *   1. If an official asset exists at `public/brand/chains/<slug>.svg`, it is
 *      used. Detection is automatic (see `lib/chains/marks.ts`) — drop the file
 *      in and it appears; there is no registry to update.
 *   2. Otherwise the component renders Routefold's own geometric glyph.
 *
 * Routefold ships no third-party trademarks itself. The fallback glyphs are
 * deliberately original rather than approximations, because a redrawn logo
 * misrepresents a brand more than an obviously-different mark does. Each glyph
 * is derived from facts already in the knowledge base — execution environment
 * and ecosystem family — so the grid encodes real information: every EVM chain
 * shares a silhouette, every rollup carries a settlement tick, and so on.
 */

const ENV_ACCENT: Record<ExecutionEnvironment, string> = {
  EVM: 'text-ember',
  SVM: 'text-marine',
  MoveVM: 'text-amber',
  CosmWasm: 'text-marine-soft',
  'NEAR-VM': 'text-ember-deep',
  'DA-layer': 'text-ink-faint',
};

/**
 * The glyph geometry per execution environment. Deliberately abstract: a
 * silhouette language of Routefold's own, echoing the folded-route mark.
 */
function Glyph({ chain, className }: { chain: ChainRecord; className?: string }) {
  const env = chain.executionEnvironment;
  const isRollup = chain.family.startsWith('ethereum-l2');
  const isL1 = chain.family === 'ethereum-l1';

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-full', ENV_ACCENT[env], className)}
      aria-hidden="true"
    >
      {/* Outer silhouette — one shape per execution environment. */}
      {env === 'EVM' ? (
        <path
          d="M12 2.5 20 12 12 21.5 4 12Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ) : env === 'SVM' ? (
        <>
          <path d="M5 7.5h14l-3 3H2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M5 16.5h14l-3-3H2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </>
      ) : env === 'MoveVM' ? (
        <path
          d="M12 2.5c5 3 7.5 6 7.5 9.5S16 21.5 12 21.5 4.5 15.5 4.5 12 7 5.5 12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      ) : env === 'CosmWasm' ? (
        <>
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="currentColor" strokeWidth="1.2" />
          <ellipse
            cx="12"
            cy="12"
            rx="9.5"
            ry="4"
            stroke="currentColor"
            strokeWidth="1.2"
            transform="rotate(60 12 12)"
          />
        </>
      ) : env === 'NEAR-VM' ? (
        <path
          d="M5 19V5l14 14V5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path d="M3 8h18M3 12h18M3 16h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="8" r="1.3" fill="currentColor" />
          <circle cx="16" cy="16" r="1.3" fill="currentColor" />
        </>
      )}

      {/* Inner vertex — the Routefold decision point. */}
      {env === 'EVM' ? (
        <rect x="10.4" y="10.4" width="3.2" height="3.2" fill="currentColor" />
      ) : null}

      {/* Settlement tick: rollups inherit security from a layer below. */}
      {isRollup ? (
        <path d="M8.5 22.6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      ) : null}

      {/* Base layer: L1s carry a full underline. */}
      {isL1 ? (
        <path d="M4 22.6h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      ) : null}
    </svg>
  );
}

export function ChainMark({
  chain,
  markSrc,
  className,
}: {
  chain: ChainRecord;
  /** Public path to an official asset, when one is present on disk. */
  markSrc?: string;
  className?: string;
}) {
  if (markSrc) {
    return (
      // Intentionally a plain <img>: these are small, already-optimised vector
      // assets, and routing them through the image optimiser adds no benefit.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={markSrc}
        alt={`${chain.shortName} logo`}
        className={cn('size-full object-contain', className)}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <Glyph chain={chain} className={className} />;
}

/** A single ecosystem tile: mark, name, and execution environment. */
export function ChainTile({ chain, markSrc }: { chain: ChainRecord; markSrc?: string }) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border border-line bg-white/60 px-3.5 py-3',
        'backdrop-blur-md transition-colors hover:border-ember/35 hover:bg-white',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center">
        <ChainMark chain={chain} markSrc={markSrc} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[0.8125rem] font-medium text-ink">{chain.shortName}</span>
        <span className="font-mono text-[0.5625rem] uppercase tracking-[0.09em] text-ink-ghost">
          {chain.executionEnvironment}
        </span>
      </span>
    </div>
  );
}
