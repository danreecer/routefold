import 'server-only';
import { z } from 'zod';
import type { ChainRecord } from '@/lib/chains/types';
import {
  architectureBriefSchema,
  chainInterpretationBatchSchema,
  executionPlanSchema,
  executiveSummarySchema,
  expansionSequenceSchema,
  riskRegisterSchema,
  technicalBriefSchema,
  type ArchitectureBrief,
  type ChainInterpretation,
  type ExecutionPlan,
  type ExecutiveSummary,
  type ExpansionSequence,
  type RiskRegister,
  type TechnicalBrief,
} from '@/lib/schemas/report';
import {
  digitalTwinSchema,
  projectProfileSchema,
  type DigitalTwin,
  type ProjectProfile,
} from '@/lib/schemas/twin';
import type { WizardInput } from '@/lib/schemas/wizard';
import type { ChainScoreResult } from '@/lib/scoring';
import { generateStructured, wrapUntrusted } from './client';
import {
  ARCHITECTURE_SYSTEM_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
  INTERPRETATION_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  RISK_SYSTEM_PROMPT,
  SEQUENCE_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  TECHNICAL_BRIEF_SYSTEM_PROMPT,
  TWIN_SYSTEM_PROMPT,
} from './prompts';

/**
 * Individual pipeline stages.
 *
 * Each stage is a small function with an explicit input and a Zod-validated
 * output. Splitting the work this way keeps each prompt short enough to reason
 * about, lets a single stage be regenerated on its own, and means a validation
 * failure is attributable to one stage rather than a monolithic response.
 */

export type SourceInput = {
  url: string;
  kind: string;
  status: string;
  title: string | null;
  text: string | null;
  failureReason: string | null;
};

function renderSources(sources: SourceInput[]): string {
  if (sources.length === 0) {
    return 'No web sources were retrieved. Work only from the user-supplied answers below.';
  }
  return sources
    .map((source) => {
      if (source.status !== 'SUCCESS' || !source.text) {
        return `Source (${source.kind}): ${source.url}\nRetrieval failed: ${source.failureReason ?? source.status}. No content is available from this source.`;
      }
      return wrapUntrusted(
        `${source.kind} — ${source.url}${source.title ? ` — "${source.title}"` : ''}`,
        source.text,
      );
    })
    .join('\n\n');
}

function renderWizardInput(input: WizardInput): string {
  return [
    '--- USER-SUPPLIED ANSWERS (trusted) ---',
    `Product name: ${input.productName}`,
    `Website: ${input.websiteUrl || '(none supplied)'}`,
    `Documentation: ${input.docsUrl || '(none supplied)'}`,
    input.manualDescription
      ? `Manual description supplied by the user:\n${input.manualDescription}`
      : 'Manual description: (none supplied)',
    `Current chains: ${input.currentChains.length > 0 ? input.currentChains.join(', ') : '(none supplied)'}`,
    `Product category: ${input.category}`,
    `Execution environment in use: ${input.vmEnvironment}`,
    `Contract languages: ${input.contractLanguages.length > 0 ? input.contractLanguages.join(', ') : '(none supplied)'}`,
    `Token: ${input.hasToken}`,
    `Development stage: ${input.developmentStage}`,
    `Expansion objectives: ${input.objectives.join(', ')}`,
    `Primary objective: ${input.primaryObjective}`,
    input.objectiveNotes ? `Objective notes: ${input.objectiveNotes}` : '',
    `Primary users: ${input.primaryUsers}`,
    `Target geographies: ${input.targetGeographies.length > 0 ? input.targetGeographies.join(', ') : '(none supplied)'}`,
    `Time horizon: ${input.timeHorizon}`,
    `Team capacity: ${input.teamCapacity}`,
    `Budget sensitivity: ${input.budgetSensitivity}`,
    `Security sensitivity: ${input.securitySensitivity}`,
    `Required virtual machine: ${input.requiredVm ?? '(no hard requirement)'}`,
    `Excluded ecosystems: ${input.excludedEcosystems.length > 0 ? input.excludedEcosystems.join(', ') : '(none)'}`,
    `Preferred ecosystems: ${input.preferredEcosystems.length > 0 ? input.preferredEcosystems.join(', ') : '(none)'}`,
    input.additionalContext ? `Additional context: ${input.additionalContext}` : '',
    '--- END USER-SUPPLIED ANSWERS ---',
  ]
    .filter(Boolean)
    .join('\n');
}

