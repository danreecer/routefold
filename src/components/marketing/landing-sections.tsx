import Link from 'next/link';
import { ArrowRight, FileText, Globe } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle, SectionHeading } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ScoreBar } from '@/components/report/score-primitives';
import { CATEGORY_DEFINITIONS, FACTOR_DEFINITIONS } from '@/lib/scoring/types';
import type { ChainRecord } from '@/lib/chains/types';
import { ChainTile } from './chain-mark';
import { availableChainMarks } from '@/lib/chains/marks';
import { cn } from '@/lib/utils';

/**
 * Landing-page sections.
 *
 * Nothing on the public site is a fabricated analysis result. These previews are
 * rendered from the real methodology constants the scoring engine uses, so a
 * visitor sees the actual structure of the product rather than a sample report.
 * The worked example lives behind sign-in at /app/example.
 */

/* ── 1. Input to output ─────────────────────────────────────────────────── */

const PIPELINE = [
  {
    step: '01',
    title: 'Website and docs',
    body: 'Routefold retrieves readable public content from the URLs you submit, strips markup and scripts, and records what it could and could not read.',
  },
  {
    step: '02',
    title: 'Multichain Digital Twin',
    body: 'A structured model of your product: architecture, users, liquidity needs, transaction shape, security posture, constraints. You review and correct it before anything is scored.',
  },
  {
    step: '03',
    title: 'Expansion blueprint',
    body: 'Chain-by-chain scores with a full factor breakdown, a rollout sequence, an architecture brief, a risk register, and a 30-day plan.',
  },
];

