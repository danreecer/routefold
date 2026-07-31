import {
  BAND_INDEX,
  bandValue,
  costValue,
  type Band,
  type ChainRecord,
  type FinalityProfile,
} from '@/lib/chains/types';
import type { DigitalTwin, Objective, ProductCategory } from '@/lib/schemas/twin';
import {
  CATEGORY_DEFINITIONS,
  FACTOR_DEFINITIONS,
  SCORING_VERSION,
  type Blocker,
  type CategoryKey,
  type CategoryResult,
  type ChainScoreResult,
  type FactorKey,
  type FactorResult,
  type Penalty,
  type ScoreBreakdown,
} from './types';

/**
 * Deterministic chain-fit scoring engine.
 *
 * Pure function. Same inputs always produce the same numbers, and every point is
 * traceable to a named factor with a written reason. The language model never
 * writes into this output — it may only propose a bounded adjustment that is
 * stored and displayed separately (see `applyAiAdjustment`).
 */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// ── Category weighting ───────────────────────────────────────────────────────

/**
 * Objectives tilt category weights. Tilts are additive multipliers applied to
 * the published base allocation, then renormalised back to exactly 100 points so
 * the scale never inflates.
 */
const OBJECTIVE_TILTS: Record<Objective, Partial<Record<CategoryKey, number>>> = {
  'user-growth': { 'users-and-liquidity': 0.3, 'product-ecosystem-fit': 0.1 },
  liquidity: { 'users-and-liquidity': 0.45 },
  'institutional-adoption': { 'product-ecosystem-fit': 0.25, 'technical-compatibility': 0.15 },
  'lower-transaction-costs': { 'cost-and-operational-fit': 0.5 },
  'consumer-distribution': { 'users-and-liquidity': 0.25, 'cost-and-operational-fit': 0.2 },
  'developer-expansion': { 'technical-compatibility': 0.25, 'strategic-optionality': 0.25 },
  'geographic-expansion': { 'product-ecosystem-fit': 0.3, 'users-and-liquidity': 0.1 },
  other: {},
};

/** The primary objective counts double relative to the others. */
export function computeWeights(
  objectives: Objective[],
  primaryObjective?: Objective,
): Record<CategoryKey, number> {
  const tilt: Record<CategoryKey, number> = {
    'product-ecosystem-fit': 0,
    'users-and-liquidity': 0,
    'technical-compatibility': 0,
    'cost-and-operational-fit': 0,
    'strategic-optionality': 0,
  };

  const unique = Array.from(new Set(objectives));
  for (const objective of unique) {
    const weight = objective === primaryObjective ? 2 : 1;
    for (const [category, value] of Object.entries(OBJECTIVE_TILTS[objective] ?? {})) {
      tilt[category as CategoryKey] += value * weight;
    }
  }

  // Normalise the tilt by total objective weight so selecting many objectives
  // does not compound into an extreme skew.
  const totalObjectiveWeight = unique.reduce(
    (sum, objective) => sum + (objective === primaryObjective ? 2 : 1),
    0,
  );
  const divisor = Math.max(1, totalObjectiveWeight);

  const tilted = CATEGORY_DEFINITIONS.map((definition) => ({
    key: definition.key,
    points: definition.basePoints * (1 + tilt[definition.key] / divisor),
  }));

  const total = tilted.reduce((sum, entry) => sum + entry.points, 0);
  const weights = {} as Record<CategoryKey, number>;
  for (const entry of tilted) {
    weights[entry.key] = (entry.points / total) * 100;
  }
  return weights;
}

// ── Category → suitability domain ────────────────────────────────────────────

type SuitabilityDomain = keyof ChainRecord['suitability'];