// ── Stage 1 ──────────────────────────────────────────────────────────────────

export async function extractProjectProfile(
  input: WizardInput,
  sources: SourceInput[],
  signal?: AbortSignal,
): Promise<ProjectProfile> {
  const { data } = await generateStructured({
    stage: 'project extraction',
    system: EXTRACTION_SYSTEM_PROMPT,
    schema: projectProfileSchema,
    toolName: 'submit_project_profile',
    toolDescription: 'Submit the structured factual profile extracted for this product.',
    temperature: 0.2,
    signal,
    prompt: [
      renderWizardInput(input),
      '',
      renderSources(sources),
      '',
      'Extract the project profile now. Call submit_project_profile.',
    ].join('\n'),
  });
  return data;
}

// ── Stage 2 ──────────────────────────────────────────────────────────────────

export async function buildDigitalTwin(
  profile: ProjectProfile,
  input: WizardInput,
  signal?: AbortSignal,
): Promise<DigitalTwin> {
  const { data } = await generateStructured({
    stage: 'Digital Twin',
    system: TWIN_SYSTEM_PROMPT,
    schema: digitalTwinSchema,
    toolName: 'submit_digital_twin',
    toolDescription: 'Submit the Multichain Digital Twin for this product.',
    temperature: 0.2,
    signal,
    prompt: [
      '--- EXTRACTED PROJECT PROFILE ---',
      JSON.stringify(profile, null, 2),
      '--- END EXTRACTED PROJECT PROFILE ---',
      '',
      renderWizardInput(input),
      '',
      'Build the Multichain Digital Twin now. Call submit_digital_twin.',
    ].join('\n'),
  });
  return data;
}

// ── Stage 3 ──────────────────────────────────────────────────────────────────

function renderChainForPrompt(chain: ChainRecord, score: ChainScoreResult): string {
  const factorLines = score.breakdown.categories
    .flatMap((category) =>
      category.factors.map(
        (factor) =>
          `    ${factor.label}: ${factor.points.toFixed(1)}/${factor.maxPoints.toFixed(1)} — ${factor.reason}`,
      ),
    )
    .join('\n');

  const penaltyLines = score.breakdown.penalties.length
    ? score.breakdown.penalties.map((penalty) => `    −${penalty.points}: ${penalty.message}`).join('\n')
    : '    (none)';

  const blockerLines = score.blockers.length
    ? score.blockers.map((blocker) => `    ${blocker}`).join('\n')
    : '    (none)';

  return [
    `CHAIN: ${chain.name} (slug: ${chain.slug})`,
    `  Family: ${chain.family} | Execution: ${chain.executionEnvironment} | Languages: ${chain.contractLanguages.join(', ')}`,
    `  Finality: ${chain.finality} | Transaction cost band: ${chain.transactionCost}`,
    `  Security model: ${chain.securityModel} — ${chain.securityNotes}`,
    `  Bands — tooling: ${chain.developerToolingMaturity}, stablecoin liquidity: ${chain.stablecoinLiquidity}, DeFi depth: ${chain.defiLiquidityDepth}, retail base: ${chain.retailUserBase}, institutional: ${chain.institutionalPresence}, cross-chain: ${chain.crossChainMaturity}, ops complexity: ${chain.operationalComplexity}, ecosystem support: ${chain.ecosystemSupport}`,
    `  Knowledge-base strengths: ${chain.strengths.join(' | ')}`,
    `  Knowledge-base tradeoffs: ${chain.tradeoffs.join(' | ')}`,
    `  Data confidence: ${chain.dataConfidence} (reviewed ${chain.reviewedAt})`,
    `  DETERMINISTIC SCORE: ${score.deterministicScore.toFixed(1)}/100 (confidence ${score.confidence})`,
    '  Factor breakdown:',
    factorLines,
    '  Penalties applied:',
    penaltyLines,
    '  Blockers:',
    blockerLines,
  ].join('\n');
}

