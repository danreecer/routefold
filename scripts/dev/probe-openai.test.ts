import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { generateStructured, modelName } from '@/lib/ai/client';

/**
 * Live check of the OpenAI structured-output path.
 *
 * Opt-in only — run with:
 *   pnpm exec vitest run --config vitest.probe.config.ts
 *
 * It makes one real, small request so that a misconfigured model or a
 * schema-format problem surfaces here rather than mid-analysis.
 */
describe('openai integration', () => {
  it('returns schema-valid structured output', async () => {
    const schema = z.object({
      chainSlug: z.string().min(1),
      rationale: z.string().min(10).max(400),
      advantages: z.array(z.string().min(1)).min(2).max(3),
      score: z.number().int().min(0).max(100),
    });

    const result = await generateStructured({
      stage: 'probe',
      system: 'You are a test harness. Return only the requested JSON object.',
      prompt:
        'Chain slug "base". Give a one-sentence rationale about EVM compatibility, exactly two advantages, and the integer 77 as the score.',
      schema,
      toolName: 'probe_result',
      toolDescription: 'A minimal structured result used to verify the integration.',
      maxTokens: 600,
    });

    console.log('  model    :', modelName());
    console.log('  attempts :', result.attempts);
    console.log('  tokens   :', result.usage);
    console.log('  data     :', JSON.stringify(result.data));

    expect(result.data.chainSlug).toBeTruthy();
    expect(result.data.advantages.length).toBeGreaterThanOrEqual(2);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });
});
