/**
 * Scoring engine types.
 *
 * The engine is pure: `(DigitalTwin, ChainRecord[]) → ChainScoreResult[]`.
 * No I/O, no model calls, no randomness. That makes it unit-testable and makes
 * every number on the scorecard reproducible and explainable.
 */

export const SCORING_VERSION = '1.0.0';

export type CategoryKey =
  | 'product-ecosystem-fit'
  | 'users-and-liquidity'
  | 'technical-compatibility'
  | 'cost-and-operational-fit'
  | 'strategic-optionality';

export type FactorKey =
  // Product–ecosystem fit
  | 'category-suitability'
  | 'orientation-alignment'
  | 'geographic-alignment'
  | 'stage-support-alignment'
  // Users and liquidity
  | 'liquidity-depth'
  | 'stablecoin-availability'
  | 'user-base-reach'
  // Technical compatibility
  | 'vm-compatibility'
  | 'language-reuse'
  | 'finality-match'
  | 'security-model-fit'
  // Cost and operational fit
  | 'transaction-cost-fit'
  | 'operational-complexity-fit'
  | 'tooling-maturity-fit'
  // Strategic optionality
  | 'ecosystem-support'
  | 'diversification'
  | 'interop-reach';

export type FactorDefinition = {
  key: FactorKey;
  category: CategoryKey;
  label: string;
  /** Maximum points at the engine's default weighting. */
  maxPoints: number;
  /** Plain-language description shown on /methodology and in tooltips. */
  description: string;
};

export type CategoryDefinition = {
  key: CategoryKey;
  label: string;
  /** Base allocation from the published methodology. */
  basePoints: number;
  description: string;
};

export type FactorResult = {
  key: FactorKey;
  label: string;
  category: CategoryKey;
  /** 0–1 normalised score before weighting. */
  normalised: number;
  /** Points actually awarded after weighting. */
  points: number;
  /** Points available for this factor in this particular run. */
  maxPoints: number;
  /** Short human-readable reason, generated deterministically. */
  reason: string;
  /** True when the factor had to fall back to a default because data was absent. */
  dataMissing: boolean;
};

export type CategoryResult = {
  key: CategoryKey;
  label: string;
  points: number;
  maxPoints: number;
  factors: FactorResult[];
};

export type Blocker = {
  code: 'excluded-by-user' | 'vm-incompatible' | 'not-a-deployment-target' | 'already-deployed';
  message: string;
  /** A hard blocker zeroes the score; a soft blocker only penalises it. */
  hard: boolean;
};

export type Penalty = {
  code: string;
  message: string;
  /** Points subtracted from the weighted total. */
  points: number;
};

export type ScoreBreakdown = {
  scoringVersion: string;
  categories: CategoryResult[];
  penalties: Penalty[];
  blockers: Blocker[];
  /** Category weights actually used, after objective tilt and renormalisation. */
  appliedWeights: Record<CategoryKey, number>;
  /** Raw weighted total before penalties. */
  rawTotal: number;
  /** After penalties and clamping to 0–100. */
  deterministicScore: number;
};

export type ChainScoreResult = {
  chainSlug: string;
  chainName: string;
  deterministicScore: number;
  confidence: number;
  breakdown: ScoreBreakdown;
  blockers: string[];
  missingData: string[];
  /** True when the product is already live here. */
  isCurrentDeployment: boolean;
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'product-ecosystem-fit',
    label: 'Product–ecosystem fit',
    basePoints: 30,
    description:
      'Whether this ecosystem is a natural home for this kind of product: does its existing activity, audience orientation and regional strength match what the product does?',
  },
  {
    key: 'users-and-liquidity',
    label: 'Users and liquidity',
    basePoints: 25,
    description:
      'Whether the users and on-chain capital the product needs are actually present, at the depth the product requires.',
  },
  {
    key: 'technical-compatibility',
    label: 'Technical compatibility',
    basePoints: 20,
    description:
      'How much of the existing codebase, tooling, audit surface and security posture carries over without a rewrite.',
  },
  {
    key: 'cost-and-operational-fit',
    label: 'Cost and operational fit',
    basePoints: 15,
    description:
      'Whether per-transaction economics work for this product and whether the team can realistically operate here.',
  },
  {
    key: 'strategic-optionality',
    label: 'Strategic optionality',
    basePoints: 10,
    description:
      'What this deployment opens up beyond itself: ecosystem support, portfolio diversification, and onward reach to other chains.',
  },
];

