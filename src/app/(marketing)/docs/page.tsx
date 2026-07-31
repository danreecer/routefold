import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { CATEGORY_DEFINITIONS, SCORING_VERSION } from '@/lib/scoring/types';
import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION } from '@/lib/chains/knowledge-base';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'How to use Routefold: the analysis wizard, the Digital Twin, reading a chain scorecard, regenerating sections, sharing and exporting, and the API surface.',
  alternates: { canonical: '/docs' },
};

export const dynamic = 'force-static';

/* ── Content model ──────────────────────────────────────────────────────── */

type DocSection = {
  id: string;
  title: string;
  blurb: string;
  body: Array<{ heading?: string; paragraphs?: string[]; list?: string[]; code?: string }>;
};

const SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blurb: 'What Routefold needs from you, and what it gives back.',
    body: [
      {
        paragraphs: [
          'Routefold turns a product description into a chain-by-chain expansion blueprint. You supply a public URL and a short set of answers about your constraints; it retrieves what it can read, builds a structured model of your product, scores every ecosystem in its knowledge base against that model, and writes the strategy and execution material around the result.',
          'The whole run takes a few minutes. The only step that needs your attention in the middle is confirming the Digital Twin — everything downstream is derived from it, so correcting it there is the highest-leverage thing you can do.',
        ],
      },
      {
        heading: 'What you need',
        list: [
          'A public website or documentation URL for the product. If neither can be read, a written description of at least 40 characters works instead.',
          'An idea of your constraints: team size, time horizon, budget sensitivity, security sensitivity, and any ecosystem that is off the table.',
          'An account. Analyses are private to your account and are never used to train anything.',
        ],
      },
      {
        heading: 'What you get',
        list: [
          'A Multichain Digital Twin — the structured model of your product.',
          'A chain scorecard: every candidate scored 0–100 with a full factor breakdown.',
          'An expansion map and rollout sequence with dependencies.',
          'An architecture brief, a risk register, a 30-day plan and an engineering handoff.',
          'A sources-and-assumptions record showing exactly what the analysis was working from.',
        ],
      },
    ],
  },
  {
    id: 'wizard',
    title: 'The analysis wizard',
    blurb: 'Five steps. Everything autosaves; you can leave and come back.',
    body: [
      {
        heading: 'Step 1 — Source',
        paragraphs: [
          'Enter the product name and the URLs Routefold should read. Use the Check button to find out immediately whether a URL is readable — it returns the page title, the word count and a short excerpt, so you know what the analysis will actually be working from before you commit.',
          'Some sites render entirely client-side and return almost no readable text. Routefold tells you when that happens rather than silently proceeding on nothing. Paste a description instead; a good description outperforms an unreadable URL every time.',
        ],
      },
      {
        heading: 'Step 2 — Current state',
        paragraphs: [
          'Where the product runs today and what it is built on. Chains listed here are scored for reference but excluded from the expansion ranking — they are not expansion targets.',
          'The execution environment and contract languages drive the technical-compatibility category, which is worth 20 of the 100 points and is the difference between a redeployment and a rewrite.',
        ],
      },
      {
        heading: 'Step 3 — Objectives',
        paragraphs: [
          'What the expansion is for. Objectives tilt the scoring weights and the result is renormalised back to 100 points, so selecting more objectives produces a balanced profile rather than a bigger number. The primary objective counts double.',
        ],
      },
      {
        heading: 'Step 4 — Constraints',
        paragraphs: [
          'What is actually possible for your team. Constraints are the only inputs that can zero a score outright: an excluded ecosystem and a hard virtual-machine requirement are both hard blockers, applied by the engine and never softened by the model.',
          'Set a hard VM requirement only if a rewrite is genuinely off the table. It is the single most restrictive input in the wizard.',
        ],
      },
      {
        heading: 'Step 5 — Extracted profile',
        paragraphs: [
          'The Digital Twin, presented for review. Every field is editable and each is tagged with its provenance — whether it came from your sources, from your answers, or was inferred. The inferred fields are where errors live; those are the ones worth checking.',
          'Nothing is scored until you confirm. Saving without confirming costs nothing.',
        ],
      },
    ],
  },
  {
    id: 'twin',
    title: 'The Multichain Digital Twin',
    blurb: 'The single structured model every score is derived from.',
    body: [
      {
        paragraphs: [
          'Routefold does not reason about your product from a paragraph of prose. It builds an explicit model — category, architecture, users, liquidity requirements, transaction shape, security posture, orientation, geography and constraints — and the scoring engine reads only from that model.',
          'This is what makes the output checkable. If a score looks wrong, you can trace it to a factor, trace that factor to a twin field, and correct the field. If the model were implicit, you could only disagree with the conclusion.',
        ],
      },
      {
        heading: 'Provenance tags',
        list: [
          'From source — established from the page text Routefold retrieved.',
          'You entered — taken directly from your wizard answers. These always outrank the sources when they conflict.',
          'Inferred — derived from the product category and mechanics. Most worth reviewing.',
          'Default — no input was available, so a documented neutral value was used. These lower the confidence score.',
        ],
      },
      {
        heading: 'Editing after generation',
        paragraphs: [
          'The twin remains visible in the finished report. If you change something material, regenerate the affected sections rather than the whole report — section regeneration costs a smaller usage unit.',
        ],
      },
    ],
  },
  {
    id: 'scorecard',
    title: 'Reading a chain scorecard',
    blurb: 'Base score, model adjustment, final score — always shown together.',
    body: [
      {
        paragraphs: [
          'Each row expands to the complete factor table: every sub-factor, the points it awarded out of the points available, and the reason the engine recorded. Penalties and hard blockers appear where they applied, with their cost.',
        ],
      },
      {
        heading: 'The three numbers',
        list: [
          'Base score — computed by the deterministic engine. The model cannot write this.',
          'Adjustment — a bounded change the model may propose, clamped to ±5 points and only applied when accompanied by a written justification.',
          'Final score — the sum, clamped to 0–100.',
        ],
      },
      {
        heading: 'Confidence is a separate number',
        paragraphs: [
          'A chain can score highly with low confidence. That combination means the recommendation rests on assumptions worth verifying before acting — not that the score is wrong. Confidence is bounded above by the confidence of the Digital Twin itself: a report cannot be more certain than its own inputs.',
        ],
      },
      {
        heading: 'Margins',
        paragraphs: [
          'Treat gaps of a few points as ties. The engine resolves large differences reliably and small ones not at all, and the report says so where it matters. When two chains are close, the decision should turn on information Routefold was not given.',
        ],
      },
    ],
  },
  {
    id: 'report',
    title: 'Working with a report',
    blurb: 'Regenerating, comparing, sharing and exporting.',
    body: [
      {
        heading: 'Section regeneration',
        paragraphs: [
          'Any narrative section can be regenerated on its own. Downstream sections read the current stored versions of their inputs, so regenerating the architecture brief uses the stored expansion sequence rather than re-running the whole pipeline. Regenerate in dependency order — sequence, then architecture, then risks, then plan.',
        ],
      },
      {
        heading: 'Comparison',
        paragraphs: [
          'Select two to four chains to compare category shape, factor-level points, and the underlying knowledge-base characteristics side by side. The characteristics table is usually more decisive than the charts: it shows why the chains differ rather than that they differ.',
        ],
      },
      {
        heading: 'Sharing',
        paragraphs: [
          'A share link grants read-only access to one report through a token with 256 bits of entropy. Share pages never expose your email address, your account, your other projects or any internal log. Revoking takes effect immediately, and only one link is active per report so revocation is unambiguous.',
        ],
      },
      {
        heading: 'Exporting',
        list: [
          'PDF — opens your browser print dialogue against a print-optimised layout. Choose "Save as PDF".',
          'JSON — the complete structured report including the full factor breakdown for every chain. Suitable for archiving or for feeding into your own tooling.',
        ],
      },
    ],
  },
  {
    id: 'limits',
    title: 'Limits and honest boundaries',
    blurb: 'What Routefold does not know, and does not claim.',
    body: [
      {
        paragraphs: [
          'Routefold reads what you give it and what it can retrieve from public URLs. It does not read your codebase, your analytics, your counterparty list or your treasury. It cannot know how many of your users already hold assets on a given chain — which, for many products, is the single most decisive fact.',
          'It is not a substitute for a professional smart-contract audit, and it does not provide financial, legal, compliance or investment advice. Compliance items in every report are framed as questions to put to qualified counsel.',
        ],
      },
      {
        heading: 'Usage during private beta',
        list: [
          'Five complete report generations per account.',
          'Twenty-five section regenerations per account.',
          'A generation is consumed only when a report reaches completion — failed runs cost nothing.',
          'The public example consumes nothing and needs no account.',
        ],
      },
    ],
  },
  {
    id: 'self-hosting',
    title: 'Running Routefold yourself',
    blurb: 'The application is a standard Next.js app with a documented environment.',
    body: [
      {
        paragraphs: [
          'Routefold runs anywhere Next.js runs. It needs PostgreSQL for persistence, Clerk for authentication and an Anthropic API key for live analysis. The public site and the example report work without any of them.',
        ],
      },
      {
        heading: 'Local development',
        code: `pnpm install
cp .env.example .env

pnpm dev:db      # embedded PostgreSQL, no system install needed
pnpm db:migrate  # apply migrations
pnpm db:seed     # chain-metric snapshot only — no demo rows
pnpm dev`,
      },
      {
        heading: 'Operating modes',
        paragraphs: [
          'With an Anthropic key configured, analysis is live. Without one, setting ROUTEFOLD_FIXTURE_MODE=true enables a deterministic fixture pipeline so the full wizard and report flow can be exercised locally. Fixture output is always labelled as fixture output in the interface and is never substituted for a failed live call.',
        ],
      },
      {
        heading: 'Further reading',
        list: [
          'README.md — setup and command reference.',
          'ARCHITECTURE.md — how the pipeline, scoring engine and data model fit together.',
          'DEPLOYMENT.md — production deployment on Vercel and elsewhere.',
          'SECURITY.md — the threat model and the controls implemented against it.',
        ],
      },
    ],
  },
];

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  return (
    <div className="pb-24">
      <header className="relative overflow-hidden border-b border-line">
        <div
          className="aurora aurora-ember left-[-6%] top-[-40%] h-[32rem] w-[32rem] opacity-45"
          aria-hidden="true"
        />
        <div className="shell relative py-14 md:py-20">
          <span className="eyebrow">Documentation</span>
          <h1 className="mt-5 max-w-3xl text-headline font-medium text-ink">
            How to use Routefold
          </h1>
          <p className="mt-5 max-w-2xl text-lede text-ink-dim">
            The wizard, the Digital Twin, reading a scorecard, and what the product deliberately
            does not claim to know.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Badge tone="ghost">Scoring engine v{SCORING_VERSION}</Badge>
            <Badge tone="ghost">
              {CHAIN_KNOWLEDGE_BASE.length} ecosystems · knowledge base v{KNOWLEDGE_BASE_VERSION}
            </Badge>
            <Badge tone="ghost">{CATEGORY_DEFINITIONS.length} scoring categories</Badge>
          </div>
        </div>
      </header>

      <div className="shell grid gap-12 py-14 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Documentation sections" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-1">
            <p className="eyebrow mb-2">Contents</p>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border-l border-line px-3 py-1.5 text-[0.8125rem] text-ink-faint transition-colors hover:border-ink-ghost hover:text-ink-dim"
              >
                {section.title}
              </a>
            ))}
            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
              <Link
                href="/methodology"
                className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
              >
                Methodology →
              </Link>
              <Link
                href="/whitepaper"
                className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
              >
                Whitepaper →
              </Link>
              <Link
                href="/app/example"
                className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
              >
                Example report →
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex min-w-0 flex-col gap-14">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex flex-col gap-2">
                <h2 className="text-title font-medium text-ink">{section.title}</h2>
                <p className="text-[0.9375rem] text-ink-faint">{section.blurb}</p>
              </div>

              <div className="mt-7 flex flex-col gap-7">
                {section.body.map((block, index) => (
                  <div key={`${section.id}-${index}`} className="flex flex-col gap-3">
                    {block.heading ? (
                      <h3 className="text-[0.9375rem] font-medium text-ink">{block.heading}</h3>
                    ) : null}

                    {block.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 40)}
                        className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim"
                      >
                        {paragraph}
                      </p>
                    ))}

                    {block.list ? (
                      <ul className="flex max-w-3xl flex-col gap-2.5">
                        {block.list.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span
                              className="mt-[0.5rem] size-1 shrink-0 bg-ember"
                              aria-hidden="true"
                            />
                            <span className="text-[0.9375rem] leading-relaxed text-ink-dim">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {block.code ? (
                      <Panel tone="quiet" className="max-w-3xl overflow-x-auto">
                        <pre className="px-4 py-3.5 font-mono text-[0.75rem] leading-relaxed text-ink-dim">
                          {block.code}
                        </pre>
                      </Panel>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <Panel corners tone="accent">
            <PanelHeader>
              <PanelTitle>Ready to run one?</PanelTitle>
            </PanelHeader>
            <PanelBody className="flex flex-col gap-4">
              <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
                Read the example report first if you want to see the output format before spending a
                generation. It needs no account and consumes nothing.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/app/new"
                  className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-ink px-5 text-sm font-medium text-shell transition-colors hover:bg-white"
                >
                  Analyze a product
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/app/example"
                  className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-line-strong px-5 text-sm text-ink transition-colors hover:border-ink-ghost"
                >
                  Open the example
                </Link>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}