const CATEGORY_TO_DOMAIN: Record<ProductCategory, SuitabilityDomain> = {
  'defi-lending': 'defi',
  'defi-dex': 'defi',
  'defi-derivatives': 'defi',
  'defi-yield': 'defi',
  stablecoin: 'payments',
  'tokenized-assets': 'tokenizedAssets',
  payments: 'payments',
  wallet: 'consumer',
  infrastructure: 'infrastructure',
  oracle: 'infrastructure',
  gaming: 'gaming',
  'nft-marketplace': 'consumer',
  social: 'social',
  identity: 'infrastructure',
  'dao-tooling': 'infrastructure',
  exchange: 'defi',
  other: 'infrastructure',
};

const SENSITIVITY_VALUE = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 } as const;

const FINALITY_RANK: Record<FinalityProfile, number> = {
  'sub-second': 0,
  seconds: 1,
  'under-a-minute': 2,
  minutes: 3,
  'challenge-period': 4,
};

const REQUIRED_FINALITY_RANK = {
  'sub-second': 0,
  seconds: 1,
  minutes: 3,
  flexible: 4,
} as const;

const TEAM_CAPACITY_VALUE = { solo: 0.15, small: 0.4, medium: 0.7, large: 1 } as const;
const BUDGET_VALUE = { minimal: 0.15, constrained: 0.4, moderate: 0.7, 'well-funded': 1 } as const;
const TIME_HORIZON_VALUE = { weeks: 0.15, 'one-quarter': 0.45, 'two-quarters': 0.75, 'a-year-plus': 1 } as const;

const bandLabelLower: Record<Band, string> = {
  'very-low': 'very low',
  low: 'low',
  moderate: 'moderate',
  high: 'high',
  'very-high': 'very high',
};

// ── Factor computation ───────────────────────────────────────────────────────

type FactorInput = {
  twin: DigitalTwin;
  chain: ChainRecord;
  /** Chain families the product is already exposed to. */
  currentFamilies: Set<string>;
};

type RawFactor = { normalised: number; reason: string; dataMissing?: boolean };

