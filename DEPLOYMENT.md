# Deployment

Routefold is a standard Next.js App Router application. It needs PostgreSQL,
Clerk and an Anthropic API key. The public site works without any of them.

---

## 1. Database

Any PostgreSQL 14+ instance works. Neon, Supabase and Vercel Postgres are all
fine.

Set **two** URLs:

```bash
# Pooled — used by the application at runtime.
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true&connection_limit=1"

# Direct, non-pooled — used only by `prisma migrate`. DDL cannot run through a
# transaction pooler.
DIRECT_DATABASE_URL="postgresql://user:pass@direct-host/db?sslmode=require"
```

On a single-instance database both can be the same value.

Apply migrations and seed:

```bash
pnpm db:deploy
pnpm db:seed
```

`db:seed` inserts only the external-data snapshot placeholder. It creates no
users, projects or reports — every account starts genuinely empty.

## 2. Clerk

Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app
```

Add your production domain in the Clerk dashboard before going live. Routefold
ships its own styled sign-in and sign-up screens at `/sign-in` and `/sign-up`.

## 3. Anthropic

```bash
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5"
```

`ANTHROPIC_MODEL` is deliberately configuration rather than a hardcoded string,
so the model can be changed without a code deploy. Leave
`ROUTEFOLD_FIXTURE_MODE` unset (or `false`) in production.

## 4. Application

```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"   # absolute, no trailing slash
REPORT_GENERATION_LIMIT=5
```

`NEXT_PUBLIC_APP_URL` is used for share links, canonical tags, the sitemap and
Open Graph metadata. Getting it wrong produces broken share links.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. **Import** the project in Vercel. Framework preset: Next.js. Root directory:
   the repository root.
3. **Build command**: leave the default. `pnpm build` runs `prisma generate`
   first, which Vercel's build cache would otherwise skip.
4. **Environment variables**: add every variable from `.env.example` for the
   Production environment (and Preview if you use it).
5. **Deploy.**
6. **Run migrations** — Vercel builds do not run them automatically:

   ```bash
   DATABASE_URL="<direct url>" pnpm db:deploy
   DATABASE_URL="<direct url>" pnpm db:seed
   ```

   Run these from a machine that can reach the database, or as a one-off Vercel
   job. Use the *direct* URL, not the pooled one.
7. **Verify**: open `/` and `/methodology` (should render), `/app` (should
   redirect to sign-in), and `/robots.txt` (should disallow `/app/`, `/api/`
   and `/share/`).

### Function limits

`maxDuration = 300` is set on the analysis routes. On Vercel this needs a plan
that permits 300-second functions; on Hobby, reduce it or the pipeline will be
cut off mid-run. The pipeline writes progress events durably, so an interrupted
run can be resumed from the Digital Twin review step rather than restarted.

## Deploying elsewhere

Nothing is Vercel-specific.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:deploy
pnpm start          # listens on $PORT, default 3000
```

Node 20.11+ is required. Put a TLS-terminating proxy in front; the app sets HSTS
and `upgrade-insecure-requests` and assumes HTTPS in production.

---

## Operational notes

**Rate limiting** is per-process, in memory (`src/lib/rate-limit.ts`). On a
multi-instance deployment the effective limit is per instance. It exists to stop
one client hammering the expensive endpoints — the database-backed quota in
`src/lib/quota.ts` is the real ceiling and is unaffected by instance count. To
make rate limits global, replace the token bucket with a shared store; the module
is small and has a single exported surface.

**External data.** `DEFILLAMA_ENABLED=true` enriches the knowledge base with
public TVL data, cached for `CHAIN_DATA_CACHE_TTL_SECONDS`. If the source is
unavailable, the last valid snapshot is used and displayed as cached. No outbound
call carries user data.

**Boot checks.** `assertProductionEnv()` reports missing production configuration
so misconfiguration surfaces on deploy rather than on the first user request.

**`ALLOW_PRIVATE_NETWORK_FETCH` must stay `false` in production.** It disables
private-network blocking in the URL guard and exists only for testing against a
localhost fixture server.

## Post-deploy checklist

- [ ] `/` renders with the hero gradient
- [ ] `/methodology` and `/whitepaper` render
- [ ] `/app` redirects to `/sign-in` when signed out
- [ ] Sign-up completes and lands on `/app`
- [ ] A share link opens in a private window; revoking it takes effect immediately
- [ ] `/robots.txt` disallows `/app/`, `/api/`, `/share/`
- [ ] `/sitemap.xml` lists only public pages
- [ ] Response headers include CSP with `frame-ancestors 'none'`
- [ ] Settings → Deployment configuration shows "Live analysis"
