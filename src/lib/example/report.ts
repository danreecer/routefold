import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION, knowledgeBaseReviewedAt } from '@/lib/chains/knowledge-base';
import type {
  ArchitectureBrief,
  ChainInterpretation,
  ExecutionPlan,
  ExecutiveSummary,
  ExpansionSequence,
  RiskRegister,
  SourcesAssumptions,
  TechnicalBrief,
} from '@/lib/schemas/report';
import {
  applyAiAdjustment,
  computeWeights,
  deriveRecommendation,
  overallConfidence,
  SCORING_VERSION,
  scoreChains,
  type Recommendation,
} from '@/lib/scoring';
import { EXAMPLE_SOURCES, EXAMPLE_TWIN } from './twin';

/**
 * Builds the complete example report.
 *
 * Scores come from the real deterministic engine. Narrative sections are
 * hand-authored so the example reads at the quality a live analysis should
 * reach, and every surface labels the project as fictional and the analysis as
 * illustrative. No live model call and no database row is involved, which is why
 * /example works on any deployment, consumes no quota, and never fails.
 */

export type ExampleChainScore = {
  chainSlug: string;
  chainName: string;
  deterministicScore: number;
  aiAdjustment: number;
  finalScore: number;
  confidence: number;
  rank: number;
  recommendation: Recommendation;
  scoreBreakdown: ReturnType<typeof scoreChains>[number]['breakdown'];
  explanation: ChainInterpretation | null;
  blockers: string[];
  missingData: string[];
};

