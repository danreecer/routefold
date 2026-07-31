/**
 * HTML → readable text extraction.
 *
 * Written by hand rather than pulled from a DOM library because the input is
 * hostile by definition: it is arbitrary remote HTML. This module never builds a
 * DOM, never executes anything, and only ever produces plain text. The output is
 * still treated as untrusted data everywhere downstream.
 */

export type ExtractedContent = {
  title: string | null;
  description: string | null;
  text: string;
  wordCount: number;
  /** Links that look like documentation, offered as follow-up suggestions. */
  discoveredDocLinks: string[];
};

/** Elements whose contents are never readable page content. */
const STRIPPED_ELEMENTS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'svg',
  'canvas',
  'template',
  'head',
  'nav',
  'footer',
  'form',
  'button',
  'select',
  'aside',
];

const BLOCK_ELEMENTS = new Set([
  'p', 'div', 'section', 'article', 'main', 'header', 'li', 'tr', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'td', 'th', 'dd', 'dt',
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  trade: '™',
  copy: '©',
  reg: '®',
  deg: '°',
  eacute: 'é',
  middot: '·',
  bull: '•',
  times: '×',
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? safeFromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? safeFromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function safeFromCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function stripElement(html: string, tag: string): string {
  // Non-greedy, case-insensitive, tolerant of attributes and self-closing forms.
  const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
  const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
  return html.replace(paired, ' ').replace(selfClosing, ' ');
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ? decodeEntities(match[1]).trim() : null;
}

function extractTitle(html: string): string | null {
  return (
    firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,300})["']/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']{1,300})["'][^>]+property=["']og:title["']/i) ??
    firstMatch(html, /<title[^>]*>([\s\S]{1,300}?)<\/title>/i)
  );
}

function extractDescription(html: string): string | null {
  return (
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,600})["']/i) ??
    firstMatch(html, /<meta[^>]+content=["']([^"']{1,600})["'][^>]+name=["']description["']/i) ??
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,600})["']/i)
  );
}

/** Surfaces likely documentation links so the wizard can suggest them. */
function extractDocLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const pattern = /<a\b[^>]*href=["']([^"'#]{1,500})["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null && links.size < 8) {
    const href = match[1];
    const label = decodeEntities((match[2] ?? '').replace(/<[^>]*>/g, '')).trim().toLowerCase();
    if (!href) continue;
    const looksLikeDocs =
      /\b(docs?|documentation|developers?|whitepaper|litepaper|guide|api)\b/.test(label) ||
      /\/(docs?|documentation|developers?|whitepaper|api)(\/|$)/i.test(href) ||
      /^https?:\/\/docs\./i.test(href);
    if (!looksLikeDocs) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        links.add(resolved.toString());
      }
    } catch {
      // Skip malformed hrefs.
    }
  }
  return Array.from(links);
}

/**
 * Extracts readable text from an HTML document.
 *
 * @param html   Raw response body. Assumed hostile.
 * @param baseUrl Used only to resolve relative documentation links.
 * @param maxChars Hard ceiling on returned text so a huge page cannot blow up
 *                 the prompt budget or the database row.
 */
export function extractReadableContent(
  html: string,
  baseUrl = 'https://example.com',
  maxChars = 40_000,
): ExtractedContent {
  const title = extractTitle(html);
  const description = extractDescription(html);
  const discoveredDocLinks = extractDocLinks(html, baseUrl);

  let working = html;

  // Remove comments and doctype first — comments can hide unbalanced tags.
  working = working.replace(/<!--[\s\S]*?-->/g, ' ');
  working = working.replace(/<!doctype[^>]*>/gi, ' ');

  for (const tag of STRIPPED_ELEMENTS) {
    working = stripElement(working, tag);
  }

  // Convert block-level boundaries into newlines so paragraphs survive.
  working = working.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g, (_match, tag: string) =>
    BLOCK_ELEMENTS.has(tag.toLowerCase()) ? '\n' : ' ',
  );

  // Anything left that resembles a tag goes.
  working = working.replace(/<[^>]*>/g, ' ');

  working = decodeEntities(working);

  // Normalise whitespace while preserving paragraph structure.
  working = working
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Drop lines that are almost certainly navigation chrome or cookie banners.
  const lines = working
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      if (line.length < 3) return false;
      if (/^(home|menu|close|skip to content|cookie|accept all|sign in|log in|sign up)$/i.test(line)) {
        return false;
      }
      return true;
    });

  // Collapse consecutive duplicate lines (repeated nav items).
  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line);
  }

  let text = deduped.join('\n');
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars).trimEnd()}\n\n[content truncated at ${maxChars.toLocaleString('en-US')} characters]`;
  }

  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;

  return { title, description, text, wordCount, discoveredDocLinks };
}

/** SHA-256 hex digest, used to skip redundant re-extraction. */
export async function contentHash(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
