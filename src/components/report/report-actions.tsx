'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Download,
  Ellipsis,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/primitives';
import { Field, Input } from '@/components/ui/field';
import { CopyButton } from './copy-button';
import { sectionDisplayName } from '@/lib/ai/regenerate-labels';
import type { RegeneratableSection } from '@/lib/schemas/report';

/**
 * Owner-only report controls.
 *
 * Every control performs a real operation against the API. Destructive actions
 * confirm first, and each one reports its outcome rather than optimistically
 * claiming success.
 */

export function ReportActions({
  analysisId,
  title,
  initialShareUrl,
}: {
  analysisId: string;
  title: string;
  initialShareUrl: string | null;
}) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = React.useState<string | null>(initialShareUrl);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [nextTitle, setNextTitle] = React.useState(title);

  const call = React.useCallback(
    async (
      url: string,
      init: RequestInit,
      messages: { success: string; failure: string },
    ): Promise<unknown | null> => {
      try {
        const response = await fetch(url, {
          ...init,
          headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
        });
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        if (!response.ok) {
          toast.error(body?.message ?? messages.failure);
          return null;
        }
        toast.success(messages.success);
        return body;
      } catch {
        toast.error(messages.failure);
        return null;
      }
    },
    [],
  );

  const rename = async () => {
    const trimmed = nextTitle.trim();
    if (trimmed.length === 0) return;
    setBusy('rename');
    const result = await call(
      `/api/analyses/${analysisId}`,
      { method: 'PATCH', body: JSON.stringify({ title: trimmed }) },
      { success: 'Report renamed.', failure: 'The report could not be renamed.' },
    );
    setBusy(null);
    if (result) {
      setRenameOpen(false);
      router.refresh();
    }
  };

  const duplicate = async () => {
    setBusy('duplicate');
    const result = (await call(
      `/api/analyses/${analysisId}/duplicate`,
      { method: 'POST', body: '{}' },
      { success: 'Report duplicated.', failure: 'The report could not be duplicated.' },
    )) as { analysisId?: string } | null;
    setBusy(null);
    if (result?.analysisId) router.push(`/app/reports/${result.analysisId}`);
  };

  const remove = async () => {
    setBusy('delete');
    const result = await call(
      `/api/analyses/${analysisId}`,
      { method: 'DELETE' },
      { success: 'Report deleted.', failure: 'The report could not be deleted.' },
    );
    setBusy(null);
    if (result) {
      setDeleteOpen(false);
      router.push('/app');
    }
  };

  const createShare = async () => {
    setBusy('share');
    const result = (await call(
      `/api/analyses/${analysisId}/share`,
      { method: 'POST', body: '{}' },
      { success: 'Share link created.', failure: 'The share link could not be created.' },
    )) as { url?: string } | null;
    setBusy(null);
    if (result?.url) setShareUrl(result.url);
  };

  const revokeShare = async () => {
    setBusy('share');
    const result = await call(
      `/api/analyses/${analysisId}/share`,
      { method: 'DELETE' },
      { success: 'Share link revoked.', failure: 'The share link could not be revoked.' },
    );
    setBusy(null);
    if (result) setShareUrl(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={shareUrl ? 'subtle' : 'outline'}
          size="sm"
          onClick={() => setShareOpen(true)}
        >
          {shareUrl ? <Link2 className="text-marine" /> : <Link2 />}
          {shareUrl ? 'Shared' : 'Share'}
        </Button>

        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer />
          Export PDF
        </Button>

        <Button asChild variant="outline" size="sm">
          <a href={`/api/analyses/${analysisId}/export`} download>
            <Download />
            JSON
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More report actions">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Report</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void duplicate()} disabled={busy === 'duplicate'}>
              {busy === 'duplicate' ? <Loader2 className="animate-spin" /> : <Copy />}
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Report title" htmlFor="report-title">
              <Input
                id="report-title"
                value={nextTitle}
                onChange={(event) => setNextTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void rename();
                }}
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void rename()}
              disabled={busy === 'rename' || nextTitle.trim().length === 0}
            >
              {busy === 'rename' ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this report</DialogTitle>
            <DialogDescription>
              A share link gives read-only access to this one report. It never exposes your email
              address, your account, or any other project.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            {shareUrl ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge tone="live">Link active</Badge>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl} className="font-mono text-xs" />
                  <CopyButton value={shareUrl} variant="outline" label="Copy" />
                </div>
                <p className="text-xs leading-relaxed text-ink-ghost">
                  Anyone with this link can read the report. Revoking takes effect immediately.
                </p>
              </>
            ) : (
              <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                This report is private. Creating a link generates a token with 256 bits of entropy
                that grants read-only access.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            {shareUrl ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void revokeShare()}
                disabled={busy === 'share'}
              >
                {busy === 'share' ? <Loader2 className="animate-spin" /> : <Link2Off />}
                Revoke link
              </Button>
            ) : (
              <Button
                variant="accent"
                size="sm"
                onClick={() => void createShare()}
                disabled={busy === 'share'}
              >
                {busy === 'share' ? <Loader2 className="animate-spin" /> : <Link2 />}
                Create share link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this report?</DialogTitle>
            <DialogDescription>
              This removes the report, its Digital Twin, its chain scores, every section, and any
              share links. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void remove()}
              disabled={busy === 'delete'}
            >
              {busy === 'delete' ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Per-section regeneration control. */
export function RegenerateButton({
  analysisId,
  section,
  disabled,
  remaining,
}: {
  analysisId: string;
  section: RegeneratableSection;
  disabled?: boolean;
  remaining: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const regenerate = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/sections/${section}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        toast.error(body?.message ?? 'That section could not be regenerated.');
        return;
      }
      toast.success(`${sectionDisplayName(section)} regenerated.`);
      router.refresh();
    } catch {
      toast.error('That section could not be regenerated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void regenerate()}
      disabled={busy || disabled || remaining <= 0}
      title={
        remaining <= 0
          ? 'No section regenerations remaining during the private beta.'
          : `Regenerate this section (${remaining} remaining)`
      }
    >
      {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      Regenerate
    </Button>
  );
}
