import type { NextRequest } from 'next/server';
import { AnalysisStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { preparePhase } from '@/lib/ai/pipeline';
import { apiError, guardMutation, ndjsonStream, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { wizardInputStrictSchema } from '@/lib/schemas/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Phase 1 — retrieve sources, extract the profile, build the Digital Twin.
 *
 * Streams newline-delimited progress events. POST rather than GET because it
 * mutates; the client reads the stream manually rather than using EventSource,
 * which also keeps the same-origin guard applicable.
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

    if (analysis.status === AnalysisStatus.COMPLETED) {
      return apiError('ALREADY_COMPLETE', 'That report has already been generated.', 409);
    }
    if (analysis.status === AnalysisStatus.RUNNING) {
      return apiError('ALREADY_RUNNING', 'That analysis is already running.', 409);
    }

    const wizardInput = wizardInputStrictSchema.safeParse(analysis.project.wizardInput);
    if (!wizardInput.success) {
      return apiError(
        'MISSING_INPUT',
        'The wizard answers for this analysis are missing or invalid. Start a new analysis.',
        422,
      );
    }

    return ndjsonStream(async (emit) => {
      await preparePhase(analysisId, wizardInput.data, emit, request.signal);
      await recordActivity({
        userId: profile.id,
        action: 'analysis.prepared',
        entityType: 'analysis',
        entityId: analysisId,
        metadata: { name: analysis.project.name },
      });
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
