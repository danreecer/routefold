import { describe, expect, it } from 'vitest';
import { computeQuota, reportLimitFor } from '@/lib/quota';
import { contentHash, decodeEntities, extractReadableContent } from '@/lib/retrieval/extract';
import { rateLimit, __resetRateLimits } from '@/lib/rate-limit';

describe('quota', () => {
  const profile = (overrides = {}) => ({
    reportsGenerated: 0,
    sectionsRegenerated: 0,
    reportLimitOverride: null as number | null,
    ...overrides,
  });

  it('reports the full allowance for a new account', () => {
    const quota = computeQuota(profile());
    expect(quota.reportsRemaining).toBe(quota.reportLimit);
    expect(quota.canGenerateReport).toBe(true);
  });

  it('decrements as reports are generated', () => {
    const quota = computeQuota(profile({ reportsGenerated: 2 }));
    expect(quota.reportsRemaining).toBe(quota.reportLimit - 2);
  });

  it('blocks generation once exhausted', () => {
    const quota = computeQuota(profile({ reportsGenerated: 5 }));
    expect(quota.reportsRemaining).toBe(0);
    expect(quota.canGenerateReport).toBe(false);
  });

  it('never reports negative remaining', () => {
    const quota = computeQuota(profile({ reportsGenerated: 99 }));
    expect(quota.reportsRemaining).toBe(0);
  });

  it('honours a per-user override', () => {
    expect(reportLimitFor({ reportLimitOverride: 50 })).toBe(50);
    const quota = computeQuota(profile({ reportsGenerated: 6, reportLimitOverride: 50 }));
    expect(quota.canGenerateReport).toBe(true);
    expect(quota.reportsRemaining).toBe(44);
  });

  it('tracks section regenerations independently of reports', () => {
    const quota = computeQuota(profile({ reportsGenerated: 5, sectionsRegenerated: 1 }));
    expect(quota.canGenerateReport).toBe(false);
    expect(quota.canRegenerateSection).toBe(true);
  });
});

describe('rate limiting', () => {
  it('allows up to the limit then blocks', () => {
    __resetRateLimits();
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit('k', 3, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit('k', 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    __resetRateLimits();
    expect(rateLimit('a', 1, 60_000).allowed).toBe(true);
    expect(rateLimit('a', 1, 60_000).allowed).toBe(false);
    expect(rateLimit('b', 1, 60_000).allowed).toBe(true);
  });

  it('reports remaining accurately', () => {
    __resetRateLimits();
    expect(rateLimit('c', 5, 60_000).remaining).toBe(4);
    expect(rateLimit('c', 5, 60_000).remaining).toBe(3);
  });
});

describe('decodeEntities', () => {
  it('decodes named entities', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt;')).toBe('a & b <c>');
  });

  it('decodes numeric and hex entities', () => {
    expect(decodeEntities('&#65;&#x42;')).toBe('AB');
  });

  it('leaves unknown entities intact', () => {
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;');
  });
});

describe('extractReadableContent', () => {
  it('extracts the title and body text', () => {
    const html = `
      <html><head><title>Acme Protocol</title></head>
      <body><h1>Acme</h1><p>A lending protocol for institutional counterparties operating onchain.</p></body></html>`;
    const result = extractReadableContent(html);
    expect(result.title).toBe('Acme Protocol');
    expect(result.text).toContain('lending protocol');
    expect(result.wordCount).toBeGreaterThan(5);
  });

  it('prefers the Open Graph title when present', () => {
    const html = `<html><head><meta property="og:title" content="OG Title"><title>Doc Title</title></head><body><p>body text here</p></body></html>`;
    expect(extractReadableContent(html).title).toBe('OG Title');
  });

  it('removes scripts and their contents entirely', () => {
    const html = `<html><body><script>alert('xss'); var secret = 1;</script><p>Real readable content about the protocol.</p></body></html>`;
    const result = extractReadableContent(html);
    expect(result.text).not.toContain('alert');
    expect(result.text).not.toContain('secret');
    expect(result.text).toContain('Real readable content');
  });

  it('removes styles, iframes and forms', () => {
    const html = `<html><body>
      <style>.a{color:red}</style>
      <iframe src="https://evil.example"></iframe>
      <form><input name="x"></form>
      <p>Genuine page copy describing the product.</p>
    </body></html>`;
    const result = extractReadableContent(html);
    expect(result.text).not.toContain('color:red');
    expect(result.text).not.toContain('evil.example');
    expect(result.text).toContain('Genuine page copy');
  });

  it('never returns markup', () => {
    const html = `<html><body><div><p>Text <b>with</b> <a href="#">markup</a> inside.</p></div></body></html>`;
    const result = extractReadableContent(html);
    expect(result.text).not.toMatch(/<[a-z]/i);
  });

  it('strips HTML comments', () => {
    const html = `<html><body><!-- hidden instruction --><p>Visible product copy for the reader.</p></body></html>`;
    expect(extractReadableContent(html).text).not.toContain('hidden instruction');
  });

  it('truncates beyond the character ceiling', () => {
    const html = `<html><body><p>${'word '.repeat(20000)}</p></body></html>`;
    const result = extractReadableContent(html, 'https://example.com', 1000);
    expect(result.text.length).toBeLessThan(1200);
    expect(result.text).toContain('content truncated');
  });

  it('discovers documentation links and resolves them absolutely', () => {
    const html = `<html><body><a href="/docs">Documentation</a><p>Some copy about the protocol.</p></body></html>`;
    const result = extractReadableContent(html, 'https://example.com');
    expect(result.discoveredDocLinks).toContain('https://example.com/docs');
  });

  it('reports near-zero word count for a client-rendered shell', () => {
    const html = `<html><body><div id="root"></div><script src="/app.js"></script></body></html>`;
    expect(extractReadableContent(html).wordCount).toBeLessThan(20);
  });

  it('collapses repeated navigation lines', () => {
    const html = `<html><body><p>Home</p><p>Home</p><p>Home</p><p>Actual descriptive body copy.</p></body></html>`;
    const result = extractReadableContent(html);
    expect(result.text.split('Home').length - 1).toBeLessThanOrEqual(1);
  });
});

describe('contentHash', () => {
  it('is stable for identical input', async () => {
    expect(await contentHash('abc')).toBe(await contentHash('abc'));
  });

  it('differs for different input', async () => {
    expect(await contentHash('abc')).not.toBe(await contentHash('abd'));
  });

  it('produces a 64-character hex digest', async () => {
    expect(await contentHash('x')).toMatch(/^[0-9a-f]{64}$/);
  });
});
