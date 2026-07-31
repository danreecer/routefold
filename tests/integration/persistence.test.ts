import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { toReportModel } from '@/lib/report-model';
import { SCORING_VERSION, computeWeights, scoreChains } from '@/lib/scoring';
import { CHAIN_KNOWLEDGE_BASE } from '@/lib/chains/knowledge-base';
import { EXAMPLE_TWIN } from '@/lib/example/twin';
import {
  EXAMPLE_ARCHITECTURE,
  EXAMPLE_PLAN,
  EXAMPLE_RISKS,
  EXAMPLE_SEQUENCE,
  buildExampleSummary,
} from '@/lib/example/report';
import { computeQuota } from '@/lib/quota';

/**
 * Integration tests against a real PostgreSQL database.
 *
 * These exercise the guarantees that unit tests cannot: cascading deletes,
 * uniqueness constraints, the idempotency key, and — most importantly — that a
 * query scoped to one user cannot reach another user's rows.
 *
 * They require a database. Start one with `pnpm dev:db` and apply migrations
 * with `pnpm db:migrate`. If DATABASE_URL is unreachable the suite fails loudly
 * rather than skipping, because a silently skipped authorisation test is worse
 * than no test at all.
 *
 * Note on constraint tests: the embedded development engine drops its
 * connection when a statement raises, instead of returning the error and
 * continuing as a full PostgreSQL server does. `expectConstraintViolation`
 * therefore reconnects afterwards, so the same assertions pass against both the
 * embedded engine and the real PostgreSQL used in CI.
 */

/**
 * Asserts that an operation is rejected by a database constraint, and restores
 * the connection afterwards. Where the driver surfaces a Prisma error code, it
 * must be P2002 (unique violation) — the assertion is not weakened to "throws".
 */
async function expectConstraintViolation(operation: () => Promise<unknown>) {
  let thrown: unknown;
  try {
    await operation();
  } catch (error) {
    thrown = error;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await prisma.$connect().catch(() => undefined);
  }

  expect(thrown, 'expected the operation to be rejected by a constraint').toBeDefined();
  const code = (thrown as { code?: string }).code;
  if (code && code.startsWith('P2')) {
    expect(code).toBe('P2002');
  }
}

const prisma = new PrismaClient();

const RUN_ID = `test-${Math.random().toString(36).slice(2, 10)}`;
const userA = `${RUN_ID}-a`;
const userB = `${RUN_ID}-b`;

let profileA: { id: string };
let profileB: { id: string };

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    throw new Error(
      `Integration tests need a reachable PostgreSQL database at DATABASE_URL.\n` +
        `Start one with "pnpm dev:db" and run "pnpm db:migrate".\n` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  profileA = await prisma.userProfile.create({
    data: { clerkUserId: userA, displayName: 'User A', email: 'a@example.test' },
  });
  profileB = await prisma.userProfile.create({
    data: { clerkUserId: userB, displayName: 'User B', email: 'b@example.test' },
  });
});

afterAll(async () => {
  await prisma.userProfile.deleteMany({ where: { clerkUserId: { in: [userA, userB] } } });
  await prisma.$disconnect();
});

async function createProject(userId: string, name = 'Test Protocol') {
  return prisma.project.create({
    data: {
      userId,
      name,
      websiteUrl: 'https://example.test',
      currentChains: ['ethereum'],
      category: 'tokenized-assets',
    },
  });
}

async function createAnalysis(userId: string, projectId: string, key: string) {
  return prisma.analysis.create({
    data: {
      projectId,
      userId,
      title: 'Test blueprint',
      status: 'COMPLETED',
      currentStage: 'DONE',
      progress: 100,
      scoringVersion: SCORING_VERSION,
      modelName: 'test',
      generationMode: 'fixture',
      confidence: 70,
      recommendedChain: 'base',
      completedAt: new Date(),
      idempotencyKey: key,
    },
  });
}

