import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageHeader } from '@/components/app-shell/shell';
import { AnalysisWizard } from '@/components/wizard/analysis-wizard';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { generationMode } from '@/lib/env';
import { computeQuota } from '@/lib/quota';

export const metadata: Metadata = {
  title: 'New analysis',
  description: 'Create a multichain expansion blueprint for your product.',
};

export const dynamic = 'force-dynamic';

export default async function NewAnalysisPage() {
  const profile = await requireUserProfile();
  const quota = computeQuota(profile);
  const mode = generationMode();

  return (
    <>
      <PageHeader
        eyebrow="New analysis"
        title="Analyze a product"
        description="Routefold reads your public sources, builds a Multichain Digital Twin for you to correct, then scores every ecosystem against it."
        breadcrumbs={[{ href: '/app', label: 'Dashboard' }, { label: 'New analysis' }]}
        actions={
          mode === 'fixture' ? <Badge tone="caution">Fixture mode</Badge> : null
        }
      />

      {mode === 'unavailable' ? (
        <div className="px-5 py-10 md:px-8">
          <Panel corners className="mx-auto max-w-2xl">
            <PanelBody className="flex flex-col gap-5">
              <h2 className="text-[1.0625rem] font-medium text-ink">Analysis is not configured</h2>
              <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                This deployment has no analysis provider configured, so new reports cannot be
                generated. The complete example report is available without any configuration.
              </p>
              <div className="border border-line bg-paper px-4 py-3">
                <p className="eyebrow">Required</p>
                <pre className="mt-2 overflow-x-auto font-mono text-[0.6875rem] leading-relaxed text-caution">
                  {`OPENAI_API_KEY=
OPENAI_MODEL=`}
                </pre>
                <p className="mt-3 text-xs leading-relaxed text-ink-ghost">
                  Alternatively set <code className="font-mono">ROUTEFOLD_FIXTURE_MODE=true</code>{' '}
                  to exercise the flow locally with the deterministic fixture pipeline. Fixture
                  output is always labelled as such.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="primary" size="sm">
                  <Link href="/app/example">Open the example report</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app">Back to dashboard</Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      ) : !quota.canGenerateReport ? (
        <div className="px-5 py-10 md:px-8">
          <Panel corners className="mx-auto max-w-2xl">
            <PanelBody className="flex flex-col gap-5">
              <h2 className="text-[1.0625rem] font-medium text-ink">
                No report generations remaining
              </h2>
              <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                You have used all {quota.reportLimit} report generations available during the private
                beta. Your existing reports remain fully accessible, and you can still regenerate
                individual sections ({quota.sectionsRemaining} remaining).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="primary" size="sm">
                  <Link href="/app">View your reports</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/settings">Usage details</Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      ) : (
        <Suspense fallback={<WizardSkeleton />}>
          <AnalysisWizard
            canGenerate={quota.canGenerateReport}
            remaining={quota.reportsRemaining}
          />
        </Suspense>
      )}
    </>
  );
}

function WizardSkeleton() {
  return (
    <div className="grid gap-10 px-5 py-8 md:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
