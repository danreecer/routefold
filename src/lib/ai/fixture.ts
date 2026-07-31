import type { ChainRecord } from '@/lib/chains/types';
import { getChain } from '@/lib/chains/knowledge-base';
import type {
  ArchitectureBrief,
  ChainInterpretation,
  ExecutionPlan,
  ExecutiveSummary,
  ExpansionSequence,
  RiskRegister,
  TechnicalBrief,
} from '@/lib/schemas/report';
import type { DigitalTwin, ProductCategory } from '@/lib/schemas/twin';
import { PRODUCT_CATEGORY_LABELS } from '@/lib/schemas/twin';
import type { WizardInput } from '@/lib/schemas/wizard';
import type { ChainScoreResult } from '@/lib/scoring';
import type { RankedChainSummary } from './stages';

/**
 * Deterministic fixture pipeline.
 *
 * Purpose: let a developer exercise the entire wizard → report flow locally
 * without an Anthropic key, and let the test suite run without paid API calls.
 *
 * Two rules this module exists to enforce:
 *  1. Fixture output is derived from the *real* deterministic scoring engine, so
 *     the numbers on screen are genuine and the UI is exercised properly.
 *  2. Fixture output is never substituted for a failed live call. It is only
 *     reachable when ROUTEFOLD_FIXTURE_MODE is explicitly on and no live key is
 *     configured, and everything it produces is stored with modelName
 *     "fixture" and labelled in the interface.
 */

export const FIXTURE_MODEL_NAME = 'fixture';

export function buildFixtureProfile(input: WizardInput) {
  const description =
    input.manualDescription.trim() ||
    `${input.productName} is a ${PRODUCT_CATEGORY_LABELS[input.category].toLowerCase()} product currently operating on ${
      input.currentChains.length > 0 ? input.currentChains.join(', ') : 'a single chain'
    }.`;

  return {
    name: input.productName,
    oneLineDescription: `${PRODUCT_CATEGORY_LABELS[input.category]} — ${input.developmentStage.replace(/-/g, ' ')}`,
    summary: description,
    category: input.category,
    categoryRationale: 'Category was supplied directly by the user in the analysis wizard.',
    detectedChains: input.currentChains,
    detectedContractLanguages: input.contractLanguages,
    hasToken: input.hasToken === 'yes' ? true : input.hasToken === 'no' ? false : null,
    tokenNotes:
      input.hasToken === 'planned'
        ? 'A token is planned but not yet live, per the user.'
        : '',
    targetUsers: [input.primaryUsers],
    keyFeatures: [],
    integrations: [],
    extractionConfidence: 45,
    missingInformation: [
      'This profile was produced by the local fixture pipeline, not by a language model.',
      'No web sources were interpreted; only the wizard answers were used.',
    ],
    assumptions: ['All fields were taken directly from the user-supplied wizard answers.'],
  };
}