export function InputToOutput() {
  return (
    <section className="shell border-t border-line py-24 md:py-32">
      <SectionHeading
        eyebrow="Input to output"
        title="Three steps, nothing hidden between them"
        description="Each stage produces an artefact you can inspect. If a source could not be read, you are told; if a field was inferred rather than found, it is marked."
      />

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {PIPELINE.map((entry, index) => (
          <div
            key={entry.step}
            className="frost frost-sheen relative rounded-[18px] p-7 md:p-8"
          >
            <div className="flex items-center gap-3">
              <span data-numeric className="text-xs text-ember-bright">
                {entry.step}
              </span>
              {index < PIPELINE.length - 1 ? (
                <ArrowRight className="size-3.5 text-ink-ghost" aria-hidden="true" />
              ) : null}
            </div>
            <h3 className="mt-5 text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
              {entry.title}
            </h3>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-faint">{entry.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 2. Digital Twin ────────────────────────────────────────────────────── */

const TWIN_FIELDS = [
  ['Product category', 'What it actually does'],
  ['Current architecture', 'Contracts, dependencies, offchain parts'],
  ['Current chains', 'Where it already runs'],
  ['Virtual machine', 'EVM, SVM, Move, CosmWasm'],
  ['Contract assumptions', 'Complexity, upgradeability'],
  ['User profile', 'Retail, institutional, developer'],
  ['Liquidity requirements', 'Depth and stablecoin dependency'],
  ['Transaction characteristics', 'Frequency, latency, finality'],
  ['Security sensitivity', 'Value at risk, audit status'],
  ['Orientation', 'Consumer or institutional'],
  ['Target geographies', 'Where growth is wanted'],
  ['Operational constraints', 'Team, budget, horizon'],
  ['Growth priorities', 'What the expansion is for'],
];

export function DigitalTwinSection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-shell py-24 md:py-32">
      <div
        className="aurora aurora-ember right-[-10%] top-[-20%] h-[34rem] w-[34rem] opacity-30"
        aria-hidden="true"
      />
      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The core model"
              title="Every score traces back to one structured model"
              description="Routefold does not reason about your product from a paragraph. It builds a Multichain Digital Twin — an explicit, editable model — and every downstream number is derived from it. When you change the twin, you can see exactly what moves."
            />
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-[0.4rem] size-1 shrink-0 bg-ember" aria-hidden="true" />
                <p className="text-[0.875rem] leading-relaxed text-ink-faint">
                  Fields derived from your sources are marked separately from fields you entered and
                  fields that were inferred.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-[0.4rem] size-1 shrink-0 bg-ember" aria-hidden="true" />
                <p className="text-[0.875rem] leading-relaxed text-ink-faint">
                  You confirm the twin before any chain is scored. Nothing is generated on top of a
                  model you have not agreed with.
                </p>
              </div>
            </div>
          </div>

          <Panel corners>
            <PanelHeader>
              <PanelTitle>Multichain Digital Twin</PanelTitle>
              <Badge tone="ghost">13 field groups</Badge>
            </PanelHeader>
            <PanelBody>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {TWIN_FIELDS.map(([label, hint]) => (
                  <div key={label} className="flex flex-col gap-1 border-b border-line-faint pb-3">
                    <dt className="text-[0.6875rem] uppercase tracking-[0.06em] text-ink-ghost">
                      {label}
                    </dt>
                    <dd className="text-[0.8125rem] text-ink-dim">{hint}</dd>
                  </div>
                ))}
              </dl>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ── 3. Chain scorecard ─────────────────────────────────────────────────── */

/**
 * Public-facing preview of the scoring mechanism.
 *
 * Driven entirely by the real methodology definitions — the same constants the
 * engine scores with — rather than by a sample analysis. Nothing on the public
 * site is a fabricated result; a visitor sees the actual structure of the
 * scoring function, and the worked application of it lives behind sign-in.
 */
export function ScorecardPreview() {
  const technical = CATEGORY_DEFINITIONS.find((c) => c.key === 'technical-compatibility');
  const technicalFactors = FACTOR_DEFINITIONS.filter(
    (f) => f.category === 'technical-compatibility',
  );

  return (
    <section className="shell border-t border-line py-24 md:py-32">
      <SectionHeading
        eyebrow="Chain scorecard"
        title="A score you can check line by line"
        description="100 points across five categories and seventeen documented sub-factors. Every point is attributable to a named factor with a written reason, and the model may adjust a total by at most ±5 points — with a justification, stored and displayed separately from the base."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel corners>
          <PanelHeader>
            <PanelTitle>How a total is composed</PanelTitle>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
              base · adj · final
            </span>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-6">
            {CATEGORY_DEFINITIONS.map((category) => (
              <div key={category.key} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.875rem] text-ink-dim">{category.label}</span>
                  <span data-numeric className="text-xs text-ink-faint">
                    {category.basePoints}
                    <span className="text-ink-ghost"> pts</span>
                  </span>
                </div>
                <ScoreBar value={category.basePoints} max={30} tone="accent" />
              </div>
            ))}

            <div className="rule-fade" aria-hidden="true" />

            <div className="flex flex-col gap-3">
              <p className="eyebrow">Then, and only then</p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="neutral">Deterministic base</Badge>
                <span className="text-ink-ghost" aria-hidden="true">
                  +
                </span>
                <Badge tone="accent">Model adjustment ±5 max</Badge>
                <span className="text-ink-ghost" aria-hidden="true">
                  =
                </span>
                <Badge tone="ghost">Final score</Badge>
              </div>
              <p className="text-xs leading-relaxed text-ink-ghost">
                The clamp is enforced in the scoring layer, not requested in a prompt, so it holds
                regardless of what the model returns.
              </p>
            </div>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{technical?.label} — the sub-factors</PanelTitle>
            <Badge tone="ghost">{technical?.basePoints} pts</Badge>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-5">
            <p className="text-[0.875rem] leading-relaxed text-ink-faint">
              {technical?.description}
            </p>
            {technicalFactors.map((factor) => (
              <div key={factor.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.8125rem] text-ink-dim">{factor.label}</span>
                  <span data-numeric className="text-xs text-ink-faint">
                    {factor.maxPoints}
                    <span className="text-ink-ghost"> pts</span>
                  </span>
                </div>
                <ScoreBar value={factor.maxPoints} max={technical?.basePoints ?? 20} tone="neutral" />
                <p className="text-xs leading-relaxed text-ink-ghost">{factor.description}</p>
              </div>
            ))}
          </PanelBody>
        </Panel>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORY_DEFINITIONS.map((category) => (
          <div key={category.key} className="frost rounded-[16px] p-5">
            <div className="flex items-baseline gap-2">
              <span data-numeric className="text-lg font-medium text-ink">
                {category.basePoints}
              </span>
              <span className="text-xs text-ink-ghost">pts</span>
            </div>
            <p className="mt-2 text-[0.8125rem] font-medium text-ink-dim">{category.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 4. Expansion map ───────────────────────────────────────────────────── */

const MAP_LEGEND = [
  {
    tone: 'bone',
    label: 'Your product',
    body: 'The origin node. Everything is measured relative to what you already run.',
  },
  {
    tone: 'positive',
    label: 'Current deployment',
    body: 'Scored for reference and excluded from the ranking — an existing chain is not an expansion target.',
  },
  {
    tone: 'violet',
    label: 'Recommended route',
    body: 'The highest-scoring candidate that is neither current nor blocked, with its rollout dependencies drawn.',
  },
  {
    tone: 'live',
    label: 'Secondary candidate',
    body: 'Strong alternatives, sequenced by dependency and marginal engineering cost rather than score alone.',
  },
  {
    tone: 'slate',
    label: 'Monitor',
    body: 'Viable but not yet justified under the stated constraints.',
  },
  {
    tone: 'critical',
    label: 'Blocked',
    body: 'Ruled out by a hard constraint — an excluded ecosystem or an unsatisfiable VM requirement — with the reason attached to the node.',
  },
];

export function ExpansionMapSection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-shell py-24 md:py-32">
      <div
        className="aurora aurora-amber left-[-8%] bottom-[-24%] h-[32rem] w-[32rem] opacity-30"
        aria-hidden="true"
      />
      <div className="shell relative">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Expansion map"
              title="The decision as a graph, not a list"
              description="Current deployments, the recommended route, secondary candidates and everything ruled out — with the reason attached to the node rather than left implicit. Pan, zoom and rearrange it in the report."
            />
            <Link
              href="/docs#report"
              className="mt-8 inline-flex items-center gap-2 text-sm text-ember-bright transition-colors hover:text-ember"
            >
              How to read the map
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <Panel className="overflow-hidden">
            <div className="grid-field-fine relative p-6">
              <div className="flex flex-col gap-2.5">
                {MAP_LEGEND.map((entry, index) => (
                  <div
                    key={entry.label}
                    className={cn(
                      'flex items-start gap-4 rounded-[14px] border bg-white/70 px-4 py-3.5 backdrop-blur-md',
                      entry.tone === 'violet'
                        ? 'border-ember/60'
                        : entry.tone === 'live'
                          ? 'border-marine/35'
                          : entry.tone === 'positive'
                            ? 'border-positive/35'
                            : entry.tone === 'critical'
                              ? 'border-critical/30 opacity-70'
                              : 'border-line',
                    )}
                    style={{ marginLeft: `${Math.min(index, 3) * 1.25}rem` }}
                  >
                    <span
                      className={cn(
                        'mt-[0.35rem] size-2 shrink-0',
                        entry.tone === 'bone' && 'bg-ink',
                        entry.tone === 'positive' && 'bg-positive',
                        entry.tone === 'violet' && 'bg-ember',
                        entry.tone === 'live' && 'bg-marine',
                        entry.tone === 'slate' && 'bg-stone',
                        entry.tone === 'critical' && 'bg-critical/70',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[0.8125rem] font-medium text-ink">{entry.label}</span>
                      <span className="text-xs leading-relaxed text-ink-ghost">{entry.body}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ── 5. Strategy to execution ───────────────────────────────────────────── */

const EXECUTION_OUTPUTS = [
  {
    title: 'Architecture brief',
    body: 'A deployment model with its reasoning, a component diagram, and specific positions on token model, messaging, state synchronisation, liquidity, indexing and monitoring. Assumptions are listed separately so you know what to verify.',
    items: ['Deployment model', 'Component diagram', 'Monitoring requirements', 'Stated assumptions'],
  },
  {
    title: 'Risk register',
    body: 'Filterable by category and severity. Every entry has a probability, an impact, a mitigation someone can own, and a suggested owner role. Compliance items are framed as questions for counsel, never as conclusions.',
    items: ['Security', 'Liquidity', 'Operational', 'Governance', 'User experience', 'Compliance'],
  },
  {
    title: '30-day plan',
    body: 'Four weeks with milestones, tasks across engineering, product, ecosystem and operations tracks, dependencies between them, and acceptance criteria that are objectively checkable.',
    items: ['Weekly milestones', 'Task dependencies', 'Acceptance criteria', 'Launch dependencies'],
  },
];

export function StrategyToExecution() {
  return (
    <section className="shell border-t border-line py-24 md:py-32">
      <SectionHeading
        eyebrow="From strategy to execution"
        title="A recommendation is not a deliverable"
        description="Knowing which chain is only useful if you also know what to build, what can go wrong, and what happens in the first month."
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {EXECUTION_OUTPUTS.map((output) => (
          <Panel key={output.title} corners>
            <PanelHeader>
              <PanelTitle>{output.title}</PanelTitle>
            </PanelHeader>
            <PanelBody className="flex flex-col gap-5">
              <p className="text-[0.875rem] leading-relaxed text-ink-faint">{output.body}</p>
              <ul className="flex flex-wrap gap-1.5">
                {output.items.map((item) => (
                  <li key={item}>
                    <Badge tone="ghost">{item}</Badge>
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Panel>
        ))}
      </div>
    </section>
  );
}

/* ── 6. Methodology ─────────────────────────────────────────────────────── */

export function MethodologySection() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-shell py-24 md:py-32">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <SectionHeading
            eyebrow="Methodology"
            title="The model does not choose the number"
            description="Chain-fit scores come from a deterministic engine that runs before any language model sees the problem. It normalises your inputs, applies the priorities you selected, penalises hard incompatibilities, and returns a factor-by-factor breakdown with a confidence value and a record of what data was missing."
          >
            <Link
              href="/methodology"
              className="mt-2 inline-flex items-center gap-2 text-sm text-ember-bright transition-colors hover:text-ember"
            >
              Read the full methodology
              <ArrowRight className="size-3.5" />
            </Link>
          </SectionHeading>

          <div className="flex flex-col divide-y divide-line">
            {[
              {
                label: 'Deterministic engine',
                body: 'Computes the 0–100 base score from documented factors. Same inputs always produce the same number.',
                tone: 'violet',
              },
              {
                label: 'Model interpretation',
                body: 'Explains the score, identifies advantages, trade-offs and unknowns, and may propose an adjustment of at most ±5 points with a written justification.',
                tone: 'live',
              },
              {
                label: 'Displayed separately',
                body: 'Base score, adjustment, final score, confidence and missing-data warnings all appear together. You always see what the engine computed and what the model moved.',
                tone: 'bone',
              },
            ].map((entry) => (
              <div key={entry.label} className="py-6 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'size-1.5',
                      entry.tone === 'violet' && 'bg-ember',
                      entry.tone === 'live' && 'bg-marine',
                      entry.tone === 'bone' && 'bg-ink',
                    )}
                    aria-hidden="true"
                  />
                  <p className="text-[0.9375rem] font-medium text-ink">{entry.label}</p>
                </div>
                <p className="mt-2 pl-[1.125rem] text-[0.875rem] leading-relaxed text-ink-faint">
                  {entry.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 7. Final CTA ───────────────────────────────────────────────────────── */

export function FinalCta() {
  return (
    <section className="relative px-3 pb-3 pt-0 md:px-5 md:pb-5">
      <div className="sunset-field relative overflow-hidden rounded-[26px] md:rounded-[34px]">
        <div
          className="aurora aurora-ember animate-drift left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 opacity-55"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-3 rounded-[20px] border border-white/45 md:inset-5 md:rounded-[26px]"
          aria-hidden="true"
        />
        <div className="shell relative py-28 md:py-36">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 text-center">
            <span className="eyebrow text-ember-deep">Free during private beta</span>
            <h2 className="text-headline font-semibold text-ink">Find your next chain.</h2>
            <p className="max-w-lg text-lede text-ink-dim">
              Paste your product. Review the model Routefold builds of it. Get a blueprint your
              engineering team can act on.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href="/app/new">
                  Analyze a product
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/whitepaper">
                  <FileText />
                  Read the whitepaper
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Ecosystem coverage ─────────────────────────────────────────────────── */

/**
 * Ecosystem coverage grid.
 *
 * Marks are original geometric glyphs from `ChainMark`, not third-party logos —
 * see that file for the reasoning and for how to drop in a licensed asset.
 */
export function CoverageStrip({ chains }: { chains: ChainRecord[] }) {
  // Official assets are picked up from public/brand/chains at build time.
  const marks = availableChainMarks();
  const usingOfficial = marks.size > 0;

  return (
    <section className="relative overflow-hidden border-y border-line bg-white/55 py-14 backdrop-blur-sm md:py-16">
      <div className="shell relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="eyebrow flex items-center gap-2 text-ember-deep">
              <Globe className="size-3.5" aria-hidden="true" />
              Ecosystems modelled
            </span>
            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Every candidate is scored against the same factor table, with its own data-confidence
              level and review date.
            </p>
          </div>
          <Link
            href="/methodology#knowledge-base"
            className="inline-flex items-center gap-2 text-[0.8125rem] text-ember-deep transition-colors hover:text-ember"
          >
            See the knowledge base
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {chains.map((chain) => (
            <ChainTile key={chain.slug} chain={chain} markSrc={marks.get(chain.slug)} />
          ))}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-ghost">
          {usingOfficial
            ? 'Ecosystem names and logos are shown for identification only. All marks belong to their respective owners, and their use here implies no affiliation or endorsement.'
            : 'Marks shown are Routefold’s own geometric glyphs, grouped by execution environment. Ecosystem names are used for identification only and imply no affiliation or endorsement.'}
        </p>
      </div>
    </section>
  );
}