const FACTOR_COMPUTERS: Record<FactorKey, (input: FactorInput) => RawFactor> = {
  'category-suitability': ({ twin, chain }) => {
    const domain = CATEGORY_TO_DOMAIN[twin.productCategory];
    const band = chain.suitability[domain];
    return {
      normalised: bandValue(band),
      reason: `${chain.shortName} has ${bandLabelLower[band]} established activity in this product category.`,
    };
  },

  'orientation-alignment': ({ twin, chain }) => {
    const consumer = bandValue(chain.retailUserBase);
    const institutional = bandValue(chain.institutionalPresence);
    const developer = bandValue(chain.suitability.infrastructure);
    let normalised: number;
    let axis: string;
    switch (twin.orientation) {
      case 'consumer':
        normalised = consumer;
        axis = 'consumer reach';
        break;
      case 'institutional':
        normalised = institutional;
        axis = 'institutional presence';
        break;
      case 'developer':
        normalised = developer;
        axis = 'developer ecosystem';
        break;
      default:
        normalised = (consumer + institutional) / 2;
        axis = 'combined consumer and institutional presence';
    }
    return {
      normalised,
      reason: `Scored on ${axis}, matching the product's ${twin.orientation} orientation.`,
    };
  },

  'geographic-alignment': ({ twin, chain }) => {
    if (twin.targetGeographies.length === 0) {
      return {
        normalised: 0.6,
        reason: 'No target regions specified — scored neutrally rather than penalised.',
        dataMissing: true,
      };
    }
    const chainRegions = chain.geographicStrength.map((region) => region.toLowerCase());
    const targets = twin.targetGeographies.map((region) => region.toLowerCase());
    if (chainRegions.includes('global')) {
      const specificOverlap = targets.filter((target) =>
        chainRegions.some((region) => region !== 'global' && region.includes(target)),
      );
      const normalised = specificOverlap.length > 0 ? 1 : 0.7;
      return {
        normalised,
        reason:
          specificOverlap.length > 0
            ? `Global reach plus specific strength in ${specificOverlap.join(', ')}.`
            : 'Global reach, without particular concentration in the target regions.',
      };
    }
    const overlap = targets.filter((target) =>
      chainRegions.some((region) => region.includes(target) || target.includes(region)),
    );
    const normalised = overlap.length / targets.length;
    return {
      normalised,
      reason:
        overlap.length > 0
          ? `Regional strength overlaps ${overlap.length} of ${targets.length} target regions.`
          : `Regional strength (${chain.geographicStrength.join(', ')}) does not overlap the target regions.`,
    };
  },

  'stage-support-alignment': ({ twin, chain }) => {
    const support = bandValue(chain.ecosystemSupport);
    // Earlier-stage products benefit more from ecosystem support.
    const stageNeed = {
      concept: 1,
      prototype: 1,
      testnet: 0.9,
      'mainnet-early': 0.8,
      'mainnet-scaling': 0.5,
      mature: 0.3,
    }[twin.developmentStage];
    const normalised = clamp01(support * stageNeed + (1 - stageNeed) * 0.65);
    return {
      normalised,
      reason: `Ecosystem support is ${bandLabelLower[chain.ecosystemSupport]}; weighted for a ${twin.developmentStage.replace(/-/g, ' ')} product.`,
    };
  },

  'liquidity-depth': ({ twin, chain }) => {
    const depth = bandValue(chain.defiLiquidityDepth);
    if (!twin.liquidity.requiresDeepLiquidity) {
      // Depth still helps a little, but shallow markets are not a real problem.
      return {
        normalised: clamp01(0.7 + depth * 0.3),
        reason: 'The product does not depend on deep on-chain liquidity, so depth is weighted lightly.',
      };
    }
    return {
      normalised: depth,
      reason: `DeFi liquidity depth is ${bandLabelLower[chain.defiLiquidityDepth]} and the product depends on it.`,
    };
  },

  'stablecoin-availability': ({ twin, chain }) => {
    const availability = bandValue(chain.stablecoinLiquidity);
    const dependency = SENSITIVITY_VALUE[twin.liquidity.stablecoinDependency];
    const normalised = clamp01(availability * dependency + (1 - dependency) * 0.75);
    return {
      normalised,
      reason: `Stablecoin liquidity is ${bandLabelLower[chain.stablecoinLiquidity]} against a ${twin.liquidity.stablecoinDependency} dependency.`,
    };
  },

  'user-base-reach': ({ twin, chain }) => {
    const profile = twin.users.primaryProfile;
    let band: Band;
    let axis: string;
    if (profile === 'institutional' || profile === 'enterprise') {
      band = chain.institutionalPresence;
      axis = 'institutional presence';
    } else if (profile === 'developer') {
      band = chain.developerToolingMaturity;
      axis = 'developer ecosystem';
    } else if (profile === 'professional-trader') {
      band = chain.defiLiquidityDepth;
      axis = 'professional trading depth';
    } else if (profile === 'mixed') {
      const combined = (BAND_INDEX[chain.retailUserBase] + BAND_INDEX[chain.institutionalPresence]) / 2;
      return {
        normalised: combined / 4,
        reason: 'Scored on combined retail and institutional reach for a mixed audience.',
      };
    } else {
      band = chain.retailUserBase;
      axis = 'retail user base';
    }
    return {
      normalised: bandValue(band),
      reason: `${axis.charAt(0).toUpperCase() + axis.slice(1)} is ${bandLabelLower[band]} for this audience.`,
    };
  },

  'vm-compatibility': ({ twin, chain }) => {
    const required = twin.constraints.requiredVm ?? twin.vmRequirement;
    if (required === 'any') {
      return {
        normalised: 0.85,
        reason: 'No virtual-machine constraint, so any execution environment is workable.',
      };
    }
    if (chain.executionEnvironment === required) {
      return {
        normalised: 1,
        reason: `Same execution environment (${required}) — existing contracts port directly.`,
      };
    }
    // Some chains offer a compatible path without being natively that VM.
    const hasCompatibleLanguage = chain.contractLanguages.some((language) =>
      required === 'EVM' ? /solidity|vyper/i.test(language) : false,
    );
    if (hasCompatibleLanguage) {
      return {
        normalised: 0.6,
        reason: `Not natively ${required}, but a compatible deployment path exists (${chain.contractLanguages.join(', ')}).`,
      };
    }
    return {
      normalised: 0.05,
      reason: `Requires a full rewrite from ${required} to ${chain.executionEnvironment}.`,
    };
  },

  'language-reuse': ({ twin, chain }) => {
    if (twin.contractLanguages.length === 0) {
      return {
        normalised: 0.6,
        reason: 'Current contract languages were not established — scored neutrally.',
        dataMissing: true,
      };
    }
    const chainLanguages = chain.contractLanguages.map((language) => language.toLowerCase());
    const overlap = twin.contractLanguages.filter((language) =>
      chainLanguages.some((candidate) => candidate.includes(language.toLowerCase())),
    );
    const normalised = overlap.length / twin.contractLanguages.length;
    return {
      normalised,
      reason:
        overlap.length > 0
          ? `${overlap.join(', ')} carries over directly.`
          : `No overlap with the team's current languages (${chain.contractLanguages.join(', ')} required).`,
    };
  },

  'finality-match': ({ twin, chain }) => {
    const required = REQUIRED_FINALITY_RANK[twin.transactions.finalityRequirement];
    const actual = FINALITY_RANK[chain.finality];
    if (actual <= required) {
      return {
        normalised: 1,
        reason: `${chain.finality.replace(/-/g, ' ')} finality satisfies the ${twin.transactions.finalityRequirement.replace(/-/g, ' ')} requirement.`,
      };
    }
    const gap = actual - required;
    return {
      normalised: clamp01(1 - gap * 0.32),
      reason: `${chain.finality.replace(/-/g, ' ')} finality is slower than the ${twin.transactions.finalityRequirement.replace(/-/g, ' ')} requirement.`,
    };
  },

  'security-model-fit': ({ twin, chain }) => {
    // How much independent trust the model asks the product to extend.
    const modelStrength: Record<ChainRecord['securityModel'], number> = {
      'l1-consensus': 1,
      'l2-validity-proof': 0.9,
      'l2-fraud-proof': 0.8,
      'l2-with-training-wheels': 0.6,
      'independent-consensus': 0.65,
      'shared-security': 0.55,
      'sidechain-consensus': 0.45,
    };
    const strength = modelStrength[chain.securityModel];
    const sensitivity = SENSITIVITY_VALUE[twin.security.sensitivity];
    // A low-sensitivity product is largely indifferent to the trust model.
    const normalised = clamp01(strength * sensitivity + (1 - sensitivity));
    return {
      normalised,
      reason: `${chain.securityModel.replace(/-/g, ' ')} weighed against ${twin.security.sensitivity} security sensitivity.`,
    };
  },

  'transaction-cost-fit': ({ twin, chain }) => {
    const cost = costValue(chain.transactionCost);
    const sensitivity = SENSITIVITY_VALUE[twin.transactions.costSensitivity];
    const frequencyMultiplier =
      twin.transactions.profile === 'high-frequency-low-value'
        ? 1
        : twin.transactions.profile === 'balanced'
          ? 0.7
          : twin.transactions.profile === 'batch-settlement'
            ? 0.5
            : 0.35;
    const effectiveSensitivity = clamp01(sensitivity * frequencyMultiplier + 0.15);
    const normalised = clamp01(cost * effectiveSensitivity + (1 - effectiveSensitivity));
    return {
      normalised,
      reason: `${chain.transactionCost.replace(/-/g, ' ')} transaction cost against a ${twin.transactions.profile.replace(/-/g, ' ')} profile.`,
    };
  },

  'operational-complexity-fit': ({ twin, chain }) => {
    // Lower complexity is better; capacity offsets it.
    const complexity = bandValue(chain.operationalComplexity);
    const capacity = TEAM_CAPACITY_VALUE[twin.constraints.teamCapacity];
    const budget = BUDGET_VALUE[twin.constraints.budgetSensitivity];
    const headroom = (capacity + budget) / 2;
    const normalised = clamp01(1 - Math.max(0, complexity - headroom) * 1.4);
    return {
      normalised,
      reason: `${bandLabelLower[chain.operationalComplexity]} operational burden against a ${twin.constraints.teamCapacity} team.`,
    };
  },

  'tooling-maturity-fit': ({ twin, chain }) => {
    const maturity = bandValue(chain.developerToolingMaturity);
    const horizon = TIME_HORIZON_VALUE[twin.constraints.timeHorizon];
    // Short horizons make immature tooling much more costly.
    const urgency = 1 - horizon;
    const normalised = clamp01(maturity * (0.5 + urgency * 0.5) + (1 - (0.5 + urgency * 0.5)) * 0.7);
    return {
      normalised,
      reason: `${bandLabelLower[chain.developerToolingMaturity]} tooling maturity against a ${twin.constraints.timeHorizon.replace(/-/g, ' ')} horizon.`,
    };
  },

  'ecosystem-support': ({ chain }) => ({
    normalised: bandValue(chain.ecosystemSupport),
    reason: `Grant and business-development support is ${bandLabelLower[chain.ecosystemSupport]}.`,
  }),

  diversification: ({ chain, currentFamilies }) => {
    if (currentFamilies.size === 0) {
      return {
        normalised: 0.7,
        reason: 'No existing deployments recorded, so diversification is scored neutrally.',
        dataMissing: true,
      };
    }
    if (currentFamilies.has(chain.family)) {
      return {
        normalised: 0.3,
        reason: 'Same ecosystem family as an existing deployment — limited diversification benefit.',
      };
    }
    const sharesVm = Array.from(currentFamilies).some((family) => family.includes('evm') || family.includes('ethereum'));
    const isEvm = chain.executionEnvironment === 'EVM';
    return {
      normalised: sharesVm && isEvm ? 0.65 : 1,
      reason:
        sharesVm && isEvm
          ? 'Different family but the same execution environment — moderate diversification.'
          : 'Different ecosystem family and execution environment — meaningful diversification.',
    };
  },

  'interop-reach': ({ chain }) => ({
    normalised: bandValue(chain.crossChainMaturity),
    reason: `Cross-chain messaging and bridging maturity is ${bandLabelLower[chain.crossChainMaturity]}.`,
  }),
};

