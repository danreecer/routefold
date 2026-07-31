import type { DigitalTwin } from '@/lib/schemas/twin';

/**
 * The public example analysis.
 *
 * MERIDIAN RESERVE is a fictional protocol invented for this example. It is not
 * a real company, it has not commissioned anything, and no real organisation's
 * branding, data or identity appears anywhere in it. Every surface that renders
 * this analysis is labelled "Example analysis — fictional project".
 *
 * The Digital Twin below is hand-authored. The chain scores shown alongside it
 * are NOT hand-authored: they are computed at request time by the same
 * deterministic engine that scores real analyses, from this twin. That is the
 * point of the example — a reviewer can read the methodology page, look at the
 * factor table, and verify that the numbers follow from the documented rules.
 */

export const EXAMPLE_PROJECT_NAME = 'Meridian Reserve';
export const EXAMPLE_SLUG = 'meridian-reserve';

export const EXAMPLE_TWIN: DigitalTwin = {
  productName: EXAMPLE_PROJECT_NAME,
  productCategory: 'tokenized-assets',
  oneLineDescription:
    'Tokenized short-duration treasury exposure with onchain redemption, issued to verified institutional counterparties.',

  architecture: {
    summary:
      'A permissioned issuance contract mints a yield-bearing share token against an offchain custodied treasury portfolio. An attestation oracle publishes daily net asset value; redemption is processed onchain against a liquidity buffer and settled offchain beyond it. An allowlist registry gates transfer and redemption to verified addresses.',
    contractComplexity: 'high',
    upgradeability: 'proxy-upgradeable',
    externalDependencies: [
      'Net asset value attestation oracle',
      'Offchain custodian and transfer agent',
      'Identity verification provider feeding the allowlist registry',
      'Stablecoin used as the subscription and redemption leg',
    ],
    offchainComponents: [
      'Subscription and redemption operations desk',
      'Portfolio management and custody reconciliation',
      'Compliance screening and periodic re-verification',
    ],
  },

  currentChains: ['ethereum'],
  vmRequirement: 'EVM',
  vmRequirementReason:
    'The issuance, registry and redemption contracts are an audited Solidity codebase. A non-EVM deployment would be a full reimplementation and a new audit, not a port.',
  contractLanguages: ['Solidity'],

  users: {
    primaryProfile: 'institutional',
    secondaryProfiles: ['professional-trader'],
    estimatedSophistication: 'high',
    walletExpectations:
      'Institutional counterparties operate multi-signature or MPC custody. Self-custody consumer wallets are out of scope; every holding address must clear the allowlist first.',
  },

  liquidity: {
    requiresDeepLiquidity: true,
    stablecoinDependency: 'critical',
    requiredAssets: ['USDC', 'USDT'],
    notes:
      'Subscription and redemption both settle in stablecoins. Secondary transfer between verified holders needs a venue with genuine depth, otherwise the token trades at a discount to attested net asset value and undermines the product.',
  },

  transactions: {
    profile: 'low-frequency-high-value',
    latencySensitivity: 'low',
    costSensitivity: 'low',
    finalityRequirement: 'minutes',
  },

  security: {
    sensitivity: 'critical',
    valueAtRisk: 'very-high',
    auditStatus: 'completed',
    notes:
      'Contracts hold a claim on a custodied portfolio. A registry or issuance compromise is a direct loss of principal for institutional holders, with consequences beyond the protocol itself.',
  },

  orientation: 'institutional',
  targetGeographies: ['North America', 'Europe', 'Asia'],

  constraints: {
    timeHorizon: 'two-quarters',
    teamCapacity: 'medium',
    budgetSensitivity: 'well-funded',
    excludedEcosystems: ['bnb-chain'],
    requiredVm: 'EVM',
    other: [
      'Every deployment must support address-level transfer restriction at the contract layer.',
      'The attestation oracle must be able to publish to any target chain without a bespoke integration.',
    ],
  },

  objectives: ['institutional-adoption', 'liquidity', 'geographic-expansion'],
  objectiveNotes:
    'The constraint is distribution, not issuance. Counterparties increasingly hold treasury on chains other than Ethereum mainnet and will not bridge in order to subscribe.',
  preferredEcosystems: [],

  developmentStage: 'mainnet-scaling',
  hasToken: true,

  assumptions: [
    'The existing Solidity codebase is deployable without structural change to any EVM-equivalent chain.',
    'The attestation oracle can publish to additional chains without redesign.',
    'Institutional counterparties will accept a rollup security model for a treasury-backed instrument, subject to review.',
    'Redemption liquidity buffers can be funded per chain rather than shared across chains.',
  ],

  missingData: [
    'The proportion of existing counterparties already operating on each candidate chain is not known.',
    'Whether the custodian supports settlement instructions referencing a non-mainnet deployment is unconfirmed.',
    'Per-chain regulatory treatment of the share token has not been assessed.',
  ],

  confidence: 78,
};

/** Illustrative source records shown in the example's Sources section. */
export const EXAMPLE_SOURCES = [
  {
    url: 'https://meridian-reserve.example/',
    kind: 'website',
    status: 'SUCCESS',
    retrievedAt: '2026-07-14T09:12:00.000Z',
    wordCount: 1840,
    failureReason: null,
  },
  {
    url: 'https://docs.meridian-reserve.example/protocol',
    kind: 'docs',
    status: 'SUCCESS',
    retrievedAt: '2026-07-14T09:12:04.000Z',
    wordCount: 6120,
    failureReason: null,
  },
] as const;
