import { NextResponse, type NextRequest } from 'next/server';
import { AnalysisStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { ACTIVE_MODEL_NAME, ACTIVE_SCORING_VERSION } from '@/lib/ai/pipeline';
import { apiError, guardMutation, readJson, rateLimitResponse, toErrorResponse } from '@/lib/api';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generationMode } from '@/lib/env';
import { limitAnalysisCreation } from '@/lib/rate-limit';
import { assertReportQuota } from '@/lib/quota';
import { createAnalysisRequestSchema } from '@/lib/schemas/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creates a project (or reuses one) and an analysis record.
 *
 * Idempotent by `idempotencyKey`: a duplicate submit — a double click, a retry
 * after a flaky connection, a resubmitted form — returns the existing analysis
 * instead of creating a second one and consuming a second quota unit. The
 * uniqueness is enforced by a database constraint, not just by this check, so a
 * genuine race still resolves to one row.
 */
export async function POST(request: NextRequest) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const profile = await requireUserProfile();

    const limit = limitAnalysisCreation(profile.id);
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

    if (generationMode() === 'unavailable') {
      return apiError(
        'AI_NOT_CONFIGURED',
        'Analysis is not configured on this deployment. OPENAI_API_KEY and OPENAI_MODEL are required.',
        503,
      );
    }

    await assertReportQuota(profile.id);

    const body = createAnalysisRequestSchema.parse(await readJson(request));
    const { input, idempotencyKey } = body;

    const existing = await prisma.analysis.findUnique({
      where: { user_idempotency: { userId: profile.id, idempotencyKey } },
      select: { id: true, status: true, projectId: true },
    });
    if (existing) {
      return NextResponse.json({
        analysisId: existing.id,
        projectId: existing.projectId,
        status: existing.status,
        reused: true,
      });
    }

    // One transaction so a failure cannot leave an orphan project behind.
    const created = await prisma.$transaction(async (tx) => {
      const project = body.projectId
        ? await tx.project.findFirst({ where: { id: body.projectId, userId: profile.id } })
        : null;

      const resolvedProject =
        project ??
        (await tx.project.create({
          data: {
            userId: profile.id,
            name: input.productName,
            websiteUrl: input.websiteUrl || null,
            docsUrl: input.docsUrl || null,
            description: input.manualDescription || null,
            currentChains: input.currentChains,
            category: input.category,
            wizardInput: input,
          },
        }));

      if (project) {
        await tx.project.update({
          where: { id: project.id },
          data: {
            name: input.productName,
            websiteUrl: input.websiteUrl || null,
            docsUrl: input.docsUrl || null,
            description: input.manualDescription || null,
            currentChains: input.currentChains,
            category: input.category,
            wizardInput: input,
          },
        });
      }

      const analysis = await tx.analysis.create({
        data: {
          projectId: resolvedProject.id,
          userId: profile.id,
          title: `${input.productName} expansion blueprint`,
          status: AnalysisStatus.QUEUED,
          scoringVersion: ACTIVE_SCORING_VERSION,
          modelName: ACTIVE_MODEL_NAME(),
          generationMode: generationMode() === 'fixture' ? 'fixture' : 'live',
          idempotencyKey,
        },
      });

      return { analysis, project: resolvedProject, isNewProject: !project };
    });

    await recordActivity({
      userId: profile.id,
      action: created.isNewProject ? 'project.created' : 'analysis.created',
      entityType: 'analysis',
      entityId: created.analysis.id,
      metadata: { name: input.productName },
    });

    return NextResponse.json(
      {
        analysisId: created.analysis.id,
        projectId: created.project.id,
        status: created.analysis.status,
        reused: false,
      },
      { status: 201 },
    );
  } catch (error) {
    // A concurrent request winning the idempotency race is not an error.
    if ((error as { code?: string }).code === 'P2002') {
      try {
        const profile = await requireUserProfile();
        const body = createAnalysisRequestSchema.parse(await readJson(request));
        const existing = await prisma.analysis.findUnique({
          where: { user_idempotency: { userId: profile.id, idempotencyKey: body.idempotencyKey } },
          select: { id: true, projectId: true, status: true },
        });
        if (existing) {
          return NextResponse.json({
            analysisId: existing.id,
            projectId: existing.projectId,
            status: existing.status,
            reused: true,
          });
        }
      } catch {
        // fall through to the generic handler
      }
    }
    return toErrorResponse(error);
  }
}
