import { z } from 'zod';
import type { ScoreBreakdown } from '@/lib/scoring/types';
import type { Recommendation } from '@/lib/scoring/engine';
import {
  architectureBriefSchema,
  executionPlanSchema,
  executiveSummarySchema,
  expansionSequenceSchema,
  riskRegisterSchema,
  sourcesAssumptionsSchema,
  technicalBriefSchema,
  type ArchitectureBrief,
  type ChainInterpretation,
  type ExecutionPlan,
  type ExecutiveSummary,
  type ExpansionSequence,
  type RiskRegister,
  type SourcesAssumptions,
  type TechnicalBrief,
} from '@/lib/schemas/report';
import { digitalTwinSchema, type DigitalTwin } from '@/lib/schemas/twin';

/**
 * The single view model every report surface renders.
 *
 * Three very different sources produce it — the built-in example, an owner's
 * database-backed analysis, and a public share token — and all three converge
 * here. That means the report components are written once, and a change to the
 * report is impossible to apply inconsistently across the three surfaces.
 */

export type ReportChainScore = {
  chainSlug: string;
  chainName: string;
  deterministicScore: number;
  aiAdjustment: number;
  finalScore: number;
  confidence: number;
  rank: number;
  recommendation: Recommendation;
  scoreBreakdown: ScoreBreakdown;
  explanation: ChainInterpretation | null;
  blockers: string[];
  missingData: string[];
};

export type ReportModel = {
  id: string;
  title: string;
  projectName: string;
  websiteUrl: string | null;
  docsUrl: string | null;
  currentChains: string[];
  confidence: number;
  recommendedChain: string | null;
  completedAt: string | null;
  createdAt: string;
  scoringVersion: string;
  modelName: string;
  generationMode: 'live' | 'fixture';
  /** True for the built-in fictional example. Drives the illustrative banner. */
  isExample: boolean;
  /** True on the public share surface. Hides owner-only controls. */
  isPublicView: boolean;

  twin: DigitalTwin;
  twinAssumptions: string[];
  twinMissingData: string[];
  twinFieldSources: Record<string, string> | null;

  scores: ReportChainScore[];

  summary: ExecutiveSummary | null;
  sequence: ExpansionSequence | null;
  architecture: ArchitectureBrief | null;
  risks: RiskRegister | null;
  plan: ExecutionPlan | null;
  technicalBrief: TechnicalBrief | null;
  sources: SourcesAssumptions | null;
};

const SECTION_PARSERS = {
  EXECUTIVE_SUMMARY: executiveSummarySchema,
  EXPANSION_MAP: expansionSequenceSchema,
  ARCHITECTURE: architectureBriefSchema,
  RISK_REGISTER: riskRegisterSchema,
  EXECUTION_PLAN: executionPlanSchema,
  TECHNICAL_BRIEF: technicalBriefSchema,
  SOURCES_ASSUMPTIONS: sourcesAssumptionsSchema,
} as const;

/**
 * Parses a stored section. Stored data was validated on write, but schemas
 * evolve — a section written by an older version that no longer parses is
 * rendered as absent rather than crashing the whole report.
 */
function parseSection<K extends keyof typeof SECTION_PARSERS>(
  sections: Array<{ sectionType: string; content: unknown }>,
  key: K,
): z.infer<(typeof SECTION_PARSERS)[K]> | null {
  const row = sections.find((section) => section.sectionType === key);
  if (!row) return null;
  const parsed = SECTION_PARSERS[key].safeParse(row.content);
  if (!parsed.success) {
    console.warn(`[report] section ${key} failed validation and was omitted`);
    return null;
  }
  return parsed.data as z.infer<(typeof SECTION_PARSERS)[K]>;
}

type RawAnalysis = {
  id: string;
  title: string | null;
  confidence: number | null;
  recommendedChain: string | null;
  scoringVersion: string;
  modelName: string;
  generationMode: string;
  completedAt: Date | null;
  createdAt: Date;
  project: {
    name: string;
    websiteUrl: string | null;
    docsUrl: string | null;
    currentChains: string[];
  };
  digitalTwin: {
    structuredData: unknown;
    assumptions: string[];
    missingData: string[];
    fieldSources: unknown;
  } | null;
  chainScores: Array<{
    chainSlug: string;
    chainName: string;
    deterministicScore: number;
    aiAdjustment: number;
    finalScore: number;
    confidence: number;
    rank: number;
    recommendation: string;
    scoreBreakdown: unknown;
    explanation: unknown;
    blockers: string[];
    missingData: string[];
  }>;
  sections: Array<{ sectionType: string; content: unknown }>;
};