/** Hand-authored interpretations, keyed by slug. Kept honest about tradeoffs. */
const INTERPRETATIONS: Record<string, Omit<ChainInterpretation, 'chainSlug'>> = {
  base: {
    rationale:
      'Base scores well on distribution and cost, and as an EVM rollup the existing Solidity contracts deploy without structural change. It places third because the two factors this twin weights most heavily — category suitability for tokenized assets, and institutional presence — are where Base is thinnest. Its real strength is consumer on-ramp reach, which is not what this product is short of.',
    advantages: [
      'Existing audited Solidity contracts deploy unchanged; the security review reduces to the delta.',
      'The largest verified-user on-ramp of any EVM L2, which matters for onboarding counterparties who do not already hold onchain treasury.',
      'Transaction costs are low enough that per-holder attestation updates stop being a budget line.',
    ],
    tradeoffs: [
      'A single corporate sequencer operator is a governance concentration that an institutional counterparty will ask about, and the answer is not yet "decentralised".',
      'Tokenized-asset depth is materially thinner than Ethereum mainnet — this deployment adds distribution, it does not replace the mainnet venue.',
      'Optimistic withdrawal timing needs to be modelled into redemption operations rather than assumed away.',
    ],
    unknowns: [
      'Whether the custodian will accept settlement instructions referencing a Base deployment.',
      'How many existing counterparties already operate treasury on Base.',
    ],
    adjustment: 0,
    adjustmentReason: '',
  },
  arbitrum: {
    rationale:
      'Arbitrum has the highest deterministic base score in the candidate set at 86.5, narrowly ahead of Avalanche. It leads on users and liquidity — the deepest stablecoin and DeFi depth outside mainnet, which is exactly what secondary transfer between verified holders needs — and it is byte-for-byte EVM equivalent, making it the lowest-friction technical target here. It finishes second only after a bounded adjustment is applied to Avalanche. On the engine\'s own numbers these two are a tie.',
    advantages: [
      'Deepest stablecoin liquidity outside mainnet, directly relevant to the subscription and redemption legs.',
      'Byte-for-byte EVM equivalence — the lowest-friction technical target in the candidate set.',
      'An established professional and institutional user base already operating there.',
    ],
    tradeoffs: [
      'Optimistic challenge period affects canonical withdrawal timing; redemption operations must account for it.',
      'Sequencer remains operated by a single party.',
      'Consumer on-ramp reach is smaller than Base, which matters less for this product than it would for a consumer one.',
    ],
    unknowns: [
      'Whether existing counterparties would consolidate treasury operations onto Arbitrum or split across chains.',
    ],
    adjustment: 0,
    adjustmentReason: '',
  },
  avalanche: {
    rationale:
      'Avalanche scores highest on the two bands this twin weights most: tokenized-asset suitability and institutional presence. Sub-second finality removes the optimistic challenge window that both rollup candidates force into redemption operations. Its deterministic base of 86.1 sits marginally below Arbitrum\'s 86.5 — the two are inside the resolution of any scoring model — and it takes first place only after a bounded +1.5 adjustment for a capability the factor table structurally cannot see. Read the two as tied and decide on evidence Routefold does not have.',
    advantages: [
      'The strongest institutional and tokenized-asset positioning outside Ethereum mainnet.',
      'Sub-second finality removes the challenge-period modelling that both rollup candidates require.',
      'Subnets permit a permissioned validator set, which maps unusually well onto an allowlist-gated instrument.',
    ],
    tradeoffs: [
      'An independent validator set is a different security assumption from settling to Ethereum, and counterparties will evaluate it separately.',
      'DeFi liquidity depth is moderate, so secondary-market depth would need active support.',
      'Running a subnet is a standing operational commitment, not a deployment.',
    ],
    unknowns: [
      'Whether a subnet or the C-Chain is the right target — that decision depends on counterparty appetite for a permissioned validator set.',
    ],
    adjustment: 1.5,
    adjustmentReason:
      'The deterministic engine scores subnet capability only indirectly, through operational complexity, where it reads as a cost. For an allowlist-gated instrument the ability to run a permissioned execution environment is a genuine product capability the factor table does not represent. Bounded upward adjustment applied.',
  },
  polygon: {
    rationale:
      'Polygon scores respectably on distribution and cost, and it has real enterprise and tokenized-asset history. The limiting factor for this twin is the security model: it does not inherit Ethereum consensus, and for an instrument with very high value at risk and critical security sensitivity, that is the factor that dominates.',
    advantages: [
      'Very large user base with particular strength in Asia and Latin America, matching two stated target regions.',
      'Established enterprise and payment integration track record.',
      'Negligible transaction costs.',
    ],
    tradeoffs: [
      'Sidechain consensus is an independent trust assumption, weighed against a critical security sensitivity.',
      'DeFi liquidity depth has drifted below the leading L2s.',
    ],
    unknowns: ['Whether counterparties would accept a sidechain trust model for treasury-backed exposure.'],
    adjustment: 0,
    adjustmentReason: '',
  },
  optimism: {
    rationale:
      'OP Mainnet is technically near-identical to the leading candidates and scores accordingly on compatibility. It loses ground on users-and-liquidity: Superchain liquidity is distributed across many OP Stack chains rather than concentrated on OP Mainnet itself, which is precisely the property a liquidity-dependent instrument does not want.',
    advantages: [
      'Mature, standardised rollup tooling with fault proofs deployed.',
      'Superchain interoperability offers a low-cost path to further OP Stack deployments later.',
    ],
    tradeoffs: [
      'Liquidity is fragmented across the Superchain rather than concentrated.',
      'Institutional presence is thinner than Arbitrum or Avalanche.',
    ],
    unknowns: ['Whether Superchain interoperability materially reduces the cost of a later third deployment.'],
    adjustment: 0,
    adjustmentReason: '',
  },
  linea: {
    rationale:
      'Linea offers validity proofs on a familiar Solidity toolchain, which removes the challenge-period question entirely. It scores below the leading candidates because its liquidity depth and institutional presence are materially thinner — for a product whose bottleneck is distribution to institutional counterparties, that is the factor that matters most.',
    advantages: [
      'Validity proofs avoid optimistic withdrawal timing.',
      'Backed by an established infrastructure vendor with enterprise reach.',
    ],
    tradeoffs: [
      'DeFi liquidity is shallow relative to the leading L2s.',
      'Sequencer and prover are operator-controlled.',
    ],
    unknowns: ['Whether enterprise reach translates into counterparties for this specific instrument.'],
    adjustment: 0,
    adjustmentReason: '',
  },
  scroll: {
    rationale:
      'Scroll is bytecode-equivalent, which makes it technically among the cheapest targets in the set, and validity proofs remove the withdrawal-timing question. It ranks lower because liquidity and institutional presence are the thinnest of the EVM candidates, and those are the two things this expansion is actually trying to buy.',
    advantages: [
      'Bytecode-level EVM equivalence — existing tooling and audit surface carry over almost entirely.',
      'Validity proofs settle canonical withdrawals without a multi-day window.',
    ],
    tradeoffs: [
      'Liquidity and user base are materially smaller than the leading L2s.',
      'Proving infrastructure is still centralised.',
    ],
    unknowns: ['Whether ecosystem growth would arrive on a timeline relevant to this rollout.'],
    adjustment: 0,
    adjustmentReason: '',
  },
  near: {
    rationale:
      'NEAR scores respectably on account abstraction and onboarding, which is a genuine strength — but not one this product needs, since every holding address must clear an allowlist before it can hold anything. It ranks last among the unblocked candidates because stablecoin liquidity is the thinnest in the set, and the subscription and redemption legs both settle in stablecoins.',
    advantages: [
      'Named accounts and account abstraction give the best onboarding UX in the candidate set.',
      'Chain signatures allow cross-chain control without a classic bridge, which is architecturally interesting for a multi-chain issuer.',
    ],
    tradeoffs: [
      'Stablecoin liquidity is materially below what the redemption leg requires.',
      'Native contracts are Rust; the Aurora EVM path adds another layer to reason about for an instrument with critical security sensitivity.',
    ],
    unknowns: ['Whether the Aurora EVM path is acceptable to counterparties as a deployment target.'],
    adjustment: 0,
    adjustmentReason: '',
  },
  solana: {
    rationale:
      'Solana scores strongly on liquidity, distribution and cost, and it has a growing tokenized-asset presence. It is not recommended for this rollout because of one hard technical fact: the Digital Twin records EVM as a hard requirement, and Solana runs the SVM. That is a full reimplementation of an audited registry and issuance system, which does not fit a two-quarter horizon.',
    advantages: [
      'Very deep stablecoin liquidity and negligible transaction costs.',
      'Fast-growing institutional and tokenized-asset activity.',
    ],
    tradeoffs: [
      'Non-EVM — the audited Solidity contracts must be reimplemented in Rust and re-audited.',
      'A smaller pool of auditors experienced with this contract category.',
    ],
    unknowns: [
      'Whether a later, separately resourced Solana programme is justified once the EVM rollout is complete.',
    ],
    adjustment: 0,
    adjustmentReason: '',
  },
};

