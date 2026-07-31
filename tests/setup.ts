/**
 * Shared test setup.
 *
 * The important guarantee here: the test suite never makes a paid API call.
 * OPENAI_API_KEY is cleared and fixture mode is forced, so any code path that
 * reaches the AI layer either uses the deterministic fixture pipeline or throws
 * a configuration error — it can never silently bill.
 */
import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.OPENAI_API_KEY = '';
  process.env.ROUTEFOLD_FIXTURE_MODE = 'true';
  process.env.OPENAI_MODEL = '';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.REPORT_GENERATION_LIMIT = process.env.REPORT_GENERATION_LIMIT ?? '5';
  process.env.SECTION_REGENERATION_LIMIT = process.env.SECTION_REGENERATION_LIMIT ?? '25';
});
