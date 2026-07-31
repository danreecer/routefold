import 'server-only';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * Private-beta usage quota.
 *
 * Counters live in the database and are only ever incremented server-side, after
 * work actually completes. The client is told the remaining balance for display
 * but cannot influence it — every enforcement point re-reads the row.
 */

export type QuotaState = {
  reportsUsed: number;
  reportLimit: number;
  reportsRemaining: number;
  sectionsUsed: number;
  sectionLimit: number;
  sectionsRemaining: number;
  canGenerateReport: boolean;
  canRegenerateSection: boolean;
};

export function reportLimitFor(profile: { reportLimitOverride: number | null }): number {
  return profile.reportLimitOverride ?? env.reportGenerationLimit;
}

export function computeQuota(profile: {
  reportsGenerated: number;
  sectionsRegenerated: number;
  reportLimitOverride: number | null;
}): QuotaState {
  const reportLimit = reportLimitFor(profile);
  const sectionLimit = env.sectionRegenerationLimit;
  const reportsRemaining = Math.max(0, reportLimit - profile.reportsGenerated);
  const sectionsRemaining = Math.max(0, sectionLimit - profile.sectionsRegenerated);
  return {
    reportsUsed: profile.reportsGenerated,
    reportLimit,
    reportsRemaining,
    sectionsUsed: profile.sectionsRegenerated,
    sectionLimit,
    sectionsRemaining,
    canGenerateReport: reportsRemaining > 0,
    canRegenerateSection: sectionsRemaining > 0,
  };
}

export class QuotaExceededError extends Error {
  override readonly name = 'QuotaExceededError';
  constructor(
    readonly kind: 'report' | 'section',
    message: string,
  ) {
    super(message);
  }
}

/** Re-reads the row and throws if the caller is out of report generations. */
export async function assertReportQuota(userProfileId: string): Promise<QuotaState> {
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: userProfileId },
    select: { reportsGenerated: true, sectionsRegenerated: true, reportLimitOverride: true },
  });
  const quota = computeQuota(profile);
  if (!quota.canGenerateReport) {
    throw new QuotaExceededError(
      'report',
      `You have used all ${quota.reportLimit} report generations available during the private beta.`,
    );
  }
  return quota;
}

export async function assertSectionQuota(userProfileId: string): Promise<QuotaState> {
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: userProfileId },
    select: { reportsGenerated: true, sectionsRegenerated: true, reportLimitOverride: true },
  });
  const quota = computeQuota(profile);
  if (!quota.canRegenerateSection) {
    throw new QuotaExceededError(
      'section',
      `You have used all ${quota.sectionLimit} section regenerations available during the private beta.`,
    );
  }
  return quota;
}

/**
 * Consumes one report generation. Called only after a report reaches COMPLETED,
 * so a failed run never costs the user anything.
 */
export async function consumeReportCredit(userProfileId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { reportsGenerated: { increment: 1 } },
  });
}

export async function consumeSectionCredit(userProfileId: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id: userProfileId },
    data: { sectionsRegenerated: { increment: 1 } },
  });
}

export async function getQuota(userProfileId: string): Promise<QuotaState> {
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: userProfileId },
    select: { reportsGenerated: true, sectionsRegenerated: true, reportLimitOverride: true },
  });
  return computeQuota(profile);
}
