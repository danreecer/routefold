# Security

Routefold fetches URLs that arbitrary users submit and feeds the result to a
language model. Both are hostile inputs by definition. This document describes
the threat model and the implemented controls.

This is a description of implemented controls, not a claim of certification,
accreditation, or a completed third-party assessment. Routefold is in private
beta.

---

## Threat model

| Threat | Control |
| --- | --- |
| SSRF via submitted URL | Multi-stage URL guard + DNS re-validation + per-hop redirect validation |
| Prompt injection from a fetched page | Untrusted-content delimiters, explicit prompt instruction, and a structural ±5 clamp on model influence |
| Horizontal privilege escalation | Every query filters by the resolved owner id; no id-only lookups |
| Share-token enumeration | 256 bits of CSPRNG entropy; identical response for unknown / revoked / expired |
| Secret exposure to the client | `server-only` import guard turns an accidental client import into a build error |
| CSRF | POST/PATCH/DELETE + JSON content type + `sec-fetch-site` check |
| Resource exhaustion | Byte ceilings, wall-clock timeouts, request-size limits, rate limits, quota |
| Malformed model output | Zod validation on write and on read; retry with the validation error; error rather than persist |

---

## Server-side request forgery

`src/lib/retrieval/url-guard.ts` is pure and dependency-free so it can be
exhaustively unit-tested. Every control below has explicit test coverage in
`tests/unit/url-guard.test.ts`.

**Before any network access:**

- `http` and `https` only. Every other scheme is refused.
- URLs containing embedded credentials are refused.
- Only ports 80, 443, 8080, 8443 are permitted.
- **IPv4**: loopback, `10/8`, `172.16/12`, `192.168/16`, link-local
  (`169.254/16`, which includes the cloud metadata endpoint), CGNAT `100.64/10`,
  and every reserved block are refused.
- **IPv6**: loopback, `::`, link-local `fe80::/10`, unique-local `fc00::/7`,
  multicast `ff00::/8`, NAT64 `64:ff9b::/96`, and IPv4-mapped forms such as
  `::ffff:127.0.0.1` are refused.
- Decimal, octal and hex integer encodings of an IPv4 address are refused.
- Internal hostnames (`localhost`, `metadata.google.internal`,
  `kubernetes.default.svc`, …), internal-only suffixes (`.local`, `.internal`,
  `.cluster.local`, …) and any single-label hostname are refused.

**During the request:**

- The hostname is resolved and **every returned address is re-checked**, so a
  public hostname with a private A record is refused. This is the classic bypass.
- Redirects are followed manually and **every hop is validated from scratch**,
  up to a strict limit.
- Wall-clock timeout with `AbortController`.
- Hard byte ceiling enforced **while streaming**, not after buffering.
- Content-type allow-list. Binary and unsupported types are refused, not parsed.

`ALLOW_PRIVATE_NETWORK_FETCH` relaxes only the address classification, never the
protocol, credential or port rules. It exists for testing against a localhost
fixture server and is reported as a problem by `assertProductionEnv()`.

## Handling retrieved content

Retrieved HTML is never turned into a DOM and nothing in it is ever executed.
Scripts, styles, iframes, embedded objects, forms and navigation chrome are
stripped, remaining markup is removed, and the output is plain text. Nothing
retrieved is rendered back as HTML anywhere in the product — there is no
`dangerouslySetInnerHTML` in the codebase.

## Prompt injection

A fetched page can contain text designed to look like an instruction. Two
defences, in order of importance:

**Structural.** The model cannot write a score. Scores come from a deterministic
function that never sees retrieved text as anything but input to a fixed
computation. The model's only numeric influence is an adjustment clamped to ±5
points *in code*, requiring a written justification, stored in a separate column
and displayed next to the base score. Injected text cannot move a recommendation
beyond that visible bound.

**Instructional.** Every retrieved document is wrapped in explicit delimiters
marking it as untrusted data, and every system prompt states that instructions
found inside those delimiters must be ignored and never followed.

## Authorisation

An entity id from a URL or request body is never sufficient to reach a row. Every
read and every write resolves the authenticated subject first, then filters by
the owning user id (`requireOwnedProject`, `requireOwnedAnalysis`). There is no
code path that loads a project or report by id alone on behalf of a signed-in
user.

A forbidden resource returns **404, not 403** — confirming existence would leak
that an id is real.

Route protection is resource-based rather than path-matched: `/app/*` is gated in
its layout, API routes gate in each handler, and ownership is enforced in the
query. A path matcher can diverge from how Next.js actually routes a request; the
data layer cannot.

## Sharing

Share tokens are 32 bytes from the OS CSPRNG, base64url-encoded — 256 bits.

`loadSharedReport` is the only path that returns report data without an
authenticated owner check, so it selects fields **explicitly** rather than
spreading a row. Owner identity, Clerk id, email, other projects and internal
logs are structurally unreachable through it.

One active link per analysis, so revocation is unambiguous and immediate.
Unknown, revoked, expired and incomplete tokens all produce the same response.

## Model output

Every model response is a forced tool call validated against a Zod schema before
use or storage. A response failing validation is retried with the specific
validation error fed back; if it still fails, the stage reports an error rather
than persisting malformed data. Stored sections are re-validated on read, so a
schema change cannot render stale data as if it were current.

## Secrets and transport

- `server-only` is imported by every module holding secrets, so an accidental
  client import is a build error rather than a leak.
- API keys and the database URL exist only in the server environment.
- Internal errors are logged server-side; the browser receives a typed error code
  and a plain-language message — no stack trace, no upstream detail.
- Every response carries a Content-Security-Policy with `frame-ancestors 'none'`
  and `object-src 'none'`, plus `nosniff`, a strict referrer policy, a
  restrictive permissions policy and HSTS.
- Mutating endpoints require a JSON content type and reject cross-origin
  `sec-fetch-site`, which a cross-site form post cannot satisfy without a
  preflight the browser will block.

## Quota and abuse

Report generations and section regenerations are counted in the database and
incremented **only after work completes**, so a failed run costs nothing and the
client cannot influence the count. Analysis creation is idempotent on a
per-user-unique key enforced by a database constraint, so a duplicate submit
cannot consume two units.

## Honest operating modes

Production mode uses the configured model. Local fixture mode uses a
deterministic pipeline and labels every report accordingly. **Fixture output is
never substituted for a failed live call** — if a live call fails, the analysis
reports the failure rather than returning templated content that resembles a real
analysis.

## Reporting an issue

Please report security issues privately rather than disclosing publicly, and
allow time for a fix before disclosure.
