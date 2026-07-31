'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  BookOpen,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Settings,
  Shield,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * Command palette (⌘K).
 *
 * Every entry navigates somewhere real. There are no placeholder commands.
 */
export function CommandPalette({
  open,
  onOpenChange,
  recentReports,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentReports: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[22%] max-w-xl -translate-y-0 p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          loop
          className="w-full"
          filter={(value, search) =>
            value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <div className="border-b border-line px-4">
            <Command.Input
              autoFocus
              placeholder="Search reports and navigate…"
              className={cn(
                'h-12 w-full bg-transparent text-sm text-ink outline-none',
                'placeholder:text-ink-ghost',
              )}
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[0.8125rem] text-ink-faint">
              No matches.
            </Command.Empty>

            <Group heading="Actions">
              <Item value="New analysis create report" onSelect={() => go('/app/new')}>
                <Plus />
                New analysis
              </Item>
            </Group>

            <Group heading="Navigate">
              <Item value="Dashboard home" onSelect={() => go('/app')}>
                <LayoutDashboard />
                Dashboard
              </Item>
              <Item value="Projects list" onSelect={() => go('/app/projects')}>
                <FolderOpen />
                Projects
              </Item>
              <Item value="Settings account quota" onSelect={() => go('/app/settings')}>
                <Settings />
                Settings
              </Item>
            </Group>

            {recentReports.length > 0 ? (
              <Group heading="Reports">
                {recentReports.map((report) => (
                  <Item
                    key={report.id}
                    value={`report ${report.title}`}
                    onSelect={() => go(`/app/reports/${report.id}`)}
                  >
                    <FileText />
                    <span className="truncate">{report.title}</span>
                  </Item>
                ))}
              </Group>
            ) : null}

            <Group heading="Reference">
              <Item value="Methodology scoring" onSelect={() => go('/methodology')}>
                <BookOpen />
                Methodology
              </Item>
              <Item value="Example report fictional" onSelect={() => go('/app/example')}>
                <FileText />
                Example report
              </Item>
              <Item value="Security posture" onSelect={() => go('/security')}>
                <Shield />
                Security
              </Item>
            </Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2',
        '[&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.625rem]',
        '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.09em]',
        '[&_[cmdk-group-heading]]:text-ink-ghost',
      )}
    >
      {children}
    </Command.Group>
  );
}

function Item({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-[2px] px-3 py-2.5 text-[0.8125rem]',
        'text-ink-dim outline-none transition-colors',
        'data-[selected=true]:bg-sand data-[selected=true]:text-ink',
        '[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-ink-ghost',
      )}
    >
      {children}
    </Command.Item>
  );
}
