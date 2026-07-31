import { z } from 'zod';

/**
 * The Multichain Digital Twin — Routefold's structured representation of a
 * product. Every downstream stage reads from this document, so it is the single
 * most important contract in the system and is validated on the way in and out.
 */

export const productCategorySchema = z.enum([
  'defi-lending',
  'defi-dex',
  'defi-derivatives',
  'defi-yield',
  'stablecoin',
  'tokenized-assets',
  'payments',
  'wallet',
  'infrastructure',
  'oracle',
  'gaming',
  'nft-marketplace',
  'social',
  'identity',
  'dao-tooling',
  'exchange',
  'other',
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  'defi-lending': 'DeFi — lending & credit',
  'defi-dex': 'DeFi — spot exchange',
  'defi-derivatives': 'DeFi — derivatives & perps',
  'defi-yield': 'DeFi — yield & asset management',
  stablecoin: 'Stablecoin issuer',
  'tokenized-assets': 'Tokenized real-world assets',
  payments: 'Payments & remittance',
  wallet: 'Wallet',
  infrastructure: 'Infrastructure & developer tooling',
  oracle: 'Oracle & data',
  gaming: 'Gaming',
  'nft-marketplace': 'NFT & digital collectibles',
  social: 'Social & consumer',
  identity: 'Identity & attestation',
  'dao-tooling': 'Governance & DAO tooling',
  exchange: 'Centralised or hybrid exchange',
  other: 'Other',
};

export const vmRequirementSchema = z.enum(['EVM', 'SVM', 'MoveVM', 'CosmWasm', 'NEAR-VM', 'any']);
export type VmRequirement = z.infer<typeof vmRequirementSchema>;

export const developmentStageSchema = z.enum([
  'concept',
  'prototype',
  'testnet',
  'mainnet-early',
  'mainnet-scaling',
  'mature',
]);
export type DevelopmentStage = z.infer<typeof developmentStageSchema>;

export const DEVELOPMENT_STAGE_LABELS: Record<DevelopmentStage, string> = {
  concept: 'Concept / pre-build',
  prototype: 'Prototype',
  testnet: 'Testnet',
  'mainnet-early': 'Mainnet — early traction',
  'mainnet-scaling': 'Mainnet — scaling',
  mature: 'Mature / established',
};

export const objectiveSchema = z.enum([
  'user-growth',
  'liquidity',
  'institutional-adoption',
  'lower-transaction-costs',
  'consumer-distribution',
  'developer-expansion',
  'geographic-expansion',
  'other',
]);
export type Objective = z.infer<typeof objectiveSchema>;

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  'user-growth': 'User growth',
  liquidity: 'Liquidity depth',
  'institutional-adoption': 'Institutional adoption',
  'lower-transaction-costs': 'Lower transaction costs',
  'consumer-distribution': 'Consumer distribution',
  'developer-expansion': 'Developer expansion',
  'geographic-expansion': 'Geographic expansion',
  other: 'Other',
};

export const OBJECTIVE_DESCRIPTIONS: Record<Objective, string> = {
  'user-growth': 'Reach more end users than the current deployment can.',
  liquidity: 'Access deeper stablecoin and trading liquidity.',
  'institutional-adoption': 'Meet the requirements of regulated or institutional counterparties.',
  'lower-transaction-costs': 'Make per-transaction economics viable at higher volume.',
  'consumer-distribution': 'Reach mainstream consumers through wallets and apps with real reach.',
  'developer-expansion': 'Attract integrators building on top of the product.',
  'geographic-expansion': 'Enter specific regional markets.',
  other: 'A goal not covered by the options above.',
};

export const sensitivitySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Sensitivity = z.infer<typeof sensitivitySchema>;

export const budgetSensitivitySchema = z.enum(['minimal', 'constrained', 'moderate', 'well-funded']);
export type BudgetSensitivity = z.infer<typeof budgetSensitivitySchema>;

export const BUDGET_LABELS: Record<BudgetSensitivity, string> = {
  minimal: 'Minimal — every cost matters',
  constrained: 'Constrained — prioritise cheap execution',
  moderate: 'Moderate — cost is one factor of several',
  'well-funded': 'Well funded — optimise for outcome over cost',
};

export const timeHorizonSchema = z.enum(['weeks', 'one-quarter', 'two-quarters', 'a-year-plus']);
export type TimeHorizon = z.infer<typeof timeHorizonSchema>;

export const TIME_HORIZON_LABELS: Record<TimeHorizon, string> = {
  weeks: 'Weeks',
  'one-quarter': 'One quarter',
  'two-quarters': 'Two quarters',
  'a-year-plus': 'A year or more',
};

export const teamCapacitySchema = z.enum(['solo', 'small', 'medium', 'large']);
export type TeamCapacity = z.infer<typeof teamCapacitySchema>;

export const TEAM_CAPACITY_LABELS: Record<TeamCapacity, string> = {
  solo: 'One engineer',
  small: '2–4 engineers',
  medium: '5–15 engineers',
  large: '15+ engineers',
};

export const userProfileSchema = z.enum([
  'retail-consumer',
  'crypto-native',
  'professional-trader',
  'institutional',
  'developer',
  'enterprise',
  'mixed',
]);
export type UserProfileType = z.infer<typeof userProfileSchema>;

