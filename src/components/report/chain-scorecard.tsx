'use client';

import * as React from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { Panel, PanelHeader, PanelTitle, PanelDescription } from '@/components/ui/panel';
import { BigScore, ConfidenceMeter, RecommendationBadge, ScoreBar, ScoreComposition } from './score-primitives';
import { getChain } from '@/lib/chains/knowledge-base';
import type { ReportChainScore } from '@/lib/report-model';
import { CATEGORY_DEFINITIONS } from '@/lib/scoring/types';
import { cn, formatScore } from '@/lib/utils';

/**
 * Chain scorecard.
 *
 * Every row expands to the complete factor table, because the scorecard's value
 * is that the number is checkable. Nothing is summarised away: penalties,
 * blockers and missing data all appear where they applied.
 */

export function ChainScorecard({
  scores,
  defaultExpandedSlug,
}: {
  scores: ReportChainScore[];
  defaultExpandedSlug?: string;
}) {
  const [expanded, setExpanded] = React.useState<string | null>(
    defaultExpandedSlug ?? scores[0]?.chainSlug ?? null,
  );

  const ranked = scores.filter((score) => score.recommendation !== 'current');
  const current = scores.filter((score) => score.recommendation === 'current');

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>Chain scorecard</PanelTitle>
            <PanelDescription>
              Every candidate scored against the same {CATEGORY_DEFINITIONS.length} categories and{' '}
              17 sub-factors. Expand any row for the complete factor table.
            </PanelDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="ghost">Base + adjustment = final</Badge>
          </div>
        </PanelHeader>

        <div className="divide-y divide-line">
          {ranked.map((score) => (
            <ScorecardRow
              key={score.chainSlug}
              score={score}
              isExpanded={expanded === score.chainSlug}
              onToggle={() =>
                setExpanded((value) => (value === score.chainSlug ? null : score.chainSlug))
              }
            />
          ))}
        </div>
      </Panel>

      {current.length > 0 ? (
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>Current deployments</PanelTitle>
              <PanelDescription>
                Scored for reference and excluded from the expansion ranking.
              </PanelDescription>
            </div>
          </PanelHeader>
          <div className="divide-y divide-line">
            {current.map((score) => (
              <ScorecardRow
                key={score.chainSlug}
                score={score}
                isExpanded={expanded === score.chainSlug}
                onToggle={() =>
                  setExpanded((value) => (value === score.chainSlug ? null : score.chainSlug))
                }
              />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function ScorecardRow({
  score,
  isExpanded,
  onToggle,
}: {
  score: ReportChainScore;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const chain = getChain(score.chainSlug);
  const panelId = `factors-${score.chainSlug}`;

  return (
    <div data-print="block">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors',
          'hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ember-bright',
        )}
      >
        <span
          data-numeric
          className="w-6 shrink-0 text-xs text-ink-ghost"
          aria-label={`Rank ${score.rank}`}
        >
          {String(score.rank).padStart(2, '0')}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{score.chainName}</span>
            <RecommendationBadge recommendation={score.recommendation} />
            {score.blockers.length > 0 ? (
              <Badge tone="critical">
                <TriangleAlert className="size-2.5" />
                Blocked
              </Badge>
            ) : null}
          </span>
          {chain ? (
            <span className="font-mono text-[0.6875rem] text-ink-ghost">
              {chain.executionEnvironment} · {chain.family.replace(/-/g, ' ')} ·{' '}
              {chain.transactionCost.replace(/-/g, ' ')} cost
            </span>
          ) : null}
          <ScoreBar
            value={score.finalScore}
            tone={score.rank === 1 && score.recommendation !== 'current' ? 'accent' : 'muted'}
            className="mt-0.5 max-w-md"
          />
        </span>

        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <ScoreComposition
            deterministic={score.deterministicScore}
            adjustment={score.aiAdjustment}
            final={score.finalScore}
            compact
          />
          <ConfidenceMeter value={score.confidence} size="sm" />
        </span>

        <span className="shrink-0 sm:hidden">
          <BigScore value={score.finalScore} />
        </span>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-ink-faint transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {isExpanded ? (
        <div id={panelId} className="border-t border-line bg-paper px-5 py-5">
          <ScoreDetail score={score} />
        </div>
      ) : null}
    </div>
  );
}

function ScoreDetail({ score }: { score: ReportChainScore }) {
  const breakdown = score.scoreBreakdown;
  const interpretation = score.explanation;

  return (
    <div className="flex flex-col gap-6">
      {score.blockers.length > 0 ? (
        <div className="border-l-2 border-critical bg-critical/5 px-4 py-3">
          <p className="eyebrow text-critical">Hard constraints</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {score.blockers.map((blocker) => (
              <li key={blocker} className="text-[0.8125rem] leading-relaxed text-ink-dim">
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {interpretation ? (
        <div className="flex flex-col gap-4">
          <p className="max-w-3xl text-[0.875rem] leading-relaxed text-ink-dim">
            {interpretation.rationale}
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            <InterpretationList title="Advantages" items={interpretation.advantages} tone="positive" />
            <InterpretationList title="Trade-offs" items={interpretation.tradeoffs} tone="caution" />
            <InterpretationList title="Unknowns" items={interpretation.unknowns} tone="neutral" />
          </div>

          {score.aiAdjustment !== 0 && interpretation.adjustmentReason ? (
            <div className="border border-ember/25 bg-ember/5 px-4 py-3">
              <p className="eyebrow text-ember-bright">
                Model adjustment {score.aiAdjustment > 0 ? '+' : '−'}
                {Math.abs(score.aiAdjustment).toFixed(1)} — bounded to ±5
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-dim">
                {interpretation.adjustmentReason}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Factor table */}
      <div className="flex flex-col gap-4">
        <p className="eyebrow">Factor breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="eyebrow py-2 pr-4 font-normal">
                  Factor
                </th>
                <th scope="col" className="eyebrow py-2 pr-4 text-right font-normal">
                  Points
                </th>
                <th scope="col" className="eyebrow w-32 py-2 pr-4 font-normal">
                  Share
                </th>
                <th scope="col" className="eyebrow py-2 font-normal">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {breakdown.categories.map((category) => (
                <React.Fragment key={category.key}>
                  <tr className="border-b border-line-faint bg-surface/50">
                    <td className="py-2 pr-4 text-[0.8125rem] font-medium text-ink">
                      {category.label}
                    </td>
                    <td
                      data-numeric
                      className="py-2 pr-4 text-right text-[0.8125rem] font-medium text-ink"
                    >
                      {formatScore(category.points)}
                      <span className="text-ink-ghost">/{formatScore(category.maxPoints)}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <ScoreBar value={category.points} max={category.maxPoints} tone="neutral" />
                    </td>
                    <td />
                  </tr>
                  {category.factors.map((factor) => (
                    <tr key={factor.key} className="border-b border-line-faint">
                      <td className="py-2 pr-4 pl-4 text-[0.8125rem] text-ink-faint">
                        {factor.label}
                        {factor.dataMissing ? (
                          <span className="ml-2 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-caution">
                            default
                          </span>
                        ) : null}
                      </td>
                      <td data-numeric className="py-2 pr-4 text-right text-xs text-ink-dim">
                        {formatScore(factor.points)}
                        <span className="text-ink-ghost">/{formatScore(factor.maxPoints)}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <ScoreBar value={factor.points} max={factor.maxPoints} tone="muted" />
                      </td>
                      <td className="py-2 text-xs leading-relaxed text-ink-faint">{factor.reason}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              {breakdown.penalties.map((penalty) => (
                <tr key={penalty.code} className="border-b border-line-faint">
                  <td className="py-2 pr-4 text-[0.8125rem] text-critical">Penalty</td>
                  <td data-numeric className="py-2 pr-4 text-right text-xs text-critical">
                    −{formatScore(penalty.points)}
                  </td>
                  <td />
                  <td className="py-2 text-xs leading-relaxed text-ink-faint">{penalty.message}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 text-[0.8125rem] font-medium text-ink">
                  Deterministic score
                </td>
                <td data-numeric className="py-3 pr-4 text-right text-[0.8125rem] font-medium text-ink">
                  {formatScore(breakdown.deterministicScore)}
                  <span className="text-ink-ghost">/100</span>
                </td>
                <td colSpan={2} className="py-3 text-xs text-ink-ghost">
                  Scoring engine v{breakdown.scoringVersion}. Weights applied:{' '}
                  {Object.entries(breakdown.appliedWeights)
                    .map(([key, value]) => `${key.split('-')[0]} ${value}`)
                    .join(' · ')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {score.missingData.length > 0 ? (
        <div className="border-l-2 border-caution bg-caution/5 px-4 py-3">
          <p className="eyebrow text-caution">Missing data affecting confidence</p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4">
            {score.missingData.map((item) => (
              <li key={item} className="text-xs leading-relaxed text-ink-faint">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function InterpretationList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'caution' | 'neutral';
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p
        className={cn(
          'eyebrow',
          tone === 'positive' && 'text-positive',
          tone === 'caution' && 'text-caution',
        )}
      >
        {title}
      </p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-ink-faint">
            <span className="mt-[0.4rem] size-1 shrink-0 bg-ink-ghost" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
