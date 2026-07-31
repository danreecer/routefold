import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell/shell';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { getClerkUserId, requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { capabilities } from '@/lib/env';
import { computeQuota, type QuotaState } from '@/lib/quota';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s — Routefold' },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const caps = capabilities();

  if (!caps.auth || !caps.database) {
    return <ConfigurationRequired missingAuth={!caps.auth} missingDatabase={!caps.database} />;
  }

  /**
   * Resource-based auth gate. This layout wraps every /app route, so an
   * unauthenticated visitor is redirected here rather than relying on a
   * path matcher in the proxy that could drift out of sync with the routes.
   * Handlers and queries beneath still perform their own ownership checks.
   */
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) redirect('/sign-in');

  let quota: QuotaState | null = null;
  let counts = { projects: 0, reports: 0 };
  let recentReports: Array<{ id: string; title: string }> = [];

  try {
    const profile = await requireUserProfile();
    quota = computeQuota(profile);

    const [projectCount, reportCount, recent] = await Promise.all([
      prisma.project.count({ where: { userId: profile.id, archivedAt: null } }),
      prisma.analysis.count({ where: { userId: profile.id, status: 'COMPLETED' } }),
      prisma.analysis.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, title: true, project: { select: { name: true } } },
      }),
    ]);

    counts = { projects: projectCount, reports: reportCount };
    recentReports = recent.map((analysis) => ({
      id: analysis.id,
      title: analysis.title ?? analysis.project.name,
    }));
  } catch (error) {
    // The shell must render even when the database is briefly unreachable; the
    // page beneath it surfaces the real error state.
    console.error('[app-layout] failed to load shell data', error);
  }

  return (
    <AppShell quota={quota} counts={counts} recentReports={recentReports}>
      {children}
    </AppShell>
  );
}

function ConfigurationRequired({
  missingAuth,
  missingDatabase,
}: {
  missingAuth: boolean;
  missingDatabase: boolean;
}) {
  const missing = [
    ...(missingAuth ? ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'] : []),
    ...(missingDatabase ? ['DATABASE_URL'] : []),
  ];

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg">
        <Panel corners>
          <PanelHeader>
            <PanelTitle>The application is not configured</PanelTitle>
          </PanelHeader>
          <PanelBody className="flex flex-col gap-5">
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              Routefold&rsquo;s authenticated application needs the environment variables below. The
              public site and the complete example report work without them.
            </p>
            <div className="border border-line bg-paper px-4 py-3">
              <p className="eyebrow">Missing</p>
              <pre className="mt-2 overflow-x-auto font-mono text-[0.6875rem] leading-relaxed text-caution">
                {missing.join('\n')}
              </pre>
            </div>
            <p className="text-xs leading-relaxed text-ink-ghost">
              See README.md for setup and DEPLOYMENT.md for production configuration.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary" size="sm">
                <Link href="/app/example">Open the example report</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Back to the site</Link>
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
