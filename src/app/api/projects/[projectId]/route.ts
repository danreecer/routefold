import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { recordActivity } from '@/lib/activity';
import { guardMutation, readJson, toErrorResponse } from '@/lib/api';
import { requireOwnedProject } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(1, 'A name is required.').max(120),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { projectId } = await context.params;
    const { profile } = await requireOwnedProject(projectId);
    const body = patchSchema.parse(await readJson(request));

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { name: body.name },
      select: { id: true, name: true },
    });

    await recordActivity({
      userId: profile.id,
      action: 'project.renamed',
      entityType: 'project',
      entityId: projectId,
      metadata: { name: body.name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Cascades to source documents, analyses, twins, scores, sections and shares. */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const guard = guardMutation(request);
  if (guard) return guard;

  try {
    const { projectId } = await context.params;
    const { profile, project } = await requireOwnedProject(projectId);

    await prisma.project.delete({ where: { id: projectId } });

    await recordActivity({
      userId: profile.id,
      action: 'project.deleted',
      entityType: 'project',
      entityId: projectId,
      metadata: { name: project.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
