import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RoutefoldWordmark } from '@/components/brand/logo';
import { ReportView } from '@/components/report/report-view';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { getChain } from '@/lib/chains/knowledge-base';
import { toReportModel } from '@/lib/report-model';
import { loadSharedReport } from '@/lib/share';
import { formatDate } from '@/lib/utils';

/**
 * Public read-only share surface.
 *
 * Shared reports are never indexed — they are private documents that happen to
 * be reachable by URL, and putting them in a search index would defeat the point
 * of a revocable token.
 */
export const metadata: Metadata = {
  title: 'Shared report',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const shared = await loadSharedReport(shareToken);

  if (!shared) return <Unavailable />;

  const report = toReportModel(shared as never, { isPublicView: true });
  if (!report) return <Unavailable />;

  const recommended = report.recommendedChain ? getChain(report.recommendedChain) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header data-app-nav className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-xl">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" className="transition-opacity hover:opacity-80" aria-label="Routefold">
            <RoutefoldWordmark />
          </Link>
          <div className="flex items-center gap-3">
            <Badge tone="ghost">Shared report · read only</Badge>
            <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
              <Link href="/app/new">
                Analyze your product
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-24">
        <div className="border-b border-line">
          <div className="shell py-10 md:py-12">
            <h1 className="max-w-3xl text-headline font-medium text-ink">{report.title}</h1>
            <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
              <Meta label="Recommended first" value={recommended?.name ?? '—'} />
              <Meta label="Confidence" value={`${report.confidence}/100`} />
              <Meta label="Candidates scored" value={String(report.scores.length)} />
              <Meta label="Generated" value={formatDate(report.completedAt)} />
              <Meta label="Methodology" value={`v${report.scoringVersion}`} />
            </dl>
          </div>
        </div>

        <div className="shell pt-12">
          <ReportView report={report} />
        </div>
      </main>

      <footer className="border-t border-line bg-shell">
        <div className="shell flex flex-wrap items-center justify-between gap-6 py-8">
          <div className="max-w-2xl">
            <p className="text-xs leading-relaxed text-ink-ghost">
              Routefold provides technical and strategic decision support. Outputs may contain
              incomplete assumptions and do not constitute financial, legal, compliance,
              security-audit, or investment advice.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/methodology" className="text-xs text-ink-faint transition-colors hover:text-ink">
              Methodology
            </Link>
            <Link href="/app/example" className="text-xs text-ink-faint transition-colors hover:text-ink">
              Example
            </Link>
            <Link href="/privacy" className="text-xs text-ink-faint transition-colors hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd data-numeric className="text-sm text-ink">
        {value || '—'}
      </dd>
    </div>
  );
}

/**
 * One response for unknown, revoked, expired and incomplete tokens alike, so the
 * token space cannot be probed for which values are real.
 */
function Unavailable() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="shell flex h-16 items-center">
          <Link href="/" className="transition-opacity hover:opacity-80" aria-label="Routefold">
            <RoutefoldWordmark />
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-20">
        <Panel corners className="w-full max-w-lg">
          <PanelBody className="flex flex-col gap-5">
            <span className="eyebrow">Not available</span>
            <h1 className="text-title font-medium text-ink">This report is not available</h1>
            <p className="text-[0.875rem] leading-relaxed text-ink-dim">
              The link may have been revoked by its owner, it may have expired, or it may never have
              existed. Share links can be revoked at any time and take effect immediately.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary" size="sm">
                <Link href="/app/example">See an example report</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/">Go to Routefold</Link>
              </Button>
            </div>
          </PanelBody>
        </Panel>
      </main>
    </div>
  );
}
