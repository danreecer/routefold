import type { Metadata } from 'next';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { PrintButton } from '@/components/marketing/print-button';
import { CATEGORY_DEFINITIONS, FACTOR_DEFINITIONS, SCORING_VERSION } from '@/lib/scoring/types';
import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION, knowledgeBaseReviewedAt } from '@/lib/chains/knowledge-base';

export const metadata: Metadata = {
  title: 'Whitepaper',
  description:
    'Routefold whitepaper: the problem of multichain expansion decisions, the Multichain Digital Twin, a deterministic scoring engine with bounded model influence, and the limits of the approach.',
  alternates: { canonical: '/whitepaper' },
};

export const dynamic = 'force-static';

/* ── Structure ──────────────────────────────────────────────────────────── */

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'h3'; text: string };

type Chapter = { number: string; id: string; title: string; blocks: Block[] };

const ABSTRACT = `Teams building onchain products face a recurring decision with poor tooling: which ecosystem to expand to next. The decision is high-cost, hard to reverse, and usually made from a mixture of ecosystem marketing, incentive offers and whoever spoke to the team most recently. Routefold proposes a different basis for it. A product is first converted into an explicit structured model — a Multichain Digital Twin — and that model is then scored against a maintained knowledge base by a deterministic function whose every term is published. A language model is used for interpretation, sequencing and execution planning, but is architecturally prevented from writing a score beyond a bounded, justified and separately displayed adjustment. This paper describes the model, the scoring function, the pipeline, and what the approach cannot do.`;