/** Converts a database row set into the shared view model. */
export function toReportModel(
  analysis: RawAnalysis,
  options: { isPublicView?: boolean } = {},
): ReportModel | null {
  if (!analysis.digitalTwin) return null;
  const twinParsed = digitalTwinSchema.safeParse(analysis.digitalTwin.structuredData);
  if (!twinParsed.success) return null;

  return {
    id: analysis.id,
    title: analysis.title ?? `${analysis.project.name} expansion blueprint`,
    projectName: analysis.project.name,
    websiteUrl: analysis.project.websiteUrl,
    docsUrl: analysis.project.docsUrl,
    currentChains: analysis.project.currentChains,
    confidence: analysis.confidence ?? 0,
    recommendedChain: analysis.recommendedChain,
    completedAt: analysis.completedAt?.toISOString() ?? null,
    createdAt: analysis.createdAt.toISOString(),
    scoringVersion: analysis.scoringVersion,
    modelName: analysis.modelName,
    generationMode: analysis.generationMode === 'fixture' ? 'fixture' : 'live',
    isExample: false,
    isPublicView: options.isPublicView ?? false,

    twin: twinParsed.data,
    twinAssumptions: analysis.digitalTwin.assumptions,
    twinMissingData: analysis.digitalTwin.missingData,
    twinFieldSources: (analysis.digitalTwin.fieldSources as Record<string, string> | null) ?? null,

    scores: analysis.chainScores.map((score) => ({
      chainSlug: score.chainSlug,
      chainName: score.chainName,
      deterministicScore: score.deterministicScore,
      aiAdjustment: score.aiAdjustment,
      finalScore: score.finalScore,
      confidence: score.confidence,
      rank: score.rank,
      recommendation: score.recommendation as Recommendation,
      scoreBreakdown: score.scoreBreakdown as ScoreBreakdown,
      explanation: (score.explanation as ChainInterpretation | null) ?? null,
      blockers: score.blockers,
      missingData: score.missingData,
    })),

    summary: parseSection(analysis.sections, 'EXECUTIVE_SUMMARY'),
    sequence: parseSection(analysis.sections, 'EXPANSION_MAP'),
    architecture: parseSection(analysis.sections, 'ARCHITECTURE'),
    risks: parseSection(analysis.sections, 'RISK_REGISTER'),
    plan: parseSection(analysis.sections, 'EXECUTION_PLAN'),
    technicalBrief: parseSection(analysis.sections, 'TECHNICAL_BRIEF'),
    sources: parseSection(analysis.sections, 'SOURCES_ASSUMPTIONS'),
  };
}

/** Shape used by the JSON export. Excludes anything owner-identifying. */
export function toExportPayload(report: ReportModel) {
  return {
    routefold: {
      schemaVersion: '1.0.0',
      scoringVersion: report.scoringVersion,
      generationMode: report.generationMode,
      model: report.modelName,
      generatedAt: report.completedAt ?? report.createdAt,
      disclaimer:
        'Routefold provides technical and strategic decision support. Outputs may contain incomplete assumptions and do not constitute financial, legal, compliance, security-audit, or investment advice.',
    },
    project: {
      name: report.projectName,
      websiteUrl: report.websiteUrl,
      docsUrl: report.docsUrl,
      currentChains: report.currentChains,
    },
    digitalTwin: report.twin,
    confidence: report.confidence,
    recommendedChain: report.recommendedChain,
    chainScores: report.scores,
    executiveSummary: report.summary,
    expansionSequence: report.sequence,
    architecture: report.architecture,
    riskRegister: report.risks,
    executionPlan: report.plan,
    technicalBrief: report.technicalBrief,
    sourcesAndAssumptions: report.sources,
  };
}
