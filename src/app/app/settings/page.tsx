import type { Metadata } from 'next';
import Link from 'next/link';
import { UserProfile } from '@clerk/nextjs';
import { PageBody, PageHeader } from '@/components/app-shell/shell';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge, Progress } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { requireUserProfile } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { capabilities, env, generationMode } from '@/lib/env';
import { KNOWLEDGE_BASE_VERSION, knowledgeBaseReviewedAt } from '@/lib/chains/knowledge-base';
import { computeQuota } from '@/lib/quota';
import { SCORING_VERSION } from '@/lib/scoring';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const profile = await requireUserProfile();
  const quota = computeQuota(profile);
  const caps = capabilities();
  const mode = generationMode();

  const [projectCount, reportCount] = await Promise.all([
    prisma.project.count({ where: { userId: profile.id } }),
    prisma.analysis.count({ where: { userId: profile.id } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Account and usage"
        breadcrumbs={[{ href: '/app', label: 'Dashboard' }, { label: 'Settings' }]}
      />

      <PageBody className="flex flex-col gap-8">
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel>
            <PanelHeader>
              <PanelTitle>Private beta usage</PanelTitle>
              <Badge tone={quota.canGenerateReport ? 'live' : 'critical'}>
                {quota.canGenerateReport ? 'Active' : 'Exhausted'}
              </Badge>
            </PanelHeader>
            <PanelBody className="flex flex-col gap-6">
              <UsageRow
                label="Report generations"
                used={quota.reportsUsed}
                limit={quota.reportLimit}
                note="Consumed only when a report reaches completion. Failed runs cost nothing."
              />
              <UsageRow
                label="Section regenerations"
                used={quota.sectionsUsed}
                limit={quota.sectionLimit}
                note="A smaller unit charged when an individual report section is regenerated."
              />
              <p className="text-xs leading-relaxed text-ink-ghost">
                Routefold is free during private beta. There is no billing, no card on file, and no
                paid tier to upgrade to yet. Limits are configured per deployment via{' '}
                <code className="font-mono">REPORT_GENERATION_LIMIT</code>.
              </p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Your data</PanelTitle>
            </PanelHeader>
            <PanelBody className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-5">
                <div>
                  <dt className="eyebrow">Projects</dt>
                  <dd data-numeric className="mt-1.5 text-lg text-ink">
                    {projectCount}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Analyses</dt>
                  <dd data-numeric className="mt-1.5 text-lg text-ink">
                    {reportCount}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Account created</dt>
                  <dd className="mt-1.5 text-[0.8125rem] text-ink-dim">
                    {formatDate(profile.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">Email</dt>
                  <dd className="mt-1.5 break-all text-[0.8125rem] text-ink-dim">
                    {profile.email ?? '—'}
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-ink-ghost">
                Deleting a project removes every analysis, source document and share link belonging
                to it. See the{' '}
                <Link href="/privacy" className="text-ember-bright underline underline-offset-4">
                  privacy policy
                </Link>{' '}
                for what is stored and why.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/projects">Manage projects</Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>

        <Panel>
          <PanelHeader>
            <PanelTitle>Deployment configuration</PanelTitle>
            <Badge tone={mode === 'live' ? 'live' : mode === 'fixture' ? 'caution' : 'critical'}>
              {mode === 'live' ? 'Live analysis' : mode === 'fixture' ? 'Fixture mode' : 'Unavailable'}
            </Badge>
          </PanelHeader>
          <PanelBody>
            <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <ConfigRow label="Authentication" value={caps.auth ? 'Configured' : 'Not configured'} ok={caps.auth} />
              <ConfigRow label="Database" value={caps.database ? 'Connected' : 'Not configured'} ok={caps.database} />
              <ConfigRow
                label="Analysis provider"
                value={caps.liveAi ? env.anthropicModel ?? 'configured' : 'Not configured'}
                ok={caps.liveAi}
              />
              <ConfigRow label="Scoring engine" value={`v${SCORING_VERSION}`} ok />
              <ConfigRow
                label="Chain knowledge base"
                value={`v${KNOWLEDGE_BASE_VERSION} · reviewed ${knowledgeBaseReviewedAt()}`}
                ok
              />
              <ConfigRow
                label="External chain data"
                value={env.defillamaEnabled ? 'DeFiLlama enabled' : 'Disabled'}
                ok={env.defillamaEnabled}
              />
            </dl>
            {mode === 'fixture' ? (
              <p className="mt-6 border-l-2 border-caution pl-4 text-xs leading-relaxed text-ink-dim">
                This deployment is running the local fixture pipeline. Deterministic chain scores are
                genuine, but narrative sections are templated and every report is labelled as fixture
                output. Fixture output is never substituted for a failed live call.
              </p>
            ) : null}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Profile</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'w-full shadow-none border border-line',
                  card: 'bg-surface shadow-none',
                  navbar: 'bg-paper border-r border-line',
                  scrollBox: 'bg-surface',
                },
              }}
            />
          </PanelBody>
        </Panel>
      </PageBody>
    </>
  );
}

function UsageRow({
  label,
  used,
  limit,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  note: string;
}) {
  const remaining = Math.max(0, limit - used);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[0.875rem] text-ink-dim">{label}</span>
        <span data-numeric className="text-sm text-ink">
          {remaining}
          <span className="text-ink-ghost"> of {limit} remaining</span>
        </span>
      </div>
      <Progress
        value={(used / Math.max(limit, 1)) * 100}
        indicatorClassName={remaining === 0 ? 'bg-critical' : 'bg-ember'}
      />
      <p className="text-xs leading-relaxed text-ink-ghost">{note}</p>
    </div>
  );
}

function ConfigRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow">{label}</dt>
      <dd className={`font-mono text-xs ${ok ? 'text-ink-dim' : 'text-caution'}`}>{value}</dd>
    </div>
  );
}
