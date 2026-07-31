import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Panel — the single structural container in the interface.
 *
 * A folded plane rendered in frost: a translucent, blurred surface with a lit
 * top edge and corner ticks. `tone` selects how much presence it has, so depth
 * across the product comes from one scale instead of per-component guesswork.
 *
 *   frost   (default) — standard translucent surface
 *   lifted            — heavier blur and shadow, for the primary panel on screen
 *   accent            — ember edge-light, for the recommendation and CTAs
 *   quiet             — minimal tint, for nested or secondary containers
 *   solid             — opaque, for surfaces stacked over other frost where a
 *                       second blur layer would turn to mud
 */

type PanelTone = 'frost' | 'lifted' | 'accent' | 'quiet' | 'solid';

const PANEL_TONE: Record<PanelTone, string> = {
  frost: 'frost frost-sheen',
  lifted: 'frost-strong frost-sheen',
  accent: 'frost-ember frost-sheen',
  quiet: 'frost-faint',
  solid: 'border border-line bg-surface',
};

export function Panel({
  className,
  corners = false,
  inset = false,
  tone = 'frost',
  ...props
}: React.ComponentProps<'div'> & {
  corners?: boolean;
  inset?: boolean;
  tone?: PanelTone;
}) {
  return (
    <div
      className={cn(
        'relative rounded-[16px]',
        PANEL_TONE[inset ? 'quiet' : tone],
        corners && 'fold-corners',
        'print-surface',
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('text-[0.9375rem] font-medium tracking-[-0.015em] text-ink', className)}
      {...props}
    />
  );
}

export function PanelDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('mt-1 text-[0.8125rem] leading-relaxed text-ink-faint', className)} {...props} />;
}

export function PanelBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 py-5', className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 border-t border-line px-5 py-3.5', className)}
      {...props}
    />
  );
}

/** Section heading used across the report and marketing pages. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="text-title font-medium text-ink">{title}</h2>
      {description ? (
        <p className={cn('max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim')}>{description}</p>
      ) : null}
      {children}
    </div>
  );
}