// ── Hard constraints and penalties ───────────────────────────────────────────

function evaluateBlockers(twin: DigitalTwin, chain: ChainRecord, isCurrent: boolean): Blocker[] {
  const blockers: Blocker[] = [];

  const excluded = twin.constraints.excludedEcosystems.map((slug) => slug.toLowerCase());
  if (excluded.includes(chain.slug) || excluded.includes(chain.name.toLowerCase())) {
    blockers.push({
      code: 'excluded-by-user',
      message: `${chain.name} was explicitly excluded in the analysis constraints.`,
      hard: true,
    });
  }

  const requiredVm = twin.constraints.requiredVm;
  if (requiredVm && requiredVm !== 'any' && chain.executionEnvironment !== requiredVm) {
    const hasCompatiblePath =
      requiredVm === 'EVM' && chain.contractLanguages.some((language) => /solidity|vyper/i.test(language));
    if (!hasCompatiblePath) {
      blockers.push({
        code: 'vm-incompatible',
        message: `${requiredVm} was set as a hard requirement and ${chain.name} runs ${chain.executionEnvironment}.`,
        hard: true,
      });
    }
  }

  if (chain.executionEnvironment === 'DA-layer' && twin.productCategory !== 'infrastructure') {
    blockers.push({
      code: 'not-a-deployment-target',
      message: `${chain.name} is a data-availability layer, not a contract deployment target. It is only relevant if the product runs its own rollup.`,
      hard: true,
    });
  }

  if (isCurrent) {
    blockers.push({
      code: 'already-deployed',
      message: `The product is already deployed on ${chain.name}.`,
      hard: false,
    });
  }

  return blockers;
}