export function buildExampleScores(): ExampleChainScore[] {
  const weights = computeWeights(EXAMPLE_TWIN.objectives, EXAMPLE_TWIN.objectives[0]);
  const deterministic = scoreChains(EXAMPLE_TWIN, CHAIN_KNOWLEDGE_BASE, { weights });

  const withAdjustment = deterministic.map((result) => {
    const interpretation = INTERPRETATIONS[result.chainSlug];
    const { aiAdjustment, finalScore } = applyAiAdjustment(
      result.deterministicScore,
      interpretation?.adjustment ?? 0,
      Boolean(interpretation?.adjustmentReason && interpretation.adjustmentReason.length > 0),
    );
    return { result, interpretation, aiAdjustment, finalScore };
  });

  withAdjustment.sort((a, b) => {
    if (a.result.isCurrentDeployment !== b.result.isCurrentDeployment) {
      return a.result.isCurrentDeployment ? 1 : -1;
    }
    return b.finalScore - a.finalScore;
  });

  return withAdjustment.map((entry, index) => ({
    chainSlug: entry.result.chainSlug,
    chainName: entry.result.chainName,
    deterministicScore: entry.result.deterministicScore,
    aiAdjustment: entry.aiAdjustment,
    finalScore: entry.finalScore,
    confidence: entry.result.confidence,
    rank: index + 1,
    recommendation: deriveRecommendation(
      {
        finalScore: entry.finalScore,
        blockers: entry.result.blockers,
        isCurrentDeployment: entry.result.isCurrentDeployment,
      },
      index + 1,
    ),
    scoreBreakdown: entry.result.breakdown,
    explanation: entry.interpretation
      ? { chainSlug: entry.result.chainSlug, ...entry.interpretation }
      : null,
    blockers: entry.result.blockers,
    missingData: entry.result.missingData,
  }));
}

export function exampleOverallConfidence(): number {
  const weights = computeWeights(EXAMPLE_TWIN.objectives, EXAMPLE_TWIN.objectives[0]);
  return overallConfidence(scoreChains(EXAMPLE_TWIN, CHAIN_KNOWLEDGE_BASE, { weights }));
}

/** The top-ranked chain, computed rather than hardcoded. */
export function examplePrimarySlug(): string {
  const scores = buildExampleScores();
  return scores.find((score) => score.recommendation !== 'current')?.chainSlug ?? 'base';
}

export const EXAMPLE_SEQUENCE: ExpansionSequence = {
  primary: {
    chainSlug: 'avalanche',
    reason:
      "Avalanche finishes first at 87.6. It scores highest of any candidate on the two bands this twin weights most heavily — tokenized-asset suitability and institutional presence — and its sub-second finality removes the optimistic challenge window that both rollup candidates otherwise force into redemption operations. One caveat belongs in the recommendation itself rather than a footnote: on deterministic score alone Arbitrum leads 86.5 to 86.1, and Avalanche only takes first place after a bounded +1.5 adjustment. Treat the top two as tied and let the counterparty evidence below decide.",
    timing:
      'Begin once the mainnet deployment has completed a full quarter without a redemption incident.',
  },
  secondary: [
    {
      chainSlug: 'arbitrum',
      reason:
        'Arbitrum holds the highest deterministic base score in the set and brings the deepest non-mainnet stablecoin liquidity, which is what secondary transfer between verified holders actually needs. If the counterparty survey favours a rollup security model over an independent validator set, these two swap places and nothing else in this analysis changes.',
      timing: 'Immediately after the primary deployment, or in place of it if the counterparty survey favours a rollup.',
    },
    {
      chainSlug: 'base',
      reason:
        'Base adds the widest verified-user on-ramp of any L2. Because it is EVM-equivalent like Arbitrum, deploying to it after either rollup is configuration and liquidity work rather than new contract work.',
      timing: 'After the first two deployments have run for a month with redemption flowing normally.',
    },
  ],
  notRecommended: [
    {
      chainSlug: 'solana',
      reason:
        'EVM is recorded as a hard requirement in the Digital Twin; a Solana deployment is a reimplementation and re-audit, not a port.',
    },
    {
      chainSlug: 'sui',
      reason: 'Non-EVM, and tokenized-asset and institutional depth are materially thinner.',
    },
    {
      chainSlug: 'aptos',
      reason: 'Non-EVM, with the thinnest DeFi liquidity of the major alt-L1 candidates.',
    },
    {
      chainSlug: 'bnb-chain',
      reason: 'Explicitly excluded in the analysis constraints.',
    },
    {
      chainSlug: 'celestia',
      reason:
        'A data-availability layer rather than a contract deployment target; only relevant if the protocol were to run its own rollup.',
    },
    {
      chainSlug: 'cosmos',
      reason:
        'Appchain sovereignty is not a requirement here, and the operational commitment is disproportionate to the distribution gained.',
    },
  ],
  rolloutOrder: [
    {
      step: 1,
      chainSlug: 'avalanche',
      milestone:
        'Counterparty position on the trust model recorded in writing, and the C-Chain versus subnet decision closed. This gate can still reverse the choice between Avalanche and Arbitrum.',
      dependsOn: [],
    },
    {
      step: 2,
      chainSlug: 'avalanche',
      milestone:
        'Registry, issuance and redemption contracts deployed to Avalanche testnet with the existing integration suite passing unmodified and the attestation oracle publishing net asset value.',
      dependsOn: ['avalanche'],
    },
    {
      step: 3,
      chainSlug: 'avalanche',
      milestone:
        'Avalanche mainnet deployment live behind a supply cap, with two counterparties completing a full subscribe-and-redeem cycle.',
      dependsOn: ['avalanche'],
    },
    {
      step: 4,
      chainSlug: 'arbitrum',
      milestone:
        'Arbitrum deployment reusing the same contract set, with its redemption liquidity buffer funded independently.',
      dependsOn: ['avalanche'],
    },
  ],
  decisionRationale:
    "The sequence follows the score, then marginal engineering cost. Avalanche and Arbitrum are separated by 1.1 points after adjustment and 0.4 points before it — inside the noise of any scoring model — so the honest reading is that the engine cannot separate them and the decision rests on something it was not given: how many existing counterparties already operate on each, and whether their risk committees accept an independent validator set for treasury-backed exposure. Both are EVM, so whichever goes first, the second is configuration and liquidity work rather than a second engineering programme; that materially lowers the cost of being wrong. Base is sequenced third because its advantage is consumer on-ramp reach, which this product is not short of. Solana scores well on liquidity and distribution and is excluded solely by the recorded EVM requirement — if that requirement were relaxed and separately resourced, it would merit its own analysis.",
};

