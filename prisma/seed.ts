/**
 * Database seed.
 *
 * Deliberately conservative about what it creates:
 *
 *  - It seeds the external-data snapshot table so a fresh deployment has a valid
 *    cached chain-metric row rather than showing "unavailable" until the first
 *    live fetch succeeds.
 *  - It creates NO users, projects, analyses or reports. Every account starts
 *    genuinely empty, and the dashboard is built to guide an empty account
 *    rather than to look busy. There is no demo, sample or placeholder data
 *    anywhere in the platform: everything a signed-in user sees is either
 *    something they created or the clearly-labelled fictional example at
 *    /example, which is static and never written to the database.
 *
 * Run with: pnpm db:seed
 */
import { PrismaClient } from '@prisma/client';
import { CHAIN_KNOWLEDGE_BASE, KNOWLEDGE_BASE_VERSION } from '../src/lib/chains/knowledge-base';

const prisma = new PrismaClient();

async function seedExternalSnapshot() {
  const existing = await prisma.externalDataSnapshot.findUnique({
    where: { source: 'defillama.chains' },
  });
  if (existing) {
    console.log('  · external data snapshot already present, leaving it alone');
    return;
  }

  // Seeded with nulls, not invented numbers. Status "seeded" is rendered
  // distinctly from "live" and "cached" everywhere it appears.
  const payload = Object.fromEntries(
    CHAIN_KNOWLEDGE_BASE.filter((chain) => chain.defillamaId).map((chain) => [
      chain.slug,
      { tvlUsd: null },
    ]),
  );

  await prisma.externalDataSnapshot.create({
    data: {
      source: 'defillama.chains',
      payload,
      status: 'seeded',
      // Already expired, so the first request attempts a real fetch immediately.
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  console.log(`  · seeded chain-metric placeholders for ${Object.keys(payload).length} chains`);
}

async function main() {
  console.log('Seeding Routefold…');
  console.log(`  · chain knowledge base v${KNOWLEDGE_BASE_VERSION}: ${CHAIN_KNOWLEDGE_BASE.length} ecosystems (compiled in, not stored)`);

  await seedExternalSnapshot();

  console.log('  · no demo, sample or placeholder rows are created — every account starts empty');

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
