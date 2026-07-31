# Architecture

How Routefold is put together, and why.

---

## The central claim

Most systems that apply a language model to analytical work let the model produce
the conclusion and then ask it to explain itself. The explanation is generated
after the fact and is not causally connected to the answer, which makes it
unfalsifiable.

Routefold inverts that. A **deterministic function** produces the number, the
model **explains that function's actual output**, and the function is published
so the explanation can be checked against it.

Everything below follows from that decision.

---

## Layers

```
 Browser
   │  wizard (client) ── NDJSON stream ──┐
   ▼                                     │
 Route handlers  (src/app/api)           │  honest per-stage progress
   │  auth → quota → rate limit → guard  │
   ▼                                     │
 Pipeline  (src/lib/ai/pipeline.ts) ─────┘
   ├── retrieval   (src/lib/retrieval)   SSRF-hardened fetch + text extraction
   ├── AI stages   (src/lib/ai/stages)   7 schema-validated generations
   ├── scoring     (src/lib/scoring)     pure function, no I/O, no model
   └── knowledge   (src/lib/chains)      categorical bands + live enrichment
   ▼
 PostgreSQL via Prisma
```

---

## The scoring engine

`src/lib/scoring/engine.ts` is a pure function:

```
(DigitalTwin, ChainRecord[], weights) → ChainScoreResult[]
```

No I/O, no randomness, no model call. Same inputs always produce the same
numbers, which is what makes the scorecard checkable and the tests meaningful.

- **100 points** across 5 categories and 17 sub-factors, each with a `maxPoints`
  and a computer that returns a normalised 0–1 value plus a written reason.
- **Objective weighting** tilts category allocations, then renormalises to
  exactly 100 so the scale never inflates.
- **Hard blockers** (excluded ecosystem, unsatisfiable VM requirement, a DA layer
  proposed as a contract target) force the score to 0 with a reason attached.
- **Penalties** subtract from the weighted total for specific incompatibilities.
- **Confidence** is a separate value, weighted toward the twin's own confidence.
  A report cannot be more certain than its inputs.

The AI clamp lives here too:

```ts
applyAiAdjustment(base, proposed, hasJustification) // ±5, or 0 without a reason
```

Enforced in code, not requested in a prompt, so it holds regardless of what the
model returns. This is also the structural answer to prompt injection: text on a
retrieved page cannot move a recommendation by more than five visible points.

## The knowledge base

`src/lib/chains/knowledge-base.ts` — 15 ecosystems, hand-reviewed, with a review
date, a data-confidence level and public references per entry.

Almost every field is a **categorical band**, not a number. Throughput, fee and
liquidity figures move continuously; a pinned figure is wrong within weeks while
still looking authoritative. A unit test asserts no exact metrics leak into the
seeded data. Live figures are fetched at runtime from a public source and always
carry source, timestamp and live/cached/seeded status.

## The pipeline

Seven stages, each with its own schema and validation, rather than one large
prompt. Split across two phases so the user can correct the model before it
commits to numbers:

**Phase 1 — prepare** (`POST /api/analyses/[id]/prepare`)
retrieve sources → extract profile → build twin → `AWAITING_REVIEW`

**Phase 2 — generate** (`POST /api/analyses/[id]/generate`)
score → interpret → sequence → architecture → risks → plan → finalise → `COMPLETED`

Every model response is a forced tool call whose input schema is derived from the
Zod schema the caller needs, then re-validated with that same schema. A failure
is retried with the specific validation error fed back; if it still fails, the
stage errors rather than persisting malformed data.

### Honest progress

Stage transitions write an `AnalysisEvent` row *and* emit a stream event.
Progress advances only when a stage genuinely completes — there is no timer and
no interpolation. A client that reconnects can reconstruct exactly where things
stand from the event log.

The transport is newline-delimited JSON over `POST` (read manually via
`ReadableStream`) rather than `EventSource`, because `EventSource` cannot issue a
POST and the same-origin guard depends on it.

## Retrieval

`src/lib/retrieval/` behind a provider interface so a hosted crawler can be
dropped in; the built-in provider is complete and is the default.

- `url-guard.ts` — protocol, credential, port and address classification. Pure
  and dependency-free so it can be exhaustively unit-tested.
- `fetcher.ts` — DNS re-validation, manual redirect handling with per-hop
  re-validation, streaming byte ceiling, wall-clock timeout, content-type
  allow-list.
- `extract.ts` — HTML → plain text without ever building a DOM. Input is hostile
  by definition; output is text only and is never rendered as HTML.

See `SECURITY.md` for the full control list.

## Data model

`prisma/schema.prisma`. The rule the schema encodes: every row belonging to a
person is reachable from `UserProfile.clerkUserId`, and every query filters by
the resolved owner id. An entity id from a URL is never sufficient.

Notable choices:

- `deterministicScore` and `aiAdjustment` are **separate columns**, so the UI can
  always show what the engine computed versus what the model moved.
- `Analysis.idempotencyKey` is unique per user, so a duplicate submit resolves to
  one analysis and one quota unit — enforced by the database, not just a check.
- `AnalysisEvent` is append-only and drives the progress UI.
- `ReportSection` is unique per `(analysisId, sectionType)` and versioned, so a
  regeneration is an upsert with an incrementing version.

## The report view model

Three very different sources — the built-in example, an owner's database-backed
analysis, and a public share token — all converge on one `ReportModel`
(`src/lib/report-model.ts`). The report components are written once, so a change
cannot be applied inconsistently across the three surfaces.

Stored sections are **re-validated on read**. A section written by an older
schema version that no longer parses renders as absent rather than as if it were
current.

## Design system

`src/app/globals.css` defines the whole visual language as tokens: surfaces,
type, one ember accent, one marine contrast, hairlines, frost recipes and ambient
gradient fields. Components consume semantic tokens (`ink`, `paper`, `ember`,
`frost`), never raw hex, which is what made the dark→light redesign a token
change rather than a rewrite.

`Panel` is the single structural container, with a `tone` scale
(`frost` / `lifted` / `accent` / `quiet` / `solid`) so depth comes from one place.

## Testing

- **Unit** — scoring engine, URL guard, schemas, quota, extraction, knowledge
  base. No database, no network, no model.
- **Integration** — real PostgreSQL: cascades, uniqueness, idempotency, and that
  a query scoped to one user cannot reach another's rows.
- **E2E** — Playwright smoke tests that hold with no credentials configured,
  including a hydration assertion and route-protection checks.

The suite clears `OPENAI_API_KEY` in setup, so no test can make a paid call.

One test deserves special mention: `example report integrity` asserts that the
example's narrative recommendation matches the engine's top-ranked chain. If the
prose ever contradicts the arithmetic, the build fails.