export function buildFixtureTwin(input: WizardInput): DigitalTwin {
  const liquidityHungry: ProductCategory[] = [
    'defi-lending',
    'defi-dex',
    'defi-derivatives',
    'defi-yield',
    'exchange',
    'stablecoin',
  ];
  const highFrequency: ProductCategory[] = ['payments', 'gaming', 'social', 'nft-marketplace'];

  return {
    productName: input.productName,
    productCategory: input.category,
    oneLineDescription: `${PRODUCT_CATEGORY_LABELS[input.category]} at ${input.developmentStage.replace(/-/g, ' ')} stage`,
    architecture: {
      summary:
        input.manualDescription.trim() ||
        'Architecture was not described in detail; the twin reflects the wizard answers only.',
      contractComplexity: input.securitySensitivity,
      upgradeability: 'unknown',
      externalDependencies: [],
      offchainComponents: [],
    },
    currentChains: input.currentChains,
    vmRequirement: input.vmEnvironment,
    vmRequirementReason: 'Taken from the execution environment the user reported.',
    contractLanguages: input.contractLanguages,
    users: {
      primaryProfile: input.primaryUsers,
      secondaryProfiles: [],
      estimatedSophistication:
        input.primaryUsers === 'retail-consumer' ? 'low' : input.primaryUsers === 'institutional' ? 'high' : 'medium',
      walletExpectations: '',
    },
    liquidity: {
      requiresDeepLiquidity: liquidityHungry.includes(input.category),
      stablecoinDependency: liquidityHungry.includes(input.category) ? 'high' : 'medium',
      requiredAssets: [],
      notes: '',
    },
    transactions: {
      profile: highFrequency.includes(input.category) ? 'high-frequency-low-value' : 'balanced',
      latencySensitivity: input.category === 'defi-derivatives' ? 'high' : 'medium',
      costSensitivity:
        input.budgetSensitivity === 'minimal' || highFrequency.includes(input.category) ? 'high' : 'medium',
      finalityRequirement: input.category === 'payments' ? 'seconds' : 'flexible',
    },
    security: {
      sensitivity: input.securitySensitivity,
      valueAtRisk: liquidityHungry.includes(input.category) ? 'high' : 'moderate',
      auditStatus: 'unknown',
      notes: '',
    },
    orientation:
      input.primaryUsers === 'institutional' || input.primaryUsers === 'enterprise'
        ? 'institutional'
        : input.primaryUsers === 'developer'
          ? 'developer'
          : input.primaryUsers === 'mixed'
            ? 'both'
            : 'consumer',
    targetGeographies: input.targetGeographies,
    constraints: {
      timeHorizon: input.timeHorizon,
      teamCapacity: input.teamCapacity,
      budgetSensitivity: input.budgetSensitivity,
      excludedEcosystems: input.excludedEcosystems,
      requiredVm: input.requiredVm,
      other: input.additionalContext ? [input.additionalContext] : [],
    },
    objectives: input.objectives,
    objectiveNotes: input.objectiveNotes,
    preferredEcosystems: input.preferredEcosystems,
    developmentStage: input.developmentStage,
    hasToken: input.hasToken === 'yes' ? true : input.hasToken === 'no' ? false : null,
    assumptions: [
      'Produced by the local fixture pipeline from wizard answers only — no language model was involved.',
      'Liquidity, latency and security characteristics were inferred from the product category, not from source analysis.',
    ],
    missingData: [
      'No web source was interpreted.',
      'Architecture, upgradeability and audit status were not established.',
    ],
    confidence: 45,
  };
}

export function buildFixtureInterpretations(
  scored: Array<{ chain: ChainRecord; score: ChainScoreResult }>,
): ChainInterpretation[] {
  return scored.map(({ chain, score }) => {
    const topFactors = score.breakdown.categories
      .flatMap((category) => category.factors)
      .sort((a, b) => b.points / Math.max(b.maxPoints, 0.01) - a.points / Math.max(a.maxPoints, 0.01));
    const best = topFactors.slice(0, 2);
    const worst = topFactors.slice(-2).reverse();

    return {
      chainSlug: chain.slug,
      rationale: `${chain.name} scored ${score.deterministicScore.toFixed(1)} out of 100. The strongest contributions came from ${best
        .map((factor) => `${factor.label.toLowerCase()} (${factor.points.toFixed(1)}/${factor.maxPoints.toFixed(1)})`)
        .join(' and ')}. The weakest were ${worst
        .map((factor) => `${factor.label.toLowerCase()} (${factor.points.toFixed(1)}/${factor.maxPoints.toFixed(1)})`)
        .join(' and ')}. This narrative was generated by the local fixture pipeline from the deterministic factor table; a live analysis explains the same numbers in product-specific terms.`,
      advantages: chain.strengths.slice(0, 3),
      tradeoffs: chain.tradeoffs.slice(0, 3),
      unknowns: [
        `Ecosystem data for ${chain.name} is ${chain.dataConfidence}-confidence and was last reviewed ${chain.reviewedAt}.`,
        'Fixture mode does not read the product website, so product-specific unknowns are not identified.',
      ],
      adjustment: 0,
      adjustmentReason: 'The fixture pipeline never adjusts a deterministic score.',
    };
  });
}