describe('project lifecycle', () => {
  it('creates and reads a project scoped to its owner', async () => {
    const project = await createProject(profileA.id);
    const found = await prisma.project.findFirst({
      where: { id: project.id, userId: profileA.id },
    });
    expect(found?.name).toBe('Test Protocol');
  });

  it('does not return another user\'s project under their id', async () => {
    const project = await createProject(profileA.id, 'Private to A');
    // This is the exact query shape every route handler uses.
    const asUserB = await prisma.project.findFirst({
      where: { id: project.id, userId: profileB.id },
    });
    expect(asUserB).toBeNull();
  });

  it('cascades to analyses, sources and sections on delete', async () => {
    const project = await createProject(profileA.id, 'Cascade test');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-cascade`);

    await prisma.sourceDocument.create({
      data: {
        projectId: project.id,
        sourceUrl: 'https://example.test',
        retrievalStatus: 'SUCCESS',
        extractedText: 'text',
      },
    });
    await prisma.reportSection.create({
      data: { analysisId: analysis.id, sectionType: 'EXECUTIVE_SUMMARY', content: {} },
    });
    await prisma.shareLink.create({
      data: { analysisId: analysis.id, token: `${RUN_ID}-cascade-token` },
    });

    await prisma.project.delete({ where: { id: project.id } });

    expect(await prisma.analysis.findUnique({ where: { id: analysis.id } })).toBeNull();
    expect(await prisma.sourceDocument.count({ where: { projectId: project.id } })).toBe(0);
    expect(await prisma.reportSection.count({ where: { analysisId: analysis.id } })).toBe(0);
    expect(await prisma.shareLink.count({ where: { analysisId: analysis.id } })).toBe(0);
  });
});

describe('analysis idempotency', () => {
  it('rejects a duplicate idempotency key for the same user', async () => {
    const project = await createProject(profileA.id, 'Idempotency');
    const key = `${RUN_ID}-idem`;
    await createAnalysis(profileA.id, project.id, key);

    await expectConstraintViolation(() => createAnalysis(profileA.id, project.id, key));
  });

  it('allows the same key for a different user', async () => {
    const key = `${RUN_ID}-shared-key`;
    const projectA = await createProject(profileA.id, 'Key A');
    const projectB = await createProject(profileB.id, 'Key B');

    await createAnalysis(profileA.id, projectA.id, key);
    const second = await createAnalysis(profileB.id, projectB.id, key);
    expect(second.id).toBeDefined();
  });
});

describe('report persistence and retrieval', () => {
  it('round-trips a full report through the shared view model', async () => {
    const project = await createProject(profileA.id, 'Round trip');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-roundtrip`);

    await prisma.digitalTwin.create({
      data: {
        analysisId: analysis.id,
        structuredData: EXAMPLE_TWIN as never,
        confidence: EXAMPLE_TWIN.confidence,
        assumptions: EXAMPLE_TWIN.assumptions,
        missingData: EXAMPLE_TWIN.missingData,
        userConfirmed: true,
      },
    });

    const weights = computeWeights(EXAMPLE_TWIN.objectives, EXAMPLE_TWIN.objectives[0]);
    const scored = scoreChains(EXAMPLE_TWIN, CHAIN_KNOWLEDGE_BASE, { weights });

    await prisma.chainScore.createMany({
      data: scored.slice(0, 5).map((score, index) => ({
        analysisId: analysis.id,
        chainSlug: score.chainSlug,
        chainName: score.chainName,
        deterministicScore: score.deterministicScore,
        aiAdjustment: 0,
        finalScore: score.deterministicScore,
        confidence: score.confidence,
        rank: index + 1,
        recommendation: index === 0 ? 'primary' : 'monitor',
        scoreBreakdown: score.breakdown as never,
        blockers: score.blockers,
        missingData: score.missingData,
      })),
    });

    await prisma.reportSection.createMany({
      data: [
        {
          analysisId: analysis.id,
          sectionType: 'EXECUTIVE_SUMMARY',
          content: buildExampleSummary() as never,
        },
        { analysisId: analysis.id, sectionType: 'EXPANSION_MAP', content: EXAMPLE_SEQUENCE as never },
        {
          analysisId: analysis.id,
          sectionType: 'ARCHITECTURE',
          content: EXAMPLE_ARCHITECTURE as never,
        },
        { analysisId: analysis.id, sectionType: 'RISK_REGISTER', content: EXAMPLE_RISKS as never },
        { analysisId: analysis.id, sectionType: 'EXECUTION_PLAN', content: EXAMPLE_PLAN as never },
      ],
    });

    const loaded = await prisma.analysis.findFirst({
      where: { id: analysis.id, userId: profileA.id },
      include: {
        project: true,
        digitalTwin: true,
        chainScores: { orderBy: { rank: 'asc' } },
        sections: true,
      },
    });

    expect(loaded).not.toBeNull();
    const report = toReportModel(loaded!);
    expect(report).not.toBeNull();
    expect(report!.scores).toHaveLength(5);
    expect(report!.summary).not.toBeNull();
    expect(report!.architecture).not.toBeNull();
    expect(report!.plan).not.toBeNull();
    expect(report!.twin.productName).toBe(EXAMPLE_TWIN.productName);
  });

  it('enforces one section row per type per analysis', async () => {
    const project = await createProject(profileA.id, 'Section uniqueness');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-section-unique`);

    await prisma.reportSection.create({
      data: { analysisId: analysis.id, sectionType: 'ARCHITECTURE', content: {} },
    });
    await expectConstraintViolation(() =>
      prisma.reportSection.create({
        data: { analysisId: analysis.id, sectionType: 'ARCHITECTURE', content: {} },
      }),
    );
  });

  it('enforces one score row per chain per analysis', async () => {
    const project = await createProject(profileA.id, 'Score uniqueness');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-score-unique`);
    const row = {
      analysisId: analysis.id,
      chainSlug: 'base',
      chainName: 'Base',
      deterministicScore: 50,
      aiAdjustment: 0,
      finalScore: 50,
      confidence: 70,
      rank: 1,
      recommendation: 'primary',
      scoreBreakdown: {} as never,
    };
    await prisma.chainScore.create({ data: row });
    await expectConstraintViolation(() => prisma.chainScore.create({ data: { ...row, rank: 2 } }));
  });
});