export const USER_PROFILE_LABELS: Record<UserProfileType, string> = {
  'retail-consumer': 'Mainstream retail consumers',
  'crypto-native': 'Crypto-native users',
  'professional-trader': 'Professional traders',
  institutional: 'Institutions',
  developer: 'Developers',
  enterprise: 'Enterprises',
  mixed: 'Mixed audience',
};

export const transactionProfileSchema = z.enum([
  'low-frequency-high-value',
  'high-frequency-low-value',
  'balanced',
  'batch-settlement',
]);
export type TransactionProfile = z.infer<typeof transactionProfileSchema>;

export const TRANSACTION_PROFILE_LABELS: Record<TransactionProfile, string> = {
  'low-frequency-high-value': 'Infrequent, high value',
  'high-frequency-low-value': 'Frequent, low value',
  balanced: 'Balanced',
  'batch-settlement': 'Batched settlement',
};

/** Marks whether a twin field was derived from a source or supplied by the user. */
export const fieldProvenanceSchema = z.enum(['source', 'user', 'inferred', 'default']);
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;

/** Stage 1 output: what could be established about the product itself. */
export const projectProfileSchema = z.object({
  name: z.string().min(1).max(120),
  oneLineDescription: z.string().min(1).max(300),
  summary: z.string().min(1).max(2000),
  category: productCategorySchema,
  categoryRationale: z.string().max(600).default(''),
  detectedChains: z.array(z.string().max(60)).max(30).default([]),
  detectedContractLanguages: z.array(z.string().max(40)).max(12).default([]),
  hasToken: z.boolean().nullable().default(null),
  tokenNotes: z.string().max(600).default(''),
  targetUsers: z.array(z.string().max(120)).max(10).default([]),
  keyFeatures: z.array(z.string().max(200)).max(12).default([]),
  integrations: z.array(z.string().max(120)).max(20).default([]),
  extractionConfidence: z.number().int().min(0).max(100),
  missingInformation: z.array(z.string().max(200)).max(20).default([]),
  assumptions: z.array(z.string().max(300)).max(20).default([]),
});
export type ProjectProfile = z.infer<typeof projectProfileSchema>;

/** Stage 2 output: the Multichain Digital Twin. */
export const digitalTwinSchema = z.object({
  productName: z.string().min(1).max(120),
  productCategory: productCategorySchema,
  oneLineDescription: z.string().min(1).max(300),

  architecture: z.object({
    summary: z.string().min(1).max(1500),
    contractComplexity: sensitivitySchema,
    upgradeability: z.enum(['immutable', 'proxy-upgradeable', 'unknown']),
    externalDependencies: z.array(z.string().max(160)).max(20).default([]),
    offchainComponents: z.array(z.string().max(160)).max(20).default([]),
  }),

  currentChains: z.array(z.string().max(60)).max(30).default([]),
  vmRequirement: vmRequirementSchema,
  vmRequirementReason: z.string().max(600).default(''),
  contractLanguages: z.array(z.string().max(40)).max(12).default([]),

  users: z.object({
    primaryProfile: userProfileSchema,
    secondaryProfiles: z.array(userProfileSchema).max(4).default([]),
    estimatedSophistication: sensitivitySchema,
    walletExpectations: z.string().max(600).default(''),
  }),

  liquidity: z.object({
    requiresDeepLiquidity: z.boolean(),
    stablecoinDependency: sensitivitySchema,
    requiredAssets: z.array(z.string().max(60)).max(20).default([]),
    notes: z.string().max(800).default(''),
  }),

  transactions: z.object({
    profile: transactionProfileSchema,
    latencySensitivity: sensitivitySchema,
    costSensitivity: sensitivitySchema,
    finalityRequirement: z.enum(['sub-second', 'seconds', 'minutes', 'flexible']),
  }),

  security: z.object({
    sensitivity: sensitivitySchema,
    valueAtRisk: z.enum(['low', 'moderate', 'high', 'very-high', 'unknown']),
    auditStatus: z.enum(['none', 'planned', 'in-progress', 'completed', 'unknown']),
    notes: z.string().max(800).default(''),
  }),

  orientation: z.enum(['consumer', 'institutional', 'both', 'developer']),
  targetGeographies: z.array(z.string().max(60)).max(12).default([]),

  constraints: z.object({
    timeHorizon: timeHorizonSchema,
    teamCapacity: teamCapacitySchema,
    budgetSensitivity: budgetSensitivitySchema,
    excludedEcosystems: z.array(z.string().max(60)).max(20).default([]),
    requiredVm: vmRequirementSchema.nullable().default(null),
    other: z.array(z.string().max(300)).max(12).default([]),
  }),

  objectives: z.array(objectiveSchema).min(1).max(8),
  objectiveNotes: z.string().max(1000).default(''),
  preferredEcosystems: z.array(z.string().max(60)).max(20).default([]),

  developmentStage: developmentStageSchema,
  hasToken: z.boolean().nullable().default(null),

  assumptions: z.array(z.string().max(300)).max(24).default([]),
  missingData: z.array(z.string().max(200)).max(24).default([]),
  confidence: z.number().int().min(0).max(100),
});
export type DigitalTwin = z.infer<typeof digitalTwinSchema>;

/** Per-field provenance map shown in the review step. */
export const fieldSourcesSchema = z.record(z.string(), fieldProvenanceSchema);
export type FieldSources = z.infer<typeof fieldSourcesSchema>;
