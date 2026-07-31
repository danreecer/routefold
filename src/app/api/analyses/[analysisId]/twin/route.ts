import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { recordActivity } from '@/lib/activity';
import { guardMutation, readJson, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { digitalTwinSchema } from '@/lib/schemas/twin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  twin: digitalTwinSchema,
  confirm: z.boolean().default(false),
});

/** Returns the stored Digital Twin for review. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  try {
    const { analysisId } = await context.params;
    await requireOwnedAnalysis(analysisId);

    const twin = await prisma.digitalTwin.findUnique({ where: { analysisId } });
    if (!twin) {
      return NextResponse.json(
        { error: 'TWIN_MISSING', message: 'The Digital Twin has not been built yet.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      twin: twin.structuredData,
      confidence: twin.confidence,
      assumptions: twin.assumptions,
      missingData: twin.missingData,
      fieldSources: twin.fieldSources,
      userConfirmed: twin.userConfirmed,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Saves user corrections to the twin, optionally confirming it.
 *
 * Confirmation is a separate boolean rather than implied by saving, so a user
 * can correct the model over several passes before committing to scoring.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);
    const body = patchSchema.parse(await readJson(request));

    const updated = await prisma.digitalTwin.update({
      where: { analysisId },
      data: {
        structuredData: body.twin as unknown as Prisma.InputJsonValue,
        confidence: body.twin.confidence,
        assumptions: body.twin.assumptions,
        missingData: body.twin.missingData,
        userConfirmed: body.confirm,
        userEditedAt: new Date(),
      },
    });

    // Keep the project row consistent with the twin the user just confirmed.
    await prisma.project.update({
      where: { id: analysis.projectId },
      data: {
        currentChains: body.twin.currentChains,
        category: body.twin.productCategory,
      },
    });

    await recordActivity({
      userId: profile.id,
      action: body.confirm ? 'twin.confirmed' : 'twin.edited',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: { name: analysis.project.name },
    });

    return NextResponse.json({ ok: true, userConfirmed: updated.userConfirmed });
  } catch (error) {
    return toErrorResponse(error);
  }
}
