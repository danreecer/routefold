import 'server-only';
import { AnalysisStage, AnalysisStatus, Prisma, ReportSectionType, RetrievalStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { env, generationMode } from '@/lib/env';
import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION, getChain, knowledgeBaseReviewedAt } from '@/lib/chains/knowledge-base';
import { getChainMetricSnapshot } from '@/lib/chains/live-data';
import { retrieveSources } from '@/lib/retrieval/fetcher';
import { digitalTwinSchema, type DigitalTwin } from '@/lib/schemas/twin';
import type { WizardInput } from '@/lib/schemas/wizard';
import { sourcesAssumptionsSchema } from '@/lib/schemas/report';
import {
  applyAiAdjustment,
  computeWeights,
  deriveRecommendation,
  overallConfidence,
  SCORING_VERSION,
  scoreChains,
  type ChainScoreResult,
} from '@/lib/scoring';
import { AiConfigurationError, AiGenerationError, modelName } from './client';
import {
  buildDigitalTwin,
  designExpansionSequence,
  extractProjectProfile,
  generateArchitectureBrief,
  generateExecutionPlan,
  generateExecutiveSummary,
  generateRiskRegister,
  generateTechnicalBrief,
  interpretChains,
  type RankedChainSummary,
  type SourceInput,
} from './stages';
import {
  FIXTURE_MODEL_NAME,
  buildFixtureArchitecture,
  buildFixtureInterpretations,
  buildFixturePlan,
  buildFixtureProfile,
  buildFixtureRisks,
  buildFixtureSequence,
  buildFixtureSummary,
  buildFixtureTechnicalBrief,
  buildFixtureTwin,
} from './fixture';

/**
 * Pipeline orchestration.
 *
 * Two phases so the user can correct the model before it commits to numbers:
 *
 *   preparePhase  — retrieve sources, extract profile, build twin → AWAITING_REVIEW
 *   generatePhase — score, interpret, sequence, architect, risk, plan → COMPLETED
 *
 * Progress is only ever advanced when a real stage finishes. There is no timer.
 * Each transition writes an AnalysisEvent row *and* emits a stream event, so a
 * client that reconnects mid-run can reconstruct exactly where things stand.
 */

export type ProgressEvent =
  | { type: 'stage'; stage: AnalysisStage; state: 'started' | 'completed' | 'failed'; label: string; progress: number; detail?: string }
  | { type: 'phase-complete'; status: AnalysisStatus; analysisId: string }
  | { type: 'error'; code: string; message: string };

export type Emit = (event: ProgressEvent) => void;

export const STAGE_LABELS: Record<AnalysisStage, string> = {
  RETRIEVING_SOURCES: 'Retrieving sources',
  EXTRACTING_PROFILE: 'Extracting project profile',
  BUILDING_TWIN: 'Building Digital Twin',
  SCORING_ECOSYSTEMS: 'Scoring ecosystems',
  DESIGNING_SEQUENCE: 'Designing expansion sequence',
  GENERATING_ARCHITECTURE: 'Generating architecture',
  BUILDING_RISK_REGISTER: 'Building risk register',
  CREATING_EXECUTION_PLAN: 'Creating execution plan',
  FINALIZING: 'Finalizing report',
  DONE: 'Complete',
};

/** Progress percentage reached once the named stage completes. */
const STAGE_PROGRESS: Record<AnalysisStage, number> = {
  RETRIEVING_SOURCES: 10,
  EXTRACTING_PROFILE: 22,
  BUILDING_TWIN: 32,
  SCORING_ECOSYSTEMS: 45,
  DESIGNING_SEQUENCE: 60,
  GENERATING_ARCHITECTURE: 72,
  BUILDING_RISK_REGISTER: 84,
  CREATING_EXECUTION_PLAN: 94,
  FINALIZING: 99,
  DONE: 100,
};

export const PREPARE_STAGES: AnalysisStage[] = [
  AnalysisStage.RETRIEVING_SOURCES,
  AnalysisStage.EXTRACTING_PROFILE,
  AnalysisStage.BUILDING_TWIN,
];

export const GENERATE_STAGES: AnalysisStage[] = [
  AnalysisStage.SCORING_ECOSYSTEMS,
  AnalysisStage.DESIGNING_SEQUENCE,
  AnalysisStage.GENERATING_ARCHITECTURE,
  AnalysisStage.BUILDING_RISK_REGISTER,
  AnalysisStage.CREATING_EXECUTION_PLAN,
  AnalysisStage.FINALIZING,
];

