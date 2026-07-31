import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';

/**
 * Public share links.
 *
 * Tokens are 32 bytes from the OS CSPRNG, base64url-encoded — 256 bits of
 * entropy, so enumeration is not a threat model that needs additional controls.
 *
 * The read path (`loadSharedReport`) is the only place in the codebase that
 * returns report data without an authenticated owner check, so it is written to
 * select fields explicitly rather than spreading a row. Nothing about the owner
 * — email, Clerk id, display name, other projects, private notes — is reachable
 * through it.
 */

export function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createShareLink(analysisId: string) {
  // One active link per analysis keeps revocation unambiguous.
  await prisma.shareLink.updateMany({
    where: { analysisId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });

  return prisma.shareLink.create({
    data: { analysisId, token: generateShareToken(), isActive: true },
  });
}

export async function revokeShareLinks(analysisId: string): Promise<number> {
  const result = await prisma.shareLink.updateMany({
    where: { analysisId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });
  return result.count;
}

export async function getActiveShareLink(analysisId: string) {
  return prisma.shareLink.findFirst({
    where: { analysisId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export type SharedReport = NonNullable<Awaited<ReturnType<typeof loadSharedReport>>>;

/**
 * Resolves a share token to a read-only report projection.
 *
 * Returns null for unknown, revoked, expired, or not-yet-complete analyses —
 * the caller renders the same "not available" page for all of them so the token
 * space cannot be probed for validity.
 */
export async function loadSharedReport(token: string) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 128) return null;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    select: {
      id: true,
      isActive: true,
      expiresAt: true,
      analysisId: true,
    },
  });

  if (!link || !link.isActive) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;

  const analysis = await prisma.analysis.findFirst({
    where: { id: link.analysisId, status: 'COMPLETED' },
    select: {
      id: true,
      title: true,
      status: true,
      confidence: true,
      recommendedChain: true,
      scoringVersion: true,
      modelName: true,
      generationMode: true,
      completedAt: true,
      createdAt: true,
      // Explicitly NOT: userId, idempotencyKey, errorMessage.
      project: {
        select: {
          name: true,
          websiteUrl: true,
          docsUrl: true,
          description: true,
          currentChains: true,
          category: true,
          // Explicitly NOT: userId, wizardInput.
        },
      },
      digitalTwin: {
        select: {
          structuredData: true,
          confidence: true,
          assumptions: true,
          missingData: true,
          fieldSources: true,
        },
      },
      chainScores: {
        orderBy: { rank: 'asc' },
        select: {
          chainSlug: true,
          chainName: true,
          deterministicScore: true,
          aiAdjustment: true,
          finalScore: true,
          confidence: true,
          rank: true,
          recommendation: true,
          scoreBreakdown: true,
          explanation: true,
          blockers: true,
          missingData: true,
        },
      },
      sections: {
        select: { sectionType: true, content: true, version: true, generatedAt: true },
      },
    },
  });

  if (!analysis) return null;

  // Best-effort view accounting; never blocks the response.
  void prisma.shareLink
    .update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })
    .catch(() => undefined);

  return analysis;
}
