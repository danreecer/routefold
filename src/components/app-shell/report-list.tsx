'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpDown, FileText, Search, TriangleAlert } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import {
  Badge,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type BadgeTone,
} from '@/components/ui/primitives';
import { Input } from '@/components/ui/field';
import { cn, relativeTime } from '@/lib/utils';

/**
 * Report list with search, sort and status filtering.
 *
 * Filtering happens client-side over the rows already fetched, which keeps the
 * interaction instant. The server caps the fetch, and the footer says so rather
 * than silently truncating.
 */

export type ReportRow = {
  id: string;
  title: string;
  status: string;
  progress: number;
  currentStage: string;
  confidence: number | null;
  recommendedChain: string | null;
  recommendedChainName: string | null;
  generationMode: string;
  createdAt: string;
  completedAt: string | null;
  projectId: string;
  projectName: string;
};

const STATUS_TONE: Record<string, BadgeTone> = {
  COMPLETED: 'positive',
  RUNNING: 'live',
  QUEUED: 'neutral',
  AWAITING_REVIEW: 'accent',
  FAILED: 'critical',
  CANCELLED: 'ghost',
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Complete',
  RUNNING: 'Running',
  QUEUED: 'Queued',
  AWAITING_REVIEW: 'Awaiting review',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

type SortKey = 'recent' | 'confidence' | 'name';

export function ReportList({
  analyses,
  title = 'Reports',
  emptyMessage = 'No reports yet.',
}: {
  analyses: ReportRow[];
  title?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<'all' | string>('all');
  const [sort, setSort] = React.useState<SortKey>('recent');

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = analyses.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (needle.length === 0) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        row.projectName.toLowerCase().includes(needle) ||
        (row.recommendedChainName?.toLowerCase().includes(needle) ?? false)
      );
    });

    return rows.sort((a, b) => {
      if (sort === 'confidence') return (b.confidence ?? -1) - (a.confidence ?? -1);
      if (sort === 'name') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [analyses, query, status, sort]);

  const statuses = Array.from(new Set(analyses.map((row) => row.status)));

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        <span data-numeric className="text-xs text-ink-ghost">
          {filtered.length} of {analyses.length}
        </span>
      </PanelHeader>

      {analyses.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-ghost" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reports…"
              aria-label="Search reports"
              className="h-8 pl-8 text-[0.8125rem]"
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-40 text-[0.8125rem]" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_LABEL[value] ?? value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="h-8 w-36 text-[0.8125rem]" aria-label="Sort reports">
              <ArrowUpDown className="size-3 text-ink-ghost" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {analyses.length === 0 ? (
        <PanelBody className="py-14 text-center">
          <FileText className="mx-auto size-5 text-ink-ghost" />
          <p className="mt-3 text-[0.8125rem] text-ink-faint">{emptyMessage}</p>
        </PanelBody>
      ) : filtered.length === 0 ? (
        <PanelBody className="py-14 text-center">
          <p className="text-[0.8125rem] text-ink-faint">No reports match those filters.</p>
        </PanelBody>
      ) : (
        <ul className="divide-y divide-line">
          {filtered.map((row) => (
            <li key={row.id}>
              <Link
                href={
                  row.status === 'AWAITING_REVIEW'
                    ? `/app/new?analysis=${row.id}`
                    : `/app/reports/${row.id}`
                }
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 transition-colors',
                  'hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ember-bright',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[0.875rem] font-medium text-ink">
                      {row.title}
                    </span>
                    <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                    {row.generationMode === 'fixture' ? (
                      <Badge tone="caution">
                        <TriangleAlert className="size-2.5" />
                        Fixture
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                      {row.projectName}
                    </span>
                    {row.recommendedChainName ? (
                      <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ember-bright">
                        → {row.recommendedChainName}
                      </span>
                    ) : null}
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                      {relativeTime(row.createdAt)}
                    </span>
                  </div>

                  {row.status === 'RUNNING' || row.status === 'QUEUED' ? (
                    <Progress value={row.progress} className="mt-1 max-w-xs" />
                  ) : null}
                </div>

                {row.confidence !== null && row.status === 'COMPLETED' ? (
                  <span className="shrink-0 text-right">
                    <span data-numeric className="block text-sm text-ink">
                      {row.confidence}
                    </span>
                    <span className="block font-mono text-[0.5625rem] uppercase tracking-[0.07em] text-ink-ghost">
                      confidence
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {analyses.length >= 30 ? (
        <PanelBody className="border-t border-line py-3">
          <p className="text-xs text-ink-ghost">
            Showing the 30 most recent analyses. Older reports remain accessible from their project.
          </p>
        </PanelBody>
      ) : null}
    </Panel>
  );
}
