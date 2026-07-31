/**
 * Test stub for the `server-only` package.
 *
 * The real module throws when imported outside a React Server Component bundle.
 * Unit tests import server modules directly, so this no-op replaces it. The
 * import guard itself is kept in source, where it does its actual job of turning
 * an accidental client import into a build error.
 */
export {};