const CHAPTERS: Chapter[] = [
  {
    number: '01',
    id: 'problem',
    title: 'The decision, and why it is made badly',
    blocks: [
      {
        kind: 'p',
        text: 'Deploying a product to a second chain is not a deployment. It is a new security surface, a new operational commitment, a second liquidity problem, and a permanent increase in the cost of every future change. The decision deserves the rigour of a hiring decision or an architecture review. In practice it usually gets less.',
      },
      {
        kind: 'p',
        text: 'Three failure modes recur. The first is incentive capture: a grant or liquidity-mining offer arrives, and the offer rather than the fit determines the destination. The second is availability bias: the team deploys where its own engineers already have context, which correlates with familiarity rather than with where the product’s users are. The third, and most damaging, is unstated criteria — the team never writes down what it is optimising for, so it cannot tell afterwards whether the decision was right or merely lucky.',
      },
      {
        kind: 'p',
        text: 'None of these are solved by more information. Ecosystem data is abundant and mostly public. What is missing is a structure that connects a specific product’s requirements to that data in a way a team can inspect and argue with.',
      },
    ],
  },
  {
    number: '02',
    id: 'twin',
    title: 'The Multichain Digital Twin',
    blocks: [
      {
        kind: 'p',
        text: 'The central construct is a structured representation of the product, built once and read by everything downstream. It records what the product is, what it requires from an execution environment, who uses it, what it cannot compromise on, and what the team can realistically execute.',
      },
      { kind: 'h3', text: 'Why an explicit model' },
      {
        kind: 'p',
        text: 'A system that reasons directly from prose to a recommendation produces an answer that can only be accepted or rejected wholesale. Interposing an explicit model changes the shape of the disagreement: a reader who thinks the recommendation is wrong can locate the specific field that is wrong, correct it, and see what moves. Disagreement becomes an edit rather than a rejection.',
      },
      {
        kind: 'p',
        text: 'It also makes the system’s ignorance legible. Every field the twin could not establish is recorded as missing data, surfaced in the report, and propagated into the confidence value attached to every score. A model that cannot represent its own gaps will fill them silently.',
      },
      { kind: 'h3', text: 'Provenance' },
      {
        kind: 'p',
        text: 'Each field carries a tag: derived from a retrieved source, supplied by the user, inferred by the model, or a documented default. User-supplied values always outrank retrieved ones when they conflict, because a public website is frequently out of date and the team is not. Inferred fields are the ones most worth reviewing, and the interface says so.',
      },
    ],
  },
  {
    number: '03',
    id: 'scoring',
    title: 'A deterministic scoring function',
    blocks: [
      {
        kind: 'p',
        text: `Chain-fit is computed by a pure function of the twin and the knowledge base. It allocates 100 points across ${CATEGORY_DEFINITIONS.length} categories and ${FACTOR_DEFINITIONS.length} sub-factors, applies objective-derived weighting, subtracts penalties for specific incompatibilities, and returns a complete factor-by-factor breakdown alongside the total.`,
      },
      { kind: 'h3', text: 'Bands, not point estimates' },
      {
        kind: 'p',
        text: 'Almost every knowledge-base field is a categorical band rather than a number. This is a deliberate accuracy claim, not a shortcut. Throughput, fee and liquidity figures move continuously; a pinned number is wrong within weeks while continuing to look authoritative, and false precision in an input propagates into false precision in the output. A band is defensible for longer and is honest about its own resolution.',
      },
      { kind: 'h3', text: 'Weighting and renormalisation' },
      {
        kind: 'p',
        text: 'Stated objectives tilt category allocations, and the result is renormalised to exactly 100. Without renormalisation, selecting more objectives would inflate scores and make runs incomparable. The applied weights are recorded in every report, so a score can be reproduced from the published function.',
      },
      { kind: 'h3', text: 'Hard constraints' },
      {
        kind: 'p',
        text: 'Some conditions are not matters of degree. An explicitly excluded ecosystem, an unsatisfiable virtual-machine requirement, and a data-availability layer proposed as a contract deployment target are all blockers: the score is zero, and the reason is attached. Treating these as heavy penalties rather than blockers would let a sufficiently attractive chain score its way past a constraint the user stated as absolute.',
      },
    ],
  },
  {
    number: '04',
    id: 'bounded-ai',
    title: 'Bounded model influence',
    blocks: [
      {
        kind: 'p',
        text: 'A language model is used for what it is good at: reading unstructured sources, explaining a numeric result in domain terms, identifying qualitative trade-offs, sequencing work, and drafting execution material. It is not used to produce the number.',
      },
      {
        kind: 'quote',
        text: 'The model may move a chain’s score by at most ±5 points, only with a written justification, and the adjustment is stored and displayed separately from the base score everywhere it appears.',
      },
      {
        kind: 'p',
        text: 'The clamp is enforced in the scoring layer rather than requested in the prompt, so it holds regardless of what the model returns. This is also the primary defence against prompt injection: retrieved page content is untrusted by construction, and the structural answer to "what if a page tries to influence the analysis" is that the influence available to it is bounded at five points and rendered visibly next to the base score.',
      },
      {
        kind: 'p',
        text: 'Every model response is a structured generation validated against a schema before it is used or stored. A response failing validation is retried with the specific validation error fed back; if it still fails, the stage reports an error rather than persisting malformed output.',
      },
    ],
  },
  {
    number: '05',
    id: 'pipeline',
    title: 'The staged pipeline',
    blocks: [
      {
        kind: 'p',
        text: 'Analysis runs as seven discrete stages rather than one large generation. Each has its own input contract, its own output schema and its own validation, which keeps every prompt short enough to reason about and makes a failure attributable to one stage.',
      },
      {
        kind: 'list',
        items: [
          'Project extraction — retrieved page text plus user answers to a validated factual profile.',
          'Digital Twin — profile plus constraints to the structured model everything else reads.',
          'Chain interpretation — twin plus deterministic scores to explanations, advantages, trade-offs and unknowns.',
          'Expansion sequence — ranked scores to a primary recommendation, secondaries, exclusions and rollout order.',
          'Architecture brief — deployment model, components, messaging, token model and monitoring.',
          'Risk register — security, liquidity, operational, governance, experience and compliance risks.',
          'Execution plan — four weeks with milestones, dependencies and acceptance criteria.',
        ],
      },
      {
        kind: 'p',
        text: 'Staging also enables section-level regeneration. A user who corrects the twin can regenerate the affected sections against stored upstream output rather than re-running the entire analysis, which makes iteration cheap enough to actually do.',
      },
      { kind: 'h3', text: 'Honest progress' },
      {
        kind: 'p',
        text: 'Stage transitions are recorded as durable events and streamed to the client. Progress advances only when a stage genuinely completes. There is no interpolation and no timer: if a stage takes ninety seconds, the interface shows it running for ninety seconds. A simulated progress bar is a small lie that teaches users to distrust every other number in the product.',
      },
    ],
  },
  {
    number: '06',
    id: 'confidence',
    title: 'Confidence as a first-class output',
    blocks: [
      {
        kind: 'p',
        text: 'Every score carries a separate confidence value derived from the knowledge base’s own confidence in that ecosystem, the number of factors that fell back to a documented default, and the confidence of the twin itself, less a penalty for each recorded gap.',
      },
      {
        kind: 'p',
        text: 'Confidence is bounded above by the confidence of the twin. A report cannot be more certain than its inputs, and a system that reports high confidence over an uncertain model of the product is reporting the confidence of its own arithmetic rather than of its conclusion.',
      },
      {
        kind: 'p',
        text: 'A high score with low confidence is a meaningful and common result: the recommendation is directionally supported but rests on assumptions worth verifying before committing engineering effort. Collapsing score and confidence into one number destroys that distinction.',
      },
    ],
  },
  {
    number: '07',
    id: 'limits',
    title: 'Limits',
    blocks: [
      {
        kind: 'p',
        text: 'Routefold reads what it is given and what it can retrieve from public URLs. It does not read the codebase, product analytics, the counterparty list or the treasury. For many products the decisive fact — how many existing users already hold assets on each candidate chain — is private, and the system does not have it.',
      },
      {
        kind: 'p',
        text: 'The knowledge base is a maintained human assessment, not a live feed. It carries a review date and a per-chain confidence level, and both are displayed. Where a live public figure genuinely improves a judgement it is fetched at runtime and always shown with its source, timestamp and whether it is live, cached or seeded.',
      },
      {
        kind: 'p',
        text: 'Scoring resolution is finite. The function separates large differences reliably and small ones not at all. Where two candidates fall within a few points, the correct output is that they are tied and the decision rests on evidence the system was not given — and reports are written to say so rather than to manufacture a winner.',
      },
      {
        kind: 'p',
        text: 'Routefold is not a smart-contract audit and is not a substitute for one. It does not provide financial, legal, compliance or investment advice; compliance items are framed as questions for qualified counsel.',
      },
    ],
  },
  {
    number: '08',
    id: 'position',
    title: 'What this is a bet on',
    blocks: [
      {
        kind: 'p',
        text: 'The prevailing pattern for applying language models to analytical work is to let the model produce the conclusion and then ask it to explain itself. The explanation is generated after the fact and is not causally connected to the answer, which makes it unfalsifiable — a plausible narrative that cannot be checked because there is nothing underneath it to check against.',
      },
      {
        kind: 'p',
        text: 'Routefold inverts that. A deterministic function produces the number, the model explains the function’s actual output, and the function is published so the explanation can be checked against it. The explanation is constrained by something real.',
      },
      {
        kind: 'p',
        text: 'The bet is that for consequential decisions, teams will prefer a system that shows its work and states its uncertainty over one that sounds more confident. The entire factor table is exposed for that reason: the goal is not to be believed, it is to be checkable.',
      },
    ],
  },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function WhitepaperPage() {
  return (
    <div className="pb-24">
      <header className="relative overflow-hidden border-b border-line">
        <div
          className="aurora aurora-ember right-[-8%] top-[-45%] h-[36rem] w-[36rem] opacity-40"
          aria-hidden="true"
        />
        <div className="grid-field field-mask-top absolute inset-0 opacity-60" aria-hidden="true" />

        <div className="shell relative py-16 md:py-24">
          <span className="eyebrow">Whitepaper</span>
          <h1 className="mt-5 max-w-4xl text-headline font-medium text-ink">
            Deterministic scoring with bounded model influence for multichain expansion decisions
          </h1>

          <div className="mt-7 flex flex-wrap gap-2">
            <Badge tone="ghost">Version 1.0</Badge>
            <Badge tone="ghost">Scoring engine v{SCORING_VERSION}</Badge>
            <Badge tone="ghost">
              Knowledge base v{KNOWLEDGE_BASE_VERSION} · reviewed {knowledgeBaseReviewedAt()}
            </Badge>
          </div>

          <div className="mt-8" data-print="hide">
            <PrintButton label="Print / save as PDF" icon={<Printer className="size-3.5" />} />
          </div>
        </div>
      </header>

      <article className="shell-narrow flex flex-col gap-14 py-16">
        {/* Abstract */}
        <section aria-labelledby="abstract">
          <h2 id="abstract" className="eyebrow">
            Abstract
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-dim">{ABSTRACT}</p>
        </section>

        <div className="rule-fade" aria-hidden="true" />

        {/* Contents */}
        <nav aria-label="Whitepaper contents" data-print="hide">
          <h2 className="eyebrow">Contents</h2>
          <ol className="mt-4 flex flex-col gap-2">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  className="flex items-baseline gap-4 text-[0.9375rem] text-ink-faint transition-colors hover:text-ink"
                >
                  <span data-numeric className="text-xs text-ink-ghost">
                    {chapter.number}
                  </span>
                  {chapter.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="rule-fade" aria-hidden="true" />

        {/* Chapters */}
        {CHAPTERS.map((chapter) => (
          <section key={chapter.id} id={chapter.id} className="scroll-mt-24" data-print="block">
            <div className="flex items-baseline gap-4">
              <span data-numeric className="text-xs text-ember-bright">
                {chapter.number}
              </span>
              <h2 className="text-title font-medium text-ink">{chapter.title}</h2>
            </div>

            <div className="mt-6 flex flex-col gap-5">
              {chapter.blocks.map((block, index) => {
                if (block.kind === 'h3') {
                  return (
                    <h3
                      key={`${chapter.id}-${index}`}
                      className="mt-2 text-[0.9375rem] font-medium text-ink"
                    >
                      {block.text}
                    </h3>
                  );
                }
                if (block.kind === 'quote') {
                  return (
                    <blockquote
                      key={`${chapter.id}-${index}`}
                      className="border-l-2 border-ember pl-5"
                    >
                      <p className="text-[1.0625rem] leading-relaxed text-ink">{block.text}</p>
                    </blockquote>
                  );
                }
                if (block.kind === 'list') {
                  return (
                    <ol key={`${chapter.id}-${index}`} className="flex flex-col gap-2.5">
                      {block.items.map((item, itemIndex) => (
                        <li key={item} className="flex gap-4">
                          <span data-numeric className="shrink-0 text-xs text-ink-ghost">
                            {String(itemIndex + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[0.9375rem] leading-relaxed text-ink-dim">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                return (
                  <p
                    key={`${chapter.id}-${index}`}
                    className="text-[0.9375rem] leading-relaxed text-ink-dim"
                  >
                    {block.text}
                  </p>
                );
              })}
            </div>
          </section>
        ))}

        <div className="rule-fade" aria-hidden="true" />

        {/* Appendix */}
        <section id="appendix" className="scroll-mt-24" data-print="block">
          <div className="flex items-baseline gap-4">
            <span data-numeric className="text-xs text-ember-bright">
              A
            </span>
            <h2 className="text-title font-medium text-ink">Appendix — scoring allocation</h2>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-line-strong">
                  <th scope="col" className="eyebrow py-2.5 pr-4 font-normal">
                    Category
                  </th>
                  <th scope="col" className="eyebrow py-2.5 pr-4 text-right font-normal">
                    Points
                  </th>
                  <th scope="col" className="eyebrow py-2.5 font-normal">
                    Sub-factors
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_DEFINITIONS.map((category) => {
                  const factors = FACTOR_DEFINITIONS.filter((f) => f.category === category.key);
                  return (
                    <tr key={category.key} className="border-b border-line-faint">
                      <td className="py-3 pr-4 text-[0.8125rem] font-medium text-ink">
                        {category.label}
                      </td>
                      <td data-numeric className="py-3 pr-4 text-right text-[0.8125rem] text-ink-dim">
                        {category.basePoints}
                      </td>
                      <td className="py-3 text-xs leading-relaxed text-ink-faint">
                        {factors.map((f) => f.label).join(' · ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-3 pr-4 text-[0.8125rem] font-medium text-ink">Total</td>
                  <td data-numeric className="py-3 pr-4 text-right text-[0.8125rem] font-medium text-ink">
                    100
                  </td>
                  <td className="py-3 text-xs text-ink-ghost">
                    {FACTOR_DEFINITIONS.length} sub-factors across {CHAIN_KNOWLEDGE_BASE.length}{' '}
                    modelled ecosystems
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-ink-ghost">
            The full definition of every factor, including its normalisation and the penalties that
            apply, is published at{' '}
            <Link href="/methodology" className="text-ember-bright underline underline-offset-4">
              /methodology
            </Link>
            . An analysis applying it end to end is at{' '}
            <Link href="/app/example" className="text-ember-bright underline underline-offset-4">
              /example
            </Link>
            .
          </p>
        </section>

        <Panel tone="quiet" data-print="block">
          <PanelBody>
            <p className="text-xs leading-relaxed text-ink-ghost">
              Routefold provides technical and strategic decision support. Outputs may contain
              incomplete assumptions and do not constitute financial, legal, compliance,
              security-audit, or investment advice.
            </p>
          </PanelBody>
        </Panel>
      </article>
    </div>
  );
}
