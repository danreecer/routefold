import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Plus } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { ReportList } from '@/components/app-shell/report-list';
import { ProjectActions } from '@/components/app-shell/project-actions';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getChain } from '@/lib/chains/knowledge-base';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '@/lib/schemas/twin';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Project', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  SUCCESS: 'positive',
  MANUAL: 'neutral',
  PENDING: 'neutral',
} as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const profile = await requireUserProfile();

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: profile.id },
    include: {
      sources: { orderBy: { createdAt: 'desc' } },
      analyses: {
        orderBy: { createdAt: 'desc' },
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
        },
      },
    },
  });

  if (!project) notFound();

  const reports = project.analyses.map((analysis) => ({
    id: analysis.id,
    title: analysis.title ?? project.name,
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
    projectId: project.id,
    projectName: project.name,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={
          project.category
            ? (PRODUCT_CATEGORY_LABELS[project.category as ProductCategory] ?? project.category)
            : undefined
        }
        breadcrumbs={[
          { href: '/app', label: 'Dashboard' },
          { href: '/app/projects', label: 'Projects' },
          { label: project.name },
        ]}
        actions={
          <>
            <Button asChild variant="accent" size="sm">
              <Link href="/app/new">
                <Plus />
                New analysis
              </Link>
            </Button>
            <ProjectActions projectId={project.id} name={project.name} />
          </>
        }
      />

      <PageBody className="flex flex-col gap-8">
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <ReportList
            analyses={reports}
            title="Analyses"
            emptyMessage="No analyses have been run for this project yet."
          />

          <div className="flex flex-col gap-5">
            <Panel>
              <PanelHeader>
                <PanelTitle>Details</PanelTitle>
              </PanelHeader>
              <PanelBody>
                <dl className="flex flex-col gap-4">
                  <DetailRow label="Website">
                    {project.websiteUrl ? (
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 break-all text-ember-bright transition-colors hover:text-ember"
                      >
                        {project.websiteUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow label="Documentation">
                    {project.docsUrl ? (
                      <a
                        href={project.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 break-all text-ember-bright transition-colors hover:text-ember"
                      >
                        {project.docsUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow label="Current chains">
                    {project.currentChains.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {project.currentChains.map((slug) => (
                          <Badge key={slug} tone="ghost">
                            {getChain(slug)?.shortName ?? slug}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow label="Created">{formatDateTime(project.createdAt)}</DetailRow>
                </dl>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader>
                <PanelTitle>Retrieved sources</PanelTitle>
                <span data-numeric className="text-xs text-ink-ghost">
                  {project.sources.length}
                </span>
              </PanelHeader>
              {project.sources.length === 0 ? (
                <PanelBody>
                  <p className="text-[0.8125rem] text-ink-faint">
                    No sources have been retrieved for this project.
                  </p>
                </PanelBody>
              ) : (
                <ul className="divide-y divide-line">
                  {project.sources.map((source) => (
                    <li key={source.id} className="flex flex-col gap-1.5 px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="ghost">{source.kind}</Badge>
                        <Badge
                          tone={
                            STATUS_TONE[source.retrievalStatus as keyof typeof STATUS_TONE] ??
                            'caution'
                          }
                        >
                          {source.retrievalStatus}
                        </Badge>
                        {source.wordCount ? (
                          <span data-numeric className="text-[0.6875rem] text-ink-ghost">
                            {source.wordCount.toLocaleString('en-US')} words
                          </span>
                        ) : null}
                      </div>
                      <span className="break-all font-mono text-[0.6875rem] text-ink-faint">
                        {source.sourceUrl}
                      </span>
                      {source.failureReason ? (
                        <span className="text-xs text-caution">{source.failureReason}</span>
                      ) : null}
                      <span className="font-mono text-[0.625rem] text-ink-ghost">
                        {source.retrievedAt ? formatDateTime(source.retrievedAt) : 'not retrieved'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-[0.8125rem] text-ink-dim">{children}</dd>
    </div>
  );
}
