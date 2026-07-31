import type { Metadata } from 'next';
import Link from 'next/link';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { ScoreBar } from '@/components/report/score-primitives';
import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION, knowledgeBaseReviewedAt } from '@/lib/chains/knowledge-base';
import { BAND_LABEL, COST_LABEL, FINALITY_LABEL, SECURITY_MODEL_LABEL } from '@/lib/chains/types';
import { CATEGORY_DEFINITIONS, FACTOR_DEFINITIONS, SCORING_VERSION } from '@/lib/scoring/types';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How Routefold computes chain-fit scores: a deterministic 100-point engine across five categories and seventeen documented sub-factors, with a bounded model adjustment shown separately.',
  alternates: { canonical: '/methodology' },
};

export const dynamic = 'force-static';

export default function MethodologyPage() {
  return (
    <div className="pb-24">
      <header className="border-b border-line">
        <div className="shell py-14 md:py-20">
          <span className="eyebrow">Methodology</span>
          <h1 className="mt-5 max-w-3xl text-headline font-medium text-ink">
            How a chain-fit score is produced
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-dim">
            Routefold&rsquo;s scores are computed by a deterministic engine before any language
            model is involved. This page documents every category, every sub-factor, every hard
            constraint, and the exact limits placed on model influence.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge tone="ghost">Scoring engine v{SCORING_VERSION}</Badge>
            <Badge tone="ghost">Knowledge base v{KNOWLEDGE_BASE_VERSION}</Badge>
            <Badge tone="ghost">Reviewed {knowledgeBaseReviewedAt()}</Badge>
          </div>
        </div>
      </header>

      <div className="shell flex flex-col gap-20 py-16">
        {/* ── Principles ── */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <h2 className="text-title font-medium text-ink">Three rules</h2>
          <div className="flex flex-col gap-8">
            <Principle
              index="01"
              title="The model does not choose the number"
              body="A deterministic function maps the Digital Twin and the chain knowledge base to a 0–100 score. It is pure: the same inputs always produce the same result, with no randomness and no model call. Every point is attributable to a named sub-factor with a written reason."
            />
            <Principle
              index="02"
              title="Model influence is bounded and visible"
              body="The model explains the score, identifies advantages, trade-offs and unknowns, and may propose an adjustment. That adjustment is clamped to ±5 points regardless of what it returns, requires a written justification to apply at all, is stored in a separate column, and is displayed next to the base score everywhere a score appears."
            />
            <Principle
              index="03"
              title="Missing data lowers confidence rather than being guessed"
              body="When a factor has no input, it scores on a documented neutral default and is flagged. Each flag lowers the confidence value shown beside the score, and the specific gap is listed in the report. Routefold does not fill a gap with a plausible-looking number."
            />
          </div>
        </section>

        {/* ── Category allocation ── */}
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="text-title font-medium text-ink">The 100 points</h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Five categories with a fixed base allocation. Your selected objectives tilt these
              weights, and the result is renormalised back to exactly 100 so the scale never
              inflates.
            </p>
          </div>

          <div className="flex flex-col divide-y divide-line">
            {CATEGORY_DEFINITIONS.map((category) => {
              const factors = FACTOR_DEFINITIONS.filter((factor) => factor.category === category.key);
              return (
                <div key={category.key} className="py-8 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h3 className="text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
                      {category.label}
                    </h3>
                    <span className="flex items-baseline gap-1.5">
                      <span data-numeric className="text-xl font-medium text-ember-bright">
                        {category.basePoints}
                      </span>
                      <span className="text-xs text-ink-ghost">base points</span>
                    </span>
                  </div>

                  <ScoreBar value={category.basePoints} max={30} tone="accent" className="mt-3 max-w-lg" />

                  <p className="mt-4 max-w-3xl text-[0.875rem] leading-relaxed text-ink-faint">
                    {category.description}
                  </p>

                  <ul className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
                    {factors.map((factor) => (
                      <li key={factor.key} className="border-l border-line pl-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[0.8125rem] font-medium text-ink-dim">
                            {factor.label}
                          </span>
                          <span data-numeric className="shrink-0 text-xs text-ink-faint">
                            {factor.maxPoints} pts
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-ghost">
                          {factor.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Weighting ── */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <h2 className="text-title font-medium text-ink">Objective weighting</h2>
          <div className="flex flex-col gap-6">
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Each objective you select applies a tilt to one or more categories. Your primary
              objective counts double. The combined tilt is divided by the total objective weight, so
              selecting many objectives produces a balanced profile rather than a compounded
              distortion. The tilted allocations are then renormalised to sum to 100.
            </p>
            <Panel>
              <PanelHeader>
                <PanelTitle>Worked example</PanelTitle>
              </PanelHeader>
              <PanelBody className="flex flex-col gap-4">
                <p className="text-[0.875rem] leading-relaxed text-ink-faint">
                  A product selecting <strong className="text-ink-dim">lower transaction costs</strong>{' '}
                  as its primary objective and <strong className="text-ink-dim">user growth</strong>{' '}
                  as a secondary one moves points toward cost and operational fit and toward users
                  and liquidity, and away from the categories neither objective touches. Technical
                  compatibility keeps its base allocation in absolute terms but represents a smaller
                  share of a fixed 100 points.
                </p>
                <p className="text-[0.875rem] leading-relaxed text-ink-faint">
                  The exact weights used are recorded in every report&rsquo;s factor table, under the
                  deterministic score row.
                </p>
              </PanelBody>
            </Panel>
          </div>
        </section>

        {/* ── Hard constraints ── */}
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="text-title font-medium text-ink">Hard constraints and penalties</h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Some conditions are not a matter of degree. A hard blocker zeroes the score outright; a
              penalty subtracts from the weighted total.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader>
                <PanelTitle>Hard blockers — score forced to zero</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <ul className="flex flex-col gap-4">
                  <ConstraintItem
                    title="Excluded by you"
                    body="An ecosystem you explicitly excluded in the constraints step is never recommended, regardless of how it would otherwise score."
                  />
                  <ConstraintItem
                    title="Virtual-machine incompatible"
                    body="When you set a hard VM requirement, chains that cannot satisfy it are blocked. A chain offering a compatible deployment path — for example Solidity support without being natively EVM — is not blocked, but scores lower on compatibility."
                  />
                  <ConstraintItem
                    title="Not a deployment target"
                    body="A data-availability layer is not somewhere application contracts deploy. It is blocked for every product category except infrastructure, with the reason stated."
                  />
                </ul>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Penalties — points subtracted</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <ul className="flex flex-col gap-4">
                  <ConstraintItem title="Security model below requirement" body="−8 points. Critical security sensitivity against a sidechain or shared-security trust model." />
                  <ConstraintItem title="Rewrite exceeds horizon" body="−9 points. A time horizon measured in weeks against a target requiring a full contract rewrite." />
                  <ConstraintItem title="Operational burden above capacity" body="−7 points. High or very high operational complexity against a solo or small team." />
                  <ConstraintItem title="Cost above budget" body="−6 points. Minimal budget sensitivity against moderate or high transaction costs." />
                  <ConstraintItem title="Liquidity below requirement" body="−5 points. The product depends on deep liquidity and the ecosystem does not have it." />
                  <ConstraintItem title="Insufficient data for value at risk" body="−4 points. Very high value at risk against low-confidence ecosystem data." />
                </ul>
              </PanelBody>
            </Panel>
          </div>
        </section>

        {/* ── Confidence ── */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <h2 className="text-title font-medium text-ink">Confidence</h2>
          <div className="flex flex-col gap-5">
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Confidence is a separate number from the score. A chain can score highly with low
              confidence — that combination means the recommendation rests on assumptions you should
              verify before acting.
            </p>
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              It is derived from three inputs: how confident the knowledge-base record for that chain
              is, how many factors had to fall back to a neutral default, and how confident the
              Digital Twin extraction itself was. The specific gaps are listed under each chain in the
              scorecard rather than summarised into the number alone.
            </p>
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              A report&rsquo;s overall confidence is the score-weighted mean of its top candidates,
              so a weak long tail does not drag down a well-supported recommendation.
            </p>
          </div>
        </section>

        {/* ── Knowledge base ── */}
        <section id="knowledge-base" className="scroll-mt-24 flex flex-col gap-8">
          <div>
            <h2 className="text-title font-medium text-ink">The chain knowledge base</h2>
            <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Almost every field is a categorical band rather than an exact figure. This is
              deliberate. Throughput, fee and liquidity numbers move constantly, and any figure
              pinned into a knowledge base would be wrong within weeks while continuing to look
              authoritative. Bands are defensible and honest about their own precision. Where a live
              figure genuinely helps, it is fetched from a public source at runtime and always
              displayed with its source, its timestamp, and whether it is live, cached or seeded.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line-strong">
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">Chain</th>
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">VM</th>
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">Finality</th>
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">Cost</th>
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">Security model</th>
                  <th scope="col" className="eyebrow py-3 pr-4 font-normal">Stablecoins</th>
                  <th scope="col" className="eyebrow py-3 font-normal">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {CHAIN_KNOWLEDGE_BASE.map((chain) => (
                  <tr key={chain.slug} className="border-b border-line-faint">
                    <td className="py-3 pr-4 text-[0.8125rem] font-medium text-ink">{chain.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-ink-faint">
                      {chain.executionEnvironment}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-faint">{FINALITY_LABEL[chain.finality]}</td>
                    <td className="py-3 pr-4 text-xs text-ink-faint">
                      {COST_LABEL[chain.transactionCost]}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-faint">
                      {SECURITY_MODEL_LABEL[chain.securityModel]}
                    </td>
                    <td className="py-3 pr-4 text-xs text-ink-faint">
                      {BAND_LABEL[chain.stablecoinLiquidity]}
                    </td>
                    <td className="py-3 text-xs">
                      <span
                        className={
                          chain.dataConfidence === 'high'
                            ? 'text-positive'
                            : chain.dataConfidence === 'medium'
                              ? 'text-caution'
                              : 'text-critical'
                        }
                      >
                        {chain.dataConfidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Pipeline ── */}
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="text-title font-medium text-ink">The analysis pipeline</h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Seven stages, each with its own schema and its own validation. A stage that returns
              something invalid is retried with the validation error fed back; if it still fails, the
              analysis reports which stage failed rather than persisting malformed output.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Project extraction', 'Retrieved page text plus your answers → a validated factual profile.'],
              ['Digital Twin', 'Profile plus constraints → the structured model everything else reads from.'],
              ['Chain interpretation', 'Twin plus deterministic scores → explanation, advantages, trade-offs, unknowns.'],
              ['Expansion sequence', 'Ranked scores → primary, secondary, ruled out, and a rollout order.'],
              ['Architecture brief', 'Deployment model, components, messaging, token model, monitoring.'],
              ['Risk register', 'Security, liquidity, operational, governance, UX and compliance risks.'],
              ['Execution plan', 'Four weeks with milestones, tasks, dependencies and acceptance criteria.'],
              ['Finalisation', 'Executive summary, technical brief, and the sources and assumptions record.'],
            ].map(([title, body], index) => (
              <li key={title} className="frost frost-sheen rounded-[16px] p-6">
                <span data-numeric className="text-xs text-ember-bright">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-[0.9375rem] font-medium text-ink">{title}</h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-faint">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Limits ── */}
        <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <h2 className="text-title font-medium text-ink">What this does not do</h2>
          <div className="flex flex-col gap-5">
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              Routefold reads what you give it and what it can retrieve from public URLs. It does not
              read your codebase, your analytics, your counterparty list or your cap table. It cannot
              know how many of your users already hold assets on a given chain, and it does not
              pretend to.
            </p>
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              It is not a substitute for a professional smart-contract audit, and it does not provide
              financial, legal, compliance or investment advice. Compliance items in every report are
              framed as questions to put to qualified counsel.
            </p>
            <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
              The scores are a structured argument, not an answer. The reason the entire factor table
              is exposed is so you can disagree with a specific line rather than with the number.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href="/app/example"
                className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-line-strong px-5 text-sm text-ink transition-colors hover:border-ink-ghost hover:bg-raised"
              >
                See it applied to an example
              </Link>
              <Link
                href="/security"
                className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-line-strong px-5 text-sm text-ink transition-colors hover:border-ink-ghost hover:bg-raised"
              >
                Security posture
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Principle({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="border-l border-line pl-6">
      <span data-numeric className="text-xs text-ember-bright">
        {index}
      </span>
      <h3 className="mt-2 text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-faint">{body}</p>
    </div>
  );
}

function ConstraintItem({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="text-[0.8125rem] font-medium text-ink-dim">{title}</span>
      <span className="text-xs leading-relaxed text-ink-ghost">{body}</span>
    </li>
  );
}
