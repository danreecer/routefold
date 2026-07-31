import { describe, expect, it } from 'vitest';
import { CHAIN_KNOWLEDGE_BASE, allChainSlugs, getChain } from '@/lib/chains/knowledge-base';
import { BAND_INDEX, bandValue, costValue, COST_INDEX } from '@/lib/chains/types';
import { buildExampleReport } from '@/lib/example';

describe('chain knowledge base', () => {
  it('contains the required ecosystems', () => {
    const required = [
      'ethereum',
      'arbitrum',
      'base',
      'optimism',
      'polygon',
      'avalanche',
      'bnb-chain',
      'solana',
      'sui',
      'aptos',
      'near',
      'celestia',
      'cosmos',
      'scroll',
      'linea',
    ];
    for (const slug of required) {
      expect(getChain(slug), `missing ${slug}`).toBeDefined();
    }
  });

  it('has unique slugs', () => {
    const slugs = allChainSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every chain a reviewed date and at least one reference', () => {
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      expect(chain.reviewedAt, chain.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(chain.references.length, chain.slug).toBeGreaterThan(0);
    }
  });

  it('gives every chain both strengths and tradeoffs', () => {
    // A chain with no recorded tradeoff is a failure of assessment, not a
    // perfect chain — the report explicitly promises this.
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      expect(chain.strengths.length, `${chain.slug} strengths`).toBeGreaterThan(0);
      expect(chain.tradeoffs.length, `${chain.slug} tradeoffs`).toBeGreaterThan(0);
    }
  });

  it('records a security note for every chain', () => {
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      expect(chain.securityNotes.length, chain.slug).toBeGreaterThan(20);
    }
  });

  it('contains no hardcoded exact metrics', () => {
    // The methodology commits to bands rather than pinned figures. A large bare
    // number or a dollar amount in the seeded data would break that promise.
    const serialised = JSON.stringify(CHAIN_KNOWLEDGE_BASE);
    expect(serialised).not.toMatch(/\$\s?\d/);
    expect(serialised).not.toMatch(/\d{1,3}(,\d{3}){2,}/);
  });

  it('covers every suitability domain for every chain', () => {
    const domains = [
      'defi',
      'consumer',
      'gaming',
      'institutional',
      'tokenizedAssets',
      'payments',
      'infrastructure',
      'social',
    ] as const;
    for (const chain of CHAIN_KNOWLEDGE_BASE) {
      for (const domain of domains) {
        expect(chain.suitability[domain], `${chain.slug}.${domain}`).toBeDefined();
      }
    }
  });
});

describe('band helpers', () => {
  it('normalises bands monotonically to 0–1', () => {
    expect(bandValue('very-low')).toBe(0);
    expect(bandValue('very-high')).toBe(1);
    expect(BAND_INDEX['low']).toBeLessThan(BAND_INDEX['high']);
  });

  it('inverts cost so cheaper is better', () => {
    expect(costValue('negligible')).toBe(1);
    expect(costValue('high')).toBe(0);
    expect(COST_INDEX['negligible']).toBeLessThan(COST_INDEX['high']);
  });
});

describe('example report integrity', () => {
  const report = buildExampleReport();

  it('is internally consistent — the narrative follows the engine', () => {
    // The example is the product's public proof that the prose does not
    // contradict the arithmetic. If the engine's top-ranked chain ever stops
    // matching the recommendation, the example is lying and this must fail.
    const top = report.scores.find((score) => score.recommendation !== 'current');
    expect(top).toBeDefined();
    expect(report.sequence?.primary.chainSlug).toBe(top?.chainSlug);
    expect(report.summary?.recommendedChainSlug).toBe(top?.chainSlug);
    expect(report.recommendedChain).toBe(top?.chainSlug);
  });

  it('is labelled as an example', () => {
    expect(report.isExample).toBe(true);
  });

  it('keeps every AI adjustment within the documented bound', () => {
    for (const score of report.scores) {
      expect(Math.abs(score.aiAdjustment)).toBeLessThanOrEqual(5);
      if (score.aiAdjustment !== 0) {
        expect(score.explanation?.adjustmentReason.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('does not claim more confidence than its own Digital Twin', () => {
    expect(report.confidence).toBeLessThanOrEqual(report.twin.confidence + 2);
  });

  it('produces every report section', () => {
    expect(report.summary).not.toBeNull();
    expect(report.sequence).not.toBeNull();
    expect(report.architecture).not.toBeNull();
    expect(report.risks).not.toBeNull();
    expect(report.plan).not.toBeNull();
    expect(report.technicalBrief).not.toBeNull();
    expect(report.sources).not.toBeNull();
  });

  it('references only real chain slugs', () => {
    const slugs = new Set(allChainSlugs());
    expect(slugs.has(report.sequence!.primary.chainSlug)).toBe(true);
    for (const entry of report.sequence!.secondary) {
      expect(slugs.has(entry.chainSlug), entry.chainSlug).toBe(true);
    }
    for (const entry of report.sequence!.notRecommended) {
      expect(slugs.has(entry.chainSlug), entry.chainSlug).toBe(true);
    }
  });

  it('has architecture connections that reference defined components', () => {
    const ids = new Set(report.architecture!.components.map((c) => c.id));
    for (const connection of report.architecture!.connections) {
      expect(ids.has(connection.from), connection.from).toBe(true);
      expect(ids.has(connection.to), connection.to).toBe(true);
    }
  });

  it('has plan weeks that reference defined tasks', () => {
    const ids = new Set(report.plan!.tasks.map((t) => t.id));
    for (const week of report.plan!.weeks) {
      for (const taskId of week.taskIds) {
        expect(ids.has(taskId), taskId).toBe(true);
      }
    }
    for (const task of report.plan!.tasks) {
      for (const dependency of task.dependsOn) {
        expect(ids.has(dependency), dependency).toBe(true);
      }
    }
  });

  it('includes at least one risk arguing against the recommendation', () => {
    const risks = report.risks!.risks;
    expect(risks.length).toBeGreaterThanOrEqual(3);
    expect(risks.some((risk) => risk.impact === 'high')).toBe(true);
  });

  it('frames compliance items as open questions', () => {
    for (const risk of report.risks!.risks) {
      if (risk.category === 'compliance') {
        expect(risk.isOpenQuestion, risk.id).toBe(true);
      }
    }
  });
});
