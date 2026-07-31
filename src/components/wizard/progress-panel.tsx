'use client';

import * as React from 'react';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Progress } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * Stage progress.
 *
 * Every row advances only when the server reports that a real stage finished.
 * There is no timer and no simulated motion — if a stage takes ninety seconds,
 * the row sits at "running" for ninety seconds, which is the honest thing to
 * show.
 */

export type StageState = 'pending' | 'running' | 'complete' | 'failed';

export type StageRow = {
  id: string;
  label: string;
  state: StageState;
  detail?: string;
};

export function ProgressPanel({
  title,
  stages,
  progress,
  error,
}: {
  title: string;
  stages: StageRow[];
  progress: number;
  error?: { code: string; message: string } | null;
}) {
  return (
    <Panel corners>
      <PanelHeader>
        <div>
          <PanelTitle>{title}</PanelTitle>
        </div>
        <span data-numeric className="text-sm text-ink-dim">
          {Math.round(progress)}%
        </span>
      </PanelHeader>

      <div className="px-5 pt-4">
        <Progress
          value={progress}
          indicatorClassName={error ? 'bg-critical' : 'bg-ember'}
          aria-label="Analysis progress"
        />
      </div>

      <PanelBody>
        <ol className="flex flex-col gap-0.5" aria-live="polite" aria-atomic="false">
          {stages.map((stage) => (
            <li
              key={stage.id}
              className={cn(
                'flex items-start gap-3 rounded-[2px] px-2 py-2.5 transition-colors',
                stage.state === 'running' && 'bg-raised/60',
              )}
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                {stage.state === 'complete' ? (
                  <CircleCheck className="size-4 text-positive" />
                ) : stage.state === 'running' ? (
                  <Loader2 className="size-4 animate-spin text-ember-bright" />
                ) : stage.state === 'failed' ? (
                  <CircleX className="size-4 text-critical" />
                ) : (
                  <span className="size-1.5 rounded-full bg-ink-ghost" />
                )}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    'text-[0.875rem]',
                    stage.state === 'complete'
                      ? 'text-ink-dim'
                      : stage.state === 'running'
                        ? 'text-ink'
                        : stage.state === 'failed'
                          ? 'text-critical'
                          : 'text-ink-ghost',
                  )}
                >
                  {stage.label}
                </span>
                {stage.detail ? (
                  <span className="text-xs leading-relaxed text-ink-faint">{stage.detail}</span>
                ) : null}
              </span>

              {stage.state === 'running' ? (
                <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-marine animate-pulse-live">
                  running
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {error ? (
          <div className="mt-4 border-l-2 border-critical bg-critical/5 px-4 py-3">
            <p className="eyebrow text-critical">{error.code}</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-dim">{error.message}</p>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
