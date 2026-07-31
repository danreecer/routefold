import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { capabilities } from '@/lib/env';

/**
 * Authentication and authorisation helpers.
 *
 * The single rule this module exists to enforce: an entity id from a URL or a
 * request body is never sufficient to access a row. Every read and every write
 * resolves the Clerk subject first, maps it to a UserProfile, and then filters
 * by that profile's id. There is no code path that loads a Project, Analysis or
 * ShareLink by id alone on behalf of a signed-in user.
 */

export class UnauthorizedError extends Error {
  override readonly name = 'UnauthorizedError';
  constructor(message = 'You must be signed in to do that.') {
    super(message);
  }
}

export class ForbiddenError extends Error {
  override readonly name = 'ForbiddenError';
  constructor(message = 'You do not have access to that.') {
    super(message);
  }
}

export class AuthNotConfiguredError extends Error {
  override readonly name = 'AuthNotConfiguredError';
  constructor() {
    super('Authentication is not configured on this deployment.');
  }
}

/** Returns the Clerk user id, or null when signed out / not configured. */
export async function getClerkUserId(): Promise<string | null> {
  if (!capabilities().auth) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the Clerk subject to a Routefold UserProfile, creating it on first
 * sight. Throws when signed out — call `getClerkUserId` first if you need a
 * non-throwing check.
 */
export async function requireUserProfile() {
  if (!capabilities().auth) throw new AuthNotConfiguredError();

  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  const existing = await prisma.userProfile.findUnique({ where: { clerkUserId: userId } });
  if (existing) return existing;

  // First sight of this user — provision a profile.
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    email?.split('@')[0] ||
    null;

  return prisma.userProfile.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, email, displayName },
    update: {},
  });
}

/** Loads a project the caller owns, or throws. */
export async function requireOwnedProject(projectId: string) {
  const profile = await requireUserProfile();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: profile.id },
  });
  if (!project) throw new ForbiddenError('That project does not exist or is not yours.');
  return { profile, project };
}

/** Loads an analysis the caller owns, or throws. */
export async function requireOwnedAnalysis(analysisId: string) {
  const profile = await requireUserProfile();
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, userId: profile.id },
    include: { project: true },
  });
  if (!analysis) throw new ForbiddenError('That report does not exist or is not yours.');
  return { profile, analysis };
}

export type AuthedProfile = Awaited<ReturnType<typeof requireUserProfile>>;