function evaluatePenalties(twin: DigitalTwin, chain: ChainRecord): Penalty[] {
  const penalties: Penalty[] = [];

  if (
    twin.security.sensitivity === 'critical' &&
    (chain.securityModel === 'sidechain-consensus' || chain.securityModel === 'shared-security')
  ) {
    penalties.push({
      code: 'security-model-below-requirement',
      message: `Critical security sensitivity against a ${chain.securityModel.replace(/-/g, ' ')} trust model.`,
      points: 8,
    });
  }

  if (
    twin.security.valueAtRisk === 'very-high' &&
    chain.dataConfidence === 'low'
  ) {
    penalties.push({
      code: 'insufficient-data-for-value-at-risk',
      message: 'Very high value at risk with low-confidence ecosystem data.',
      points: 4,
    });
  }

  if (
    twin.constraints.budgetSensitivity === 'minimal' &&
    (chain.transactionCost === 'high' || chain.transactionCost === 'moderate')
  ) {
    penalties.push({
      code: 'cost-above-budget',
      message: `Minimal budget against ${chain.transactionCost} transaction costs.`,
      points: 6,
    });
  }

  if (
    (twin.constraints.teamCapacity === 'solo' || twin.constraints.teamCapacity === 'small') &&
    BAND_INDEX[chain.operationalComplexity] >= BAND_INDEX['high']
  ) {
    penalties.push({
      code: 'operational-burden-above-capacity',
      message: `${bandLabelLower[chain.operationalComplexity]} operational burden is unrealistic for a ${twin.constraints.teamCapacity} team.`,
      points: 7,
    });
  }

  if (
    twin.constraints.timeHorizon === 'weeks' &&
    twin.vmRequirement !== 'any' &&
    chain.executionEnvironment !== twin.vmRequirement &&
    !(twin.vmRequirement === 'EVM' && chain.contractLanguages.some((l) => /solidity|vyper/i.test(l)))
  ) {
    penalties.push({
      code: 'rewrite-exceeds-horizon',
      message: 'A full contract rewrite is not deliverable inside a horizon measured in weeks.',
      points: 9,
    });
  }

  if (
    twin.liquidity.requiresDeepLiquidity &&
    BAND_INDEX[chain.defiLiquidityDepth] <= BAND_INDEX['low']
  ) {
    penalties.push({
      code: 'liquidity-below-requirement',
      message: 'The product requires deep liquidity and this ecosystem does not have it.',
      points: 5,
    });
  }

  return penalties;
}

