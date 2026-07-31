import { NextResponse, type NextRequest } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Clerk proxy (Next.js `proxy` convention, formerly `middleware`).
 *
 * This attaches Clerk's auth context to every request and routes Clerk's
 * auto-proxy path. It deliberately does NOT perform path-based route
 * protection: path matching can diverge from how Next.js actually routes a
 * request, which can leave a protected resource reachable. Routefold does
 * resource-based checks at the point of data access instead —
 *
 *   • /app/*     → `src/app/app/layout.tsx` resolves the session and redirects
 *   • API routes → `requireUserProfile` / `requireOwnedAnalysis` in each handler
 *   • ownership  → every query filters by the resolved owner id
 *
 * — so a route added later is protected by the data layer rather than by
 * remembering to update a matcher.
 */

const authConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim(),
);

/**
 * When Clerk is not configured, `clerkMiddleware` cannot run. The public site
 * and the built-in example must keep working, so requests pass through and the
 * authenticated surfaces explain the missing configuration themselves.
 */
function passthrough(_request: NextRequest) {
  return NextResponse.next();
}

export default authConfigured ? clerkMiddleware() : passthrough;

export const config = {
  matcher: [
    // Everything except static assets.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path.
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
