import { cn } from '@/lib/utils';

/**
 * Routefold brand marks.
 *
 * The mark is an original construction: a single route entering from the lower
 * left, striking a decision vertex, and folding outward into three divergent
 * planes. Read as geometry it is one line becoming many — the product's premise.
 * It deliberately avoids the arc/portal motifs common to bridge branding.
 *
 * Every mark is pure SVG with `currentColor` so it inherits type colour and
 * stays crisp at any size. No rasterised text anywhere.
 */

type MarkProps = {
  className?: string;
  /** Renders the accent stroke in violet rather than inheriting colour. */
  accent?: boolean;
  title?: string;
};

export function RoutefoldMark({ className, accent = true, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('shrink-0', className)}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {/* Incoming route */}
      <path
        d="M3 26.5 L13.4 16.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        opacity="0.55"
      />
      {/* Folded planes — three divergent routes from one decision vertex */}
      <path
        d="M13.4 16.1 L29 16.1"
        stroke={accent ? 'var(--color-ember)' : 'currentColor'}
        strokeWidth="1.6"
        strokeLinecap="square"
      />
      <path
        d="M13.4 16.1 L24.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        opacity="0.85"
      />
      <path
        d="M13.4 16.1 L24.5 27.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
        opacity="0.35"
      />
      {/* Decision vertex */}
      <rect
        x="11.6"
        y="14.3"
        width="3.6"
        height="3.6"
        fill={accent ? 'var(--color-ember)' : 'currentColor'}
      />
      {/* Terminal coordinates */}
      <rect x="27.4" y="14.5" width="3.2" height="3.2" stroke="currentColor" strokeWidth="1.1" />
      <rect x="23" y="3.5" width="3.2" height="3.2" stroke="currentColor" strokeWidth="1.1" opacity="0.8" />
      <rect x="23" y="25.7" width="3.2" height="3.2" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
    </svg>
  );
}

export function RoutefoldWordmark({
  className,
  markClassName,
  accent = true,
}: {
  className?: string;
  markClassName?: string;
  accent?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <RoutefoldMark className={cn('h-6 w-6', markClassName)} accent={accent} />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.035em] text-ink">
        Routefold
      </span>
    </span>
  );
}

/** Full lockup used in the footer, share pages and the launch kit. */
export function RoutefoldLockup({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col gap-1.5', className)}>
      <RoutefoldWordmark />
      <span className="eyebrow pl-[2.1rem]">Multichain expansion intelligence</span>
    </span>
  );
}
