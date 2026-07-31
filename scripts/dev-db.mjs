#!/usr/bin/env node
/**
 * Local development database.
 *
 * Routefold targets PostgreSQL in production. This script starts a real
 * PostgreSQL engine (PGlite — Postgres 17 compiled to WASM) and exposes it on a
 * TCP socket speaking the Postgres wire protocol, so Prisma, `psql`, and the app
 * all connect to it with an ordinary `postgresql://` URL and no system install.
 *
 * It is a development convenience only. Production uses a managed PostgreSQL
 * instance via DATABASE_URL — see DEPLOYMENT.md.
 *
 *   pnpm dev:db                 # start on 127.0.0.1:5433, data in .routefold-db
 *   PGPORT=5544 pnpm dev:db     # different port
 *   RESET=1 pnpm dev:db         # wipe the data directory first
 */
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { PGlite } = await import('@electric-sql/pglite');
const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

const PORT = Number(process.env.PGPORT ?? 5433);
const HOST = process.env.PGHOST ?? '127.0.0.1';
const DATA_DIR = path.resolve(process.cwd(), process.env.PGDATA_DIR ?? '.routefold-db');

if (process.env.RESET === '1' && existsSync(DATA_DIR)) {
  console.log(`[dev-db] RESET=1 — removing ${DATA_DIR}`);
  await rm(DATA_DIR, { recursive: true, force: true });
}

await mkdir(path.dirname(DATA_DIR), { recursive: true });

console.log('[dev-db] booting embedded PostgreSQL…');
const db = await PGlite.create({ dataDir: DATA_DIR });

// PGlite starts with a single database named `postgres`. Prisma's default URL in
// .env.example points at a database called `routefold`; create it if missing so
// both spellings work.
try {
  const existing = await db.query(`SELECT 1 FROM pg_database WHERE datname = 'routefold'`);
  if (existing.rows.length === 0) {
    await db.exec(`CREATE DATABASE routefold`);
    console.log('[dev-db] created database "routefold"');
  }
} catch (error) {
  // PGlite exposes a single database; CREATE DATABASE is a no-op there. The
  // connection string's database component is ignored by the socket server, so
  // this is not fatal.
  console.log(`[dev-db] note: single-database engine (${String(error).split('\n')[0]})`);
}

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: HOST,
  maxConnections: 20,
  idleTimeout: 0,
});

await server.start();

const url = `postgresql://postgres:postgres@${HOST}:${PORT}/routefold?pgbouncer=true&connection_limit=1`;
console.log('');
console.log('  ┌──────────────────────────────────────────────────────────────┐');
console.log('  │  Routefold local PostgreSQL is running                       │');
console.log('  └──────────────────────────────────────────────────────────────┘');
console.log('');
console.log(`   DATABASE_URL="${url}"`);
console.log(`   data directory: ${DATA_DIR}`);
console.log('');
console.log('   pgbouncer=true is required: this engine runs a single backend, so');
console.log('   Prisma\'s named prepared statements would collide without it.');
console.log('');
console.log('   Next, in a second terminal:');
console.log('     pnpm db:migrate      # apply migrations');
console.log('     pnpm db:seed         # seed the chain knowledge base + example');
console.log('     pnpm dev             # start Next.js');
console.log('');
console.log('   Ctrl-C to stop.');
console.log('');

let stopping = false;
const shutdown = async (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`\n[dev-db] ${signal} — shutting down…`);
  try {
    await server.stop();
    await db.close();
  } catch {
    // best effort
  }
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