// ── Confidence ───────────────────────────────────────────────────────────────

function computeConfidence(
  twin: DigitalTwin,
  chain: ChainRecord,
  factors: FactorResult[],
): { confidence: number; missingData: string[] } {
  const missingData: string[] = [];

  const chainConfidence = { high: 100, medium: 78, low: 55 }[chain.dataConfidence];
  if (chain.dataConfidence !== 'high') {
    missingData.push(`Ecosystem assessment for ${chain.name} is ${chain.dataConfidence}-confidence.`);
  }

  const missingFactors = factors.filter((factor) => factor.dataMissing);
  for (const factor of missingFactors) {
    missingData.push(`${factor.label}: scored on a neutral default because input data was absent.`);
  }

  for (const item of twin.missingData) {
    missingData.push(item);
  }

  /**
   * Three weighted components, then a penalty for gaps the twin recorded.
   *
   * The twin component carries the most weight on purpose. Confidence in a
   * chain-fit score is bounded above by confidence in the model of the product
   * being fitted — a report cannot be more certain than its own inputs, and an
   * earlier revision of this formula produced 98/100 for a twin that recorded
   * three unresolved unknowns, which is exactly the kind of false precision the
   * methodology promises not to produce.
   */
  const chainComponent = chainConfidence;
  const factorComponent = Math.max(0, 100 - missingFactors.length * 12);
  const twinComponent = twin.confidence;
  const gapPenalty = Math.min(18, twin.missingData.length * 4);

  const confidence = Math.round(
    Math.min(
      99,
      Math.max(
        5,
        chainComponent * 0.3 + factorComponent * 0.25 + twinComponent * 0.45 - gapPenalty,
      ),
    ),
  );

  return { confidence, missingData: Array.from(new Set(missingData)) };
}

