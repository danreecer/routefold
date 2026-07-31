import { NextResponse, type NextRequest } from 'next/server';
import { AnalysisStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { apiError, guardMutation, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { absoluteUrl } from '@/lib/env';
import { createShareLink, getActiveShareLink, revokeShareLinks } from '@/lib/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns the current active share link, if any. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  try {
    const { analysisId } = await context.params;
    await requireOwnedAnalysis(analysisId);

    const link = await getActiveShareLink(analysisId);
    if (!link) return NextResponse.json({ active: false, url: null });

    return NextResponse.json({
      active: true,
      url: absoluteUrl(`/share/${link.token}`),
      createdAt: link.createdAt.toISOString(),
      viewCount: link.viewCount,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Creates a link, replacing any existing one so revocation stays unambiguous. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);

    if (analysis.status !== AnalysisStatus.COMPLETED) {
      return apiError('NOT_COMPLETE', 'Only completed reports can be shared.', 409);
    }

    const link = await createShareLink(analysisId);

    await recordActivity({
      userId: profile.id,
      action: 'share.created',
      entityType: 'share',
      entityId: link.id,
      metadata: { name: analysis.title ?? analysis.project.name },
    });

    return NextResponse.json(
      { active: true, url: absoluteUrl(`/share/${link.token}`) },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId } = await context.params;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);

    const revoked = await revokeShareLinks(analysisId);

    if (revoked > 0) {
      await recordActivity({
        userId: profile.id,
        action: 'share.revoked',
        entityType: 'analysis',
        entityId: analysisId,
        metadata: { name: analysis.title ?? analysis.project.name },
      });
    }

    return NextResponse.json({ active: false, revoked });
  } catch (error) {
    return toErrorResponse(error);
  }
}