export async function interpretChains(
  twin: DigitalTwin,
  scored: Array<{ chain: ChainRecord; score: ChainScoreResult }>,
  signal?: AbortSignal,
): Promise<ChainInterpretation[]> {
  const { data } = await generateStructured({
    stage: 'chain interpretation',
    system: INTERPRETATION_SYSTEM_PROMPT,
    schema: chainInterpretationBatchSchema,
    toolName: 'submit_chain_interpretations',
    toolDescription:
      'Submit one interpretation for every candidate chain you were given, using the exact slugs provided.',
    temperature: 0.35,
    maxTokens: 12_000,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '--- END DIGITAL TWIN ---',
      '',
      '--- CANDIDATE CHAINS WITH DETERMINISTIC SCORES ---',
      scored.map(({ chain, score }) => renderChainForPrompt(chain, score)).join('\n\n'),
      '--- END CANDIDATE CHAINS ---',
      '',
      `Write one interpretation for each of these ${scored.length} chains, using these exact slugs: ${scored
        .map(({ chain }) => chain.slug)
        .join(', ')}.`,
      'Call submit_chain_interpretations.',
    ].join('\n'),
  });
  return data.interpretations;
}

// ── Stage 4 ──────────────────────────────────────────────────────────────────

export type RankedChainSummary = {
  slug: string;
  name: string;
  finalScore: number;
  deterministicScore: number;
  aiAdjustment: number;
  confidence: number;
  isCurrentDeployment: boolean;
  blockers: string[];
};