export const EXAMPLE_ARCHITECTURE: ArchitectureBrief = {
  summary:
    'Ethereum mainnet remains the canonical issuance and accounting layer. Each additional chain receives a satellite deployment that mints against a mainnet-locked allocation, holds its own redemption liquidity buffer, and reads net asset value from an attestation feed published to every chain. The allowlist registry is replicated rather than shared, so a messaging failure degrades new subscriptions rather than freezing transfer for existing holders. Because the two leading candidates are both EVM, this architecture is target-agnostic between them — nothing below changes if the counterparty survey reverses the choice.',
  deploymentModel: {
    approach: 'Hub-and-spoke with Ethereum mainnet as the canonical issuance layer',
    reasoning:
      'Total supply must be verifiable against the custodied portfolio at all times. A single canonical issuance point makes that a one-place check. Fully independent per-chain issuance would require reconciling several mint authorities against one portfolio, which is exactly the class of accounting error that undermines confidence in a treasury-backed instrument.',
  },
  components: [
    {
      id: 'issuance-hub',
      name: 'Issuance contract (mainnet)',
      layer: 'onchain',
      chainSlug: 'ethereum',
      description:
        'Canonical mint and burn authority. Total supply here must reconcile to the attested portfolio at every reporting cycle.',
    },
    {
      id: 'registry-hub',
      name: 'Allowlist registry (mainnet)',
      layer: 'onchain',
      chainSlug: 'ethereum',
      description:
        'Source of truth for verified holder addresses. Additions and revocations originate here and propagate outward.',
    },
    {
      id: 'satellite',
      name: 'Satellite deployment (target chain)',
      layer: 'onchain',
      chainSlug: 'avalanche',
      description:
        'Share token, replicated registry and redemption buffer. Mints only against an allocation locked on mainnet.',
    },
    {
      id: 'nav-oracle',
      name: 'Net asset value attestation feed',
      layer: 'external',
      chainSlug: null,
      description:
        'Publishes the daily attested value to every chain. Staleness must be enforced on-chain, not assumed.',
    },
    {
      id: 'messaging',
      name: 'Cross-chain messaging',
      layer: 'external',
      chainSlug: null,
      description:
        'Carries allocation locks and registry updates. Its trust assumption becomes part of the instrument\'s security model and must be disclosed to counterparties.',
    },
    {
      id: 'ops',
      name: 'Subscription & redemption desk',
      layer: 'offchain',
      chainSlug: null,
      description:
        'Processes flows exceeding the on-chain buffer, and reconciles chain-level balances against custodian records daily.',
    },
    {
      id: 'indexer',
      name: 'Multi-chain indexer',
      layer: 'data',
      chainSlug: null,
      description:
        'Single holder ledger across chains. Required for reporting, and for proving that aggregate supply reconciles.',
    },
    {
      id: 'monitoring',
      name: 'Monitoring & reconciliation',
      layer: 'offchain',
      chainSlug: null,
      description:
        'Continuous supply reconciliation, feed-staleness alerting and registry divergence detection.',
    },
  ],
  connections: [
    { from: 'registry-hub', to: 'messaging', label: 'registry updates', kind: 'state' },
    { from: 'messaging', to: 'satellite', label: 'registry + allocation', kind: 'message' },
    { from: 'issuance-hub', to: 'messaging', label: 'allocation lock', kind: 'liquidity' },
    { from: 'nav-oracle', to: 'issuance-hub', label: 'attested NAV', kind: 'data' },
    { from: 'nav-oracle', to: 'satellite', label: 'attested NAV', kind: 'data' },
    { from: 'satellite', to: 'indexer', label: 'holder events', kind: 'data' },
    { from: 'issuance-hub', to: 'indexer', label: 'supply events', kind: 'data' },
    { from: 'indexer', to: 'monitoring', label: 'reconciliation', kind: 'data' },
    { from: 'ops', to: 'issuance-hub', label: 'mint / burn instruction', kind: 'user' },
  ],
  tokenModel:
    'One canonical supply, issued only on mainnet. A satellite deployment mints strictly against an allocation locked in the mainnet issuance contract, so aggregate supply across all chains can never exceed the attested portfolio. This makes the allocation lock the single most security-critical mechanism in the expansion: it is the invariant that keeps the instrument honest, and it should be treated with the same review intensity as the original issuance contract.',
  messaging:
    'Two message classes with different urgency. Registry updates are frequent and low-value individually, but a stale revocation means a de-authorised address can still transfer — so revocations should propagate on a tighter deadline than additions, and the satellite should fail closed on a stale registry. Allocation locks are infrequent and high-value; they warrant an independent verification step before the corresponding mint executes, not simply trust in message delivery.',
  stateSynchronisation:
    'Only the registry and the allocation ceiling are globally consistent. Avalanche\'s sub-second finality shortens the window in which a satellite can hold stale state, which is a genuine operational simplification over an optimistic rollup — but it does not remove the need for an explicit staleness bound. Redemption buffer levels, gas configuration and operational parameters are per-chain and should be allowed to diverge — every value forced into consistency is another message that can fail during an incident. Net asset value arrives from the attestation feed independently on each chain, which means each deployment must enforce its own staleness bound rather than assuming the feed is current.',
  liquidity:
    'Each satellite needs its own redemption buffer sized to expected flow, because buffers cannot be shared across chains without introducing a synchronous cross-chain dependency into the redemption path — the worst possible place for one. Under-funding the buffer means redemptions queue to the offchain desk, which is visible to counterparties and directly undermines the product promise.',
  frontendAndWallets:
    'Counterparties operate multi-signature and MPC custody, so the interface must produce transactions those systems can review and co-sign rather than assuming a browser wallet. Chain selection should be explicit and persistent, and holdings should be presented both per-chain and in aggregate, because a counterparty reconciling against custodian records needs both views.',
  indexing:
    'One holder ledger spanning every chain, with an explicit chain dimension and reorg handling calibrated per chain. This is a reporting requirement, not an optimisation: aggregate supply reconciliation is the check that proves the instrument is fully backed, and it cannot be performed from per-chain views examined separately.',
  monitoring: [
    'Aggregate supply across all chains reconciled against the attested portfolio, continuously, with any divergence treated as a stop-issuance event.',
    'Attestation feed staleness per chain, alerting well before the on-chain staleness bound is reached.',
    'Registry divergence between mainnet and each satellite, measured as count and age of un-propagated updates.',
    'Redemption buffer level per chain against its funding floor.',
    'Every privileged-role invocation on every deployment, routed to a human immediately.',
    'Messaging delivery latency, with separate thresholds for revocations and allocation locks.',
  ],
  assumptions: [
    'The existing Solidity codebase deploys to the Avalanche C-Chain and to EVM-equivalent rollups without structural change.',
    'The attestation provider can publish to additional chains without a bespoke integration per chain.',
    'The custodian can accept settlement instructions referencing a non-mainnet deployment. This is listed as unconfirmed in the Digital Twin and should be verified before engineering work begins.',
    'Redemption buffers can be funded per chain from existing working capital.',
    'No messaging vendor is assumed; the trust assumption is described generically because the choice is a governance decision, not a technical default.',
  ],
};