export function buildFixtureSequence(ranked: RankedChainSummary[]): ExpansionSequence {
  const candidates = ranked.filter((entry) => !entry.isCurrentDeployment && entry.blockers.length === 0);
  const primary = candidates[0];
  const secondary = candidates.slice(1, 3);
  const rejected = ranked.filter((entry) => entry.blockers.length > 0 || entry.finalScore < 40).slice(0, 6);

  const primarySlug = primary?.slug ?? ranked[0]?.slug ?? 'base';
  const primaryName = primary?.name ?? ranked[0]?.name ?? 'the top-ranked chain';

  return {
    primary: {
      chainSlug: primarySlug,
      reason: `${primaryName} is the highest-scoring candidate that is not already deployed and not blocked by a stated constraint, at ${(primary?.finalScore ?? 0).toFixed(1)} out of 100.`,
      timing: 'Begin once the current deployment has been stable for a full release cycle.',
    },
    secondary: secondary.map((entry) => ({
      chainSlug: entry.slug,
      reason: `${entry.name} scored ${entry.finalScore.toFixed(1)} and is the next strongest candidate.`,
      timing: 'After the primary deployment has run in production for at least one month.',
    })),
    notRecommended: rejected.map((entry) => ({
      chainSlug: entry.slug,
      reason:
        entry.blockers[0] ??
        `Scored ${entry.finalScore.toFixed(1)}, below the threshold for a recommended expansion under the stated constraints.`,
    })),
    rolloutOrder: [
      {
        step: 1,
        chainSlug: primarySlug,
        milestone: `Contracts deployed and verified on ${primaryName} testnet with the existing integration suite passing.`,
        dependsOn: [],
      },
      {
        step: 2,
        chainSlug: primarySlug,
        milestone: `${primaryName} mainnet deployment behind a supply or exposure cap, with monitoring in place.`,
        dependsOn: [primarySlug],
      },
      ...(secondary[0]
        ? [
            {
              step: 3,
              chainSlug: secondary[0].slug,
              milestone: `${secondary[0].name} evaluation reopened once the primary deployment has a month of production data.`,
              dependsOn: [primarySlug],
            },
          ]
        : []),
    ],
    decisionRationale:
      'This sequence was produced by the local fixture pipeline. It orders chains strictly by their deterministic score and by whether constraints block them. A live analysis additionally weighs dependency structure, engineering-programme boundaries and ecosystem timing.',
  };
}

export function buildFixtureArchitecture(twin: DigitalTwin, sequence: ExpansionSequence): ArchitectureBrief {
  const target = getChain(sequence.primary.chainSlug);
  const targetName = target?.name ?? sequence.primary.chainSlug;
  const homeChain = twin.currentChains[0] ?? 'the existing deployment';

  return {
    summary: `A hub-and-spoke deployment keeping ${homeChain} as the canonical accounting layer and treating ${targetName} as an independent execution surface with its own liquidity. This brief was produced by the local fixture pipeline and describes a conventional pattern rather than an analysis of this specific codebase.`,
    deploymentModel: {
      approach: 'Hub-and-spoke with a canonical home chain',
      reasoning:
        'Keeping one chain canonical avoids reconciling divergent global state across chains, at the cost of a messaging dependency for anything that must stay consistent.',
    },
    components: [
      {
        id: 'core-home',
        name: 'Core contracts (home chain)',
        layer: 'onchain',
        chainSlug: twin.currentChains[0] ?? null,
        description: 'Existing production contracts. Remain the canonical source of truth for global accounting.',
      },
      {
        id: 'core-target',
        name: `Core contracts (${targetName})`,
        layer: 'onchain',
        chainSlug: sequence.primary.chainSlug,
        description: 'A deployment of the same contracts with chain-specific configuration and its own risk parameters.',
      },
      {
        id: 'messaging',
        name: 'Cross-chain messaging',
        layer: 'external',
        chainSlug: null,
        description:
          'Carries state updates between deployments. Introduces a new trust assumption that does not exist in a single-chain system.',
      },
      {
        id: 'indexer',
        name: 'Indexing layer',
        layer: 'data',
        chainSlug: null,
        description: 'Multi-chain indexer producing a unified event stream for the application and for analytics.',
      },
      {
        id: 'frontend',
        name: 'Application frontend',
        layer: 'client',
        chainSlug: null,
        description: 'Chain-aware routing, network switching and a single account view across deployments.',
      },
      {
        id: 'monitoring',
        name: 'Monitoring and alerting',
        layer: 'offchain',
        chainSlug: null,
        description: 'Per-chain health, message-delivery latency and divergence detection between deployments.',
      },
    ],
    connections: [
      { from: 'core-home', to: 'messaging', label: 'state updates', kind: 'message' },
      { from: 'messaging', to: 'core-target', label: 'state updates', kind: 'message' },
      { from: 'core-home', to: 'indexer', label: 'events', kind: 'data' },
      { from: 'core-target', to: 'indexer', label: 'events', kind: 'data' },
      { from: 'indexer', to: 'frontend', label: 'unified read model', kind: 'data' },
      { from: 'frontend', to: 'core-target', label: 'user transactions', kind: 'user' },
      { from: 'indexer', to: 'monitoring', label: 'divergence signals', kind: 'data' },
    ],
    tokenModel:
      twin.hasToken === true
        ? 'A single canonical supply on the home chain with a lock-and-mint representation on the target chain keeps total supply verifiable. The representation contract becomes a privileged component and needs the same review as the core contracts.'
        : 'No token is in scope. Accounting units still need a defined canonical chain so balances cannot be double-counted across deployments.',
    messaging:
      'Any messaging layer adds a liveness dependency and a trust assumption. Decide explicitly whether a message failure should halt the target deployment or allow it to continue with stale state, and make that behaviour observable.',
    stateSynchronisation:
      'Only synchronise what must be globally consistent. Parameters that can safely diverge per chain — rate curves, caps, fee levels — should diverge, because every synchronised value is a message that can fail.',
    liquidity:
      'Plan the first weeks of liquidity explicitly. A deployment with no depth produces poor execution, which is visible to users immediately and hard to recover from.',
    frontendAndWallets:
      'Users should not have to understand which chain they are on. Detect the connected network, prompt to switch, and label balances by chain in the account view.',
    indexing:
      'Index every chain into one schema with an explicit chain dimension. Reorg handling and per-chain finality differences must be modelled rather than assumed away.',
    monitoring: [
      'Message delivery latency between deployments, with an alert threshold well below the point users would notice.',
      'State divergence between the canonical and target deployments, checked continuously.',
      'Per-chain RPC availability and error rate.',
      'Liquidity depth on the target chain against a floor the team sets in advance.',
      'Privileged-key usage on every deployment.',
    ],
    assumptions: [
      'This brief was generated by the local fixture pipeline and does not reflect analysis of the actual codebase.',
      'The existing deployment is assumed to hold canonical global state.',
      'No specific messaging vendor is assumed.',
    ],
  };
}

