import type { NextRequest } from 'next/server';
import { AnalysisStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { generatePhase } from '@/lib/ai/pipeline';
import { apiError, guardMutation, ndjsonStream, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertReportQuota, consumeReportCredit } from '@/lib/quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Phase 2 — score, interpret, sequence, architect, risk, plan.
 *
 * Quota is checked before the run and only consumed when the analysis actually
 * reaches COMPLETED. A run that fails part-way costs the user nothing, which is
 * the only defensible behaviour for a paid-ish resource.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);

    if (analysis.status === AnalysisStatus.RUNNING) {
      return apiError('ALREADY_RUNNING', 'That analysis is already running.', 409);
    }
    if (analysis.status === AnalysisStatus.COMPLETED) {
      return apiError('ALREADY_COMPLETE', 'That report has already been generated.', 409);
    }
    if (analysis.status !== AnalysisStatus.AWAITING_REVIEW && analysis.status !== AnalysisStatus.FAILED) {
      return apiError(
        'TWIN_NOT_READY',
        'Confirm the Digital Twin before generating the report.',
        409,
      );
    }

    const twin = await prisma.digitalTwin.findUnique({
      where: { analysisId },
      select: { userConfirmed: true },
    });
    if (!twin) {
      return apiError('TWIN_MISSING', 'The Digital Twin has not been built yet.', 409);
    }
    if (!twin.userConfirmed) {
      return apiError(
        'TWIN_NOT_CONFIRMED',
        'Review and confirm the Digital Twin before generating the report.',
        409,
      );
    }

    await assertReportQuota(profile.id);

    return ndjsonStream(async (emit) => {
      await generatePhase(analysisId, emit, request.signal);

      const finished = await prisma.analysis.findUnique({
        where: { id: analysisId },
        select: { status: true },
      });

      if (finished?.status === AnalysisStatus.COMPLETED) {
        await consumeReportCredit(profile.id);
        await recordActivity({
          userId: profile.id,
          action: 'analysis.completed',
          entityType: 'analysis',
          entityId: analysisId,
          metadata: { name: analysis.project.name },
        });
      } else {
        await recordActivity({
          userId: profile.id,
          action: 'analysis.failed',
          entityType: 'analysis',
          entityId: analysisId,
          metadata: { name: analysis.project.name },
        });
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
