import { describe, expect, it } from 'vitest';
import {
  chainInterpretationSchema,
  executionPlanSchema,
  executiveSummarySchema,
  riskRegisterSchema,
  REGENERATABLE_SECTIONS,
} from '@/lib/schemas/report';
import { digitalTwinSchema } from '@/lib/schemas/twin';
import {
  DEFAULT_WIZARD_INPUT,
  createAnalysisRequestSchema,
  wizardInputStrictSchema,
} from '@/lib/schemas/wizard';
import { EXAMPLE_TWIN } from '@/lib/example/twin';

describe('digitalTwinSchema', () => {
  it('accepts the example twin', () => {
    expect(digitalTwinSchema.safeParse(EXAMPLE_TWIN).success).toBe(true);
  });

  it('rejects an out-of-range confidence', () => {
    expect(digitalTwinSchema.safeParse({ ...EXAMPLE_TWIN, confidence: 140 }).success).toBe(false);
    expect(digitalTwinSchema.safeParse({ ...EXAMPLE_TWIN, confidence: -1 }).success).toBe(false);
  });

  it('requires at least one objective', () => {
    expect(digitalTwinSchema.safeParse({ ...EXAMPLE_TWIN, objectives: [] }).success).toBe(false);
  });

  it('rejects an unknown product category', () => {
    expect(
      digitalTwinSchema.safeParse({ ...EXAMPLE_TWIN, productCategory: 'not-a-category' }).success,
    ).toBe(false);
  });

  it('strips nothing it validates — round-trips cleanly', () => {
    const parsed = digitalTwinSchema.parse(EXAMPLE_TWIN);
    expect(digitalTwinSchema.safeParse(parsed).success).toBe(true);
  });
});

describe('wizard input', () => {
  const valid = {
    ...DEFAULT_WIZARD_INPUT,
    productName: 'Test Product',
    websiteUrl: 'https://example.com',
  };

  it('accepts a complete input', () => {
    expect(wizardInputStrictSchema.safeParse(valid).success).toBe(true);
  });

  it('normalises a bare domain to https', () => {
    const parsed = wizardInputStrictSchema.parse({ ...valid, websiteUrl: 'example.com' });
    expect(parsed.websiteUrl).toBe('https://example.com');
  });

  it('rejects a product name that is too short', () => {
    expect(wizardInputStrictSchema.safeParse({ ...valid, productName: 'x' }).success).toBe(false);
  });

  it('requires the primary objective to be among the selected objectives', () => {
    const result = wizardInputStrictSchema.safeParse({
      ...valid,
      objectives: ['user-growth'],
      primaryObjective: 'liquidity',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('primaryObjective'))).toBe(true);
    }
  });

  it('rejects an ecosystem that is both preferred and excluded', () => {
    const result = wizardInputStrictSchema.safeParse({
      ...valid,
      preferredEcosystems: ['base'],
      excludedEcosystems: ['base'],
    });
    expect(result.success).toBe(false);
  });

  it('requires a source or a substantial description', () => {
    const noSource = wizardInputStrictSchema.safeParse({
      ...valid,
      websiteUrl: '',
      docsUrl: '',
      manualDescription: 'too short',
    });
    expect(noSource.success).toBe(false);

    const described = wizardInputStrictSchema.safeParse({
      ...valid,
      websiteUrl: '',
      docsUrl: '',
      manualDescription:
        'A lending protocol with isolated markets and an onchain liquidation engine, live on Ethereum.',
    });
    expect(described.success).toBe(true);
  });

  it('rejects a non-http protocol in a URL field', () => {
    expect(
      wizardInputStrictSchema.safeParse({ ...valid, websiteUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });
});

describe('createAnalysisRequestSchema', () => {
  const base = {
    input: { ...DEFAULT_WIZARD_INPUT, productName: 'Test', websiteUrl: 'https://example.com' },
    idempotencyKey: '3f7c8b0e-2a1d-4f6b-9c3e-8d5a1b2c4e6f',
  };

  it('accepts a well-formed request', () => {
    expect(createAnalysisRequestSchema.safeParse(base).success).toBe(true);
  });

  it('requires a UUID idempotency key', () => {
    expect(createAnalysisRequestSchema.safeParse({ ...base, idempotencyKey: 'abc' }).success).toBe(
      false,
    );
  });
});

describe('report section schemas', () => {
  it('clamps the interpretation adjustment range at the schema level', () => {
    const base = {
      chainSlug: 'base',
      rationale: 'because',
      advantages: ['a'],
      tradeoffs: ['b'],
    };
    expect(chainInterpretationSchema.safeParse({ ...base, adjustment: 4 }).success).toBe(true);
    expect(chainInterpretationSchema.safeParse({ ...base, adjustment: 6 }).success).toBe(false);
    expect(chainInterpretationSchema.safeParse({ ...base, adjustment: -6 }).success).toBe(false);
  });

  it('requires at least one advantage and one tradeoff', () => {
    expect(
      chainInterpretationSchema.safeParse({
        chainSlug: 'base',
        rationale: 'because',
        advantages: [],
        tradeoffs: ['b'],
      }).success,
    ).toBe(false);
  });

  it('requires the execution plan to have exactly four weeks', () => {
    const week = (n: number) => ({
      week: n,
      theme: 't',
      milestone: 'm',
      taskIds: ['T1'],
    });
    const tasks = Array.from({ length: 6 }, (_, i) => ({
      id: `T${i + 1}`,
      title: 'Task',
      track: 'engineering' as const,
      description: 'd',
      owner: 'Engineering',
      dependsOn: [],
      acceptanceCriteria: ['done'],
      effort: 'M' as const,
    }));

    expect(
      executionPlanSchema.safeParse({
        summary: 's',
        weeks: [week(1), week(2), week(3)],
        tasks,
      }).success,
    ).toBe(false);

    expect(
      executionPlanSchema.safeParse({
        summary: 's',
        weeks: [week(1), week(2), week(3), week(4)],
        tasks,
      }).success,
    ).toBe(true);
  });

  it('requires a minimum number of risks', () => {
    expect(
      riskRegisterSchema.safeParse({
        summary: 's',
        risks: [],
      }).success,
    ).toBe(false);
  });

  it('bounds executive summary confidence to 0–100', () => {
    const base = {
      recommendedChainSlug: 'base',
      headline: 'h',
      rationale: 'r',
      mainOpportunity: 'o',
      mainRisk: 'k',
      suggestedTiming: 't',
    };
    expect(executiveSummarySchema.safeParse({ ...base, confidence: 50 }).success).toBe(true);
    expect(executiveSummarySchema.safeParse({ ...base, confidence: 101 }).success).toBe(false);
  });

  it('excludes the provenance section from regeneratable sections', () => {
    expect(REGENERATABLE_SECTIONS).not.toContain('SOURCES_ASSUMPTIONS');
    expect(REGENERATABLE_SECTIONS.length).toBeGreaterThan(0);
  });
});