export const EXAMPLE_RISKS: RiskRegister = {
  summary:
    'The dominant risks of this expansion are not contract bugs in code that has already been audited. They are the new invariants the expansion creates: an allocation lock that must hold across chains, a registry that must not go stale, and a redemption path that must not develop a synchronous cross-chain dependency. Three of the seven risks below argue for slowing the rollout down, and one argues that the recommendation itself is inside the model\'s margin of error.',
  risks: [
    {
      id: 'R1',
      title: 'The allocation lock invariant fails and aggregate supply exceeds the portfolio',
      category: 'security',
      description:
        'Satellite deployments mint against an allocation locked on mainnet. If a message is replayed, or a lock is released without the corresponding burn, aggregate supply across chains can exceed the attested portfolio. The instrument would be under-backed while continuing to report correctly on any single chain examined in isolation.',
      probability: 'low',
      impact: 'high',
      mitigation:
        'Treat aggregate supply reconciliation as a continuous on-chain-verifiable check, not a periodic report. Make allocation-lock messages non-replayable with a nonce enforced at the satellite. Require an independent verification step before a satellite mint executes. Define a stop-issuance trigger that fires automatically on any divergence.',
      suggestedOwner: 'Protocol engineering',
      isOpenQuestion: false,
    },
    {
      id: 'R2',
      title: 'A stale allowlist registry lets a revoked address transfer',
      category: 'security',
      description:
        'Revocations originate on mainnet and propagate by message. Between revocation and propagation, the satellite still treats the address as verified. For an allowlist-gated instrument this is a control failure, not a latency inconvenience.',
      probability: 'medium',
      impact: 'high',
      mitigation:
        'Enforce a maximum registry age at the satellite and fail transfers closed once exceeded. Propagate revocations on a tighter deadline than additions. Alert on un-propagated revocation age, not just count.',
      suggestedOwner: 'Protocol engineering',
      isOpenQuestion: false,
    },
    {
      id: 'R3',
      title: 'The redemption buffer is under-funded and redemptions queue offchain',
      category: 'liquidity',
      description:
        'Each satellite holds its own buffer. If sized from optimistic flow assumptions, redemptions exceed it and fall back to the offchain desk. Counterparties experience the onchain redemption promise failing on first use.',
      probability: 'medium',
      impact: 'high',
      mitigation:
        'Size the initial buffer from observed mainnet redemption distribution, not from projections. Cap satellite supply so the buffer covers a defined multiple of expected flow. Make the fallback path explicit to counterparties in advance rather than discovered during an incident.',
      suggestedOwner: 'Treasury operations',
      isOpenQuestion: false,
    },
    {
      id: 'R4',
      title: 'Privileged roles multiply and the weakest deployment sets the security level',
      category: 'governance',
      description:
        'Each satellite adds a mint authority, a registry writer, a pause authority and an upgrade path. Key management calibrated for one deployment is often quietly relaxed for the second, and an attacker targets the weakest one.',
      probability: 'medium',
      impact: 'high',
      mitigation:
        'Inventory every privileged role per chain before deployment, with a named holder and explicit powers. Apply the identical signer policy on every chain with no exceptions. Publish the full role inventory so counterparties can review it.',
      suggestedOwner: 'Security lead',
      isOpenQuestion: false,
    },
    {
      id: 'R5',
      title: 'The messaging trust assumption is not acceptable to counterparties',
      category: 'operational',
      description:
        'This risk argues against the expansion as scoped. Institutional counterparties evaluating a treasury-backed instrument may decline to accept a messaging layer as part of its security model, regardless of how the contracts are written. For Avalanche specifically they must also accept an independent validator set rather than Ethereum settlement. If either is rejected after engineering work is complete, the investment is stranded.',
      probability: 'medium',
      impact: 'high',
      mitigation:
        'Put the proposed trust model to three existing counterparties in writing before engineering begins. Treat their response as a go/no-go input, not as feedback. If it is rejected, independent per-chain issuance with separate portfolios is the alternative — materially more operational work, but no cross-chain trust assumption.',
      suggestedOwner: 'Head of institutional distribution',
      isOpenQuestion: false,
    },
    {
      id: 'R6',
      title: 'The recommendation rests on a margin narrower than the model can resolve',
      category: 'operational',
      description:
        'Avalanche leads Arbitrum by 1.1 points after a bounded adjustment, and trails it by 0.4 points before one. A difference that small is not a finding. Acting on it as though it were — committing engineering, liquidity and counterparty conversations to one chain because a scorecard put it a point ahead — is the most likely way this analysis causes harm.',
      probability: 'high',
      impact: 'medium',
      mitigation:
        'Treat the top two as tied. Run the counterparty survey (R5) before committing, and let its result decide. Because both are EVM, reversing the choice after the survey costs configuration work rather than a second engineering programme — so the survey is cheap insurance, not a delay.',
      suggestedOwner: 'Head of institutional distribution',
      isOpenQuestion: false,
    },
    {
      id: 'R7',
      title: 'Per-chain regulatory treatment of the share token is unassessed',
      category: 'compliance',
      description:
        'The Digital Twin records this as missing data. Deploying into additional ecosystems may change which counterparties are reachable and which obligations apply. Routefold cannot assess this and does not attempt to.',
      probability: 'medium',
      impact: 'high',
      mitigation:
        'Put the questions below to qualified counsel before any mainnet satellite deployment.',
      suggestedOwner: 'Legal counsel',
      isOpenQuestion: true,
    },
  ],
  complianceQuestions: [
    'Does issuing the share token on an additional chain change its characterisation in any jurisdiction where counterparties are domiciled?',
    'Does the custodian\'s mandate permit settlement instructions referencing a non-mainnet deployment?',
    'What disclosure is required regarding the cross-chain messaging trust assumption, and to whom?',
    'What records must be retained for cross-chain allocation locks, and for how long?',
    'Does replicating the allowlist registry across chains alter obligations for holder verification or periodic re-verification?',
  ],
};