function renderRanking(ranked: RankedChainSummary[]): string {
  return ranked
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.name} (${entry.slug}) — final ${entry.finalScore.toFixed(1)} (base ${entry.deterministicScore.toFixed(1)}, adjustment ${entry.aiAdjustment >= 0 ? '+' : ''}${entry.aiAdjustment.toFixed(1)}), confidence ${entry.confidence}${
          entry.isCurrentDeployment ? ' — ALREADY DEPLOYED' : ''
        }${entry.blockers.length > 0 ? ` — BLOCKED: ${entry.blockers.join('; ')}` : ''}`,
    )
    .join('\n');
}

export async function designExpansionSequence(
  twin: DigitalTwin,
  ranked: RankedChainSummary[],
  signal?: AbortSignal,
): Promise<ExpansionSequence> {
  const { data } = await generateStructured({
    stage: 'expansion sequence',
    system: SEQUENCE_SYSTEM_PROMPT,
    schema: expansionSequenceSchema,
    toolName: 'submit_expansion_sequence',
    toolDescription: 'Submit the recommended expansion sequence using the exact chain slugs provided.',
    temperature: 0.3,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '--- END DIGITAL TWIN ---',
      '',
      '--- FINAL CHAIN RANKING ---',
      renderRanking(ranked),
      '--- END FINAL CHAIN RANKING ---',
      '',
      'Design the expansion sequence now. Use only the slugs above. Call submit_expansion_sequence.',
    ].join('\n'),
  });
  return data;
}

// ── Stage 5 ──────────────────────────────────────────────────────────────────

export async function generateArchitectureBrief(
  twin: DigitalTwin,
  sequence: ExpansionSequence,
  signal?: AbortSignal,
): Promise<ArchitectureBrief> {
  const { data } = await generateStructured({
    stage: 'architecture brief',
    system: ARCHITECTURE_SYSTEM_PROMPT,
    schema: architectureBriefSchema,
    toolName: 'submit_architecture_brief',
    toolDescription: 'Submit the multichain architecture brief.',
    temperature: 0.35,
    maxTokens: 10_000,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '--- END DIGITAL TWIN ---',
      '',
      '--- EXPANSION SEQUENCE ---',
      JSON.stringify(sequence, null, 2),
      '--- END EXPANSION SEQUENCE ---',
      '',
      'Produce the architecture brief now. Every connection.from and connection.to must match a component id you define. Call submit_architecture_brief.',
    ].join('\n'),
  });
  return data;
}

// ── Stage 6 ──────────────────────────────────────────────────────────────────

export async function generateRiskRegister(
  twin: DigitalTwin,
  sequence: ExpansionSequence,
  architecture: ArchitectureBrief,
  signal?: AbortSignal,
): Promise<RiskRegister> {
  const { data } = await generateStructured({
    stage: 'risk register',
    system: RISK_SYSTEM_PROMPT,
    schema: riskRegisterSchema,
    toolName: 'submit_risk_register',
    toolDescription: 'Submit the risk register for this expansion.',
    temperature: 0.35,
    maxTokens: 10_000,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '--- END DIGITAL TWIN ---',
      '',
      '--- EXPANSION SEQUENCE ---',
      JSON.stringify(sequence, null, 2),
      '',
      '--- ARCHITECTURE BRIEF ---',
      JSON.stringify(architecture, null, 2),
      '--- END INPUTS ---',
      '',
      'Produce the risk register now. Call submit_risk_register.',
    ].join('\n'),
  });
  return data;
}

// ── Stage 7 ──────────────────────────────────────────────────────────────────

export async function generateExecutionPlan(
  twin: DigitalTwin,
  sequence: ExpansionSequence,
  architecture: ArchitectureBrief,
  risks: RiskRegister,
  signal?: AbortSignal,
): Promise<ExecutionPlan> {
  const { data } = await generateStructured({
    stage: '30-day plan',
    system: PLAN_SYSTEM_PROMPT,
    schema: executionPlanSchema,
    toolName: 'submit_execution_plan',
    toolDescription: 'Submit the four-week execution plan.',
    temperature: 0.3,
    maxTokens: 12_000,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '',
      '--- EXPANSION SEQUENCE ---',
      JSON.stringify(sequence, null, 2),
      '',
      '--- ARCHITECTURE BRIEF ---',
      JSON.stringify(architecture, null, 2),
      '',
      '--- RISK REGISTER ---',
      JSON.stringify(risks, null, 2),
      '--- END INPUTS ---',
      '',
      'Produce the 30-day plan now. Exactly four weeks. Call submit_execution_plan.',
    ].join('\n'),
  });
  return data;
}

// ── Technical brief ──────────────────────────────────────────────────────────

export async function generateTechnicalBrief(
  twin: DigitalTwin,
  sequence: ExpansionSequence,
  architecture: ArchitectureBrief,
  plan: ExecutionPlan,
  signal?: AbortSignal,
): Promise<TechnicalBrief> {
  const { data } = await generateStructured({
    stage: 'technical brief',
    system: TECHNICAL_BRIEF_SYSTEM_PROMPT,
    schema: technicalBriefSchema,
    toolName: 'submit_technical_brief',
    toolDescription: 'Submit the engineering handoff brief.',
    temperature: 0.3,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '',
      '--- EXPANSION SEQUENCE ---',
      JSON.stringify(sequence, null, 2),
      '',
      '--- ARCHITECTURE BRIEF ---',
      JSON.stringify(architecture, null, 2),
      '',
      '--- EXECUTION PLAN ---',
      JSON.stringify(plan, null, 2),
      '--- END INPUTS ---',
      '',
      'Produce the technical brief now. Call submit_technical_brief.',
    ].join('\n'),
  });
  return data;
}

// ── Executive summary ────────────────────────────────────────────────────────

export async function generateExecutiveSummary(
  twin: DigitalTwin,
  ranked: RankedChainSummary[],
  sequence: ExpansionSequence,
  risks: RiskRegister,
  overallConfidence: number,
  signal?: AbortSignal,
): Promise<ExecutiveSummary> {
  const { data } = await generateStructured({
    stage: 'executive summary',
    system: SUMMARY_SYSTEM_PROMPT,
    schema: executiveSummarySchema,
    toolName: 'submit_executive_summary',
    toolDescription: 'Submit the executive summary.',
    temperature: 0.3,
    signal,
    prompt: [
      '--- MULTICHAIN DIGITAL TWIN ---',
      JSON.stringify(twin, null, 2),
      '',
      '--- FINAL CHAIN RANKING ---',
      renderRanking(ranked),
      '',
      '--- EXPANSION SEQUENCE ---',
      JSON.stringify(sequence, null, 2),
      '',
      '--- RISK REGISTER SUMMARY ---',
      risks.summary,
      risks.risks
        .slice(0, 8)
        .map((risk) => `- [${risk.category}] ${risk.title} (probability ${risk.probability}, impact ${risk.impact})`)
        .join('\n'),
      '',
      `The scoring engine computed an overall data confidence of ${overallConfidence}/100 for this analysis.`,
      '--- END INPUTS ---',
      '',
      'Write the executive summary now. Call submit_executive_summary.',
    ].join('\n'),
  });
  return data;
}

/** Re-exported so route handlers can validate regenerated sections generically. */
export const STAGE_SCHEMAS = {
  projectProfile: projectProfileSchema,
  digitalTwin: digitalTwinSchema,
  interpretations: chainInterpretationBatchSchema,
  sequence: expansionSequenceSchema,
  architecture: architectureBriefSchema,
  risks: riskRegisterSchema,
  plan: executionPlanSchema,
  technicalBrief: technicalBriefSchema,
  summary: executiveSummarySchema,
} satisfies Record<string, z.ZodType>;
