import 'server-only';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Detects which ecosystems have an official logo asset available.
 *
 * Drop a file at `public/brand/chains/<slug>.svg` (or .png / .webp) and it is
 * picked up automatically at build time — no code change, no registry to edit.
 * Slugs are the knowledge-base slugs: ethereum, arbitrum, base, optimism,
 * polygon, avalanche, bnb-chain, solana, sui, aptos, near, celestia, cosmos,
 * scroll, linea.
 *
 * Routefold ships none of these itself: it has no licence to redistribute other
 * projects' trademarks, and a redrawn approximation of a real logo misrepresents
 * the brand more than an obviously-original glyph does. Until a file is present,
 * `ChainMark` renders Routefold's own geometric glyph instead.
 *
 * This module is server-only and the result is computed once per process.
 */

const MARK_DIRECTORY = path.join(process.cwd(), 'public', 'brand', 'chains');
const EXTENSIONS = ['.svg', '.png', '.webp'] as const;

let cache: Map<string, string> | null = null;

/** slug → public path, for every ecosystem asset present on disk. */
export function availableChainMarks(): Map<string, string> {
  if (cache) return cache;

  const found = new Map<string, string>();
  try {
    if (existsSync(MARK_DIRECTORY)) {
      for (const entry of readdirSync(MARK_DIRECTORY)) {
        const extension = path.extname(entry).toLowerCase();
        if (!EXTENSIONS.includes(extension as (typeof EXTENSIONS)[number])) continue;
        const slug = path.basename(entry, extension).toLowerCase();
        found.set(slug, `/brand/chains/${entry}`);
      }
    }
  } catch {
    // A missing or unreadable directory simply means no official assets.
  }

  cache = found;
  return found;
}