export const EXAMPLE_PLAN: ExecutionPlan = {
  summary:
    'Four weeks from decision to a capped Avalanche deployment with two counterparties completing a full subscribe-and-redeem cycle. The plan front-loads the counterparty conversation deliberately, and for two reasons: if the trust model is rejected the whole approach changes, and because Avalanche and Arbitrum are separated by less than the model can resolve, the survey is also what actually decides which chain week 2 targets.',
  weeks: [
    {
      week: 1,
      theme: 'Validate the assumption that could invalidate the plan',
      milestone:
        'Counterparty position on the trust model recorded in writing, the Avalanche-versus-Arbitrum choice closed on that evidence, and custodian confirmation obtained or the gap escalated.',
      taskIds: ['T1', 'T2', 'T3'],
    },
    {
      week: 2,
      theme: 'Testnet deployment',
      milestone:
        'Full contract set on the chosen chain\'s testnet with the existing integration suite passing unmodified and the attestation feed publishing.',
      taskIds: ['T4', 'T5', 'T6'],
    },
    {
      week: 3,
      theme: 'Invariants and observability',
      milestone:
        'Supply reconciliation and registry-staleness controls demonstrably firing on induced failures; security review of the delta closed.',
      taskIds: ['T7', 'T8', 'T9'],
    },
    {
      week: 4,
      theme: 'Capped mainnet',
      milestone:
        'Mainnet live under a supply cap with two counterparties completing subscribe and redeem. An uncapped deployment follows an external audit of the allocation-lock mechanism, which does not fit inside 30 days.',
      taskIds: ['T10', 'T11', 'T12'],
    },
  ],
  tasks: [
    {
      id: 'T1',
      title: 'Put the trust model to three counterparties in writing',
      track: 'ecosystem',
      description:
        'Document both the cross-chain trust assumption and the difference between an independent validator set and Ethereum settlement, in the terms a risk committee reads. Obtain a written position from three existing counterparties.',
      owner: 'Head of institutional distribution',
      dependsOn: [],
      acceptanceCriteria: [
        'Three written responses received.',
        'A go / no-go decision is recorded against them before any contract work starts.',
        'The Avalanche-versus-Arbitrum choice is closed and the reasoning recorded.',
      ],
      effort: 'M',
    },
    {
      id: 'T2',
      title: 'Confirm custodian support for non-mainnet settlement instructions',
      track: 'operations',
      description:
        'The Digital Twin lists this as unconfirmed. It is a hard dependency for the whole rollout.',
      owner: 'Treasury operations',
      dependsOn: [],
      acceptanceCriteria: ['Written confirmation from the custodian, or an escalation path with a date.'],
      effort: 'S',
    },
    {
      id: 'T3',
      title: 'Specify the allocation-lock mechanism',
      track: 'engineering',
      description:
        'Define the lock, the nonce scheme, the independent verification step, and the stop-issuance trigger. This is the security-critical invariant of the expansion.',
      owner: 'Protocol engineering',
      dependsOn: [],
      acceptanceCriteria: [
        'A written specification reviewed and signed off by the security lead.',
        'The stop-issuance trigger condition is stated numerically.',
      ],
      effort: 'M',
    },
    {
      id: 'T4',
      title: 'Deploy the contract set to the target testnet',
      track: 'engineering',
      description: 'Registry, issuance satellite and redemption buffer with chain-specific configuration.',
      owner: 'Protocol engineering',
      dependsOn: ['T3'],
      acceptanceCriteria: ['The existing integration suite passes unmodified against the testnet deployment.'],
      effort: 'L',
    },
    {
      id: 'T5',
      title: 'Publish the attestation feed to the target chain',
      track: 'engineering',
      description: 'Extend the net asset value feed and enforce an on-chain staleness bound at the satellite.',
      owner: 'Protocol engineering',
      dependsOn: ['T4'],
      acceptanceCriteria: [
        'The feed publishes on schedule to testnet.',
        'A deliberately stalled feed causes the satellite to fail closed within the specified bound.',
      ],
      effort: 'M',
    },
    {
      id: 'T6',
      title: 'Extend indexing to a unified holder ledger',
      track: 'engineering',
      description: 'One ledger across chains with an explicit chain dimension and per-chain reorg handling.',
      owner: 'Platform engineering',
      dependsOn: ['T4'],
      acceptanceCriteria: [
        'Aggregate supply across chains is queryable in a single result.',
        'A simulated reorg produces neither duplicate nor missing holder events.',
      ],
      effort: 'M',
    },
    {
      id: 'T7',
      title: 'Implement continuous supply reconciliation',
      track: 'engineering',
      description:
        'Aggregate supply checked against the attested portfolio continuously, with automatic stop-issuance on divergence.',
      owner: 'Platform engineering',
      dependsOn: ['T6'],
      acceptanceCriteria: [
        'An induced divergence in staging triggers stop-issuance without human action.',
        'The alert reaches a named on-call owner within the agreed window.',
      ],
      effort: 'M',
    },
    {
      id: 'T8',
      title: 'Implement registry propagation with a staleness bound',
      track: 'engineering',
      description: 'Revocations on a tighter deadline than additions; transfers fail closed on a stale registry.',
      owner: 'Protocol engineering',
      dependsOn: ['T4'],
      acceptanceCriteria: [
        'A revocation propagates within the specified deadline in staging.',
        'A deliberately stalled registry blocks transfers rather than allowing them.',
      ],
      effort: 'M',
    },
    {
      id: 'T9',
      title: 'Security review of the expansion delta',
      track: 'engineering',
      description:
        'Review only what is new: allocation lock, registry propagation, satellite mint authority, and the expanded privileged-role set.',
      owner: 'Security lead',
      dependsOn: ['T3', 'T7', 'T8'],
      acceptanceCriteria: [
        'Every privileged role on every chain is documented with holder and powers.',
        'All blocking findings are closed.',
      ],
      effort: 'L',
    },
    {
      id: 'T10',
      title: 'Capped mainnet deployment',
      track: 'engineering',
      description:
        'Deploy under a supply cap sized so the redemption buffer covers a defined multiple of expected flow.',
      owner: 'Engineering lead',
      dependsOn: ['T9', 'T5'],
      acceptanceCriteria: [
        'Contracts deployed and verified on the block explorer.',
        'The supply cap is enforced on-chain.',
        'The rollback procedure has been rehearsed at least once.',
      ],
      effort: 'L',
    },
    {
      id: 'T11',
      title: 'Fund and verify the redemption buffer',
      track: 'operations',
      description: 'Fund to the agreed floor and verify redemption end to end before opening to counterparties.',
      owner: 'Treasury operations',
      dependsOn: ['T10'],
      acceptanceCriteria: ['A full redemption completes onchain without touching the offchain desk.'],
      effort: 'S',
    },
    {
      id: 'T12',
      title: 'Two counterparties complete a full cycle',
      track: 'ecosystem',
      description: 'Guided subscribe-and-redeem with two existing counterparties on the capped deployment.',
      owner: 'Head of institutional distribution',
      dependsOn: ['T11'],
      acceptanceCriteria: [
        'Two counterparties each complete subscription and redemption.',
        'Written feedback is captured before the cap is raised.',
      ],
      effort: 'M',
    },
  ],
  launchDependencies: [
    'External audit slot for the allocation-lock mechanism before the supply cap is lifted.',
    'Custodian confirmation on non-mainnet settlement instructions (T2) — blocks the entire rollout.',
    'Counterparty acceptance of the messaging trust model (T1) — may invalidate the approach entirely.',
    'Legal position on per-chain characterisation of the share token.',
  ],
};

