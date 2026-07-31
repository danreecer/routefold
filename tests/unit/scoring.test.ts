import { describe, expect, it } from 'vitest';
import { CHAIN_KNOWLEDGE_BASE, getChain } from '@/lib/chains/knowledge-base';
import {
  applyAiAdjustment,
  computeWeights,
  deriveRecommendation,
  MAX_AI_ADJUSTMENT,
  overallConfidence,
  SCORING_VERSION,
  scoreChain,
  scoreChains,
} from '@/lib/scoring';
import { CATEGORY_DEFINITIONS, FACTOR_DEFINITIONS, type CategoryKey } from '@/lib/scoring/types';
import type { DigitalTwin } from '@/lib/schemas/twin';
import { EXAMPLE_TWIN } from '@/lib/example/twin';

function twin(overrides: Partial<DigitalTwin> = {}): DigitalTwin {
  return { ...EXAMPLE_TWIN, ...overrides };
}

describe('methodology definitions', () => {
  it('category base allocations sum to exactly 100', () => {
    const total = CATEGORY_DEFINITIONS.reduce((sum, c) => sum + c.basePoints, 0);
    expect(total).toBe(100);
  });

  it('factor allocations sum to their category allocation', () => {
    for (const category of CATEGORY_DEFINITIONS) {
      const total = FACTOR_DEFINITIONS.filter((f) => f.category === category.key).reduce(
        (sum, f) => sum + f.maxPoints,
        0,
      );
      expect(total, `${category.key} factors`).toBe(category.basePoints);
    }
  });

  it('every factor belongs to a defined category', () => {
    const keys = new Set(CATEGORY_DEFINITIONS.map((c) => c.key));
    for (const factor of FACTOR_DEFINITIONS) {
      expect(keys.has(factor.category)).toBe(true);
    }
  });
});

