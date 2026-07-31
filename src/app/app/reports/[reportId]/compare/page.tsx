import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { ChainComparison } from '@/components/report/chain-comparison';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { toReportModel } from '@/lib/report-model';

export const metadata: Metadata = {
  title: 'Compare chains',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ chains?: string }>;
}) {
  const { reportId } = await params;
  const { chains } = await searchParams;
  const profile = await requireUserProfile();

  const analysis = await prisma.analysis.findFirst({
    where: { id: reportId, userId: profile.id, status: 'COMPLETED' },
    include: {
      project: true,
      digitalTwin: true,
      chainScores: { orderBy: { rank: 'asc' } },
      sections: true,
    },
  });

  if (!analysis) notFound();

  const report = toReportModel(analysis);
  if (!report) notFound();

  const initialSlugs = chains
    ?.split(',')
    .map((slug) => slug.trim())
    .filter((slug) => report.scores.some((score) => score.chainSlug === slug));

  return (
    <>
      <PageHeader
        eyebrow="Chain comparison"
        title={`Compare candidates — ${report.projectName}`}
        description="Select two to four chains to compare their category shape, factor-level points, and underlying knowledge-base characteristics."
        breadcrumbs={[
          { href: '/app', label: 'Dashboard' },
          { href: `/app/reports/${reportId}`, label: report.title },
          { label: 'Compare' },
        ]}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/reports/${reportId}`}>
              <ArrowLeft />
              Back to report
            </Link>
          </Button>
        }
      />

      <PageBody>
        <ChainComparison scores={report.scores} initialSlugs={initialSlugs} />
      </PageBody>
    </>
  );
}
