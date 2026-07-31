import 'server-only';
import { ReportSectionType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generationMode } from '@/lib/env';
import {
  architectureBriefSchema,
  executionPlanSchema,
  expansionSequenceSchema,
  riskRegisterSchema,
  type RegeneratableSection,
} from '@/lib/schemas/report';
import { digitalTwinSchema } from '@/lib/schemas/twin';
import { overallConfidence } from '@/lib/scoring';
import { saveSection } from './pipeline';
import {
  designExpansionSequence,
  generateArchitectureBrief,
  generateExecutionPlan,
  generateExecutiveSummary,
  generateRiskRegister,
  generateTechnicalBrief,
  type RankedChainSummary,
} from './stages';
import {
  buildFixtureArchitecture,
  buildFixturePlan,
  buildFixtureRisks,
  buildFixtureSequence,
  buildFixtureSummary,
  buildFixtureTechnicalBrief,
} from './fixture';

/**
 * Section-level regeneration.
 *
 * Downstream sections depend on upstream ones, so regenerating a section reads
 * the current stored versions of its inputs rather than re-running the whole
 * pipeline. Regenerating the architecture brief, for example, uses the stored
 * expansion sequence — which is what makes a targeted regeneration cheap enough
 * to charge a smaller quota unit for.
 */

export class SectionDependencyError extends Error {
  override readonly name = 'SectionDependencyError';
  constructor(section: string, missing: string) {
    super(`${section} cannot be regenerated because ${missing} is missing. Regenerate that first.`);
  }
}

async function loadContext(analysisId: string) {
  const analysis = await prisma.analysis.findUniqueOrThrow({
    where: { id: analysisId },
    include: {
      digitalTwin: true,
      chainScores: { orderBy: { rank: 'asc' } },
      sections: true,
    },
  });

  if (!analysis.digitalTwin) throw new SectionDependencyError('This section', 'the Digital Twin');
  const twin = digitalTwinSchema.parse(analysis.digitalTwin.structuredData);

  const ranked: RankedChainSummary[] = analysis.chainScores.map((score) => ({
    slug: score.chainSlug,
    name: score.chainName,
    finalScore: score.finalScore,
    deterministicScore: score.deterministicScore,
    aiAdjustment: score.aiAdjustment,
    confidence: score.confidence,
    isCurrentDeployment: score.recommendation === 'current',
    blockers: score.blockers,
  }));

  const section = <T>(type: ReportSectionType, parse: (value: unknown) => T, label: string): T => {
    const row = analysis.sections.find((entry) => entry.sectionType === type);
    if (!row) throw new SectionDependencyError('This section', label);
    return parse(row.content);
  };

  return { analysis, twin, ranked, section };
}

export async function regenerateSection(
  analysisId: string,
  sectionType: RegeneratableSection,
  signal?: AbortSignal,
): Promise<void> {
  const mode = generationMode();
  if (mode === 'unavailable') {
    throw new SectionDependencyError('This section', 'a configured analysis provider');
  }
  const isFixture = mode === 'fixture';

  const { twin, ranked, section } = await loadContext(analysisId);

  switch (sectionType) {
    case 'EXPANSION_MAP': {
      const sequence = isFixture
        ? buildFixtureSequence(ranked)
        : await designExpansionSequence(twin, ranked, signal);
      await saveSection(analysisId, ReportSectionType.EXPANSION_MAP, sequence, mode);
      await prisma.analysis.update({
        where: { id: analysisId },
        data: { recommendedChain: sequence.primary.chainSlug },
      });
      return;
    }

    case 'ARCHITECTURE': {
      const sequence = section(
        ReportSectionType.EXPANSION_MAP,
        (value) => expansionSequenceSchema.parse(value),
        'the expansion sequence',
      );
      const architecture = isFixture
        ? buildFixtureArchitecture(twin, sequence)
        : await generateArchitectureBrief(twin, sequence, signal);
      await saveSection(analysisId, ReportSectionType.ARCHITECTURE, architecture, mode);
      return;
    }

    case 'RISK_REGISTER': {
      const sequence = section(
        ReportSectionType.EXPANSION_MAP,
        (value) => expansionSequenceSchema.parse(value),
        'the expansion sequence',
      );
      const architecture = section(
        ReportSectionType.ARCHITECTURE,
        (value) => architectureBriefSchema.parse(value),
        'the architecture brief',
      );
      const risks = isFixture
        ? buildFixtureRisks(twin, sequence)
        : await generateRiskRegister(twin, sequence, architecture, signal);
      await saveSection(analysisId, ReportSectionType.RISK_REGISTER, risks, mode);
      return;
    }

    case 'EXECUTION_PLAN': {
      const sequence = section(
        ReportSectionType.EXPANSION_MAP,
        (value) => expansionSequenceSchema.parse(value),
        'the expansion sequence',
      );
      const architecture = section(
        ReportSectionType.ARCHITECTURE,
        (value) => architectureBriefSchema.parse(value),
        'the architecture brief',
      );
      const risks = section(
        ReportSectionType.RISK_REGISTER,
        (value) => riskRegisterSchema.parse(value),
        'the risk register',
      );
      const plan = isFixture
        ? buildFixturePlan(sequence)
        : await generateExecutionPlan(twin, sequence, architecture, risks, signal);
      await saveSection(analysisId, ReportSectionType.EXECUTION_PLAN, plan, mode);
      return;
    }

    case 'TECHNICAL_BRIEF': {
      const sequence = section(
        ReportSectionType.EXPANSION_MAP,
        (value) => expansionSequenceSchema.parse(value),
        'the expansion sequence',
      );
      const architecture = section(
        ReportSectionType.ARCHITECTURE,
        (value) => architectureBriefSchema.parse(value),
        'the architecture brief',
      );
      const plan = section(
        ReportSectionType.EXECUTION_PLAN,
        (value) => executionPlanSchema.parse(value),
        'the execution plan',
      );
      const brief = isFixture
        ? buildFixtureTechnicalBrief(twin, sequence)
        : await generateTechnicalBrief(twin, sequence, architecture, plan, signal);
      await saveSection(analysisId, ReportSectionType.TECHNICAL_BRIEF, brief, mode);
      return;
    }

    case 'EXECUTIVE_SUMMARY': {
      const sequence = section(
        ReportSectionType.EXPANSION_MAP,
        (value) => expansionSequenceSchema.parse(value),
        'the expansion sequence',
      );
      const risks = section(
        ReportSectionType.RISK_REGISTER,
        (value) => riskRegisterSchema.parse(value),
        'the risk register',
      );
      const confidence = overallConfidence(
        ranked.map((entry) => ({
          confidence: entry.confidence,
          deterministicScore: entry.deterministicScore,
        })),
      );
      const summary = isFixture
        ? buildFixtureSummary(twin, ranked, sequence, confidence)
        : await generateExecutiveSummary(twin, ranked, sequence, risks, confidence, signal);
      await saveSection(analysisId, ReportSectionType.EXECUTIVE_SUMMARY, summary, mode);
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          confidence: summary.confidence,
          recommendedChain: summary.recommendedChainSlug,
        },
      });
      return;
    }

    default: {
      const exhaustive: never = sectionType;
      throw new Error(`Unsupported section: ${String(exhaustive)}`);
    }
  }
}

export { sectionDisplayName } from './regenerate-labels';