export function buildFixtureRisks(twin: DigitalTwin, sequence: ExpansionSequence): RiskRegister {
  const target = getChain(sequence.primary.chainSlug);
  const targetName = target?.name ?? sequence.primary.chainSlug;

  return {
    summary: `Expanding to ${targetName} adds a messaging trust assumption, a second operational surface and a liquidity bootstrapping problem. This register was produced by the local fixture pipeline and covers the structural risks of any multichain expansion rather than risks specific to this codebase.`,
    risks: [
      {
        id: 'R1',
        title: 'Cross-chain messaging introduces a new trust assumption',
        category: 'security',
        description:
          'A single-chain deployment has one consensus assumption. Adding a messaging layer means a compromise or liveness failure there can affect state on both chains, and the failure mode is often not visible until it is exploited.',
        probability: 'medium',
        impact: 'high',
        mitigation:
          'Document the exact trust assumption in writing. Cap the value the messaging path can move per period. Add an independent verification of message contents before privileged actions execute.',
        suggestedOwner: 'Security lead',
        isOpenQuestion: false,
      },
      {
        id: 'R2',
        title: 'The new deployment launches without sufficient liquidity',
        category: 'liquidity',
        description:
          'Thin depth at launch produces poor execution and high slippage. Early users experience the product at its worst and rarely return.',
        probability: twin.liquidity.requiresDeepLiquidity ? 'high' : 'medium',
        impact: 'high',
        mitigation:
          'Agree a minimum viable depth before launch and treat it as a launch gate. Line up liquidity commitments during the build, not after.',
        suggestedOwner: 'Ecosystem/BD',
        isOpenQuestion: false,
      },
      {
        id: 'R3',
        title: 'Operating two deployments exceeds the team\'s current capacity',
        category: 'operational',
        description: `A ${twin.constraints.teamCapacity} team taking on a second chain doubles the on-call surface, deployment pipeline and incident load without doubling headcount.`,
        probability: twin.constraints.teamCapacity === 'solo' || twin.constraints.teamCapacity === 'small' ? 'high' : 'medium',
        impact: 'medium',
        mitigation:
          'Automate deployment and verification before the second chain goes live. Define an on-call rotation that accounts for both chains. Budget explicit maintenance time.',
        suggestedOwner: 'Engineering lead',
        isOpenQuestion: false,
      },
      {
        id: 'R4',
        title: 'Privileged keys multiply across chains',
        category: 'governance',
        description:
          'Each deployment adds admin, upgrade and pause authorities. Key management that was adequate for one chain often is not for several, and the weakest deployment sets the security level.',
        probability: 'medium',
        impact: 'high',
        mitigation:
          'Inventory every privileged role per chain before launch. Use the same signer policy everywhere. Publish the key set so it can be reviewed externally.',
        suggestedOwner: 'Security lead',
        isOpenQuestion: false,
      },
      {
        id: 'R5',
        title: 'Users cannot tell which chain they are transacting on',
        category: 'user-experience',
        description:
          'Multichain products routinely confuse users about where funds are. Support load rises and users lose confidence even when nothing is technically wrong.',
        probability: 'high',
        impact: 'medium',
        mitigation:
          'Show the active chain persistently. Label balances by chain. Detect a wrong-network state and offer a one-step switch rather than an error.',
        suggestedOwner: 'Product',
        isOpenQuestion: false,
      },
      {
        id: 'R6',
        title: 'Regulatory treatment of the new deployment is unverified',
        category: 'compliance',
        description:
          'Deploying into a new ecosystem can change which users are reachable and which obligations apply. Routefold cannot assess this.',
        probability: 'medium',
        impact: 'medium',
        mitigation:
          'Put the questions below to qualified counsel before the mainnet deployment, not after.',
        suggestedOwner: 'Legal counsel',
        isOpenQuestion: true,
      },
    ],
    complianceQuestions: [
      'Does deploying on this chain change the jurisdictions in which the product is considered available?',
      'Do the target chain\'s dominant user regions introduce obligations the current deployment does not have?',
      'If a token representation is issued on the new chain, how is it characterised in the relevant jurisdictions?',
      'What records must be retained about cross-chain transfers, and for how long?',
    ],
  };
}

