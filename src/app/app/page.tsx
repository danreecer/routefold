import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Plus, TrendingUp } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { ReportList } from '@/components/app-shell/report-list';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getChain } from '@/lib/chains/knowledge-base';
import { ACTIVITY_LABELS, recentActivity, type ActivityAction } from '@/lib/activity';
import { computeQuota } from '@/lib/quota';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await requireUserProfile();
  const quota = computeQuota(profile);

  const [analyses, projectCount, activity, chainAggregate] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        currentStage: true,
        confidence: true,
        recommendedChain: true,
        generationMode: true,
        createdAt: true,
        completedAt: true,
        project: { select: { id: true, name: true, category: true } },
      },
    }),
    prisma.project.count({ where: { userId: profile.id, archivedAt: null } }),
    recentActivity(profile.id, 8),
    prisma.analysis.groupBy({
      by: ['recommendedChain'],
      where: { userId: profile.id, status: 'COMPLETED', recommendedChain: { not: null } },
      _count: { recommendedChain: true },
      orderBy: { _count: { recommendedChain: 'desc' } },
      take: 1,
    }),
  ]);

  const completed = analyses.filter((analysis) => analysis.status === 'COMPLETED');
  const averageConfidence =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, analysis) => sum + (analysis.confidence ?? 0), 0) / completed.length,
        )
      : null;

  const topChainSlug = chainAggregate[0]?.recommendedChain ?? null;
  const topChainName = topChainSlug ? (getChain(topChainSlug)?.name ?? topChainSlug) : null;
  const topChainCount = chainAggregate[0]?._count.recommendedChain ?? 0;

  const isEmpty = analyses.length === 0 && projectCount === 0;
  const greetingName = profile.displayName?.split(' ')[0] ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={greetingName ? `Welcome back, ${greetingName}` : 'Welcome to Routefold'}
        description={
          isEmpty
            ? 'Start by analysing a product, or read an example blueprint first.'
            : 'Your projects, reports, and recent activity.'
        }
        actions={
          <Button asChild variant="accent" disabled={!quota.canGenerateReport}>
            <Link href="/app/new">
              <Plus />
              New analysis
            </Link>
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-8">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Projects" value={String(projectCount)} />
              <Stat label="Reports generated" value={String(completed.length)} />
              <Stat
                label="Most recommended chain"
                value={topChainName ?? '—'}
                hint={
                  topChainName
                    ? `${topChainCount} report${topChainCount === 1 ? '' : 's'}`
                    : 'No completed reports yet'
                }
              />
              <Stat
                label="Average confidence"
                value={averageConfidence !== null ? `${averageConfidence}/100` : '—'}
                hint={
                  averageConfidence !== null
                    ? averageConfidence >= 70
                      ? 'Well supported'
                      : 'Verify assumptions'
                    : undefined
                }
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <ReportList analyses={analyses.map(serialiseAnalysis)} />

              <div className="flex flex-col gap-6">
                <Panel>
                  <PanelHeader>
                    <PanelTitle>Recent activity</PanelTitle>
                  </PanelHeader>
                  <PanelBody>
                    {activity.length === 0 ? (
                      <p className="text-[0.8125rem] text-ink-faint">Nothing recorded yet.</p>
                    ) : (
                      <ol className="flex flex-col gap-3.5">
                        {activity.map((event) => (
                          <li key={event.id} className="flex flex-col gap-1">
                            <span className="text-[0.8125rem] text-ink-dim">
                              You{' '}
                              {ACTIVITY_LABELS[event.action as ActivityAction] ?? event.action}{' '}
                              <span className="text-ink-faint">
                                {typeof (event.metadata as { name?: string } | null)?.name ===
                                'string'
                                  ? (event.metadata as { name: string }).name
                                  : ''}
                              </span>
                            </span>
                            <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                              {relativeTime(event.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </PanelBody>
                </Panel>

                <QuotaPanel
                  remaining={quota.reportsRemaining}
                  limit={quota.reportLimit}
                  sectionsRemaining={quota.sectionsRemaining}
                  sectionLimit={quota.sectionLimit}
                />
              </div>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

function serialiseAnalysis(analysis: {
  id: string;
  title: string | null;
  status: string;
  progress: number;
  currentStage: string;
  confidence: number | null;
  recommendedChain: string | null;
  generationMode: string;
  createdAt: Date;
  completedAt: Date | null;
  project: { id: string; name: string; category: string | null };
}) {
  return {
    id: analysis.id,
    title: analysis.title ?? analysis.project.name,
    status: analysis.status,
    progress: analysis.progress,
    currentStage: analysis.currentStage,
    confidence: analysis.confidence,
    recommendedChain: analysis.recommendedChain,
    recommendedChainName: analysis.recommendedChain
      ? (getChain(analysis.recommendedChain)?.name ?? analysis.recommendedChain)
      : null,
    generationMode: analysis.generationMode,
    createdAt: analysis.createdAt.toISOString(),
    completedAt: analysis.completedAt?.toISOString() ?? null,
    projectId: analysis.project.id,
    projectName: analysis.project.name,
  };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="frost frost-sheen rounded-[16px] p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2.5 text-[1.375rem] font-medium tracking-[-0.025em] text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-ghost">{hint}</p> : null}
    </div>
  );
}

function QuotaPanel({
  remaining,
  limit,
  sectionsRemaining,
  sectionLimit,
}: {
  remaining: number;
  limit: number;
  sectionsRemaining: number;
  sectionLimit: number;
}) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Private beta usage</PanelTitle>
        <Badge tone={remaining > 0 ? 'ghost' : 'critical'}>
          {remaining > 0 ? 'Active' : 'Exhausted'}
        </Badge>
      </PanelHeader>
      <PanelBody className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.8125rem] text-ink-dim">Report generations</span>
          <span data-numeric className="text-sm text-ink">
            {remaining}
            <span className="text-ink-ghost">/{limit}</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.8125rem] text-ink-dim">Section regenerations</span>
          <span data-numeric className="text-sm text-ink">
            {sectionsRemaining}
            <span className="text-ink-ghost">/{sectionLimit}</span>
          </span>
        </div>
        <p className="text-xs leading-relaxed text-ink-ghost">
          Routefold is free during private beta. A generation is only consumed when a report
          completes — failed runs cost nothing.
        </p>
      </PanelBody>
    </Panel>
  );
}

function EmptyState() {
  const steps = [
    {
      icon: Plus,
      title: 'Analyze a product',
      body: 'Enter your product URL and constraints. Routefold retrieves your public sources, builds a Digital Twin for you to correct, then scores every ecosystem.',
      href: '/app/new',
      cta: 'Start an analysis',
      primary: true,
    },
    {
      icon: FileText,
      title: 'Read an example first',
      body: 'A complete blueprint for a fictional tokenized-asset protocol: scorecard, expansion map, architecture, risks and a 30-day plan.',
      href: '/app/example',
      cta: 'Open the example',
      primary: false,
    },
    {
      icon: BookOpen,
      title: 'Understand the scoring',
      body: 'Every category, sub-factor, hard constraint and penalty is documented, along with the exact limits placed on model influence.',
      href: '/methodology',
      cta: 'Read the methodology',
      primary: false,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Panel corners className="relative overflow-hidden">
        <div className="grid-field-fine field-mask absolute inset-0 opacity-60" aria-hidden="true" />
        <PanelBody className="relative flex flex-col gap-3 px-6 py-10 md:px-10 md:py-14">
          <span className="eyebrow">Nothing here yet</span>
          <h2 className="max-w-xl text-title font-medium text-ink">
            Your first expansion blueprint is about ten minutes away.
          </h2>
          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-ink-dim">
            Routefold works from your public website and documentation plus a short set of answers
            about your constraints. You review the model it builds before anything is scored.
          </p>
        </PanelBody>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Panel key={step.title} className="flex flex-col">
              <PanelBody className="flex flex-1 flex-col gap-4">
                <Icon
                  className={step.primary ? 'size-4 text-ember-bright' : 'size-4 text-ink-faint'}
                />
                <h3 className="text-[0.9375rem] font-medium text-ink">{step.title}</h3>
                <p className="flex-1 text-[0.8125rem] leading-relaxed text-ink-faint">
                  {step.body}
                </p>
                <Button
                  asChild
                  variant={step.primary ? 'accent' : 'outline'}
                  size="sm"
                  className="w-full"
                >
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight />
                  </Link>
                </Button>
              </PanelBody>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <PanelBody className="flex flex-wrap items-center gap-4">
          <TrendingUp className="size-4 shrink-0 text-ink-ghost" />
          <p className="flex-1 text-[0.8125rem] leading-relaxed text-ink-faint">
            Your dashboard will show recent reports, the chain most often recommended across your
            analyses, and average report confidence once you have generated something.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
