import { NextResponse, type NextRequest } from 'next/server';
import { recordActivity } from '@/lib/activity';
import { apiError, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { toExportPayload, toReportModel } from '@/lib/report-model';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** JSON export. Owner-only; the payload deliberately excludes account fields. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ analysisId: string }> },
) {
  try {
    const { analysisId } = await context.params;
    const { profile } = await requireOwnedAnalysis(analysisId);

    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId: profile.id },
      include: {
        project: true,
        digitalTwin: true,
        chainScores: { orderBy: { rank: 'asc' } },
        sections: true,
      },
    });

    if (!analysis) return apiError('NOT_FOUND', 'That report does not exist.', 404);

    const report = toReportModel(analysis);
    if (!report) {
      return apiError('NOT_READY', 'That report is not complete enough to export.', 409);
    }

    await recordActivity({
      userId: profile.id,
      action: 'export.json',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: { name: report.title },
    });

    const filename = `routefold-${slugify(report.projectName) || 'report'}.json`;

    return new NextResponse(JSON.stringify(toExportPayload(report), null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
