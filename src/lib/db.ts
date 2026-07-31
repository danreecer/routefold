import 'server-only';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma singleton.
 *
 * Next.js hot-reloads modules in development; without the global cache each
 * reload would open a new pool and eventually exhaust connections.
 */
const globalForPrisma = globalThis as unknown as {
  routefoldPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.routefoldPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.routefoldPrisma = prisma;
}

/**
 * Runs a database operation, converting connection failures into a typed error
 * the UI can render as "database unavailable" instead of a stack trace.
 */
export class DatabaseUnavailableError extends Error {
  override readonly name = 'DatabaseUnavailableError';
  constructor(cause?: unknown) {
    super('The Routefold database is not reachable.');
    this.cause = cause;
  }
}

export async function withDb<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const code = (error as { code?: string }).code;
    // Prisma connection-level error codes.
    if (code && ['P1000', 'P1001', 'P1002', 'P1003', 'P1017'].includes(code)) {
      throw new DatabaseUnavailableError(error);
    }
    // A deployment with no DATABASE_URL at all fails at client initialisation
    // rather than at connect time. That is still "no database", and it should
    // read as a configuration gap rather than as an unexplained 500.
    if ((error as { name?: string }).name === 'PrismaClientInitializationError') {
      throw new DatabaseUnavailableError(error);
    }
    throw error;
  }
}