class StageRunner {
  constructor(
    private readonly analysisId: string,
    private readonly emit: Emit,
  ) {}

  async run<T>(stage: AnalysisStage, work: () => Promise<T>): Promise<T> {
    this.emit({
      type: 'stage',
      stage,
      state: 'started',
      label: STAGE_LABELS[stage],
      progress: Math.max(0, STAGE_PROGRESS[stage] - 8),
    });
    await this.record(stage, 'started');
    await prisma.analysis.update({
      where: { id: this.analysisId },
      data: { currentStage: stage, status: AnalysisStatus.RUNNING },
    });

    try {
      const result = await work();
      await this.record(stage, 'completed');
      await prisma.analysis.update({
        where: { id: this.analysisId },
        data: { progress: STAGE_PROGRESS[stage] },
      });
      this.emit({
        type: 'stage',
        stage,
        state: 'completed',
        label: STAGE_LABELS[stage],
        progress: STAGE_PROGRESS[stage],
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown failure.';
      await this.record(stage, 'failed', message);
      this.emit({
        type: 'stage',
        stage,
        state: 'failed',
        label: STAGE_LABELS[stage],
        progress: STAGE_PROGRESS[stage],
        detail: message,
      });
      throw error;
    }
  }

  private async record(stage: AnalysisStage, state: string, message?: string) {
    try {
      await prisma.analysisEvent.create({
        data: { analysisId: this.analysisId, stage, state, message: message ?? null },
      });
    } catch {
      // Event logging must never take down a run.
    }
  }
}

function toErrorCode(error: unknown): { code: string; message: string } {
  if (error instanceof AiConfigurationError) {
    return {
      code: 'AI_NOT_CONFIGURED',
      message: 'Analysis is not configured on this deployment. OPENAI_API_KEY and OPENAI_MODEL are required.',
    };
  }
  if (error instanceof AiGenerationError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { code: 'CANCELLED', message: 'The analysis was cancelled.' };
  }
  console.error('[pipeline] unexpected failure', error);
  return { code: 'INTERNAL', message: 'The analysis failed unexpectedly. Nothing was charged against your quota.' };
}

async function markFailed(analysisId: string, error: unknown, emit: Emit) {
  const { code, message } = toErrorCode(error);
  await prisma.analysis
    .update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.FAILED, errorCode: code, errorMessage: message },
    })
    .catch(() => undefined);
  emit({ type: 'error', code, message });
}

// ── Phase 1: prepare ─────────────────────────────────────────────────────────

