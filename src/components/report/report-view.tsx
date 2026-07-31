'use client';

import * as React from 'react';
import { Info } from 'lucide-react';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { ChainScorecard } from './chain-scorecard';
import { ChainComparison } from './chain-comparison';
import { ArchitectureView } from './architecture-view';
import { ExpansionMap } from './expansion-map';
import {
  DigitalTwinView,
  ExecutionPlanView,
  ExecutiveSummaryView,
  ExpansionSequenceView,
  RiskRegisterView,
  SourcesView,
  TechnicalBriefView,
} from './sections';
import { getChain } from '@/lib/chains/knowledge-base';
import type { ReportModel } from '@/lib/report-model';
import { cn } from '@/lib/utils';

/**
 * The report shell.
 *
 * Everything is on one page rather than behind tabs. That is deliberate: this
 * document gets printed, exported and shared with people who will not click
 * through nine tabs, and a single scrolling document is also what makes the PDF
 * export path work without a separate layout.
 *
 * A sticky rail provides navigation and tracks position with IntersectionObserver.
 */

type SectionId =
  | 'summary'
  | 'twin'
  | 'map'
  | 'scorecard'
  | 'comparison'
  | 'architecture'
  | 'risks'
  | 'plan'
  | 'brief'
  | 'sources';

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'summary', label: 'Executive summary' },
  { id: 'twin', label: 'Digital Twin' },
  { id: 'map', label: 'Expansion map' },
  { id: 'scorecard', label: 'Chain scorecard' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'risks', label: 'Risk register' },
  { id: 'plan', label: '30-day plan' },
  { id: 'brief', label: 'Technical brief' },
  { id: 'sources', label: 'Sources' },
];

export type SectionSlots = Partial<Record<SectionId, React.ReactNode>>;