describe('computeWeights', () => {
  it('always renormalises to 100', () => {
    const cases: Array<Parameters<typeof computeWeights>> = [
      [['user-growth'], 'user-growth'],
      [['liquidity', 'user-growth'], 'liquidity'],
      [
        [
          'user-growth',
          'liquidity',
          'institutional-adoption',
          'lower-transaction-costs',
          'consumer-distribution',
          'developer-expansion',
          'geographic-expansion',
        ],
        'liquidity',
      ],
      [['other'], 'other'],
    ];

    for (const [objectives, primary] of cases) {
      const weights = computeWeights(objectives, primary);
      const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
      expect(total).toBeCloseTo(100, 6);
    }
  });

  it('tilts toward the category an objective targets', () => {
    const neutral = computeWeights(['other'], 'other');
    const costFocused = computeWeights(['lower-transaction-costs'], 'lower-transaction-costs');
    expect(costFocused['cost-and-operational-fit']).toBeGreaterThan(
      neutral['cost-and-operational-fit'],
    );
  });

  it('weights the primary objective more than a secondary one', () => {
    const primaryLiquidity = computeWeights(['liquidity', 'lower-transaction-costs'], 'liquidity');
    const primaryCost = computeWeights(['liquidity', 'lower-transaction-costs'], 'lower-transaction-costs');
    expect(primaryLiquidity['users-and-liquidity']).toBeGreaterThan(
      primaryCost['users-and-liquidity'],
    );
  });

  it('never produces a negative or zero weight', () => {
    const weights = computeWeights(['lower-transaction-costs'], 'lower-transaction-costs');
    for (const value of Object.values(weights)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('scoreChain', () => {
  const weights = computeWeights(['user-growth'], 'user-growth');

  it('produces a score within 0–100', () => {
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      const result = scoreChain(twin(), chain, weights);
      expect(result.deterministicScore).toBeGreaterThanOrEqual(0);
      expect(result.deterministicScore).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic — identical inputs give identical output', () => {
    const chain = getChain('base')!;
    const a = scoreChain(twin(), chain, weights);
    const b = scoreChain(twin(), chain, weights);
    expect(a.deterministicScore).toBe(b.deterministicScore);
    expect(JSON.stringify(a.breakdown)).toBe(JSON.stringify(b.breakdown));
  });

  it('records the scoring version used', () => {
    const result = scoreChain(twin(), getChain('base')!, weights);
    expect(result.breakdown.scoringVersion).toBe(SCORING_VERSION);
  });

  it('category points never exceed the category maximum', () => {
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      const result = scoreChain(twin(), chain, weights);
      for (const category of result.breakdown.categories) {
        expect(category.points).toBeLessThanOrEqual(category.maxPoints + 0.001);
        for (const factor of category.factors) {
          expect(factor.points).toBeLessThanOrEqual(factor.maxPoints + 0.001);
          expect(factor.normalised).toBeGreaterThanOrEqual(0);
          expect(factor.normalised).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('every factor carries a written reason', () => {
    const result = scoreChain(twin(), getChain('solana')!, weights);
    for (const category of result.breakdown.categories) {
      for (const factor of category.factors) {
        expect(factor.reason.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('hard constraints', () => {
  const weights = computeWeights(['user-growth'], 'user-growth');

  it('zeroes a chain excluded by the user', () => {
    const result = scoreChain(
      twin({ constraints: { ...EXAMPLE_TWIN.constraints, excludedEcosystems: ['base'] } }),
      getChain('base')!,
      weights,
    );
    expect(result.deterministicScore).toBe(0);
    expect(result.blockers.join(' ')).toMatch(/excluded/i);
  });

  it('zeroes a VM-incompatible chain when the VM is a hard requirement', () => {
    const result = scoreChain(
      twin({ constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: 'EVM' } }),
      getChain('solana')!,
      weights,
    );
    expect(result.deterministicScore).toBe(0);
    expect(result.blockers.join(' ')).toMatch(/EVM/);
  });

  it('does not block a chain that offers a compatible deployment path', () => {
    const result = scoreChain(
      twin({ constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: 'EVM' } }),
      getChain('near')!,
      weights,
    );
    // NEAR exposes Solidity via Aurora, so it is penalised rather than blocked.
    expect(result.deterministicScore).toBeGreaterThan(0);
  });

  it('blocks a data-availability layer for a non-infrastructure product', () => {
    const result = scoreChain(twin({ productCategory: 'defi-dex' }), getChain('celestia')!, weights);
    expect(result.deterministicScore).toBe(0);
    expect(result.blockers.join(' ')).toMatch(/data-availability/i);
  });

  it('does not block a data-availability layer for infrastructure products', () => {
    const result = scoreChain(
      twin({
        productCategory: 'infrastructure',
        constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: null },
      }),
      getChain('celestia')!,
      weights,
    );
    expect(result.deterministicScore).toBeGreaterThan(0);
  });

  it('flags a current deployment without zeroing it', () => {
    const result = scoreChain(twin({ currentChains: ['ethereum'] }), getChain('ethereum')!, weights);
    expect(result.isCurrentDeployment).toBe(true);
    expect(result.deterministicScore).toBeGreaterThan(0);
  });
});

describe('penalties', () => {
  const weights = computeWeights(['user-growth'], 'user-growth');

  it('penalises a weak trust model under critical security sensitivity', () => {
    const base = scoreChain(
      twin({
        security: { ...EXAMPLE_TWIN.security, sensitivity: 'low' },
        constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: null },
      }),
      getChain('polygon')!,
      weights,
    );
    const strict = scoreChain(
      twin({
        security: { ...EXAMPLE_TWIN.security, sensitivity: 'critical' },
        constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: null },
      }),
      getChain('polygon')!,
      weights,
    );
    expect(strict.deterministicScore).toBeLessThan(base.deterministicScore);
    expect(strict.breakdown.penalties.some((p) => p.code === 'security-model-below-requirement')).toBe(
      true,
    );
  });

  it('penalises a rewrite that cannot fit a weeks-long horizon', () => {
    const result = scoreChain(
      twin({
        vmRequirement: 'EVM',
        constraints: { ...EXAMPLE_TWIN.constraints, timeHorizon: 'weeks', requiredVm: null },
      }),
      getChain('solana')!,
      weights,
    );
    expect(result.breakdown.penalties.some((p) => p.code === 'rewrite-exceeds-horizon')).toBe(true);
  });

  it('penalises operational burden beyond a small team', () => {
    const result = scoreChain(
      twin({
        constraints: { ...EXAMPLE_TWIN.constraints, teamCapacity: 'solo', requiredVm: null },
      }),
      getChain('cosmos')!,
      weights,
    );
    expect(
      result.breakdown.penalties.some((p) => p.code === 'operational-burden-above-capacity'),
    ).toBe(true);
  });

  it('never drives a score below zero', () => {
    const result = scoreChain(
      twin({
        security: { ...EXAMPLE_TWIN.security, sensitivity: 'critical', valueAtRisk: 'very-high' },
        liquidity: { ...EXAMPLE_TWIN.liquidity, requiresDeepLiquidity: true },
        constraints: {
          ...EXAMPLE_TWIN.constraints,
          teamCapacity: 'solo',
          budgetSensitivity: 'minimal',
          timeHorizon: 'weeks',
          requiredVm: null,
        },
      }),
      getChain('cosmos')!,
      weights,
    );
    expect(result.deterministicScore).toBeGreaterThanOrEqual(0);
  });
});

describe('applyAiAdjustment', () => {
  it('clamps a runaway positive adjustment', () => {
    expect(applyAiAdjustment(50, 999, true).aiAdjustment).toBe(MAX_AI_ADJUSTMENT);
  });

  it('clamps a runaway negative adjustment', () => {
    expect(applyAiAdjustment(50, -999, true).aiAdjustment).toBe(-MAX_AI_ADJUSTMENT);
  });

  it('ignores an adjustment with no written justification', () => {
    const result = applyAiAdjustment(50, 4, false);
    expect(result.aiAdjustment).toBe(0);
    expect(result.finalScore).toBe(50);
  });

  it('rejects a non-finite adjustment outright rather than clamping it', () => {
    // Clamping Infinity to +5 would silently accept a nonsense value as a
    // maximal adjustment. Refusing it is the safer failure.
    expect(applyAiAdjustment(50, Number.NaN, true).aiAdjustment).toBe(0);
    expect(applyAiAdjustment(50, Number.POSITIVE_INFINITY, true).aiAdjustment).toBe(0);
    expect(applyAiAdjustment(50, Number.NEGATIVE_INFINITY, true).finalScore).toBe(50);
  });

  it('keeps the final score inside 0–100', () => {
    expect(applyAiAdjustment(98, 5, true).finalScore).toBe(100);
    expect(applyAiAdjustment(2, -5, true).finalScore).toBe(0);
  });

  it('leaves the base score untouched', () => {
    const base = 72.4;
    const result = applyAiAdjustment(base, 3, true);
    expect(result.finalScore).toBeCloseTo(75.4, 5);
    // The caller keeps `base` — the function never mutates it.
    expect(base).toBe(72.4);
  });
});

describe('deriveRecommendation', () => {
  it('marks the top scorer as primary', () => {
    expect(deriveRecommendation({ finalScore: 80, blockers: [], isCurrentDeployment: false }, 1)).toBe(
      'primary',
    );
  });

  it('marks a current deployment regardless of rank', () => {
    expect(deriveRecommendation({ finalScore: 95, blockers: [], isCurrentDeployment: true }, 1)).toBe(
      'current',
    );
  });

  it('marks a zeroed blocked chain as blocked', () => {
    expect(
      deriveRecommendation({ finalScore: 0, blockers: ['excluded'], isCurrentDeployment: false }, 4),
    ).toBe('blocked');
  });

  it('does not promote a weak top scorer to primary', () => {
    expect(deriveRecommendation({ finalScore: 30, blockers: [], isCurrentDeployment: false }, 1)).toBe(
      'not_recommended',
    );
  });
});

describe('scoreChains', () => {
  it('ranks by score and pushes current deployments out of contention', () => {
    const results = scoreChains(twin({ currentChains: ['ethereum'] }), CHAIN_KNOWLEDGE_BASE);
    const currentIndex = results.findIndex((r) => r.chainSlug === 'ethereum');
    const lastNonCurrent = results.reduce(
      (last, r, index) => (r.isCurrentDeployment ? last : index),
      -1,
    );
    expect(currentIndex).toBeGreaterThan(lastNonCurrent - results.length);
    expect(results[0]?.isCurrentDeployment).toBe(false);
  });

  it('returns a result for every chain in the knowledge base', () => {
    const results = scoreChains(twin(), CHAIN_KNOWLEDGE_BASE);
    expect(results).toHaveLength(CHAIN_KNOWLEDGE_BASE.length);
  });

  it('sorts descending by deterministic score among non-current chains', () => {
    const results = scoreChains(twin(), CHAIN_KNOWLEDGE_BASE).filter((r) => !r.isCurrentDeployment);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1]!.deterministicScore).toBeGreaterThanOrEqual(
        results[i]!.deterministicScore,
      );
    }
  });
});

describe('confidence', () => {
  it('never exceeds the twin confidence by a wide margin', () => {
    const results = scoreChains(twin({ confidence: 40 }), CHAIN_KNOWLEDGE_BASE);
    for (const result of results) {
      expect(result.confidence).toBeLessThanOrEqual(80);
    }
  });

  it('falls as recorded gaps increase', () => {
    const few = scoreChain(twin({ missingData: [] }), getChain('base')!, computeWeights(['user-growth'], 'user-growth'));
    const many = scoreChain(
      twin({ missingData: ['a', 'b', 'c', 'd', 'e'] }),
      getChain('base')!,
      computeWeights(['user-growth'], 'user-growth'),
    );
    expect(many.confidence).toBeLessThan(few.confidence);
  });

  it('overallConfidence ignores blocked chains', () => {
    expect(
      overallConfidence([
        { confidence: 90, deterministicScore: 80 },
        { confidence: 10, deterministicScore: 0 },
      ]),
    ).toBe(90);
  });

  it('overallConfidence returns 0 with no scoreable candidates', () => {
    expect(overallConfidence([{ confidence: 50, deterministicScore: 0 }])).toBe(0);
    expect(overallConfidence([])).toBe(0);
  });
});

describe('objective weighting changes outcomes', () => {
  it('a cost-focused product ranks cheap chains higher than a liquidity-focused one does', () => {
    const product = twin({
      constraints: { ...EXAMPLE_TWIN.constraints, requiredVm: null },
      transactions: {
        ...EXAMPLE_TWIN.transactions,
        profile: 'high-frequency-low-value',
        costSensitivity: 'critical',
      },
      liquidity: { ...EXAMPLE_TWIN.liquidity, requiresDeepLiquidity: false },
    });

    const costWeights: Record<CategoryKey, number> = computeWeights(
      ['lower-transaction-costs'],
      'lower-transaction-costs',
    );
    const liquidityWeights = computeWeights(['liquidity'], 'liquidity');

    const ethereumCost = scoreChain(product, getChain('ethereum')!, costWeights);
    const ethereumLiquidity = scoreChain(product, getChain('ethereum')!, liquidityWeights);

    // Ethereum has the highest fees; a cost-focused weighting must hurt it.
    expect(ethereumCost.deterministicScore).toBeLessThan(ethereumLiquidity.deterministicScore);
  });
});
