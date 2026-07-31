import { expect, test } from '@playwright/test';

/**
 * Critical-path smoke tests.
 *
 * Everything asserted here is true without any credentials configured, so the
 * suite is meaningful on a bare checkout and in CI. It deliberately does not
 * sign in: that would need live Clerk credentials, and a suite that silently
 * skips when those are absent gives false confidence.
 */

test.describe('landing page', () => {
  test('renders the hero and primary calls to action', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Model the next chain');
    await expect(page.getByText('AI multichain expansion intelligence')).toBeVisible();
    await expect(page.getByRole('link', { name: /analyze a product/i }).first()).toBeVisible();
  });

  test('has a descriptive title and meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Routefold/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /multichain/i);
  });

  test('hydrates — the sticky header reacts to scroll', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header[data-app-nav]');
    // Transparent at the top of the page…
    await expect(header).toHaveClass(/bg-white\/0/);
    await page.evaluate(() => window.scrollTo(0, 900));
    // …and frosted once scrolled. The class only changes if client-side JS
    // actually took over, so this doubles as a hydration assertion.
    await expect(header).toHaveClass(/bg-white\/72/);
  });

  test('logs no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('renders every marketing section', async ({ page }) => {
    await page.goto('/');
    for (const heading of [
      /three steps/i,
      /every score traces back/i,
      /check line by line/i,
      /as a graph/i,
      /not a deliverable/i,
      /does not choose the number/i,
      /built and backed/i,
      /find your next chain/i,
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });
});

test.describe('marketing surfaces', () => {
  test('announces the launch and the backer, and stays dismissed', async ({ page }) => {
    await page.goto('/');

    const bar = page.getByText('Live on Product Hunt');
    await expect(bar).toBeVisible();
    await expect(page.getByRole('link', { name: /support the launch/i })).toHaveAttribute(
      'href',
      /producthunt\.com/,
    );

    await page.getByRole('button', { name: /dismiss announcement/i }).click();
    await expect(bar).toBeHidden();

    // Dismissal is permanent — nothing here nags on the next visit.
    await page.reload();
    await expect(bar).toBeHidden();
  });

  test('the sticky bar waits for the visitor to get past the hero', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /analyze a product|^start$/i }).last();

    // Before scrolling the bar is translated off-screen, below the fold.
    const startsBelowFold = await cta.evaluate(
      (node) => node.getBoundingClientRect().top >= window.innerHeight,
    );
    expect(startsBelowFold).toBe(true);

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await expect(cta).toBeInViewport();
  });

  test('the social rail never lands on top of the copy', async ({ page }) => {
    const rail = page.locator('aside[aria-label="Routefold links"]');

    // `.shell` caps at 88rem with 3.5rem of padding, so no gutter exists to hold
    // the rail until the viewport clears 1536px. Below that it must stay hidden.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await expect(rail).toBeHidden();

    await page.setViewportSize({ width: 1600, height: 900 });
    await expect(rail).toBeVisible();

    const clearance = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Routefold links"]');
      const heading = document.querySelector('#backing-heading');
      if (!aside || !heading) return null;
      return heading.getBoundingClientRect().left - aside.getBoundingClientRect().right;
    });
    expect(clearance).not.toBeNull();
    expect(clearance as number).toBeGreaterThan(0);
  });

  test('credits the backer in a way a reader can check', async ({ page }) => {
    await page.goto('/');
    const zefi = page.getByRole('link', { name: /zefi/i });
    await expect(zefi.first()).toHaveAttribute('href', 'https://www.zefi.ae');
    // Named in the announcement, the hero, the backing section and the footer.
    expect(await zefi.count()).toBeGreaterThanOrEqual(4);
  });
});

test.describe('public documentation', () => {
  for (const [path, heading] of [
    ['/docs', /how to use routefold/i],
    ['/whitepaper', /deterministic scoring/i],
    ['/methodology', /how a chain-fit score is produced/i],
    ['/security', /security posture/i],
    ['/privacy', /what routefold stores/i],
    ['/terms', /terms of use/i],
  ] as const) {
    test(`${path} renders`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    });
  }

  test('methodology publishes the full factor table', async ({ page }) => {
    await page.goto('/methodology');
    await expect(page.getByText('Product–ecosystem fit').first()).toBeVisible();
    await expect(page.getByText('Virtual-machine compatibility').first()).toBeVisible();
    await expect(page.getByText(/hard blockers/i).first()).toBeVisible();
  });

  test('whitepaper states the model-influence bound', async ({ page }) => {
    await page.goto('/whitepaper');
    await expect(page.getByText(/at most ±5 points/i).first()).toBeVisible();
  });
});