export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  {
    key: 'category-suitability',
    category: 'product-ecosystem-fit',
    label: 'Category suitability',
    maxPoints: 14,
    description:
      "How well established this product's category already is on the chain, using the knowledge base's per-category suitability band.",
  },
  {
    key: 'orientation-alignment',
    category: 'product-ecosystem-fit',
    label: 'Audience orientation',
    maxPoints: 8,
    description:
      'Alignment between the product\'s consumer / institutional / developer orientation and the chain\'s centre of gravity.',
  },
  {
    key: 'geographic-alignment',
    category: 'product-ecosystem-fit',
    label: 'Geographic alignment',
    maxPoints: 4,
    description:
      "Overlap between the product's target regions and the chain's regional strength. Neutral when no target region is set.",
  },
  {
    key: 'stage-support-alignment',
    category: 'product-ecosystem-fit',
    label: 'Stage & ecosystem support',
    maxPoints: 4,
    description:
      'Earlier-stage products gain more from ecosystems with active grant and business-development support; mature products gain less.',
  },
  {
    key: 'liquidity-depth',
    category: 'users-and-liquidity',
    label: 'Liquidity depth',
    maxPoints: 10,
    description:
      'DeFi liquidity depth measured against whether the product actually needs it. Products that do not need deep liquidity are not penalised for shallow markets.',
  },
  {
    key: 'stablecoin-availability',
    category: 'users-and-liquidity',
    label: 'Stablecoin availability',
    maxPoints: 7,
    description:
      "Stablecoin depth measured against the product's stated stablecoin dependency.",
  },
  {
    key: 'user-base-reach',
    category: 'users-and-liquidity',
    label: 'User base reach',
    maxPoints: 8,
    description:
      "Size of the chain's user base for the specific audience the product targets — retail, institutional, or developer.",
  },
  {
    key: 'vm-compatibility',
    category: 'technical-compatibility',
    label: 'Virtual-machine compatibility',
    maxPoints: 9,
    description:
      'Whether existing contracts can deploy as-is, need adaptation, or need a full rewrite in another language.',
  },
  {
    key: 'language-reuse',
    category: 'technical-compatibility',
    label: 'Language & tooling reuse',
    maxPoints: 3,
    description:
      "Overlap between the languages the team already writes and the languages the chain accepts.",
  },
  {
    key: 'finality-match',
    category: 'technical-compatibility',
    label: 'Finality match',
    maxPoints: 3,
    description:
      "Whether the chain's finality profile satisfies the product's stated settlement requirement.",
  },
  {
    key: 'security-model-fit',
    category: 'technical-compatibility',
    label: 'Security-model fit',
    maxPoints: 5,
    description:
      "Whether the chain's trust assumptions are acceptable given how much value the product puts at risk.",
  },
  {
    key: 'transaction-cost-fit',
    category: 'cost-and-operational-fit',
    label: 'Transaction cost fit',
    maxPoints: 7,
    description:
      "Per-transaction cost band weighed against the product's transaction profile and cost sensitivity.",
  },
  {
    key: 'operational-complexity-fit',
    category: 'cost-and-operational-fit',
    label: 'Operational capacity',
    maxPoints: 5,
    description:
      'Whether the operational burden of running here is realistic for the stated team size and budget.',
  },
  {
    key: 'tooling-maturity-fit',
    category: 'cost-and-operational-fit',
    label: 'Tooling maturity',
    maxPoints: 3,
    description:
      'Developer-tooling maturity, weighted more heavily when the delivery time horizon is short.',
  },
  {
    key: 'ecosystem-support',
    category: 'strategic-optionality',
    label: 'Ecosystem support',
    maxPoints: 3,
    description: 'Availability of grants, business development and go-to-market support.',
  },
  {
    key: 'diversification',
    category: 'strategic-optionality',
    label: 'Portfolio diversification',
    maxPoints: 3,
    description:
      'How much this deployment reduces concentration in the family the product is already exposed to.',
  },
  {
    key: 'interop-reach',
    category: 'strategic-optionality',
    label: 'Interoperability reach',
    maxPoints: 4,
    description:
      'Maturity of messaging and bridging infrastructure, which determines how easily the next expansion follows this one.',
  },
];

export const FACTORS_BY_CATEGORY = CATEGORY_DEFINITIONS.map((category) => ({
  ...category,
  factors: FACTOR_DEFINITIONS.filter((factor) => factor.category === category.key),
}));

export function categoryLabel(key: CategoryKey): string {
  return CATEGORY_DEFINITIONS.find((c) => c.key === key)?.label ?? key;
}
