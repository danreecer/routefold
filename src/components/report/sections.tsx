'use client';

import * as React from 'react';
import { ArrowRight, CircleCheck, ExternalLink, Filter } from 'lucide-react';
import { Panel, PanelBody, PanelDescription, PanelFooter, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge, Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/primitives';
import { CopyButton } from './copy-button';
import { ConfidenceMeter, ScoreBar } from './score-primitives';
import { getChain } from '@/lib/chains/knowledge-base';
import type {
  ExecutionPlan,
  ExecutiveSummary,
  ExpansionSequence,
  RiskCategory,
  RiskRegister,
  SourcesAssumptions,
  TechnicalBrief,
} from '@/lib/schemas/report';
import { RISK_CATEGORY_LABELS } from '@/lib/schemas/report';
import {
  BUDGET_LABELS,
  DEVELOPMENT_STAGE_LABELS,
  OBJECTIVE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  TEAM_CAPACITY_LABELS,
  TIME_HORIZON_LABELS,
  TRANSACTION_PROFILE_LABELS,
  USER_PROFILE_LABELS,
  type DigitalTwin,
} from '@/lib/schemas/twin';
import { cn, formatDateTime, humanizeEnum } from '@/lib/utils';
import { ProvenanceTag } from '@/components/ui/field';

/* ── Executive summary ──────────────────────────────────────────────────── */

export function ExecutiveSummaryView({
  summary,
  confidence,
  recommendedChainName,
}: {
  summary: ExecutiveSummary;
  confidence: number;
  recommendedChainName: string;
}) {
  return (
    <Panel corners data-print="block">
      <PanelBody className="flex flex-col gap-7 px-6 py-7 md:px-8 md:py-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="eyebrow">Executive summary</span>
          <ConfidenceMeter value={summary.confidence || confidence} label="Report confidence" />
        </div>

        <div className="flex flex-col gap-5">
          <p className="max-w-3xl text-headline font-medium text-ink">{summary.headline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="accent">Recommended · {recommendedChainName}</Badge>
            <Badge tone="ghost">{summary.suggestedTiming}</Badge>
          </div>
        </div>

        <div className="rule-fade" />

        <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">{summary.rationale}</p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border-l-2 border-positive pl-4">
            <p className="eyebrow text-positive">Main opportunity</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-dim">
              {summary.mainOpportunity}
            </p>
          </div>
          <div className="border-l-2 border-caution pl-4">
            <p className="eyebrow text-caution">Main risk</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-dim">{summary.mainRisk}</p>
          </div>
        </div>

        {summary.confidenceReason ? (
          <p className="max-w-3xl text-xs leading-relaxed text-ink-ghost">
            {summary.confidenceReason}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}

/* ── Digital Twin ───────────────────────────────────────────────────────── */

type TwinRow = { key: string; label: string; value: React.ReactNode };

function twinGroups(twin: DigitalTwin): Array<{ title: string; rows: TwinRow[] }> {
  const list = (items: string[]) => (items.length > 0 ? items.join(', ') : '—');

  return [
    {
      title: 'Identity',
      rows: [
        { key: 'productName', label: 'Product', value: twin.productName },
        {
          key: 'productCategory',
          label: 'Category',
          value: PRODUCT_CATEGORY_LABELS[twin.productCategory],
        },
        { key: 'oneLineDescription', label: 'Description', value: twin.oneLineDescription },
        {
          key: 'developmentStage',
          label: 'Stage',
          value: DEVELOPMENT_STAGE_LABELS[twin.developmentStage],
        },
        {
          key: 'hasToken',
          label: 'Token',
          value: twin.hasToken === null ? 'Not established' : twin.hasToken ? 'Yes' : 'No',
        },
      ],
    },
    {
      title: 'Architecture',
      rows: [
        { key: 'architecture.summary', label: 'Summary', value: twin.architecture.summary },
        {
          key: 'architecture.contractComplexity',
          label: 'Contract complexity',
          value: humanizeEnum(twin.architecture.contractComplexity),
        },
        {
          key: 'architecture.upgradeability',
          label: 'Upgradeability',
          value: humanizeEnum(twin.architecture.upgradeability),
        },
        {
          key: 'architecture.externalDependencies',
          label: 'External dependencies',
          value: list(twin.architecture.externalDependencies),
        },
        {
          key: 'architecture.offchainComponents',
          label: 'Offchain components',
          value: list(twin.architecture.offchainComponents),
        },
      ],
    },
    {
      title: 'Execution environment',
      rows: [
        { key: 'currentChains', label: 'Current chains', value: list(twin.currentChains) },
        { key: 'vmRequirement', label: 'Virtual machine', value: twin.vmRequirement },
        { key: 'vmRequirementReason', label: 'VM rationale', value: twin.vmRequirementReason || '—' },
        {
          key: 'contractLanguages',
          label: 'Contract languages',
          value: list(twin.contractLanguages),
        },
      ],
    },
    {
      title: 'Users',
      rows: [
        {
          key: 'users.primaryProfile',
          label: 'Primary profile',
          value: USER_PROFILE_LABELS[twin.users.primaryProfile],
        },
        {
          key: 'users.secondaryProfiles',
          label: 'Secondary profiles',
          value: list(twin.users.secondaryProfiles.map((profile) => USER_PROFILE_LABELS[profile])),
        },
        {
          key: 'users.estimatedSophistication',
          label: 'Sophistication',
          value: humanizeEnum(twin.users.estimatedSophistication),
        },
        {
          key: 'users.walletExpectations',
          label: 'Wallet expectations',
          value: twin.users.walletExpectations || '—',
        },
        { key: 'orientation', label: 'Orientation', value: humanizeEnum(twin.orientation) },
        {
          key: 'targetGeographies',
          label: 'Target regions',
          value: list(twin.targetGeographies),
        },
      ],
    },
    {
      title: 'Liquidity',
      rows: [
        {
          key: 'liquidity.requiresDeepLiquidity',
          label: 'Requires deep liquidity',
          value: twin.liquidity.requiresDeepLiquidity ? 'Yes' : 'No',
        },
        {
          key: 'liquidity.stablecoinDependency',
          label: 'Stablecoin dependency',
          value: humanizeEnum(twin.liquidity.stablecoinDependency),
        },
        {
          key: 'liquidity.requiredAssets',
          label: 'Required assets',
          value: list(twin.liquidity.requiredAssets),
        },
        { key: 'liquidity.notes', label: 'Notes', value: twin.liquidity.notes || '—' },
      ],
    },
    {
      title: 'Transactions',
      rows: [
        {
          key: 'transactions.profile',
          label: 'Profile',
          value: TRANSACTION_PROFILE_LABELS[twin.transactions.profile],
        },
        {
          key: 'transactions.latencySensitivity',
          label: 'Latency sensitivity',
          value: humanizeEnum(twin.transactions.latencySensitivity),
        },
        {
          key: 'transactions.costSensitivity',
          label: 'Cost sensitivity',
          value: humanizeEnum(twin.transactions.costSensitivity),
        },
        {
          key: 'transactions.finalityRequirement',
          label: 'Finality requirement',
          value: humanizeEnum(twin.transactions.finalityRequirement),
        },
      ],
    },
    {
      title: 'Security',
      rows: [
        {
          key: 'security.sensitivity',
          label: 'Sensitivity',
          value: humanizeEnum(twin.security.sensitivity),
        },
        {
          key: 'security.valueAtRisk',
          label: 'Value at risk',
          value: humanizeEnum(twin.security.valueAtRisk),
        },
        {
          key: 'security.auditStatus',
          label: 'Audit status',
          value: humanizeEnum(twin.security.auditStatus),
        },
        { key: 'security.notes', label: 'Notes', value: twin.security.notes || '—' },
      ],
    },
    {
      title: 'Constraints & objectives',
      rows: [
        {
          key: 'objectives',
          label: 'Objectives',
          value: list(twin.objectives.map((objective) => OBJECTIVE_LABELS[objective])),
        },
        {
          key: 'constraints.timeHorizon',
          label: 'Time horizon',
          value: TIME_HORIZON_LABELS[twin.constraints.timeHorizon],
        },
        {
          key: 'constraints.teamCapacity',
          label: 'Team capacity',
          value: TEAM_CAPACITY_LABELS[twin.constraints.teamCapacity],
        },
        {
          key: 'constraints.budgetSensitivity',
          label: 'Budget',
          value: BUDGET_LABELS[twin.constraints.budgetSensitivity],
        },
        {
          key: 'constraints.requiredVm',
          label: 'Required VM',
          value: twin.constraints.requiredVm ?? 'No hard requirement',
        },
        {
          key: 'constraints.excludedEcosystems',
          label: 'Excluded ecosystems',
          value: list(twin.constraints.excludedEcosystems),
        },
        {
          key: 'preferredEcosystems',
          label: 'Preferred ecosystems',
          value: list(twin.preferredEcosystems),
        },
      ],
    },
  ];
}

export function DigitalTwinView({
  twin,
  fieldSources,
  assumptions,
  missingData,
  action,
}: {
  twin: DigitalTwin;
  fieldSources: Record<string, string> | null;
  assumptions: string[];
  missingData: string[];
  action?: React.ReactNode;
}) {
  const groups = twinGroups(twin);

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>Multichain Digital Twin</PanelTitle>
            <PanelDescription>
              The structured model every score and section is derived from. Provenance is marked per
              field.
            </PanelDescription>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceMeter value={twin.confidence} label="Twin confidence" size="sm" />
            {action}
          </div>
        </PanelHeader>

        <div className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(odd)]:border-r md:[&>*:nth-child(odd)]:border-line md:[&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(n+3)]:border-line">
          {groups.map((group) => (
            <div key={group.title} className="p-5" data-print="block">
              <p className="eyebrow">{group.title}</p>
              <dl className="mt-4 flex flex-col gap-3.5">
                {group.rows.map((row) => {
                  const provenance = fieldSources?.[row.key] as
                    | 'source'
                    | 'user'
                    | 'inferred'
                    | 'default'
                    | undefined;
                  return (
                    <div key={row.key} className="grid gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-[0.6875rem] uppercase tracking-[0.06em] text-ink-ghost">
                          {row.label}
                        </dt>
                        {provenance ? <ProvenanceTag provenance={provenance} /> : null}
                      </div>
                      <dd className="text-[0.8125rem] leading-relaxed text-ink-dim">{row.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel data-print="block">
          <PanelHeader>
            <PanelTitle>Assumptions</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {assumptions.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {assumptions.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[0.45rem] size-1 shrink-0 bg-ember" aria-hidden="true" />
                    <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.8125rem] text-ink-faint">No assumptions were recorded.</p>
            )}
          </PanelBody>
        </Panel>

        <Panel data-print="block">
          <PanelHeader>
            <div>
              <PanelTitle>Missing data</PanelTitle>
            </div>
            <Badge tone="caution">Lowers confidence</Badge>
          </PanelHeader>
          <PanelBody>
            {missingData.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {missingData.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[0.45rem] size-1 shrink-0 bg-caution" aria-hidden="true" />
                    <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.8125rem] text-ink-faint">
                Nothing material was recorded as missing.
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

/* ── Expansion sequence ─────────────────────────────────────────────────── */

export function ExpansionSequenceView({ sequence }: { sequence: ExpansionSequence }) {
  const name = (slug: string) => getChain(slug)?.name ?? slug;

  return (
    <div className="flex flex-col gap-6">
      <Panel corners data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>Recommended route</PanelTitle>
          </div>
          <Badge tone="accent">Primary</Badge>
        </PanelHeader>
        <PanelBody className="flex flex-col gap-4">
          <p className="text-title font-medium text-ink">{name(sequence.primary.chainSlug)}</p>
          <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">
            {sequence.primary.reason}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.07em] text-ink-faint">
            Timing · {sequence.primary.timing}
          </p>
        </PanelBody>
      </Panel>

      {sequence.secondary.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {sequence.secondary.map((entry) => (
            <Panel key={entry.chainSlug} data-print="block">
              <PanelHeader>
                <PanelTitle>{name(entry.chainSlug)}</PanelTitle>
                <Badge tone="live">Secondary</Badge>
              </PanelHeader>
              <PanelBody className="flex flex-col gap-3">
                <p className="text-[0.875rem] leading-relaxed text-ink-dim">{entry.reason}</p>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.07em] text-ink-ghost">
                  {entry.timing}
                </p>
              </PanelBody>
            </Panel>
          ))}
        </div>
      ) : null}

      <Panel data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>Rollout order</PanelTitle>
            <PanelDescription>
              Sequenced by dependency and engineering-programme boundaries, not only by score.
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <ol className="flex flex-col">
            {sequence.rolloutOrder.map((step, index) => (
              <li key={`${step.step}-${step.chainSlug}-${index}`} className="flex gap-5 pb-6 last:pb-0">
                <div className="flex shrink-0 flex-col items-center">
                  <span
                    data-numeric
                    className="flex size-7 items-center justify-center border border-line-strong text-[0.6875rem] text-ink-dim"
                  >
                    {step.step}
                  </span>
                  {index < sequence.rolloutOrder.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-line" aria-hidden="true" />
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{name(step.chainSlug)}</span>
                    {step.dependsOn.length > 0 ? (
                      <Badge tone="ghost">
                        after {step.dependsOn.map((dependency) => name(dependency)).join(', ')}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-ink-faint">
                    {step.milestone}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel data-print="block">
          <PanelHeader>
            <PanelTitle>Decision rationale</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              {sequence.decisionRationale}
            </p>
          </PanelBody>
        </Panel>

        <Panel data-print="block">
          <PanelHeader>
            <PanelTitle>Not recommended now</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <ul className="flex flex-col gap-3.5">
              {sequence.notRecommended.map((entry) => (
                <li key={entry.chainSlug} className="flex flex-col gap-1">
                  <span className="text-[0.8125rem] font-medium text-ink-dim">
                    {name(entry.chainSlug)}
                  </span>
                  <span className="text-xs leading-relaxed text-ink-ghost">{entry.reason}</span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

/* ── Risk register ──────────────────────────────────────────────────────── */

const LEVEL_TONE = { low: 'ghost', medium: 'caution', high: 'critical' } as const;

export function RiskRegisterView({ register }: { register: RiskRegister }) {
  const [category, setCategory] = React.useState<'all' | RiskCategory>('all');
  const [minLevel, setMinLevel] = React.useState<'all' | 'high'>('all');

  const filtered = register.risks.filter((risk) => {
    if (category !== 'all' && risk.category !== category) return false;
    if (minLevel === 'high' && risk.impact !== 'high' && risk.probability !== 'high') return false;
    return true;
  });

  const categories = Array.from(new Set(register.risks.map((risk) => risk.category)));

  return (
    <div className="flex flex-col gap-6">
      <Panel data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>Risk register</PanelTitle>
            <PanelDescription>{register.summary}</PanelDescription>
          </div>
        </PanelHeader>

        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3" data-print="hide">
          <Filter className="size-3.5 text-ink-ghost" />
          <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
            <SelectTrigger className="h-8 w-48 text-[0.8125rem]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((key) => (
                <SelectItem key={key} value={key}>
                  {RISK_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={minLevel === 'high'}
              onCheckedChange={(checked) => setMinLevel(checked ? 'high' : 'all')}
            />
            <span className="text-[0.8125rem] text-ink-dim">High probability or impact only</span>
          </label>

          <span data-numeric className="ml-auto text-xs text-ink-ghost">
            {filtered.length} of {register.risks.length}
          </span>
        </div>

        <div className="divide-y divide-line">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-ink-faint">No risks match those filters.</p>
            </div>
          ) : (
            filtered.map((risk) => (
              <article key={risk.id} className="px-5 py-5" data-print="block">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span data-numeric className="text-[0.6875rem] text-ink-ghost">
                        {risk.id}
                      </span>
                      <h4 className="text-sm font-medium text-ink">{risk.title}</h4>
                      {risk.isOpenQuestion ? <Badge tone="accent">Open question</Badge> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{RISK_CATEGORY_LABELS[risk.category]}</Badge>
                      <Badge tone={LEVEL_TONE[risk.probability]}>
                        Probability {risk.probability}
                      </Badge>
                      <Badge tone={LEVEL_TONE[risk.impact]}>Impact {risk.impact}</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                    {risk.suggestedOwner}
                  </span>
                </div>

                <p className="mt-3 max-w-3xl text-[0.8125rem] leading-relaxed text-ink-dim">
                  {risk.description}
                </p>

                <div className="mt-3 border-l-2 border-positive/50 pl-4">
                  <p className="eyebrow text-positive">Mitigation</p>
                  <p className="mt-1.5 max-w-3xl text-[0.8125rem] leading-relaxed text-ink-dim">
                    {risk.mitigation}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      {register.complianceQuestions.length > 0 ? (
        <Panel data-print="block">
          <PanelHeader>
            <div>
              <PanelTitle>Compliance questions for qualified counsel</PanelTitle>
              <PanelDescription>
                Routefold does not answer these and does not provide legal advice. They are the
                questions this expansion raises.
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <ol className="flex flex-col gap-3">
              {register.complianceQuestions.map((question, index) => (
                <li key={question} className="flex gap-3">
                  <span data-numeric className="shrink-0 text-[0.6875rem] text-ink-ghost">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{question}</span>
                </li>
              ))}
            </ol>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

/* ── Execution plan ─────────────────────────────────────────────────────── */

const TRACK_TONE = {
  engineering: 'accent',
  product: 'live',
  ecosystem: 'positive',
  operations: 'neutral',
} as const;

export function ExecutionPlanView({ plan }: { plan: ExecutionPlan }) {
  const [done, setDone] = React.useState<Set<string>>(new Set());
  const tasksById = new Map(plan.tasks.map((task) => [task.id, task]));

  const toggle = (id: string) =>
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const completedCount = plan.tasks.filter((task) => done.has(task.id)).length;

  return (
    <div className="flex flex-col gap-6">
      <Panel data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>30-day plan</PanelTitle>
            <PanelDescription>{plan.summary}</PanelDescription>
          </div>
          <div className="flex items-center gap-3">
            <span data-numeric className="text-xs text-ink-faint">
              {completedCount}/{plan.tasks.length} complete
            </span>
            <div className="w-24">
              <ScoreBar value={completedCount} max={plan.tasks.length} tone="accent" />
            </div>
          </div>
        </PanelHeader>
      </Panel>

      <div className="flex flex-col gap-5">
        {plan.weeks.map((week) => {
          const weekTasks = week.taskIds
            .map((id) => tasksById.get(id))
            .filter((task): task is ExecutionPlan['tasks'][number] => Boolean(task));

          return (
            <Panel key={week.week} data-print="block">
              <PanelHeader>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      data-numeric
                      className="border border-line-strong px-2 py-0.5 text-[0.6875rem] text-ink-dim"
                    >
                      WEEK {week.week}
                    </span>
                    <PanelTitle>{week.theme}</PanelTitle>
                  </div>
                  <PanelDescription>{week.milestone}</PanelDescription>
                </div>
              </PanelHeader>

              <div className="divide-y divide-line">
                {weekTasks.map((task) => {
                  const isDone = done.has(task.id);
                  return (
                    <div key={task.id} className="flex gap-4 px-5 py-4">
                      <div className="pt-0.5" data-print="hide">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => toggle(task.id)}
                          aria-label={`Mark ${task.title} complete`}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span data-numeric className="text-[0.6875rem] text-ink-ghost">
                            {task.id}
                          </span>
                          <h4
                            className={cn(
                              'text-[0.875rem] font-medium text-ink',
                              isDone && 'text-ink-ghost line-through',
                            )}
                          >
                            {task.title}
                          </h4>
                          <Badge tone={TRACK_TONE[task.track]}>{task.track}</Badge>
                          <Badge tone="ghost">{task.effort}</Badge>
                        </div>

                        <p className="max-w-3xl text-[0.8125rem] leading-relaxed text-ink-faint">
                          {task.description}
                        </p>

                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                            Owner · {task.owner}
                          </span>
                          {task.dependsOn.length > 0 ? (
                            <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                              Depends on · {task.dependsOn.join(', ')}
                            </span>
                          ) : null}
                        </div>

                        <ul className="mt-1 flex flex-col gap-1.5">
                          {task.acceptanceCriteria.map((criterion) => (
                            <li key={criterion} className="flex gap-2">
                              <CircleCheck
                                className="mt-[0.15rem] size-3 shrink-0 text-ink-ghost"
                                aria-hidden="true"
                              />
                              <span className="text-xs leading-relaxed text-ink-faint">
                                {criterion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>

      {plan.launchDependencies.length > 0 ? (
        <Panel data-print="block">
          <PanelHeader>
            <div>
              <PanelTitle>Launch dependencies</PanelTitle>
              <PanelDescription>Outside the team&rsquo;s direct control.</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <ul className="flex flex-col gap-3">
              {plan.launchDependencies.map((dependency) => (
                <li key={dependency} className="flex gap-3">
                  <ArrowRight className="mt-[0.2rem] size-3.5 shrink-0 text-ink-ghost" />
                  <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{dependency}</span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      ) : null}

      <p className="text-xs text-ink-ghost" data-print="hide">
        Completion state is kept in this browser session only — it is a working checklist, not
        persisted project management.
      </p>
    </div>
  );
}

/* ── Technical brief ────────────────────────────────────────────────────── */

export function TechnicalBriefView({
  brief,
  exportHref,
}: {
  brief: TechnicalBrief;
  exportHref?: string;
}) {
  const groups: Array<{ title: string; items: string[] }> = [
    { title: 'Contract work', items: brief.contractWork },
    { title: 'Infrastructure work', items: brief.infrastructureWork },
    { title: 'Frontend work', items: brief.frontendWork },
    { title: 'Testing strategy', items: brief.testingStrategy },
    { title: 'Open questions', items: brief.openQuestions },
  ];

  const plainText = [
    `TECHNICAL BRIEF — target chain: ${brief.targetChain}`,
    '',
    brief.overview,
    '',
    ...groups.flatMap((group) => [
      group.title.toUpperCase(),
      ...group.items.map((item) => `- ${item}`),
      '',
    ]),
  ].join('\n');

  return (
    <div className="flex flex-col gap-6">
      <Panel data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>Technical brief</PanelTitle>
            <PanelDescription>Target chain · {brief.targetChain}</PanelDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={plainText} label="Copy brief" successLabel="Brief copied" />
            {exportHref ? (
              <a
                href={exportHref}
                download
                className="inline-flex h-8 items-center gap-2 rounded-[2px] border border-line-strong px-3 text-[0.8125rem] text-ink-dim transition-colors hover:border-ink-ghost hover:text-ink"
              >
                <ExternalLink className="size-3.5" />
                JSON export
              </a>
            ) : null}
          </div>
        </PanelHeader>
        <PanelBody>
          <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">{brief.overview}</p>
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) =>
          group.items.length > 0 ? (
            <Panel key={group.title} data-print="block">
              <PanelHeader>
                <PanelTitle>{group.title}</PanelTitle>
                <CopyButton
                  size="icon-sm"
                  value={`${group.title}\n${group.items.map((item) => `- ${item}`).join('\n')}`}
                  label={`Copy ${group.title}`}
                />
              </PanelHeader>
              <PanelBody>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className="mt-[0.45rem] size-1 shrink-0 bg-ink-ghost"
                        aria-hidden="true"
                      />
                      <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </PanelBody>
            </Panel>
          ) : null,
        )}
      </div>
    </div>
  );
}

/* ── Sources & assumptions ──────────────────────────────────────────────── */

const STATUS_TONE: Record<string, 'positive' | 'caution' | 'critical' | 'neutral'> = {
  SUCCESS: 'positive',
  MANUAL: 'neutral',
  BLOCKED: 'critical',
  TIMEOUT: 'caution',
  NOT_FOUND: 'caution',
  TOO_LARGE: 'caution',
  UNSUPPORTED_CONTENT: 'caution',
  ERROR: 'critical',
  PENDING: 'neutral',
};

export function SourcesView({ sources }: { sources: SourcesAssumptions }) {
  return (
    <div className="flex flex-col gap-6">
      <Panel data-print="block">
        <PanelHeader>
          <div>
            <PanelTitle>Sources</PanelTitle>
            <PanelDescription>
              What Routefold read, when it read it, and what it could not read.
            </PanelDescription>
          </div>
        </PanelHeader>
        <div className="divide-y divide-line">
          {sources.submittedSources.length === 0 ? (
            <PanelBody>
              <p className="text-[0.8125rem] text-ink-faint">
                No external sources were submitted. The analysis worked from the wizard answers
                alone.
              </p>
            </PanelBody>
          ) : (
            sources.submittedSources.map((source) => (
              <div key={`${source.url}-${source.kind}`} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="ghost">{source.kind}</Badge>
                    <Badge tone={STATUS_TONE[source.status] ?? 'neutral'}>{source.status}</Badge>
                  </div>
                  <span className="break-all font-mono text-[0.6875rem] text-ink-faint">
                    {source.url}
                  </span>
                  {source.failureReason ? (
                    <span className="text-xs text-caution">{source.failureReason}</span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  {source.wordCount !== null ? (
                    <span data-numeric className="text-xs text-ink-faint">
                      {source.wordCount.toLocaleString('en-US')} words
                    </span>
                  ) : null}
                  <span className="font-mono text-[0.625rem] text-ink-ghost">
                    {source.retrievedAt ? formatDateTime(source.retrievedAt) : 'not retrieved'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <AssumptionsPanel title="Your stated assumptions" items={sources.userAssumptions} tone="neutral" />
        <AssumptionsPanel title="Analysis assumptions" items={sources.modelAssumptions} tone="accent" />
        <AssumptionsPanel title="Missing data" items={sources.missingData} tone="caution" />
      </div>

      <Panel data-print="block">
        <PanelHeader>
          <PanelTitle>Provenance</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProvenanceRow label="Methodology version" value={`v${sources.methodologyVersion}`} />
            <ProvenanceRow
              label="Chain knowledge base"
              value={`v${sources.chainDataSource.knowledgeBaseVersion} · reviewed ${sources.chainDataSource.reviewedAt}`}
            />
            <ProvenanceRow
              label="Live chain data"
              value={
                sources.chainDataSource.liveDataFetchedAt
                  ? `${sources.chainDataSource.liveDataStatus} · ${formatDateTime(sources.chainDataSource.liveDataFetchedAt)}`
                  : sources.chainDataSource.liveDataStatus
              }
            />
            <ProvenanceRow label="Generation mode" value={sources.generationMode} />
            <ProvenanceRow label="Model" value={sources.modelName} />
          </dl>
        </PanelBody>
        <PanelFooter>
          <p className="text-xs leading-relaxed text-ink-ghost">
            Routefold provides technical and strategic decision support. Outputs may contain
            incomplete assumptions and do not constitute financial, legal, compliance,
            security-audit, or investment advice.
          </p>
        </PanelFooter>
      </Panel>
    </div>
  );
}

function AssumptionsPanel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'neutral' | 'accent' | 'caution';
}) {
  return (
    <Panel data-print="block">
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        {items.length === 0 ? (
          <p className="text-[0.8125rem] text-ink-faint">None recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span
                  className={cn(
                    'mt-[0.45rem] size-1 shrink-0',
                    tone === 'accent' && 'bg-ember',
                    tone === 'caution' && 'bg-caution',
                    tone === 'neutral' && 'bg-ink-ghost',
                  )}
                  aria-hidden="true"
                />
                <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

function ProvenanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="font-mono text-xs text-ink-dim">{value}</dd>
    </div>
  );
}
