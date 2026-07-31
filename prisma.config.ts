import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma configuration.
 *
 * Replaces the deprecated `package.json#prisma` block. The seed command loads
 * .env itself via `--env-file-if-exists`, so it works both locally and in CI
 * where variables come from the environment rather than a file.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx --env-file-if-exists=.env prisma/seed.ts',
  },
});
