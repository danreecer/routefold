import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { guardMutation, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Duplicates a completed report.
 *
 * This is a copy, not a regeneration: no model call is made and no quota is
 * consumed. It exists so a user can keep a snapshot before editing the Digital
 * Twin and regenerating sections against the original.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile } = await requireOwnedAnalysis(analysisId);

    const source = await prisma.analysis.findFirstOrThrow({
      where: { id: analysisId, userId: profile.id },
      include: {
        digitalTwin: true,
        chainScores: true,
        sections: true,
        project: true,
      },
    });

    const copy = await prisma.$transaction(async (tx) => {
      const analysis = await tx.analysis.create({
        data: {
          projectId: source.projectId,
          userId: profile.id,
          title: `${source.title ?? source.project.name} (copy)`,
          status: source.status,
          currentStage: source.currentStage,
          progress: source.progress,
          scoringVersion: source.scoringVersion,
          modelName: source.modelName,
          generationMode: source.generationMode,
          confidence: source.confidence,
          recommendedChain: source.recommendedChain,
          completedAt: source.completedAt,
          idempotencyKey: randomUUID(),
        },
      });

      if (source.digitalTwin) {
        await tx.digitalTwin.create({
          data: {
            analysisId: analysis.id,
            structuredData: source.digitalTwin.structuredData as Prisma.InputJsonValue,
            confidence: source.digitalTwin.confidence,
            assumptions: source.digitalTwin.assumptions,
            missingData: source.digitalTwin.missingData,
            fieldSources: (source.digitalTwin.fieldSources ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            userConfirmed: source.digitalTwin.userConfirmed,
          },
        });
      }

      if (source.chainScores.length > 0) {
        await tx.chainScore.createMany({
          data: source.chainScores.map((score) => ({
            analysisId: analysis.id,
            chainSlug: score.chainSlug,
            chainName: score.chainName,
            deterministicScore: score.deterministicScore,
            aiAdjustment: score.aiAdjustment,
            finalScore: score.finalScore,
            confidence: score.confidence,
            rank: score.rank,
            recommendation: score.recommendation,
            scoreBreakdown: score.scoreBreakdown as Prisma.InputJsonValue,
            explanation: (score.explanation ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            blockers: score.blockers,
            missingData: score.missingData,
          })),
        });
      }

      if (source.sections.length > 0) {
        await tx.reportSection.createMany({
          data: source.sections.map((section) => ({
            analysisId: analysis.id,
            sectionType: section.sectionType,
            content: section.content as Prisma.InputJsonValue,
            version: section.version,
            modelName: section.modelName,
          })),
        });
      }

      return analysis;
    });

    await recordActivity({
      userId: profile.id,
      action: 'analysis.duplicated',
      entityType: 'analysis',
      entityId: copy.id,
      metadata: { name: copy.title ?? source.project.name },
    });

    return NextResponse.json({ analysisId: copy.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