export const EXAMPLE_TECHNICAL_BRIEF: TechnicalBrief = {
  overview:
    'The Avalanche C-Chain runs the EVM, so this is a redeployment-and-configuration programme rather than a rewrite — and the same is true of Arbitrum, which is why the choice between them can stay open until the counterparty survey closes. The genuinely new engineering is the allocation-lock mechanism, registry propagation with a staleness bound, and unified supply reconciliation. Those three items carry essentially all of the risk in the expansion and should absorb most of the review effort.',
  targetChain: 'avalanche',
  contractWork: [
    'Deploy registry, issuance satellite and redemption buffer with Base-specific configuration.',
    'Implement the allocation-lock receiver with nonce-based replay protection.',
    'Add an on-chain staleness bound for the attestation feed; fail closed when exceeded.',
    'Add registry-age enforcement to the transfer path.',
    'Externalise every hardcoded chain ID, address and feed reference into per-chain configuration.',
    'Re-derive supply-cap parameters for Base rather than copying mainnet values.',
  ],
  infrastructureWork: [
    'Provision RPC with a fallback provider; a single provider is a single point of failure on the redemption path.',
    'Extend the indexer with an explicit chain dimension and chain-appropriate reorg depth. Avalanche\'s fast finality means a shallower reorg window than either rollup, and that difference must be configured rather than assumed.',
    'Extend the attestation publisher to the target chain with independent scheduling and its own alerting.',
    'Add the target chain to the deployment pipeline so deployments are reproducible and verified.',
    'Extend the signer policy and key inventory to cover every new privileged role.',
    'Build the supply-reconciliation job and wire its stop-issuance trigger.',
  ],
  frontendWork: [
    'Explicit, persistent chain selection — never inferred silently.',
    'Transaction construction compatible with multi-signature and MPC review flows.',
    'Per-chain and aggregate holdings views, since counterparties reconcile against custodian records.',
    'Chain-specific explorer links and per-chain redemption status.',
  ],
  testingStrategy: [
    'Run the existing integration suite unmodified against the new deployment.',
    'Replay, delay and drop each message class independently; assert the satellite fails closed on registry staleness and never mints on a replayed allocation lock.',
    'Stall the attestation feed and assert the staleness bound triggers.',
    'Induce supply divergence in staging and assert stop-issuance fires without human action.',
    'Reorg testing at chain-appropriate depth against the unified holder ledger.',
    'Rehearse the rollback procedure end to end before mainnet.',
  ],
  openQuestions: [
    'What supply cap is acceptable for the first month, and who approves raising it?',
    'Does the existing audit relationship cover the allocation-lock mechanism, or is a new engagement required?',
    'C-Chain or subnet? A subnet gives a permissioned validator set that maps onto the allowlist, at the cost of a standing operational commitment.',
    'Which team owns on-call for the new deployment, and is the rotation staffed for it?',
    'What is the minimum redemption buffer the team will launch with, expressed as a multiple of expected flow?',
  ],
};

