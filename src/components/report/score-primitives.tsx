'use client';

import * as React from 'react';
import { Badge, type BadgeTone } from '@/components/ui/primitives';
import { RECOMMENDATION_LABELS, type Recommendation as Rec } from '@/lib/scoring';
import { cn, formatScore, formatSigned } from '@/lib/utils';

/**
 * Score display primitives.
 *
 * The recurring requirement across the report is that the *composition* of a
 * score is never hidden: base, adjustment and final are shown together wherever
 * a number appears at any size.
 */

const RECOMMENDATION_TONE: Record<Rec, BadgeTone> = {
  primary: 'accent',
  secondary: 'live',
  monitor: 'neutral',
  not_recommended: 'ghost',
  blocked: 'critical',
  current: 'positive',
};

export function RecommendationBadge({ recommendation }: { recommendation: Rec }) {
  return (
    <Badge tone={RECOMMENDATION_TONE[recommendation]}>
      {RECOMMENDATION_LABELS[recommendation]}
    </Badge>
  );
}

/** A horizontal score bar with the value rendered in tabular monospace. */
export function ScoreBar({
  value,
  max = 100,
  tone = 'accent',
  className,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'neutral' | 'muted';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('h-1 w-full overflow-hidden bg-sand', className)}>
      <div
        className={cn(
          'h-full transition-[width] duration-700 ease-out',
          tone === 'accent' && 'bg-ember',
          tone === 'neutral' && 'bg-ink-dim',
          tone === 'muted' && 'bg-ink-ghost',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ConfidenceMeter({
  value,
  label = 'Confidence',
  size = 'md',
}: {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const tone = value >= 70 ? 'text-positive' : value >= 45 ? 'text-caution' : 'text-critical';
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow">{label}</span>
      <span
        data-numeric
        className={cn('font-medium', tone, size === 'sm' ? 'text-xs' : 'text-sm')}
      >
        {value}
        <span className="text-ink-ghost">/100</span>
      </span>
    </div>
  );
}

/**
 * The score triple. This is the transparency contract made visible: the
 * deterministic base, what the model moved it by, and the result.
 */
export function ScoreComposition({
  deterministic,
  adjustment,
  final,
  className,
  compact = false,
}: {
  deterministic: number;
  adjustment: number;
  final: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline gap-2 font-mono tabular-nums', className)}>
      <span className={cn('text-ink-faint', compact ? 'text-[0.6875rem]' : 'text-xs')}>
        {formatScore(deterministic)}
      </span>
      <span
        className={cn(
          compact ? 'text-[0.6875rem]' : 'text-xs',
          adjustment === 0
            ? 'text-ink-ghost'
            : adjustment > 0
              ? 'text-positive'
              : 'text-caution',
        )}
        title="Bounded model adjustment (±5 maximum)"
      >
        {formatSigned(adjustment)}
      </span>
      <span className="text-ink-ghost">=</span>
      <span className={cn('font-medium text-ink', compact ? 'text-sm' : 'text-paper')}>
        {formatScore(final)}
      </span>
    </div>
  );
}

/** Large numeral used for the headline score on a scorecard row. */
export function BigScore({ value, className }: { value: number; className?: string }) {
  const [whole, fraction] = formatScore(value).split('.');
  return (
    <span className={cn('font-mono tabular-nums leading-none', className)}>
      <span className="text-[2rem] font-medium tracking-[-0.03em] text-ink">{whole}</span>
      <span className="text-paper text-ink-faint">.{fraction}</span>
    </span>
  );
}