export function ReportView({
  report,
  slots,
  jsonExportHref,
}: {
  report: ReportModel;
  /** Owner-only controls injected per section (regenerate, edit). */
  slots?: SectionSlots;
  jsonExportHref?: string;
}) {
  const [active, setActive] = React.useState<SectionId>('summary');
  const observed = React.useRef(new Map<SectionId, IntersectionObserverEntry>());

  React.useEffect(() => {
    const elements = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          observed.current.set(entry.target.id as SectionId, entry);
        }
        // The topmost intersecting section wins.
        const visible = [...observed.current.values()]
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActive(first.target.id as SectionId);
      },
      { rootMargin: '-88px 0px -55% 0px', threshold: [0, 0.15] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [report.id]);

  const recommendedName = report.recommendedChain
    ? (getChain(report.recommendedChain)?.name ?? report.recommendedChain)
    : '—';

  const availableSections = SECTIONS.filter((section) => {
    switch (section.id) {
      case 'summary':
        return Boolean(report.summary);
      case 'map':
        return report.scores.length > 0;
      case 'comparison':
        return report.scores.length >= 2;
      case 'architecture':
        return Boolean(report.architecture);
      case 'risks':
        return Boolean(report.risks);
      case 'plan':
        return Boolean(report.plan);
      case 'brief':
        return Boolean(report.technicalBrief);
      case 'sources':
        return Boolean(report.sources);
      default:
        return true;
    }
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
      <nav
        data-print="hide"
        aria-label="Report sections"
        className="hidden lg:block"
      >
        <div className="sticky top-24 flex flex-col gap-1">
          <p className="eyebrow mb-2">Contents</p>
          {availableSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active === section.id ? 'true' : undefined}
              className={cn(
                'border-l px-3 py-1.5 text-[0.8125rem] transition-colors',
                active === section.id
                  ? 'border-ember text-ink'
                  : 'border-line text-ink-faint hover:border-ink-ghost hover:text-ink-dim',
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-16">
        {report.isExample ? <ExampleNotice /> : null}
        {report.generationMode === 'fixture' ? <FixtureNotice /> : null}

        {report.summary ? (
          <ReportSection id="summary" title="Executive summary" action={slots?.summary}>
            <ExecutiveSummaryView
              summary={report.summary}
              confidence={report.confidence}
              recommendedChainName={recommendedName}
            />
          </ReportSection>
        ) : null}

        <ReportSection id="twin" title="Multichain Digital Twin" action={slots?.twin}>
          <DigitalTwinView
            twin={report.twin}
            fieldSources={report.twinFieldSources}
            assumptions={report.twinAssumptions}
            missingData={report.twinMissingData}
          />
        </ReportSection>

        {report.scores.length > 0 ? (
          <ReportSection id="map" title="Expansion map" action={slots?.map}>
            <div className="flex flex-col gap-8">
              <ExpansionMap
                productName={report.projectName}
                scores={report.scores}
                sequence={report.sequence}
              />
              {report.sequence ? <ExpansionSequenceView sequence={report.sequence} /> : null}
            </div>
          </ReportSection>
        ) : null}

        <ReportSection id="scorecard" title="Chain scorecard" action={slots?.scorecard}>
          <ChainScorecard
            scores={report.scores}
            defaultExpandedSlug={report.recommendedChain ?? undefined}
          />
        </ReportSection>

        {report.scores.length >= 2 ? (
          <ReportSection id="comparison" title="Chain comparison" action={slots?.comparison}>
            <ChainComparison scores={report.scores} />
          </ReportSection>
        ) : null}

        {report.architecture ? (
          <ReportSection id="architecture" title="Architecture" action={slots?.architecture}>
            <ArchitectureView brief={report.architecture} />
          </ReportSection>
        ) : null}

        {report.risks ? (
          <ReportSection id="risks" title="Risk register" action={slots?.risks}>
            <RiskRegisterView register={report.risks} />
          </ReportSection>
        ) : null}

        {report.plan ? (
          <ReportSection id="plan" title="30-day plan" action={slots?.plan}>
            <ExecutionPlanView plan={report.plan} />
          </ReportSection>
        ) : null}

        {report.technicalBrief ? (
          <ReportSection id="brief" title="Technical brief" action={slots?.brief}>
            <TechnicalBriefView brief={report.technicalBrief} exportHref={jsonExportHref} />
          </ReportSection>
        ) : null}

        {report.sources ? (
          <ReportSection id="sources" title="Sources & assumptions" action={slots?.sources}>
            <SourcesView sources={report.sources} />
          </ReportSection>
        ) : null}
      </div>
    </div>
  );
}

function ReportSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id={`${id}-heading`} className="text-title font-medium text-ink">
          {title}
        </h2>
        {action ? <div data-print="hide">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ExampleNotice() {
  return (
    <Panel className="border-ember/35 bg-ember/[0.06]" data-print="block">
      <PanelBody className="flex flex-wrap items-start gap-4">
        <Info className="mt-0.5 size-4 shrink-0 text-ember-bright" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Example analysis — fictional project</Badge>
          </div>
          <p className="max-w-3xl text-[0.8125rem] leading-relaxed text-ink-dim">
            Meridian Reserve does not exist. It was invented to demonstrate the output format, and
            no real organisation commissioned or is described by this analysis. The chain scores
            below are <strong className="font-medium text-ink">not illustrative</strong> — they are
            computed at page load by the same deterministic engine that scores real analyses, from
            the Digital Twin shown here. The narrative sections are hand-authored to show the
            expected depth. Read the{' '}
            <a href="/methodology" className="text-ember-bright underline underline-offset-4">
              methodology
            </a>{' '}
            and check the factor tables against it.
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}

function FixtureNotice() {
  return (
    <Panel className="border-caution/35 bg-caution/[0.06]" data-print="block">
      <PanelBody className="flex flex-wrap items-start gap-4">
        <Info className="mt-0.5 size-4 shrink-0 text-caution" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Badge tone="caution">Fixture output — no language model was used</Badge>
          <p className="max-w-3xl text-[0.8125rem] leading-relaxed text-ink-dim">
            This report was produced by the local development fixture pipeline. The chain scores are
            genuine deterministic engine output, but the narrative sections are templated rather
            than analysed. Configure <code className="font-mono text-xs">ANTHROPIC_API_KEY</code>{' '}
            and <code className="font-mono text-xs">ANTHROPIC_MODEL</code> for live analysis.
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}