// ── Public API ───────────────────────────────────────────────────────────────

export type ScoreChainsOptions = {
  /** Overrides the objective-derived weights. Used by tests and comparisons. */
  weights?: Record<CategoryKey, number>;
};

export function scoreChain(
  twin: DigitalTwin,
  chain: ChainRecord,
  weights: Record<CategoryKey, number>,
): ChainScoreResult {
  const currentSlugs = new Set(twin.currentChains.map((slug) => slug.toLowerCase()));
  const isCurrentDeployment = currentSlugs.has(chain.slug) || currentSlugs.has(chain.name.toLowerCase());

  const currentFamilies = new Set<string>();
  for (const slug of currentSlugs) {
    const match = CHAIN_FAMILY_LOOKUP.get(slug);
    if (match) currentFamilies.add(match);
  }

  const input = { twin, chain, currentFamilies };

  // Compute each factor, scaling its maximum by the category's applied weight.
  const factors: FactorResult[] = FACTOR_DEFINITIONS.map((definition) => {
    const categoryDefinition = CATEGORY_DEFINITIONS.find((c) => c.key === definition.category);
    const baseCategoryPoints = categoryDefinition?.basePoints ?? 1;
    const appliedCategoryPoints = weights[definition.category];
    const scale = appliedCategoryPoints / baseCategoryPoints;
    const maxPoints = definition.maxPoints * scale;

    const raw = FACTOR_COMPUTERS[definition.key](input);
    const normalised = clamp01(raw.normalised);

    return {
      key: definition.key,
      label: definition.label,
      category: definition.category,
      normalised,
      points: normalised * maxPoints,
      maxPoints,
      reason: raw.reason,
      dataMissing: raw.dataMissing ?? false,
    };
  });

  const categories: CategoryResult[] = CATEGORY_DEFINITIONS.map((definition) => {
    const categoryFactors = factors.filter((factor) => factor.category === definition.key);
    return {
      key: definition.key,
      label: definition.label,
      points: round1(categoryFactors.reduce((sum, factor) => sum + factor.points, 0)),
      maxPoints: round1(categoryFactors.reduce((sum, factor) => sum + factor.maxPoints, 0)),
      factors: categoryFactors.map((factor) => ({
        ...factor,
        points: round1(factor.points),
        maxPoints: round1(factor.maxPoints),
        normalised: round3(factor.normalised),
      })),
    };
  });

  const rawTotal = categories.reduce((sum, category) => sum + category.points, 0);

  const blockers = evaluateBlockers(twin, chain, isCurrentDeployment);
  const penalties = evaluatePenalties(twin, chain);

  const hardBlocked = blockers.some((blocker) => blocker.hard);
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + penalty.points, 0);

  const deterministicScore = hardBlocked
    ? 0
    : round1(Math.min(100, Math.max(0, rawTotal - penaltyTotal)));

  const { confidence, missingData } = computeConfidence(twin, chain, factors);

  const breakdown: ScoreBreakdown = {
    scoringVersion: SCORING_VERSION,
    categories,
    penalties,
    blockers,
    appliedWeights: roundWeights(weights),
    rawTotal: round1(rawTotal),
    deterministicScore,
  };

  return {
    chainSlug: chain.slug,
    chainName: chain.name,
    deterministicScore,
    confidence,
    breakdown,
    blockers: blockers.map((blocker) => blocker.message),
    missingData,
    isCurrentDeployment,
  };
}

