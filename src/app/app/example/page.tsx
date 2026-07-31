import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ReportView } from '@/components/report/report-view';
import { Badge } from '@/components/ui/primitives';
import { buildExampleReport } from '@/lib/example';
import { getChain } from '@/lib/chains/knowledge-base';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Example analysis — Meridian Reserve (fictional)',
  description:
    'A complete Routefold expansion blueprint for a fictional tokenized-asset protocol. Chain scores are computed by the real deterministic engine; the project is invented for illustration.',
  alternates: { canonical: '/example' },
  openGraph: {
    title: 'Example analysis — Meridian Reserve (fictional) — Routefold',
    description:
      'A complete multichain expansion blueprint: Digital Twin, chain scorecard, expansion map, architecture, risks and a 30-day plan.',
  },
};

/**
 * The worked example, behind sign-in.
 *
 * Its content depends on nothing but the knowledge base and the scoring engine,
 * so it renders on any deployment and consumes no quota. It must stay dynamic
 * rather than prerendered: the /app layout performs the auth check, and a
 * statically generated page would be emitted at build time and served without
 * that gate.
 */
export const dynamic = 'force-dynamic';

export default function ExamplePage() {
  const report = buildExampleReport();
  const recommended = report.recommendedChain ? getChain(report.recommendedChain) : null;

  return (
    <div className="pb-24">
      <header className="border-b border-line">
        <div className="shell py-10 md:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Example analysis — fictional project</Badge>
            <Badge tone="ghost">Consumes no quota</Badge>
          </div>

          <h1 className="mt-6 max-w-3xl text-headline font-medium text-ink">
            {report.projectName} — multichain expansion blueprint
          </h1>

          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-dim">
            {report.twin.oneLineDescription}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <MetaItem label="Recommended first" value={recommended?.name ?? '—'} />
            <MetaItem label="Confidence" value={`${report.confidence}/100`} />
            <MetaItem
              label="Current deployment"
              value={report.currentChains.map((slug) => getChain(slug)?.name ?? slug).join(', ')}
            />
            <MetaItem label="Candidates scored" value={String(report.scores.length)} />
            <MetaItem label="Generated" value={formatDate(report.completedAt)} />
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/new"
              className="inline-flex h-10 items-center gap-2 rounded-[2px] bg-ink px-5 text-sm font-medium text-shell transition-colors hover:bg-white"
            >
              Analyze your own product
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-line-strong px-5 text-sm text-ink transition-colors hover:border-ink-ghost hover:bg-raised"
            >
              How scoring works
            </Link>
          </div>
        </div>
      </header>

      <div className="shell pt-12">
        <ReportView report={report} />
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd data-numeric className="text-sm text-ink">
        {value || '—'}
      </dd>
    </div>
  );
}