export function buildFixturePlan(sequence: ExpansionSequence): ExecutionPlan {
  const target = getChain(sequence.primary.chainSlug);
  const targetName = target?.name ?? sequence.primary.chainSlug;

  const tasks: ExecutionPlan['tasks'] = [
    {
      id: 'T1',
      title: 'Confirm the deployment model and write it down',
      track: 'engineering',
      description: 'Decide canonical-chain ownership, what state synchronises, and what may diverge. Circulate for review.',
      owner: 'Engineering lead',
      dependsOn: [],
      acceptanceCriteria: ['A written deployment model is approved by the engineering and security leads.'],
      effort: 'S',
    },
    {
      id: 'T2',
      title: `Stand up ${targetName} development environment`,
      track: 'engineering',
      description: 'RPC access, funded deployer accounts, CI targets, and a reproducible deployment script.',
      owner: 'Protocol engineering',
      dependsOn: ['T1'],
      acceptanceCriteria: [
        'A contributor can deploy the full contract set to testnet from a clean checkout with one command.',
      ],
      effort: 'M',
    },
    {
      id: 'T3',
      title: 'Select and document the messaging approach',
      track: 'engineering',
      description: 'Evaluate options against the trust assumption the team is willing to take. Record the decision and its limits.',
      owner: 'Protocol engineering',
      dependsOn: ['T1'],
      acceptanceCriteria: [
        'A written comparison exists covering trust assumption, liveness behaviour and failure mode for each option.',
        'One option is selected with a recorded rationale.',
      ],
      effort: 'M',
    },
    {
      id: 'T4',
      title: 'Deploy to testnet and run the existing integration suite',
      track: 'engineering',
      description: 'Full contract set on testnet with chain-specific configuration applied.',
      owner: 'Protocol engineering',
      dependsOn: ['T2'],
      acceptanceCriteria: ['The existing integration suite passes unmodified against the testnet deployment.'],
      effort: 'L',
    },
    {
      id: 'T5',
      title: 'Extend indexing to the new chain',
      track: 'engineering',
      description: 'One schema, explicit chain dimension, reorg handling appropriate to the chain.',
      owner: 'Platform engineering',
      dependsOn: ['T4'],
      acceptanceCriteria: [
        'Events from both chains appear in a single query result with correct chain attribution.',
        'A simulated reorg does not produce duplicate or missing events.',
      ],
      effort: 'M',
    },
    {
      id: 'T6',
      title: 'Build cross-chain monitoring and alerts',
      track: 'operations',
      description: 'Message latency, state divergence, RPC health, privileged-key usage.',
      owner: 'Platform engineering',
      dependsOn: ['T5'],
      acceptanceCriteria: [
        'Each monitor has a defined threshold and a named on-call owner.',
        'An induced divergence in staging fires an alert within the agreed window.',
      ],
      effort: 'M',
    },
    {
      id: 'T7',
      title: 'Update the frontend for multichain use',
      track: 'product',
      description: 'Network detection, switching, per-chain balances, and a unified account view.',
      owner: 'Product engineering',
      dependsOn: ['T4'],
      acceptanceCriteria: [
        'A user connected to the wrong network is offered a one-step switch rather than an error.',
        'Balances are labelled by chain everywhere they appear.',
      ],
      effort: 'M',
    },
    {
      id: 'T8',
      title: 'Secure launch liquidity commitments',
      track: 'ecosystem',
      description: 'Agree a minimum depth for launch and obtain commitments to reach it.',
      owner: 'Ecosystem/BD',
      dependsOn: ['T1'],
      acceptanceCriteria: ['Committed depth meets or exceeds the agreed launch floor before mainnet deployment.'],
      effort: 'M',
    },
    {
      id: 'T9',
      title: 'Security review of the delta',
      track: 'engineering',
      description: 'Review what is new: messaging integration, representation contracts, and the expanded privileged-key set.',
      owner: 'Security lead',
      dependsOn: ['T3', 'T4'],
      acceptanceCriteria: [
        'Every new privileged role is documented with its holder and its powers.',
        'Findings are triaged and blocking items are closed.',
      ],
      effort: 'L',
    },
    {
      id: 'T10',
      title: 'Capped mainnet deployment',
      track: 'engineering',
      description: 'Deploy to mainnet behind an exposure cap with monitoring live and a rehearsed rollback path.',
      owner: 'Engineering lead',
      dependsOn: ['T6', 'T7', 'T8', 'T9'],
      acceptanceCriteria: [
        'Contracts are deployed and verified on the block explorer.',
        'An exposure cap is enforced on-chain.',
        'The rollback procedure has been rehearsed at least once.',
      ],
      effort: 'L',
    },
    {
      id: 'T11',
      title: 'Publish integration documentation',
      track: 'product',
      description: 'Addresses, chain IDs, configuration differences, and a migration note for integrators.',
      owner: 'Developer relations',
      dependsOn: ['T10'],
      acceptanceCriteria: ['An external integrator can complete a first integration without contacting the team.'],
      effort: 'S',
    },
    {
      id: 'T12',
      title: 'Announce and instrument the launch',
      track: 'ecosystem',
      description: 'Coordinate the announcement and measure adoption against a pre-agreed target.',
      owner: 'Ecosystem/BD',
      dependsOn: ['T10', 'T11'],
      acceptanceCriteria: ['Adoption is reported against the target within two weeks of launch.'],
      effort: 'S',
    },
  ];

  return {
    summary: `A four-week plan taking ${targetName} from decision to a capped mainnet deployment. Produced by the local fixture pipeline; a live analysis tailors tasks to the specific codebase and team.`,
    weeks: [
      {
        week: 1,
        theme: 'Decide and prepare',
        milestone: 'Deployment model approved and the development environment reproducible from a clean checkout.',
        taskIds: ['T1', 'T2', 'T3', 'T8'],
      },
      {
        week: 2,
        theme: 'Testnet',
        milestone: 'Full contract set live on testnet with the existing integration suite passing.',
        taskIds: ['T4', 'T5', 'T7'],
      },
      {
        week: 3,
        theme: 'Observability and review',
        milestone: 'Monitoring firing correctly on induced failures and the security review of the delta closed.',
        taskIds: ['T6', 'T9'],
      },
      {
        week: 4,
        theme: 'Controlled launch',
        milestone:
          'Capped mainnet deployment live with documentation published. A full uncapped launch should follow an external audit, which does not fit inside 30 days.',
        taskIds: ['T10', 'T11', 'T12'],
      },
    ],
    tasks,
    launchDependencies: [
      'External audit availability, if the security review escalates.',
      'Liquidity commitments reaching the agreed launch floor.',
      'Any ecosystem grant or co-marketing timeline the team is relying on.',
    ],
  };
}