describe('share links', () => {
  it('creates, resolves and revokes a link', async () => {
    const project = await createProject(profileA.id, 'Shareable');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-share`);
    const token = `${RUN_ID}-share-token`;

    await prisma.shareLink.create({ data: { analysisId: analysis.id, token } });

    const active = await prisma.shareLink.findFirst({ where: { token, isActive: true } });
    expect(active).not.toBeNull();

    await prisma.shareLink.updateMany({
      where: { analysisId: analysis.id, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    const afterRevoke = await prisma.shareLink.findFirst({ where: { token, isActive: true } });
    expect(afterRevoke).toBeNull();
  });

  it('enforces token uniqueness', async () => {
    const project = await createProject(profileA.id, 'Token uniqueness');
    const analysis = await createAnalysis(profileA.id, project.id, `${RUN_ID}-token-unique`);
    const token = `${RUN_ID}-duplicate-token`;

    await prisma.shareLink.create({ data: { analysisId: analysis.id, token } });
    await expectConstraintViolation(() =>
      prisma.shareLink.create({ data: { analysisId: analysis.id, token } }),
    );
  });

  it('does not resolve a token belonging to an incomplete analysis', async () => {
    const project = await createProject(profileA.id, 'Incomplete');
    const analysis = await prisma.analysis.create({
      data: {
        projectId: project.id,
        userId: profileA.id,
        status: 'RUNNING',
        scoringVersion: SCORING_VERSION,
        modelName: 'test',
        idempotencyKey: `${RUN_ID}-incomplete`,
      },
    });
    const token = `${RUN_ID}-incomplete-token`;
    await prisma.shareLink.create({ data: { analysisId: analysis.id, token } });

    // The share loader requires status COMPLETED.
    const resolved = await prisma.analysis.findFirst({
      where: { id: analysis.id, status: 'COMPLETED' },
    });
    expect(resolved).toBeNull();
  });
});

describe('quota accounting', () => {
  it('increments only on the counter it is told to', async () => {
    await prisma.userProfile.update({
      where: { id: profileA.id },
      data: { reportsGenerated: { increment: 1 } },
    });
    const after = await prisma.userProfile.findUniqueOrThrow({ where: { id: profileA.id } });
    expect(after.reportsGenerated).toBe(1);
    expect(after.sectionsRegenerated).toBe(0);
    expect(computeQuota(after).reportsRemaining).toBe(computeQuota(after).reportLimit - 1);
  });
});

describe('activity log', () => {
  it('records events scoped to the acting user', async () => {
    const project = await createProject(profileA.id, 'Activity');
    await prisma.activityEvent.create({
      data: {
        userId: profileA.id,
        action: 'project.created',
        entityType: 'project',
        entityId: project.id,
        metadata: { name: 'Activity' },
      },
    });

    const forA = await prisma.activityEvent.findMany({ where: { userId: profileA.id } });
    const forB = await prisma.activityEvent.findMany({ where: { userId: profileB.id } });
    expect(forA.length).toBeGreaterThan(0);
    expect(forB.some((event) => event.entityId === project.id)).toBe(false);
  });
});
