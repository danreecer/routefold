import { NextResponse, type NextRequest } from 'next/server';
import { recordActivity } from '@/lib/activity';
import { regenerateSection, SectionDependencyError, sectionDisplayName } from '@/lib/ai/regenerate';
import { apiError, guardMutation, toErrorResponse } from '@/lib/api';
import { requireOwnedAnalysis } from '@/lib/auth';
import { assertSectionQuota, consumeSectionCredit } from '@/lib/quota';
import { REGENERATABLE_SECTIONS, type RegeneratableSection } from '@/lib/schemas/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Regenerates one report section.
 *
 * Costs one section credit rather than a full report generation, and only when
 * the regeneration actually succeeds.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ analysisId: string; sectionType: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { analysisId, sectionType } = await context.params;

    if (!REGENERATABLE_SECTIONS.includes(sectionType as RegeneratableSection)) {
      return apiError(
        'UNSUPPORTED_SECTION',
        `That section cannot be regenerated on its own. Regeneratable sections: ${REGENERATABLE_SECTIONS.join(', ')}.`,
        400,
      );
    }

    const section = sectionType as RegeneratableSection;
    const { profile, analysis } = await requireOwnedAnalysis(analysisId);

    await assertSectionQuota(profile.id);

    await regenerateSection(analysisId, section, request.signal);
    await consumeSectionCredit(profile.id);

    await recordActivity({
      userId: profile.id,
      action: 'section.regenerated',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: { name: analysis.title ?? analysis.project.name, section },
    });

    return NextResponse.json({ ok: true, section, label: sectionDisplayName(section) });
  } catch (error) {
    if (error instanceof SectionDependencyError) {
      return apiError('SECTION_DEPENDENCY', error.message, 409);
    }
    return toErrorResponse(error);
  }
}
