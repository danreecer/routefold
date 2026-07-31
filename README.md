# Routefold

**Model the next chain before you move.**

AI multichain expansion intelligence for onchain products. Paste your product and
receive a transparent, chain-by-chain expansion blueprint covering ecosystem fit,
architecture, risks, and execution.

---

## What it does

Routefold turns a product description into a decision document:

1. Retrieves readable public content from the URLs you submit (SSRF-hardened).
2. Extracts a **Multichain Digital Twin** — an explicit, editable model of the
   product: architecture, users, liquidity needs, transaction shape, security
   posture, constraints.
3. You review and correct the twin. Nothing is scored until you confirm it.
4. A **deterministic scoring engine** scores every ecosystem: 100 points across
   5 categories and 17 documented sub-factors, with hard blockers and penalties.
5. A language model explains the scores and may adjust any total by **at most
   ±5 points**, with a written justification, stored and displayed separately.
6. It then produces an expansion sequence, architecture brief, risk register,
   30-day plan, technical brief, and a sources-and-assumptions record.

The methodology is published at `/methodology`; the whitepaper at `/whitepaper`.

## What it is not

Not a chatbot, a bridge, a block explorer, a wallet tracker, or a trading
terminal. It is not a substitute for a professional smart-contract audit and does
not provide financial, legal, compliance or investment advice.

> Routefold provides technical and strategic decision support. Outputs may
> contain incomplete assumptions and do not constitute financial, legal,
> compliance, security-audit, or investment advice.

---

## Quick start

```bash
pnpm install
cp .env.example .env
```

Start the embedded database in one terminal (real PostgreSQL, no system install
required — Postgres compiled to WASM behind a wire-protocol socket):

```bash
pnpm dev:db
```

Then in a second terminal:

```bash
pnpm db:migrate   # apply migrations
pnpm db:seed      # chain-metric snapshot only; creates no demo rows
pnpm dev          # http://localhost:3000
```

The public site, the methodology, the whitepaper and the docs work with no
credentials at all. For the authenticated application you need Clerk; for live
analysis you need an Anthropic key. See **Environment** below.

> **Use `localhost`, not `127.0.0.1`, in development.** Next's dev server treats
> requests for `/_next/*` from a host it did not bind as cross-origin and blocks
> them, which silently prevents hydration. `allowedDevOrigins` in
> `next.config.ts` covers the loopback aliases, but `localhost` is the path of
> least resistance.

---

## Environment

Copy `.env.example` and fill it in. Every variable is documented inline there.

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Persistence | PostgreSQL. Append `?pgbouncer=true&connection_limit=1` for the embedded dev engine or a transaction pooler. |
| `DIRECT_DATABASE_URL` | Migrations | Non-pooled URL. Same as `DATABASE_URL` on a single instance. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY` | Auth | Never exposed to the client. |
| `ANTHROPIC_API_KEY` | Live analysis | [console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | Live analysis | Configuration, never hardcoded in source. |
| `NEXT_PUBLIC_APP_URL` | Share links, sitemap, OG | Absolute origin, no trailing slash. |
| `REPORT_GENERATION_LIMIT` | Quota | Defaults to 5 during private beta. |
| `ROUTEFOLD_FIXTURE_MODE` | Local dev | Deterministic pipeline with no model call. Always labelled in the UI. |

Missing configuration degrades honestly: the public site keeps working and each
authenticated surface explains exactly which variables it needs.

---

## Operating modes

**Production** — Clerk, PostgreSQL and Anthropic configured. Real analysis, real
persistence.

**Fixture** — `ROUTEFOLD_FIXTURE_MODE=true` with no Anthropic key. The wizard and
report flow are fully exercisable; chain scores are genuine deterministic engine
output, narrative sections are templated. Every report is labelled as fixture
output in the interface and stored with `modelName="fixture"`.

Fixture output is **never** substituted for a failed live call. If a live call
fails, the analysis reports the failure.

---

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm dev:db` | Embedded PostgreSQL on `127.0.0.1:5433` |
| `pnpm build` | Production build (runs `prisma generate` first) |
| `pnpm start` | Serve the production build |
| `pnpm db:migrate` | Apply migrations (development) |
| `pnpm db:deploy` | Apply migrations (production) |
| `pnpm db:seed` | Seed the external-data snapshot |
| `pnpm db:studio` | Prisma Studio |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit + integration (Vitest) |
| `pnpm test:unit` | Unit tests only — no database needed |
| `pnpm test:e2e` | Playwright smoke tests |
| `pnpm verify` | typecheck + lint + test |

---

## Project structure

```
src/
  app/
    (marketing)/        Landing, docs, whitepaper, methodology, security, legal
    (auth)/             Custom-styled Clerk sign-in and sign-up
    app/                Authenticated application
    share/[token]/      Public read-only report
    api/                Route handlers
  components/
    ui/                 Panel, Button, Field, primitives — the design system
    marketing/          Landing sections, hero visualisation, founder spotlight
    app-shell/          Sidebar, command palette, report list
    wizard/             Five-step analysis wizard
    report/             Scorecard, expansion map, architecture, risks, plan
  lib/
    chains/             Chain knowledge base + live data enrichment
    scoring/            Deterministic scoring engine (pure, unit-tested)
    ai/                 Client, prompts, staged pipeline, fixtures
    retrieval/          SSRF-hardened fetcher + HTML extraction
    schemas/            Zod contracts for every external and AI value
    example/            The built-in worked example
  content/
    founder.ts          Founder spotlight content
prisma/                 Schema, migrations, seed
tests/                  unit / integration / e2e
launch-kit/             Brand assets and submission material
```

## Further reading

- `ARCHITECTURE.md` — how the pipeline, scoring engine and data model fit together
- `DEPLOYMENT.md` — production deployment
- `SECURITY.md` — threat model and implemented controls
- `/methodology` — the published scoring methodology
- `/whitepaper` — the design argument behind it

---

## Ecosystem logos

Routefold ships no third-party logo assets. Drop an official SVG at
`public/brand/chains/<slug>.svg` and it is detected at build time and used
automatically — see `public/brand/chains/README.md`. Until then the coverage grid
renders Routefold's own geometric glyphs.

## Licence

Private beta. All rights reserved.