export function scoreChains(
  twin: DigitalTwin,
  chains: ChainRecord[],
  options: ScoreChainsOptions = {},
): ChainScoreResult[] {
  const weights = options.weights ?? computeWeights(twin.objectives, twin.objectives[0]);
  return chains
    .map((chain) => scoreChain(twin, chain, weights))
    .sort((a, b) => {
      // Current deployments rank last among equals; they are not expansion targets.
      if (a.isCurrentDeployment !== b.isCurrentDeployment) return a.isCurrentDeployment ? 1 : -1;
      if (b.deterministicScore !== a.deterministicScore) return b.deterministicScore - a.deterministicScore;
      return b.confidence - a.confidence;
    });
}

/**
 * Applies a model-proposed adjustment. The clamp is the security boundary: no
 * matter what the model returns, it can move a score by at most ±5 points, and
 * the base score is preserved separately so the user always sees both.
 */
export const MAX_AI_ADJUSTMENT = 5;

export function applyAiAdjustment(
  deterministicScore: number,
  proposedAdjustment: number,
  hasJustification: boolean,
): { aiAdjustment: number; finalScore: number } {
  if (!Number.isFinite(proposedAdjustment) || !hasJustification) {
    return { aiAdjustment: 0, finalScore: round1(deterministicScore) };
  }
  const aiAdjustment = round1(
    Math.min(MAX_AI_ADJUSTMENT, Math.max(-MAX_AI_ADJUSTMENT, proposedAdjustment)),
  );
  const finalScore = round1(Math.min(100, Math.max(0, deterministicScore + aiAdjustment)));
  return { aiAdjustment, finalScore };
}

export type Recommendation =
  | 'primary'
  | 'secondary'
  | 'monitor'
  | 'not_recommended'
  | 'blocked'
  | 'current';

export function deriveRecommendation(
  result: { finalScore: number; blockers: string[]; isCurrentDeployment: boolean },
  rank: number,
): Recommendation {
  if (result.isCurrentDeployment) return 'current';
  if (result.blockers.length > 0 && result.finalScore === 0) return 'blocked';
  if (rank === 1 && result.finalScore >= 55) return 'primary';
  if (rank <= 3 && result.finalScore >= 50) return 'secondary';
  if (result.finalScore >= 40) return 'monitor';
  return 'not_recommended';
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  primary: 'Recommended first',
  secondary: 'Strong secondary',
  monitor: 'Worth monitoring',
  not_recommended: 'Not recommended now',
  blocked: 'Blocked by constraints',
  current: 'Current deployment',
};

/** Overall report confidence: score-weighted mean of the top candidates. */
export function overallConfidence(results: Array<{ confidence: number; deterministicScore: number }>): number {
  const candidates = results.filter((result) => result.deterministicScore > 0).slice(0, 5);
  if (candidates.length === 0) return 0;
  const totalWeight = candidates.reduce((sum, result) => sum + result.deterministicScore, 0);
  if (totalWeight === 0) return 0;
  const weighted = candidates.reduce(
    (sum, result) => sum + result.confidence * result.deterministicScore,
    0,
  );
  return Math.round(weighted / totalWeight);
}

// ── Internals ────────────────────────────────────────────────────────────────

const round1 = (value: number) => Math.round(value * 10) / 10;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

function roundWeights(weights: Record<CategoryKey, number>): Record<CategoryKey, number> {
  const output = {} as Record<CategoryKey, number>;
  for (const [key, value] of Object.entries(weights)) {
    output[key as CategoryKey] = round1(value);
  }
  return output;
}

/**
 * Slug → family lookup used by the diversification factor. Built lazily from the
 * knowledge base to avoid a circular import at module-evaluation time.
 */
const CHAIN_FAMILY_LOOKUP = new Map<string, string>();

export function registerChainFamilies(chains: ChainRecord[]): void {
  for (const chain of chains) {
    CHAIN_FAMILY_LOOKUP.set(chain.slug, chain.family);
    CHAIN_FAMILY_LOOKUP.set(chain.name.toLowerCase(), chain.family);
  }
}
