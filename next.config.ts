import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * Content-Security-Policy is intentionally conservative but must allow:
 *  - Clerk's hosted scripts / frames / telemetry
 *  - Next.js inline bootstrap + React Server Component payloads (`unsafe-inline` for styles,
 *    and `unsafe-inline`/`unsafe-eval` for scripts only in development where React refresh needs it)
 */
const isDev = process.env.NODE_ENV === 'development';
const servesOverTls = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://');

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://challenges.cloudflare.com',
].join(' ');

const connectSrc = [
  "'self'",
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://api.openai.com',
  ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://img.clerk.com",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  /**
   * Only when this deployment is actually served over TLS.
   *
   * Keyed on the canonical URL rather than NODE_ENV: a production build served
   * over plain http (local `next start`, an internal preview, an E2E run) would
   * otherwise have its own same-origin subresource requests upgraded to https
   * and then fail them. WebKit does this even on localhost, which silently
   * prevents hydration and is very hard to diagnose from the symptom.
   */
  ...(servesOverTls ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Next's dev server treats requests for /_next/* dev resources from a host it
   * did not bind as cross-origin and blocks them, which silently prevents
   * hydration. Listing the loopback aliases keeps `pnpm dev` working whether you
   * open localhost, 127.0.0.1, or the LAN address.
   */
  allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0'],
  serverExternalPackages: ['@prisma/client', 'openai'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@xyflow/react'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