export function buildFixtureTechnicalBrief(
  twin: DigitalTwin,
  sequence: ExpansionSequence,
): TechnicalBrief {
  const target = getChain(sequence.primary.chainSlug);
  const targetName = target?.name ?? sequence.primary.chainSlug;
  const sameVm = target?.executionEnvironment === twin.vmRequirement;

  return {
    overview: `Engineering handoff for expanding ${twin.productName} to ${targetName}. ${
      sameVm
        ? 'The target runs the same execution environment, so contract work is redeployment and configuration rather than a rewrite.'
        : `The target runs ${target?.executionEnvironment ?? 'a different execution environment'}, so contract logic must be reimplemented in ${target?.contractLanguages.join(' or ') ?? 'the target language'}. Treat this as a separate engineering programme, not a port.`
    } Produced by the local fixture pipeline.`,
    targetChain: sequence.primary.chainSlug,
    contractWork: sameVm
      ? [
          'Redeploy the existing contract set with chain-specific constructor arguments.',
          'Externalise every hardcoded chain ID, address and oracle reference into configuration.',
          'Review risk parameters — values calibrated for the home chain rarely transfer unchanged.',
          'Add the messaging receiver and its authorisation checks.',
        ]
      : [
          `Reimplement core contract logic in ${target?.contractLanguages.join(' or ') ?? 'the target language'}.`,
          'Re-derive the storage and account model; a direct translation of EVM storage layout is usually wrong.',
          'Commission an audit specific to the new implementation — the existing audit does not carry over.',
          'Build a differential test suite asserting equivalent behaviour across both implementations.',
        ],
    infrastructureWork: [
      'Provision RPC with a fallback provider; a single provider is a single point of failure.',
      'Extend the indexer with an explicit chain dimension and chain-appropriate reorg depth.',
      'Add the new chain to CI so deployments are reproducible and verified.',
      'Extend key management and signing policy to cover the new deployment.',
      'Add per-chain dashboards and alert routes.',
    ],
    frontendWork: [
      'Chain-aware routing and persistent display of the active network.',
      'Wrong-network detection with a one-step switch.',
      'Per-chain balance labelling in every surface that shows a balance.',
      'Chain-specific block explorer links.',
    ],
    testingStrategy: [
      'Run the existing integration suite unmodified against the new deployment.',
      'Test message failure explicitly: delayed, dropped and replayed messages.',
      'Test reorg behaviour at the depth appropriate to the target chain.',
      'Load-test the indexer with both chains producing events simultaneously.',
      'Rehearse the rollback procedure end to end before mainnet.',
    ],
    openQuestions: [
      'Which team owns on-call for the new deployment?',
      'What exposure cap is acceptable for the first month?',
      'Is there an existing audit relationship that covers the target environment?',
      'What is the minimum liquidity depth the team will launch with?',
    ],
  };
}

