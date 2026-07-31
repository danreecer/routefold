import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { recordActivity } from '@/lib/activity';
import { guardMutation, readJson, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().trim().min(1, 'A title is required.').max(160),
});

/** Progress polling target for the wizard and the report page. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  try {
    const { analysisId } = await context.params;
    await requireOwnedAnalysis(analysisId);

    const analysis = await prisma.analysis.findUniqueOrThrow({
      where: { id: analysisId },
      select: {
        id: true,
        status: true,
        currentStage: true,
        progress: true,
        errorCode: true,
        errorMessage: true,
        confidence: true,
        recommendedChain: true,
        events: { orderBy: { createdAt: 'asc' }, take: 60 },
      },
    });

    return NextResponse.json({
      id: analysis.id,
      status: analysis.status,
      currentStage: analysis.currentStage,
      progress: analysis.progress,
      errorCode: analysis.errorCode,
      errorMessage: analysis.errorMessage,
      confidence: analysis.confidence,
      recommendedChain: analysis.recommendedChain,
      events: analysis.events.map((event) => ({
        stage: event.stage,
        state: event.state,
        message: event.message,
        at: event.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile } = await requireOwnedAnalysis(analysisId);
    const body = patchSchema.parse(await readJson(request));

    const updated = await prisma.analysis.update({
      where: { id: analysisId },
      data: { title: body.title },
      select: { id: true, title: true },
    });

    await recordActivity({
      userId: profile.id,
      action: 'analysis.renamed',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: { name: body.title },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Deleting cascades to the twin, scores, sections, events and share links. */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);

    await prisma.analysis.delete({ where: { id: analysisId } });

    await recordActivity({
      userId: profile.id,
      action: 'analysis.deleted',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: { name: analysis.title ?? analysis.project.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