test.describe('route protection', () => {
  for (const path of ['/app', '/app/new', '/app/projects', '/app/settings', '/app/example']) {
    test(`${path} is not publicly readable`, async ({ page }) => {
      await page.goto(path);
      // Either redirected to sign-in, or shown the configuration notice when
      // Clerk is not set up. In neither case may dashboard content appear.
      const isSignIn = page.url().includes('/sign-in');
      const isNotConfigured = await page
        .getByText(/not configured/i)
        .first()
        .isVisible()
        .catch(() => false);

      expect(isSignIn || isNotConfigured).toBe(true);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toHaveCount(0);
    });
  }

  test('an unknown share token does not confirm or deny existence', async ({ page }) => {
    await page.goto('/share/definitely-not-a-real-share-token-000000');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/not available/i);
  });
});

test.describe('metadata surfaces', () => {
  test('robots.txt disallows private areas', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('/app/');
    expect(body).toContain('/api/');
    expect(body).toContain('/share/');
  });

  test('sitemap lists only public pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('/methodology');
    expect(body).toContain('/whitepaper');
    expect(body).not.toContain('/app/');
    expect(body).not.toContain('/share/');
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

test.describe('api protection', () => {
  test('rejects an unauthenticated analysis creation', async ({ request }) => {
    const response = await request.post('/api/analyses', {
      headers: { 'content-type': 'application/json' },
      data: { input: {}, idempotencyKey: '00000000-0000-4000-8000-000000000000' },
    });
    expect([401, 403, 404, 422, 500, 503]).toContain(response.status());
  });

  test('rejects a non-JSON mutation', async ({ request }) => {
    const response = await request.post('/api/analyses', {
      headers: { 'content-type': 'text/plain' },
      data: 'not json',
    });
    expect(response.status()).not.toBe(200);
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only');

  test('opens and closes the menu', async ({ page }) => {
    await page.goto('/');

    const openButton = page.getByRole('button', { name: /open menu/i });
    await expect(openButton).toBeVisible();
    await openButton.click();

    const mobileNav = page.locator('#mobile-nav');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Methodology' })).toBeVisible();

    await page.getByRole('button', { name: /close menu/i }).click();
    await expect(mobileNav).toHaveCount(0);
  });

  test('hero remains readable without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Document scroll width alone is not enough: the hero sits inside an
    // `overflow-hidden` panel, so a blown-out grid track clips the headline
    // rather than producing a scrollbar. Measure the text itself.
    const clipped = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return ['h1', 'h1 + p, h1 ~ p']
        .flatMap((selector) => [...document.querySelectorAll(selector)])
        .map((node) => Math.round(node.getBoundingClientRect().right - viewport))
        .filter((overhang) => overhang > 1);
    });
    expect(clipped).toEqual([]);
  });
});

test.describe('accessibility basics', () => {
  test('skip link is reachable by keyboard', async ({ page, isMobile }) => {
    // iOS WebKit does not move focus between links on Tab by default, so this
    // asserts the desktop behaviour only. The link itself is present in the DOM
    // on every viewport — that part is checked below.
    test.skip(isMobile, 'Tab focus traversal is not an iOS Safari behaviour');

    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();
  });

  test('skip link is present on every viewport', async ({ page }) => {
    await page.goto('/');
    // Located by href rather than by role: the link is visually hidden, and
    // WebKit omits zero-size clipped elements from its accessibility tree, so a
    // role query would fail on a link that is genuinely present and functional.
    await expect(page.locator('a[href="#main"]')).toHaveCount(1);
    await expect(page.locator('a[href="#main"]')).toHaveText(/skip to content/i);
  });

  test('every page has exactly one h1', async ({ page }) => {
    for (const path of ['/', '/docs', '/methodology', '/whitepaper', '/security']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });

  test('main landmark is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main')).toHaveCount(1);
  });
});