export function buildExampleSummary(): ExecutiveSummary {
  const confidence = exampleOverallConfidence();
  const scores = buildExampleScores();
  const ranked = scores.filter((score) => score.recommendation !== 'current');
  const top = ranked[0];
  const second = ranked[1];
  const margin =
    top && second ? Math.abs(top.finalScore - second.finalScore) : 0;

  return {
    recommendedChainSlug: top?.chainSlug ?? 'avalanche',
    headline:
      'Avalanche ranks first for tokenized-asset fit and institutional reach — but by a margin narrower than the model can resolve, so treat it and Arbitrum as tied.',
    rationale: `Avalanche finishes at ${(top?.finalScore ?? 0).toFixed(1)} out of 100 against Meridian Reserve's stated objectives — institutional adoption, liquidity, and geographic expansion. It scores highest of any candidate on tokenized-asset suitability and institutional presence, the two bands those objectives weight most heavily, and its sub-second finality removes the optimistic challenge window that both rollup candidates force into redemption operations. The margin is the important part: Arbitrum's deterministic base score of ${(second?.deterministicScore ?? 0).toFixed(1)} is actually higher than Avalanche's ${(top?.deterministicScore ?? 0).toFixed(1)}, and Avalanche takes first place only after a bounded +1.5 adjustment for subnet capability that the factor table structurally cannot see. A ${margin.toFixed(1)}-point gap is not a finding. The engine cannot separate these two, and this summary should not pretend otherwise.`,
    mainOpportunity:
      'The stated bottleneck is counterparty distribution, not issuance capacity. Both leading candidates are EVM, so the audited Solidity contracts deploy without structural change — and whichever goes first, the second costs configuration and liquidity work rather than a new engineering programme.',
    mainRisk:
      'The recommendation rests inside its own margin of error. Committing engineering and counterparty conversations to Avalanche because a scorecard put it 1.1 points ahead would be reading precision into a number that does not have it. Run the counterparty survey in week 1 — whether institutional risk committees accept an independent validator set rather than Ethereum settlement is the fact that actually decides this, and Routefold was not given it.',
    suggestedTiming:
      'Begin once the mainnet deployment has completed a full quarter without a redemption incident.',
    confidence,
    confidenceReason: `Confidence of ${confidence} reflects high-confidence ecosystem data for the leading candidates combined with three material unknowns recorded in the Digital Twin: counterparty distribution across chains, custodian support for non-mainnet settlement, and per-chain regulatory treatment. None can be resolved from public sources, and the first of them is precisely what would separate the top two.`,
  };
}

export function buildExampleSources(): SourcesAssumptions {
  return {
    submittedSources: EXAMPLE_SOURCES.map((source) => ({
      url: source.url,
      kind: source.kind,
      status: source.status,
      retrievedAt: source.retrievedAt,
      wordCount: source.wordCount,
      failureReason: source.failureReason,
    })),
    userAssumptions: EXAMPLE_TWIN.constraints.other,
    modelAssumptions: EXAMPLE_TWIN.assumptions,
    missingData: EXAMPLE_TWIN.missingData,
    chainDataSource: {
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
      reviewedAt: knowledgeBaseReviewedAt(),
      liveDataStatus: 'seeded',
      liveDataFetchedAt: null,
    },
    methodologyVersion: SCORING_VERSION,
    generationMode: 'live',
    modelName: 'illustrative — hand-authored narrative, engine-computed scores',
  };
}
