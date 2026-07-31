/**
 * Chain knowledge base — type definitions.
 *
 * Deliberate design choice: almost every field is a **categorical band**, not an
 * exact figure. Exact throughput / fee / TVL numbers move constantly and any
 * hardcoded value would be wrong within weeks. Bands are defensible, stable, and
 * honest about their own precision. Where a live figure genuinely helps
 * (stablecoin + DeFi TVL) it is fetched from a public source at runtime and
 * always carries its own provenance — see `src/lib/chains/live-data.ts`.
 */

export type EcosystemFamily =
  | 'ethereum-l1'
  | 'ethereum-l2-optimistic'
  | 'ethereum-l2-zk'
  | 'ethereum-sidechain'
  | 'alt-l1-evm'
  | 'alt-l1-svm'
  | 'alt-l1-move'
  | 'alt-l1-wasm'
  | 'modular-da'
  | 'appchain-framework';

export type ExecutionEnvironment = 'EVM' | 'SVM' | 'MoveVM' | 'CosmWasm' | 'NEAR-VM' | 'DA-layer';

/** Ordered low → high. Comparable via `BAND_INDEX`. */
export type Band = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';

export const BAND_INDEX: Record<Band, number> = {
  'very-low': 0,
  low: 1,
  moderate: 2,
  high: 3,
  'very-high': 4,
};

/** Normalises a band to 0–1 for scoring. */
export function bandValue(band: Band): number {
  return BAND_INDEX[band] / 4;
}

export const BAND_LABEL: Record<Band, string> = {
  'very-low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
};

/** How long until a transaction is economically safe to treat as final. */
export type FinalityProfile =
  | 'sub-second'
  | 'seconds'
  | 'under-a-minute'
  | 'minutes'
  | 'challenge-period';

export const FINALITY_LABEL: Record<FinalityProfile, string> = {
  'sub-second': 'Sub-second',
  seconds: 'Seconds',
  'under-a-minute': 'Under a minute',
  minutes: 'Minutes',
  'challenge-period': 'Optimistic challenge period',
};

/** Relative cost of a typical user transaction, not an absolute price. */
export type CostBand = 'negligible' | 'very-low' | 'low' | 'moderate' | 'high';

export const COST_INDEX: Record<CostBand, number> = {
  negligible: 0,
  'very-low': 1,
  low: 2,
  moderate: 3,
  high: 4,
};

export const COST_LABEL: Record<CostBand, string> = {
  negligible: 'Negligible',
  'very-low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

/** Lower cost is better, so this inverts the index. */
export function costValue(cost: CostBand): number {
  return 1 - COST_INDEX[cost] / 4;
}

export type SecurityModel =
  | 'l1-consensus'
  | 'l2-fraud-proof'
  | 'l2-validity-proof'
  | 'l2-with-training-wheels'
  | 'independent-consensus'
  | 'sidechain-consensus'
  | 'shared-security';

export const SECURITY_MODEL_LABEL: Record<SecurityModel, string> = {
  'l1-consensus': 'Layer-1 consensus',
  'l2-fraud-proof': 'Rollup with fraud proofs',
  'l2-validity-proof': 'Rollup with validity proofs',
  'l2-with-training-wheels': 'Rollup with operator safeguards',
  'independent-consensus': 'Independent validator set',
  'sidechain-consensus': 'Sidechain validator set',
  'shared-security': 'Shared / delegated security',
};

/** How much we trust the record itself. Surfaced next to every derived score. */
export type DataConfidence = 'high' | 'medium' | 'low';

export type ProductSuitability = {
  defi: Band;
  consumer: Band;
  gaming: Band;
  institutional: Band;
  tokenizedAssets: Band;
  payments: Band;
  infrastructure: Band;
  social: Band;
};

export type ChainRecord = {
  slug: string;
  name: string;
  shortName: string;
  family: EcosystemFamily;
  executionEnvironment: ExecutionEnvironment;
  /** Additional VMs reachable on the same chain (e.g. Aptos/Sui EVM bridges). */
  contractLanguages: string[];

  finality: FinalityProfile;
  transactionCost: CostBand;

  developerToolingMaturity: Band;
  stablecoinLiquidity: Band;
  /** Depth and breadth of DeFi money markets / DEX liquidity. */
  defiLiquidityDepth: Band;
  retailUserBase: Band;
  institutionalPresence: Band;

  suitability: ProductSuitability;

  /** Maturity of canonical bridges, messaging layers and interop tooling. */
  crossChainMaturity: Band;
  /** Cost of running infrastructure: nodes, indexers, relayers, monitoring. */
  operationalComplexity: Band;

  securityModel: SecurityModel;
  /** Short factual notes a reviewer can verify; no marketing claims. */
  securityNotes: string;

  /** Broad geographic centre of gravity for users and builders. */
  geographicStrength: string[];

  /** Things this chain genuinely does well, in plain language. */
  strengths: string[];
  /** Honest trade-offs. Every chain has some. */
  tradeoffs: string[];

  /** Ecosystem grant / BD support availability. */
  ecosystemSupport: Band;

  dataConfidence: DataConfidence;
  /** ISO date the categorical assessment was last reviewed by a human. */
  reviewedAt: string;
  /** Public references a reviewer can check. */
  references: string[];

  /** Optional DeFiLlama chain identifier used to enrich this record at runtime. */
  defillamaId?: string;
};

export type LiveMetricStatus = 'live' | 'cached' | 'seeded' | 'unavailable';

export type LiveChainMetrics = {
  slug: string;
  /** Total value locked in USD, as reported by the public source. */
  tvlUsd: number | null;
  /** Stablecoin market cap on the chain in USD, when the source provides it. */
  stablecoinUsd: number | null;
  source: string;
  status: LiveMetricStatus;
  fetchedAt: string | null;
};

export type EnrichedChain = ChainRecord & {
  live: LiveChainMetrics;
};
