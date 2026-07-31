import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Lightweight audit log.
 *
 * Records who did what to which entity. Used for the dashboard activity feed and
 * as a basic audit trail. Writes are best-effort: an audit failure must never
 * fail the user's actual operation, but it is logged server-side when it happens.
 */

export type ActivityAction =
  | 'project.created'
  | 'project.renamed'
  | 'project.deleted'
  | 'analysis.created'
  | 'analysis.prepared'
  | 'analysis.completed'
  | 'analysis.failed'
  | 'analysis.duplicated'
  | 'analysis.deleted'
  | 'analysis.renamed'
  | 'twin.confirmed'
  | 'twin.edited'
  | 'section.regenerated'
  | 'share.created'
  | 'share.revoked'
  | 'export.json'
  | 'export.pdf';

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  'project.created': 'created project',
  'project.renamed': 'renamed project',
  'project.deleted': 'deleted project',
  'analysis.created': 'started analysis',
  'analysis.prepared': 'built Digital Twin for',
  'analysis.completed': 'completed report',
  'analysis.failed': 'analysis failed for',
  'analysis.duplicated': 'duplicated report',
  'analysis.deleted': 'deleted report',
  'analysis.renamed': 'renamed report',
  'twin.confirmed': 'confirmed Digital Twin for',
  'twin.edited': 'edited Digital Twin for',
  'section.regenerated': 'regenerated a section of',
  'share.created': 'created share link for',
  'share.revoked': 'revoked share link for',
  'export.json': 'exported JSON from',
  'export.pdf': 'exported PDF from',
};

export async function recordActivity(params: {
  userId: string;
  action: ActivityAction;
  entityType: 'project' | 'analysis' | 'share';
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('[activity] failed to record', {
      action: params.action,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function recentActivity(userId: string, take = 12) {
  return prisma.activityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
