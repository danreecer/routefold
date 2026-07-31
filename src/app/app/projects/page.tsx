import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getChain } from '@/lib/chains/knowledge-base';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '@/lib/schemas/twin';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const profile = await requireUserProfile();

  const projects = await prisma.project.findMany({
    where: { userId: profile.id, archivedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { analyses: true, sources: true } },
      analyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, recommendedChain: true, confidence: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Your products"
        description="Each project holds its retrieved sources and every analysis run against it."
        breadcrumbs={[{ href: '/app', label: 'Dashboard' }, { label: 'Projects' }]}
        actions={
          <Button asChild variant="accent">
            <Link href="/app/new">
              <Plus />
              New analysis
            </Link>
          </Button>
        }
      />

      <PageBody>
        {projects.length === 0 ? (
          <Panel>
            <PanelBody className="flex flex-col items-center gap-4 py-16 text-center">
              <FolderOpen className="size-5 text-ink-ghost" />
              <p className="text-[0.875rem] text-ink-faint">
                No projects yet. A project is created the first time you analyse a product.
              </p>
              <Button asChild variant="accent" size="sm">
                <Link href="/app/new">Start an analysis</Link>
              </Button>
            </PanelBody>
          </Panel>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const latest = project.analyses[0];
              const chain = latest?.recommendedChain ? getChain(latest.recommendedChain) : null;
              return (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-bright"
                >
                  <Panel className="h-full transition-colors group-hover:border-line-strong">
                    <PanelBody className="flex h-full flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[0.9375rem] font-medium text-ink">{project.name}</h2>
                        {chain ? <Badge tone="accent">{chain.shortName}</Badge> : null}
                      </div>

                      {project.category ? (
                        <p className="text-xs text-ink-faint">
                          {PRODUCT_CATEGORY_LABELS[project.category as ProductCategory] ??
                            project.category}
                        </p>
                      ) : null}

                      {project.websiteUrl ? (
                        <p className="truncate font-mono text-[0.6875rem] text-ink-ghost">
                          {project.websiteUrl.replace(/^https?:\/\//, '')}
                        </p>
                      ) : null}

                      {project.currentChains.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {project.currentChains.slice(0, 4).map((slug) => (
                            <Badge key={slug} tone="ghost">
                              {getChain(slug)?.shortName ?? slug}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                          {project._count.analyses} report
                          {project._count.analyses === 1 ? '' : 's'} · {project._count.sources} source
                          {project._count.sources === 1 ? '' : 's'}
                        </span>
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                          {relativeTime(project.updatedAt)}
                        </span>
                      </div>
                    </PanelBody>
                  </Panel>
                </Link>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
