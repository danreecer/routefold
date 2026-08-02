'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  BookOpen,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { RoutefoldMark, RoutefoldWordmark } from '@/components/brand/logo';
import { PoweredByZefi } from '@/components/brand/powered-by';
import { ContractAddressInline } from '@/components/token/contract-address';
import { Button } from '@/components/ui/button';
import { Badge, Progress } from '@/components/ui/primitives';
import { CommandPalette } from './command-palette';
import type { QuotaState } from '@/lib/quota';
import { cn } from '@/lib/utils';

/**
 * Persistent application shell.
 *
 * A fixed rail on desktop, a slide-over on mobile, and a command palette bound
 * to ⌘K / Ctrl-K. Navigation state comes from the pathname so it survives a hard
 * reload and deep links.
 */

export type NavCounts = { projects: number; reports: number };

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/projects', label: 'Projects', icon: FolderOpen, exact: false },
  { href: '/app/settings', label: 'Settings', icon: Settings, exact: true },
];

export function AppShell({
  children,
  quota,
  counts,
  recentReports,
}: {
  children: React.ReactNode;
  quota: QuotaState | null;
  counts: NavCounts;
  recentReports: Array<{ id: string; title: string }>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── Mobile top bar ── */}
      <header
        data-app-nav
        className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-shell/70 px-4 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      >
        <Link href="/app" aria-label="Routefold dashboard">
          <RoutefoldWordmark />
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open command palette"
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside
        id="app-sidebar"
        data-app-sidebar
        onClick={() => setMobileOpen(false)}
        className={cn(
          'z-40 flex shrink-0 flex-col border-line bg-shell/60 backdrop-blur-2xl backdrop-saturate-150',
          'lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:border-r',
          mobileOpen
            ? 'fixed inset-x-0 bottom-0 top-14 overflow-y-auto border-t'
            : 'hidden lg:flex',
        )}
      >
        <div className="hidden h-16 shrink-0 items-center border-b border-line px-5 lg:flex">
          <Link href="/app" aria-label="Routefold dashboard" className="transition-opacity hover:opacity-80">
            <RoutefoldWordmark />
          </Link>
        </div>

        <div className="flex flex-col gap-1 p-4">
          <Button asChild variant="accent" size="md" className="w-full justify-start gap-2.5">
            <Link href="/app/new">
              <Plus />
              New analysis
            </Link>
          </Button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'mt-2 hidden h-9 items-center gap-2.5 rounded-[3px] border border-line bg-ink/[0.03] px-3 text-left backdrop-blur-md lg:flex',
              'text-[0.8125rem] text-ink-ghost transition-colors hover:border-line-strong hover:text-ink-faint',
            )}
          >
            <Search className="size-3.5" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded-[2px] border border-line px-1.5 font-mono text-[0.625rem] text-ink-ghost">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-4" aria-label="Application">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            const count =
              item.href === '/app/projects' ? counts.projects : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-[3px] px-3 text-[0.8125rem] transition-colors',
                  isActive
                    ? 'border border-line-strong bg-ink/[0.07] text-ink shadow-[inset_0_1px_0_0_var(--frost-sheen)]'
                    : 'border border-transparent text-ink-faint hover:bg-ink/[0.04] hover:text-ink-dim',
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {count !== undefined && count > 0 ? (
                  <span data-numeric className="text-[0.6875rem] text-ink-ghost">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {recentReports.length > 0 ? (
            <div className="mt-6">
              <p className="eyebrow px-3">Recent reports</p>
              <div className="mt-2 flex flex-col gap-0.5">
                {recentReports.slice(0, 5).map((report) => (
                  <Link
                    key={report.id}
                    href={`/app/reports/${report.id}`}
                    className={cn(
                      'flex h-8 items-center gap-2.5 rounded-[3px] px-3 text-[0.8125rem] transition-colors',
                      pathname === `/app/reports/${report.id}`
                        ? 'bg-ink/[0.07] text-ink'
                        : 'text-ink-faint hover:bg-ink/[0.04] hover:text-ink-dim',
                    )}
                  >
                    <FileText className="size-3.5 shrink-0 text-ink-ghost" />
                    <span className="truncate">{report.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="flex flex-col gap-4 border-t border-line p-4">
          {quota ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">Beta quota</span>
                <span data-numeric className="text-[0.6875rem] text-ink-faint">
                  {quota.reportsRemaining}/{quota.reportLimit}
                </span>
              </div>
              <Progress
                value={(quota.reportsUsed / Math.max(quota.reportLimit, 1)) * 100}
                indicatorClassName={quota.reportsRemaining === 0 ? 'bg-critical' : 'bg-ember'}
              />
              <p className="text-[0.6875rem] leading-relaxed text-ink-ghost">
                {quota.reportsRemaining > 0
                  ? `${quota.reportsRemaining} report generation${quota.reportsRemaining === 1 ? '' : 's'} remaining. Free during private beta.`
                  : 'No report generations remaining during the private beta.'}
              </p>
            </div>
          ) : null}

          <Link
            href="/methodology"
            className="flex items-center gap-2.5 text-[0.8125rem] text-ink-ghost transition-colors hover:text-ink-faint"
          >
            <BookOpen className="size-3.5" />
            Methodology
          </Link>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'size-7 rounded-[2px]',
                  userButtonPopoverCard: 'bg-surface border border-line',
                },
              }}
            />
            <Badge tone="ghost">Private beta</Badge>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-3">
            <ContractAddressInline />
            <PoweredByZefi />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        recentReports={recentReports}
      />
    </div>
  );
}

/** Compact header used at the top of each app page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <div className="px-5 py-7 md:px-8 md:py-9">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span className="text-ink-ghost" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-xs text-ink-faint transition-colors hover:text-ink-dim"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-xs text-ink-dim" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h1 className="text-title font-medium text-ink">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-faint">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-8 md:px-8 md:py-10', className)}>{children}</div>;
}

export { RoutefoldMark };
