import 'server-only';

/**
 * Server-side environment access.
 *
 * Nothing in this module may be imported from a client component — the
 * `server-only` guard turns that into a build error rather than a leaked secret.
 *
 * The application is designed to boot with an incomplete environment so the
 * public marketing site and the built-in example still work. Feature
 * availability is reported through `capabilities()` and surfaced honestly in the
 * UI instead of crashing or silently degrading.
 */

function str(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function int(name: string, fallback: number): number {
  const raw = str(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = str(name)?.toLowerCase();
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test' || process.env.VITEST === 'true',

  databaseUrl: str('DATABASE_URL'),

  clerkPublishableKey: str('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
  clerkSecretKey: str('CLERK_SECRET_KEY'),

  openaiApiKey: str('OPENAI_API_KEY'),
  openaiModel: str('OPENAI_MODEL'),
  openaiMaxTokens: int('OPENAI_MAX_TOKENS', 8000),
  aiStageTimeoutMs: int('AI_STAGE_TIMEOUT_MS', 120_000),

  reportGenerationLimit: int('REPORT_GENERATION_LIMIT', 5),
  sectionRegenerationLimit: int('SECTION_REGENERATION_LIMIT', 25),

  appUrl: str('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',

  defillamaEnabled: bool('DEFILLAMA_ENABLED', true),
  chainDataCacheTtlSeconds: int('CHAIN_DATA_CACHE_TTL_SECONDS', 21_600),

  fetchTimeoutMs: int('FETCH_TIMEOUT_MS', 12_000),
  fetchMaxBytes: int('FETCH_MAX_BYTES', 2_000_000),
  fetchMaxRedirects: int('FETCH_MAX_REDIRECTS', 3),
  allowPrivateNetworkFetch: bool('ALLOW_PRIVATE_NETWORK_FETCH', false),

  fixtureMode: bool('ROUTEFOLD_FIXTURE_MODE', false),

  rateLimitAnalysisPerHour: int('RATE_LIMIT_ANALYSIS_PER_HOUR', 10),
  rateLimitFetchPerHour: int('RATE_LIMIT_FETCH_PER_HOUR', 40),
} as const;

export type Capabilities = {
  /** Clerk is configured; authenticated routes are usable. */
  auth: boolean;
  /** DATABASE_URL is present; persistence is available. */
  database: boolean;
  /** OpenAI key + model are present; live analysis is available. */
  liveAi: boolean;
  /** Deterministic fixture pipeline is explicitly enabled for local testing. */
  fixtureAi: boolean;
  /** Any analysis pipeline is usable at all. */
  analysis: boolean;
};

export function capabilities(): Capabilities {
  const auth = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
  const database = Boolean(env.databaseUrl);
  const liveAi = Boolean(env.openaiApiKey && env.openaiModel);
  const fixtureAi = env.fixtureMode;
  return {
    auth,
    database,
    liveAi,
    fixtureAi,
    analysis: database && (liveAi || fixtureAi),
  };
}

/**
 * The mode a given analysis run will use. Fixture output is *never* substituted
 * for a failed live call — if `liveAi` is available, a failure surfaces as an
 * error rather than falling back to fixtures.
 */
export function generationMode(): 'live' | 'fixture' | 'unavailable' {
  const caps = capabilities();
  if (caps.liveAi) return 'live';
  if (caps.fixtureAi) return 'fixture';
  return 'unavailable';
}

/** Absolute URL builder that tolerates a missing/odd NEXT_PUBLIC_APP_URL. */
export function absoluteUrl(pathname: string): string {
  const base = env.appUrl.replace(/\/+$/, '');
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}

/**
 * Fails loudly at boot in production when something essential is missing.
 * Called from instrumentation so misconfiguration is caught on deploy, not on
 * the first user request.
 */
export function assertProductionEnv(): string[] {
  if (!env.isProduction) return [];
  const problems: string[] = [];
  if (!env.databaseUrl) problems.push('DATABASE_URL is not set.');
  if (!env.clerkPublishableKey) problems.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.');
  if (!env.clerkSecretKey) problems.push('CLERK_SECRET_KEY is not set.');
  if (!env.openaiApiKey) problems.push('OPENAI_API_KEY is not set — live analysis is disabled.');
  if (!env.openaiModel) problems.push('OPENAI_MODEL is not set — live analysis is disabled.');
  if (!str('NEXT_PUBLIC_APP_URL')) problems.push('NEXT_PUBLIC_APP_URL is not set — share links will be relative.');
  if (env.allowPrivateNetworkFetch) {
    problems.push('ALLOW_PRIVATE_NETWORK_FETCH is true in production. This disables SSRF protection.');
  }
  return problems;
}