export async function preparePhase(
  analysisId: string,
  input: WizardInput,
  emit: Emit,
  signal?: AbortSignal,
): Promise<void> {
  const runner = new StageRunner(analysisId, emit);
  const mode = generationMode();

  if (mode === 'unavailable') {
    await markFailed(analysisId, new AiConfigurationError('not configured'), emit);
    return;
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    select: { projectId: true },
  });
  if (!analysis) throw new Error('Analysis not found.');

  try {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { startedAt: new Date(), status: AnalysisStatus.RUNNING },
    });

    // ── Stage: retrieve sources ──
    const sources = await runner.run(AnalysisStage.RETRIEVING_SOURCES, async () => {
      const targets: Array<{ url: string; kind: string }> = [];
      if (input.websiteUrl) targets.push({ url: input.websiteUrl, kind: 'website' });
      if (input.docsUrl) targets.push({ url: input.docsUrl, kind: 'docs' });

      const results = targets.length > 0 ? await retrieveSources(targets, signal) : [];

      const stored: SourceInput[] = [];
      for (const result of results) {
        await prisma.sourceDocument.create({
          data: {
            projectId: analysis.projectId,
            sourceUrl: result.sourceUrl,
            resolvedUrl: result.resolvedUrl,
            title: result.content?.title ?? null,
            extractedText: result.content?.text ?? null,
            retrievalStatus: result.status as RetrievalStatus,
            failureReason: result.status === 'SUCCESS' ? null : result.message,
            contentHash: result.contentHash,
            byteSize: result.byteSize,
            wordCount: result.content?.wordCount ?? null,
            kind: result.kind,
            retrievedAt: result.retrievedAt,
          },
        });
        stored.push({
          url: result.sourceUrl,
          kind: result.kind,
          status: result.status,
          title: result.content?.title ?? null,
          text: result.content?.text ?? null,
          failureReason: result.status === 'SUCCESS' ? null : result.message,
        });
      }

      if (input.manualDescription.trim().length > 0) {
        await prisma.sourceDocument.create({
          data: {
            projectId: analysis.projectId,
            sourceUrl: 'user://manual-description',
            extractedText: input.manualDescription,
            retrievalStatus: RetrievalStatus.MANUAL,
            kind: 'manual',
            wordCount: input.manualDescription.split(/\s+/).filter(Boolean).length,
            retrievedAt: new Date(),
          },
        });
      }

      return stored;
    });

    // ── Stage: extract profile ──
    const profile = await runner.run(AnalysisStage.EXTRACTING_PROFILE, async () =>
      mode === 'fixture'
        ? buildFixtureProfile(input)
        : extractProjectProfile(input, sources, signal),
    );

    // ── Stage: build twin ──
    const twin = await runner.run(AnalysisStage.BUILDING_TWIN, async () => {
      const built = mode === 'fixture' ? buildFixtureTwin(input) : await buildDigitalTwin(profile, input, signal);
      // Constraints the user typed are authoritative; never let the model soften them.
      return digitalTwinSchema.parse({
        ...built,
        currentChains: input.currentChains.length > 0 ? input.currentChains : built.currentChains,
        objectives: input.objectives,
        constraints: {
          ...built.constraints,
          timeHorizon: input.timeHorizon,
          teamCapacity: input.teamCapacity,
          budgetSensitivity: input.budgetSensitivity,
          excludedEcosystems: input.excludedEcosystems,
          requiredVm: input.requiredVm,
        },
        preferredEcosystems: input.preferredEcosystems,
      });
    });

    const fieldSources = buildFieldSources(input, sources.some((s) => s.status === 'SUCCESS'));

    await prisma.digitalTwin.upsert({
      where: { analysisId },
      create: {
        analysisId,
        structuredData: twin as unknown as Prisma.InputJsonValue,
        confidence: twin.confidence,
        assumptions: twin.assumptions,
        missingData: twin.missingData,
        fieldSources: fieldSources as unknown as Prisma.InputJsonValue,
      },
      update: {
        structuredData: twin as unknown as Prisma.InputJsonValue,
        confidence: twin.confidence,
        assumptions: twin.assumptions,
        missingData: twin.missingData,
        fieldSources: fieldSources as unknown as Prisma.InputJsonValue,
        userConfirmed: false,
      },
    });

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.AWAITING_REVIEW, progress: STAGE_PROGRESS.BUILDING_TWIN },
    });

    emit({ type: 'phase-complete', status: AnalysisStatus.AWAITING_REVIEW, analysisId });
  } catch (error) {
    await markFailed(analysisId, error, emit);
  }
}

function buildFieldSources(input: WizardInput, hadSources: boolean): Record<string, string> {
  const sourceOrInferred = hadSources ? 'source' : 'inferred';
  return {
    productName: 'user',
    productCategory: 'user',
    oneLineDescription: sourceOrInferred,
    'architecture.summary': sourceOrInferred,
    'architecture.contractComplexity': 'inferred',
    'architecture.upgradeability': sourceOrInferred,
    currentChains: input.currentChains.length > 0 ? 'user' : sourceOrInferred,
    vmRequirement: 'user',
    contractLanguages: input.contractLanguages.length > 0 ? 'user' : sourceOrInferred,
    'users.primaryProfile': 'user',
    'users.estimatedSophistication': 'inferred',
    'liquidity.requiresDeepLiquidity': 'inferred',
    'liquidity.stablecoinDependency': 'inferred',
    'transactions.profile': 'inferred',
    'transactions.latencySensitivity': 'inferred',
    'transactions.costSensitivity': 'inferred',
    'transactions.finalityRequirement': 'inferred',
    'security.sensitivity': 'user',
    'security.valueAtRisk': 'inferred',
    'security.auditStatus': sourceOrInferred,
    orientation: 'inferred',
    targetGeographies: input.targetGeographies.length > 0 ? 'user' : 'default',
    'constraints.timeHorizon': 'user',
    'constraints.teamCapacity': 'user',
    'constraints.budgetSensitivity': 'user',
    'constraints.excludedEcosystems': 'user',
    'constraints.requiredVm': 'user',
    objectives: 'user',
    preferredEcosystems: 'user',
    developmentStage: 'user',
    hasToken: 'user',
  };
}

// ── Phase 2: generate ────────────────────────────────────────────────────────