export function buildFixtureSummary(
  twin: DigitalTwin,
  ranked: RankedChainSummary[],
  sequence: ExpansionSequence,
  overallConfidence: number,
): ExecutiveSummary {
  const primary = ranked.find((entry) => entry.slug === sequence.primary.chainSlug) ?? ranked[0];
  const chain = getChain(sequence.primary.chainSlug);
  const name = chain?.name ?? sequence.primary.chainSlug;

  return {
    recommendedChainSlug: sequence.primary.chainSlug,
    headline: `${name} ranks first for ${twin.productName} on the deterministic scorecard.`,
    rationale: `${name} scored ${(primary?.finalScore ?? 0).toFixed(1)} out of 100 against the constraints supplied: a ${twin.constraints.teamCapacity} team, a ${twin.constraints.timeHorizon.replace(/-/g, ' ')} horizon, and ${twin.objectives.join(' and ').replace(/-/g, ' ')} as the stated objectives. The ranking reflects the deterministic scoring engine only. This report was produced by the local fixture pipeline, which does not interpret the product's own sources — treat the narrative as structural rather than product-specific.`,
    mainOpportunity: chain?.strengths[0] ?? 'The highest-scoring ecosystem under the stated constraints.',
    mainRisk:
      'The analysis ran without model interpretation of the product itself, so product-specific incompatibilities would not have been detected. Confirm the recommendation with a live analysis before acting on it.',
    suggestedTiming: 'Begin after the current deployment has been stable for a full release cycle.',
    confidence: Math.min(overallConfidence, 50),
    confidenceReason:
      'Capped at 50 because this report came from the local fixture pipeline. Deterministic scores are genuine; the narrative is templated.',
  };
}
