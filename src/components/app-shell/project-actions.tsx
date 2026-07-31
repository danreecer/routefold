'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ellipsis, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
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
  DropdownMenuTrigger,
} from '@/components/ui/primitives';
import { Field, Input } from '@/components/ui/field';

/** Rename and delete controls for a project. Both perform real mutations. */
export function ProjectActions({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [nextName, setNextName] = React.useState(name);
  const [busy, setBusy] = React.useState<string | null>(null);

  const rename = async () => {
    const trimmed = nextName.trim();
    if (trimmed.length === 0) return;
    setBusy('rename');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        toast.error(body?.message ?? 'The project could not be renamed.');
        return;
      }
      toast.success('Project renamed.');
      setRenameOpen(false);
      router.refresh();
    } catch {
      toast.error('The project could not be renamed.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        toast.error(body?.message ?? 'The project could not be deleted.');
        return;
      }
      toast.success('Project deleted.');
      router.push('/app/projects');
    } catch {
      toast.error('The project could not be deleted.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Project actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil />
            Rename project
          </DropdownMenuItem>
          <DropdownMenuItem variant="danger" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Field label="Project name" htmlFor="project-name">
              <Input
                id="project-name"
                value={nextName}
                onChange={(event) => setNextName(event.target.value)}
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
              disabled={busy === 'rename' || nextName.trim().length === 0}
            >
              {busy === 'rename' ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This permanently removes the project, every analysis run against it, all retrieved
              source text, and any share links. It cannot be undone.
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
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