export async function generatePhase(analysisId: string, emit: Emit, signal?: AbortSignal): Promise<void> {
  const runner = new StageRunner(analysisId, emit);
  const mode = generationMode();

  if (mode === 'unavailable') {
    await markFailed(analysisId, new AiConfigurationError('not configured'), emit);
    return;
  }

  const record = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { digitalTwin: true, project: { include: { sources: true } } },
  });

  if (!record?.digitalTwin) {
    await markFailed(analysisId, new Error('Digital Twin is missing.'), emit);
    return;
  }

  const twinParsed = digitalTwinSchema.safeParse(record.digitalTwin.structuredData);
  if (!twinParsed.success) {
    await markFailed(analysisId, new Error('The stored Digital Twin is not valid.'), emit);
    return;
  }
  const twin: DigitalTwin = twinParsed.data;

  try {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.RUNNING, errorCode: null, errorMessage: null },
    });

    // ── Stage: score ecosystems ──
    const { scoredResults, ranked } = await runner.run(AnalysisStage.SCORING_ECOSYSTEMS, async () => {
      const weights = computeWeights(twin.objectives, twin.objectives[0]);
      const deterministic = scoreChains(twin, CHAIN_KNOWLEDGE_BASE, { weights });

      // Only the plausible candidates go to the model — interpreting fifteen
      // chains in one call degrades quality and most are not decision-relevant.
      const candidates = deterministic
        .filter((result) => !result.isCurrentDeployment && result.deterministicScore > 0)
        .slice(0, 8);

      const pairs = candidates
        .map((score) => {
          const chain = getChain(score.chainSlug);
          return chain ? { chain, score } : null;
        })
        .filter((pair): pair is { chain: (typeof CHAIN_KNOWLEDGE_BASE)[number]; score: ChainScoreResult } =>
          Boolean(pair),
        );

      const interpretations =
        mode === 'fixture'
          ? buildFixtureInterpretations(pairs)
          : await interpretChains(twin, pairs, signal);

      const byslug = new Map(interpretations.map((entry) => [entry.chainSlug, entry]));

      const finalResults = deterministic.map((result, index) => {
        const interpretation = byslug.get(result.chainSlug);
        const { aiAdjustment, finalScore } = applyAiAdjustment(
          result.deterministicScore,
          interpretation?.adjustment ?? 0,
          Boolean(interpretation?.adjustmentReason && interpretation.adjustmentReason.trim().length > 0),
        );
        return { result, interpretation, aiAdjustment, finalScore, index };
      });

      // Re-rank on the final score, keeping current deployments out of contention.
      finalResults.sort((a, b) => {
        if (a.result.isCurrentDeployment !== b.result.isCurrentDeployment) {
          return a.result.isCurrentDeployment ? 1 : -1;
        }
        return b.finalScore - a.finalScore;
      });

      await prisma.chainScore.deleteMany({ where: { analysisId } });

      const rankedSummaries: RankedChainSummary[] = [];

      for (const [rank, entry] of finalResults.entries()) {
        const recommendation = deriveRecommendation(
          {
            finalScore: entry.finalScore,
            blockers: entry.result.blockers,
            isCurrentDeployment: entry.result.isCurrentDeployment,
          },
          rank + 1,
        );

        await prisma.chainScore.create({
          data: {
            analysisId,
            chainSlug: entry.result.chainSlug,
            chainName: entry.result.chainName,
            deterministicScore: entry.result.deterministicScore,
            aiAdjustment: entry.aiAdjustment,
            finalScore: entry.finalScore,
            confidence: entry.result.confidence,
            rank: rank + 1,
            recommendation,
            scoreBreakdown: entry.result.breakdown as unknown as Prisma.InputJsonValue,
            explanation: (entry.interpretation ?? null) as unknown as Prisma.InputJsonValue,
            blockers: entry.result.blockers,
            missingData: entry.result.missingData,
          },
        });

        rankedSummaries.push({
          slug: entry.result.chainSlug,
          name: entry.result.chainName,
          finalScore: entry.finalScore,
          deterministicScore: entry.result.deterministicScore,
          aiAdjustment: entry.aiAdjustment,
          confidence: entry.result.confidence,
          isCurrentDeployment: entry.result.isCurrentDeployment,
          blockers: entry.result.blockers,
        });
      }

      return { scoredResults: deterministic, ranked: rankedSummaries };
    });

    // ── Stage: expansion sequence ──
    const sequence = await runner.run(AnalysisStage.DESIGNING_SEQUENCE, async () =>
      mode === 'fixture' ? buildFixtureSequence(ranked) : designExpansionSequence(twin, ranked, signal),
    );
    await saveSection(analysisId, ReportSectionType.EXPANSION_MAP, sequence, mode);

    // ── Stage: architecture ──
    const architecture = await runner.run(AnalysisStage.GENERATING_ARCHITECTURE, async () =>
      mode === 'fixture'
        ? buildFixtureArchitecture(twin, sequence)
        : generateArchitectureBrief(twin, sequence, signal),
    );
    await saveSection(analysisId, ReportSectionType.ARCHITECTURE, architecture, mode);

    // ── Stage: risk register ──
    const risks = await runner.run(AnalysisStage.BUILDING_RISK_REGISTER, async () =>
      mode === 'fixture'
        ? buildFixtureRisks(twin, sequence)
        : generateRiskRegister(twin, sequence, architecture, signal),
    );
    await saveSection(analysisId, ReportSectionType.RISK_REGISTER, risks, mode);

    // ── Stage: execution plan ──
    const plan = await runner.run(AnalysisStage.CREATING_EXECUTION_PLAN, async () =>
      mode === 'fixture'
        ? buildFixturePlan(sequence)
        : generateExecutionPlan(twin, sequence, architecture, risks, signal),
    );
    await saveSection(analysisId, ReportSectionType.EXECUTION_PLAN, plan, mode);

    // ── Stage: finalize ──
    await runner.run(AnalysisStage.FINALIZING, async () => {
      const confidence = overallConfidence(scoredResults);

      const summary =
        mode === 'fixture'
          ? buildFixtureSummary(twin, ranked, sequence, confidence)
          : await generateExecutiveSummary(twin, ranked, sequence, risks, confidence, signal);
      await saveSection(analysisId, ReportSectionType.EXECUTIVE_SUMMARY, summary, mode);

      const technicalBrief =
        mode === 'fixture'
          ? buildFixtureTechnicalBrief(twin, sequence)
          : await generateTechnicalBrief(twin, sequence, architecture, plan, signal);
      await saveSection(analysisId, ReportSectionType.TECHNICAL_BRIEF, technicalBrief, mode);

      const snapshot = await getChainMetricSnapshot();
      const sourcesSection = sourcesAssumptionsSchema.parse({
        submittedSources: record.project.sources.map((source) => ({
          url: source.sourceUrl,
          kind: source.kind,
          status: source.retrievalStatus,
          retrievedAt: source.retrievedAt?.toISOString() ?? null,
          wordCount: source.wordCount,
          failureReason: source.failureReason,
        })),
        userAssumptions: twin.constraints.other,
        modelAssumptions: twin.assumptions,
        missingData: twin.missingData,
        chainDataSource: {
          knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
          reviewedAt: knowledgeBaseReviewedAt(),
          liveDataStatus: snapshot.status,
          liveDataFetchedAt: snapshot.fetchedAt,
        },
        methodologyVersion: SCORING_VERSION,
        generationMode: mode,
        modelName: mode === 'fixture' ? FIXTURE_MODEL_NAME : modelName(),
      });
      await saveSection(analysisId, ReportSectionType.SOURCES_ASSUMPTIONS, sourcesSection, mode);

      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.COMPLETED,
          currentStage: AnalysisStage.DONE,
          progress: 100,
          completedAt: new Date(),
          confidence: summary.confidence,
          recommendedChain: summary.recommendedChainSlug,
        },
      });

      return true;
    });

    emit({ type: 'phase-complete', status: AnalysisStatus.COMPLETED, analysisId });
  } catch (error) {
    await markFailed(analysisId, error, emit);
  }
}

async function saveSection(
  analysisId: string,
  sectionType: ReportSectionType,
  content: unknown,
  mode: 'live' | 'fixture',
): Promise<void> {
  const name = mode === 'fixture' ? FIXTURE_MODEL_NAME : modelName();
  await prisma.reportSection.upsert({
    where: { analysisId_sectionType: { analysisId, sectionType } },
    create: {
      analysisId,
      sectionType,
      content: content as Prisma.InputJsonValue,
      modelName: name,
    },
    update: {
      content: content as Prisma.InputJsonValue,
      version: { increment: 1 },
      modelName: name,
      generatedAt: new Date(),
    },
  });
}

export { saveSection, STAGE_PROGRESS };
export const ACTIVE_MODEL_NAME = () => (generationMode() === 'fixture' ? FIXTURE_MODEL_NAME : modelName());
export const ACTIVE_SCORING_VERSION = SCORING_VERSION;
export const ENV_FIXTURE_MODE = env.fixtureMode;
