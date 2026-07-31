'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge, Checkbox } from '@/components/ui/primitives';
import { ScoreComposition } from './score-primitives';
import { getChain } from '@/lib/chains/knowledge-base';
import { BAND_LABEL, COST_LABEL, FINALITY_LABEL, SECURITY_MODEL_LABEL } from '@/lib/chains/types';
import type { ReportChainScore } from '@/lib/report-model';
import { CATEGORY_DEFINITIONS, type CategoryKey } from '@/lib/scoring/types';
import { cn, formatScore } from '@/lib/utils';

/**
 * Chain comparison.
 *
 * Two to four chains side by side across three views: category shape (radar),
 * per-factor points (grouped bars), and the underlying knowledge-base
 * characteristics (table). The last one matters most — the chart shows *that*
 * chains differ, the table shows *why*.
 */

const SERIES_COLOURS = ['#e2570b', '#2a4d73', '#f2a516', '#7d736a'];

const MAX_SELECTION = 4;
const MIN_SELECTION = 2;

export function ChainComparison({
  scores,
  initialSlugs,
}: {
  scores: ReportChainScore[];
  initialSlugs?: string[];
}) {
  const selectable = scores.filter((score) => score.recommendation !== 'blocked');

  const defaults =
    initialSlugs && initialSlugs.length >= MIN_SELECTION
      ? initialSlugs.slice(0, MAX_SELECTION)
      : selectable.slice(0, 3).map((score) => score.chainSlug);

  const [selected, setSelected] = React.useState<string[]>(defaults);

  const toggle = (slug: string) => {
    setSelected((current) => {
      if (current.includes(slug)) {
        if (current.length <= MIN_SELECTION) return current;
        return current.filter((entry) => entry !== slug);
      }
      if (current.length >= MAX_SELECTION) return current;
      return [...current, slug];
    });
  };

  const chosen = selected
    .map((slug) => scores.find((score) => score.chainSlug === slug))
    .filter((score): score is ReportChainScore => Boolean(score));

  const radarData = CATEGORY_DEFINITIONS.map((definition) => {
    const row: Record<string, string | number> = { category: shortCategory(definition.key) };
    for (const score of chosen) {
      const category = score.scoreBreakdown.categories.find((entry) => entry.key === definition.key);
      // Normalise to a percentage of that category's available points so the
      // shape is comparable even when objective weighting changed the maxima.
      row[score.chainName] = category
        ? Math.round((category.points / Math.max(category.maxPoints, 0.01)) * 100)
        : 0;
    }
    return row;
  });

  const factorRows = (chosen[0]?.scoreBreakdown.categories ?? []).flatMap((category) =>
    category.factors.map((factor) => {
      const row: Record<string, string | number> = { factor: factor.label };
      for (const score of chosen) {
        const match = score.scoreBreakdown.categories
          .flatMap((entry) => entry.factors)
          .find((entry) => entry.key === factor.key);
        row[score.chainName] = match ? Number(match.points.toFixed(1)) : 0;
      }
      return row;
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>Select chains to compare</PanelTitle>
            <PanelDescription>
              Between {MIN_SELECTION} and {MAX_SELECTION} chains.
            </PanelDescription>
          </div>
          <Badge tone="ghost">
            {chosen.length} of {MAX_SELECTION} selected
          </Badge>
        </PanelHeader>
        <PanelBody>
          <div className="flex flex-wrap gap-2">
            {selectable.map((score) => {
              const isSelected = selected.includes(score.chainSlug);
              const atLimit = !isSelected && selected.length >= MAX_SELECTION;
              const atFloor = isSelected && selected.length <= MIN_SELECTION;
              return (
                <label
                  key={score.chainSlug}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[2px] border px-3 py-2 transition-colors',
                    isSelected
                      ? 'border-ember/50 bg-ember/8'
                      : 'border-line-strong hover:border-ink-ghost',
                    (atLimit || atFloor) && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={atLimit || atFloor}
                    onCheckedChange={() => toggle(score.chainSlug)}
                  />
                  <span className="text-[0.8125rem] text-ink">{score.chainName}</span>
                  <span data-numeric className="text-xs text-ink-faint">
                    {formatScore(score.finalScore)}
                  </span>
                </label>
              );
            })}
          </div>
        </PanelBody>
      </Panel>

      {chosen.length >= MIN_SELECTION ? (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel data-print="block">
              <PanelHeader>
                <div>
                  <PanelTitle>Category shape</PanelTitle>
                  <PanelDescription>
                    Each axis is that category&rsquo;s points as a share of the points available.
                  </PanelDescription>
                </div>
              </PanelHeader>
              <PanelBody>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="rgba(28,24,21,0.12)" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fill: 'var(--color-ink-faint)', fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tick={{ fill: 'var(--color-ink-ghost)', fontSize: 9 }}
                        stroke="rgba(28,24,21,0.12)"
                      />
                      {chosen.map((score, index) => (
                        <Radar
                          key={score.chainSlug}
                          name={score.chainName}
                          dataKey={score.chainName}
                          stroke={SERIES_COLOURS[index % SERIES_COLOURS.length]}
                          fill={SERIES_COLOURS[index % SERIES_COLOURS.length]}
                          fillOpacity={0.12}
                          strokeWidth={1.6}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-faint)' }} />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </PanelBody>
            </Panel>

            <Panel data-print="block">
              <PanelHeader>
                <div>
                  <PanelTitle>Final scores</PanelTitle>
                  <PanelDescription>Base score, model adjustment, and result.</PanelDescription>
                </div>
              </PanelHeader>
              <PanelBody className="flex flex-col gap-5">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chosen.map((score) => ({
                        name: score.chainName,
                        score: Number(score.finalScore.toFixed(1)),
                      }))}
                      margin={{ top: 4, right: 8, bottom: 4, left: -18 }}
                    >
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(28,24,21,0.08)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'var(--color-ink-faint)', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(237,234,228,0.12)' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: 'var(--color-ink-ghost)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(226,87,11,0.06)' }} />
                      <Bar dataKey="score" radius={[1, 1, 0, 0]} maxBarSize={56}>
                        {chosen.map((score, index) => (
                          <Cell
                            key={score.chainSlug}
                            fill={SERIES_COLOURS[index % SERIES_COLOURS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-3">
                  {chosen.map((score, index) => (
                    <div key={score.chainSlug} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="size-2 shrink-0"
                          style={{ backgroundColor: SERIES_COLOURS[index % SERIES_COLOURS.length] }}
                          aria-hidden="true"
                        />
                        <span className="text-[0.8125rem] text-ink-dim">{score.chainName}</span>
                      </span>
                      <ScoreComposition
                        deterministic={score.deterministicScore}
                        adjustment={score.aiAdjustment}
                        final={score.finalScore}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          </div>

          <Panel data-print="block">
            <PanelHeader>
              <div>
                <PanelTitle>Factor-level comparison</PanelTitle>
                <PanelDescription>Points awarded per sub-factor.</PanelDescription>
              </div>
            </PanelHeader>
            <PanelBody>
              <div className="h-[26rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={factorRows}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 118 }}
                    barGap={1}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(28,24,21,0.08)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--color-ink-ghost)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="factor"
                      width={116}
                      tick={{ fill: 'var(--color-ink-faint)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip suffix=" pts" />} cursor={{ fill: 'rgba(226,87,11,0.06)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-faint)' }} />
                    {chosen.map((score, index) => (
                      <Bar
                        key={score.chainSlug}
                        dataKey={score.chainName}
                        fill={SERIES_COLOURS[index % SERIES_COLOURS.length]}
                        radius={[0, 1, 1, 0]}
                        maxBarSize={9}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PanelBody>
          </Panel>

          <ComparisonTable scores={chosen} />
          <ComparisonVerdict scores={chosen} />
        </>
      ) : (
        <Panel>
          <PanelBody className="py-12 text-center">
            <p className="text-sm text-ink-faint">
              Select at least {MIN_SELECTION} chains to compare.
            </p>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}

function ComparisonTable({ scores }: { scores: ReportChainScore[] }) {
  const chains = scores.map((score) => ({ score, chain: getChain(score.chainSlug) }));

  const rows: Array<{ label: string; value: (entry: (typeof chains)[number]) => string }> = [
    { label: 'Final score', value: ({ score }) => formatScore(score.finalScore) },
    { label: 'Confidence', value: ({ score }) => `${score.confidence}/100` },
    { label: 'Execution environment', value: ({ chain }) => chain?.executionEnvironment ?? '—' },
    { label: 'Languages', value: ({ chain }) => chain?.contractLanguages.join(', ') ?? '—' },
    { label: 'Finality', value: ({ chain }) => (chain ? FINALITY_LABEL[chain.finality] : '—') },
    {
      label: 'Transaction cost',
      value: ({ chain }) => (chain ? COST_LABEL[chain.transactionCost] : '—'),
    },
    {
      label: 'Security model',
      value: ({ chain }) => (chain ? SECURITY_MODEL_LABEL[chain.securityModel] : '—'),
    },
    {
      label: 'Stablecoin liquidity',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.stablecoinLiquidity] : '—'),
    },
    {
      label: 'DeFi depth',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.defiLiquidityDepth] : '—'),
    },
    { label: 'Retail base', value: ({ chain }) => (chain ? BAND_LABEL[chain.retailUserBase] : '—') },
    {
      label: 'Institutional presence',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.institutionalPresence] : '—'),
    },
    {
      label: 'Tooling maturity',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.developerToolingMaturity] : '—'),
    },
    {
      label: 'Cross-chain maturity',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.crossChainMaturity] : '—'),
    },
    {
      label: 'Operational complexity',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.operationalComplexity] : '—'),
    },
    {
      label: 'Ecosystem support',
      value: ({ chain }) => (chain ? BAND_LABEL[chain.ecosystemSupport] : '—'),
    },
    { label: 'Data confidence', value: ({ chain }) => chain?.dataConfidence ?? '—' },
    { label: 'Last reviewed', value: ({ chain }) => chain?.reviewedAt ?? '—' },
  ];

  return (
    <Panel data-print="block">
      <PanelHeader>
        <div>
          <PanelTitle>Characteristics</PanelTitle>
          <PanelDescription>
            Underlying knowledge-base values. Bands, not point estimates — see the methodology for
            why.
          </PanelDescription>
        </div>
      </PanelHeader>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="eyebrow px-5 py-3 font-normal">
                Characteristic
              </th>
              {chains.map(({ score }, index) => (
                <th key={score.chainSlug} scope="col" className="px-5 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0"
                      style={{ backgroundColor: SERIES_COLOURS[index % SERIES_COLOURS.length] }}
                      aria-hidden="true"
                    />
                    <span className="text-[0.8125rem] font-medium text-ink">{score.chainName}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line-faint last:border-0">
                <th
                  scope="row"
                  className="px-5 py-2.5 text-left text-[0.8125rem] font-normal text-ink-faint"
                >
                  {row.label}
                </th>
                {chains.map((entry) => (
                  <td
                    key={entry.score.chainSlug}
                    className="px-5 py-2.5 text-[0.8125rem] text-ink-dim"
                  >
                    {row.value(entry)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function ComparisonVerdict({ scores }: { scores: ReportChainScore[] }) {
  const sorted = [...scores].sort((a, b) => b.finalScore - a.finalScore);
  const leader = sorted[0];
  const runnerUp = sorted[1];
  if (!leader || !runnerUp) return null;

  const gap = leader.finalScore - runnerUp.finalScore;
  const leaderChain = getChain(leader.chainSlug);
  const runnerChain = getChain(runnerUp.chainSlug);

  // Find the single factor where the leader gains the most over the runner-up.
  const leaderFactors = leader.scoreBreakdown.categories.flatMap((category) => category.factors);
  const runnerFactors = new Map(
    runnerUp.scoreBreakdown.categories
      .flatMap((category) => category.factors)
      .map((factor) => [factor.key, factor]),
  );

  const deltas = leaderFactors
    .map((factor) => ({
      label: factor.label,
      delta: factor.points - (runnerFactors.get(factor.key)?.points ?? 0),
    }))
    .sort((a, b) => b.delta - a.delta);

  const strongest = deltas[0];
  const weakest = deltas[deltas.length - 1];

  const sameVm = leaderChain?.executionEnvironment === runnerChain?.executionEnvironment;

  return (
    <Panel corners data-print="block">
      <PanelHeader>
        <PanelTitle>Comparison summary</PanelTitle>
      </PanelHeader>
      <PanelBody className="flex flex-col gap-4">
        <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">
          <strong className="font-medium text-ink">{leader.chainName}</strong> leads{' '}
          {runnerUp.chainName} by {formatScore(gap)} points
          {gap < 3
            ? ' — close enough that the decision should turn on factors outside this model, such as existing relationships or team familiarity.'
            : gap < 10
              ? ', a meaningful but not decisive margin.'
              : ', a decisive margin under the stated constraints.'}
          {strongest && strongest.delta > 0.5
            ? ` The largest single advantage is ${strongest.label.toLowerCase()} (+${formatScore(strongest.delta)} points).`
            : ''}
          {weakest && weakest.delta < -0.5
            ? ` It gives up the most on ${weakest.label.toLowerCase()} (${formatScore(weakest.delta)} points).`
            : ''}
        </p>
        {sameVm && leaderChain ? (
          <p className="max-w-3xl text-[0.875rem] leading-relaxed text-ink-faint">
            Both run {leaderChain.executionEnvironment}, so deploying to the second after the first
            is configuration and liquidity work rather than a separate engineering programme. That
            materially changes the cost of doing both instead of choosing.
          </p>
        ) : leaderChain && runnerChain ? (
          <p className="max-w-3xl text-[0.875rem] leading-relaxed text-ink-faint">
            These run different execution environments ({leaderChain.executionEnvironment} vs{' '}
            {runnerChain.executionEnvironment}), so supporting both is two engineering programmes
            and two audit surfaces, not one deployment repeated.
          </p>
        ) : null}
        <p className="text-xs text-ink-ghost">
          Comparison confidence is bounded by the lower of the two:{' '}
          {Math.min(leader.confidence, runnerUp.confidence)}/100.
        </p>
      </PanelBody>
    </Panel>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[2px] border border-line-strong bg-raised px-3 py-2 shadow-[var(--frost-shadow-lifted)]">
      {label !== undefined ? (
        <p className="mb-1.5 text-[0.6875rem] uppercase tracking-[0.07em] text-ink-ghost">{label}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-ink-dim">{entry.name}</span>
            <span data-numeric className="ml-auto text-xs font-medium text-ink">
              {entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function shortCategory(key: CategoryKey): string {
  switch (key) {
    case 'product-ecosystem-fit':
      return 'Ecosystem fit';
    case 'users-and-liquidity':
      return 'Users & liquidity';
    case 'technical-compatibility':
      return 'Technical';
    case 'cost-and-operational-fit':
      return 'Cost & ops';
    case 'strategic-optionality':
      return 'Optionality';
    default:
      return key;
  }
}
