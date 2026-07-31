import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, GitCompare } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { ReportView } from '@/components/report/report-view';
import { RegenerateButton, ReportActions } from '@/components/report/report-actions';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { absoluteUrl } from '@/lib/env';
import { getChain } from '@/lib/chains/knowledge-base';
import { computeQuota } from '@/lib/quota';
import { toReportModel } from '@/lib/report-model';
import { getActiveShareLink } from '@/lib/share';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Report', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const profile = await requireUserProfile();

  // Scoped by userId: an id belonging to someone else resolves to not-found.
  const analysis = await prisma.analysis.findFirst({
    where: { id: reportId, userId: profile.id },
    include: {
      project: true,
      digitalTwin: true,
      chainScores: { orderBy: { rank: 'asc' } },
      sections: true,
    },
  });

  if (!analysis) notFound();

  if (analysis.status === 'AWAITING_REVIEW') {
    return <AwaitingReview reportId={reportId} projectName={analysis.project.name} />;
  }

  if (analysis.status === 'FAILED') {
    return (
      <FailedReport
        reportId={reportId}
        projectName={analysis.project.name}
        errorCode={analysis.errorCode}
        errorMessage={analysis.errorMessage}
      />
    );
  }

  const report = toReportModel(analysis);
  if (!report) {
    return (
      <FailedReport
        reportId={reportId}
        projectName={analysis.project.name}
        errorCode="INCOMPLETE"
        errorMessage="This report is missing its Digital Twin and cannot be displayed."
      />
    );
  }

  const [shareLink, quota] = await Promise.all([
    getActiveShareLink(reportId),
    Promise.resolve(computeQuota(profile)),
  ]);

  const recommended = report.recommendedChain ? getChain(report.recommendedChain) : null;
  const remaining = quota.sectionsRemaining;

  return (
    <>
      <PageHeader
        eyebrow={`Report · ${formatDate(report.completedAt ?? report.createdAt)}`}
        title={report.title}
        breadcrumbs={[
          { href: '/app', label: 'Dashboard' },
          { href: `/app/projects/${analysis.projectId}`, label: report.projectName },
          { label: 'Report' },
        ]}
        description={
          recommended
            ? `Recommended first expansion: ${recommended.name} · confidence ${report.confidence}/100`
            : undefined
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/reports/${reportId}/compare`}>
                <GitCompare />
                Compare chains
              </Link>
            </Button>
            <ReportActions
              analysisId={reportId}
              title={report.title}
              initialShareUrl={shareLink ? absoluteUrl(`/share/${shareLink.token}`) : null}
            />
          </>
        }
      />

      <PageBody>
        <ReportView
          report={report}
          jsonExportHref={`/api/analyses/${reportId}/export`}
          slots={{
            summary: (
              <RegenerateButton
                analysisId={reportId}
                section="EXECUTIVE_SUMMARY"
                remaining={remaining}
              />
            ),
            map: (
              <RegenerateButton
                analysisId={reportId}
                section="EXPANSION_MAP"
                remaining={remaining}
              />
            ),
            architecture: (
              <RegenerateButton
                analysisId={reportId}
                section="ARCHITECTURE"
                remaining={remaining}
              />
            ),
            risks: (
              <RegenerateButton
                analysisId={reportId}
                section="RISK_REGISTER"
                remaining={remaining}
              />
            ),
            plan: (
              <RegenerateButton
                analysisId={reportId}
                section="EXECUTION_PLAN"
                remaining={remaining}
              />
            ),
            brief: (
              <RegenerateButton
                analysisId={reportId}
                section="TECHNICAL_BRIEF"
                remaining={remaining}
              />
            ),
          }}
        />
      </PageBody>
    </>
  );
}

function AwaitingReview({ reportId, projectName }: { reportId: string; projectName: string }) {
  return (
    <>
      <PageHeader
        eyebrow="Awaiting review"
        title={projectName}
        breadcrumbs={[{ href: '/app', label: 'Dashboard' }, { label: 'Awaiting review' }]}
      />
      <PageBody>
        <Panel corners className="mx-auto max-w-2xl">
          <PanelBody className="flex flex-col gap-5">
            <Badge tone="accent">Digital Twin ready</Badge>
            <h2 className="text-[1.0625rem] font-medium text-ink">
              This analysis is waiting for you to confirm the Digital Twin
            </h2>
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              Routefold has retrieved your sources and built a model of the product. Review and
              correct it, then confirm to score every ecosystem. No report generation has been
              consumed yet.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="accent" size="sm">
                <Link href={`/app/new?analysis=${reportId}`}>
                  Review the Digital Twin
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app">Back to dashboard</Link>
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </PageBody>
    </>
  );
}

function FailedReport({
  reportId,
  projectName,
  errorCode,
  errorMessage,
}: {
  reportId: string;
  projectName: string;
  errorCode: string | null;
  errorMessage: string | null;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Analysis failed"
        title={projectName}
        breadcrumbs={[{ href: '/app', label: 'Dashboard' }, { label: 'Failed' }]}
      />
      <PageBody>
        <Panel corners className="mx-auto max-w-2xl">
          <PanelBody className="flex flex-col gap-5">
            <Badge tone="critical">{errorCode ?? 'ERROR'}</Badge>
            <h2 className="text-[1.0625rem] font-medium text-ink">This analysis did not finish</h2>
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              {errorMessage ?? 'The analysis stopped before it could produce a report.'}
            </p>
            <p className="text-xs leading-relaxed text-ink-ghost">
              No report generation was consumed. You can resume from the Digital Twin review step.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="accent" size="sm">
                <Link href={`/app/new?analysis=${reportId}`}>Resume this analysis</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/new">Start a new analysis</Link>
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </PageBody>
    </>
  );
}
