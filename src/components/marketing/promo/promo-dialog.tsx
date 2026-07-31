'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { RoutefoldMark } from '@/components/brand/logo';
import { usePromo, useDelay, useExitIntent } from './promo-provider';

const KEY = 'dialog.beta-invite';

/**
 * The one interruptive surface.
 *
 * Opens on exit intent, or after 35 seconds of visible engagement — whichever
 * comes first — and only if nothing else has been dismissed recently. It is
 * suppressed entirely on touch devices, where exit intent does not exist and a
 * modal is far more disruptive.
 *
 * Everything it claims is verifiable: the beta is free, five reports really are
 * included, no card is really required, and the methodology really is published.
 */
export function PromoDialog() {
  const { hydrated, isDismissed, dismiss, claimInterrupt, releaseInterrupt } = usePromo();
  const [open, setOpen] = React.useState(false);
  const [pointerIsFine, setPointerIsFine] = React.useState(false);

  React.useEffect(() => {
    // Reads matchMedia, a browser API unavailable during server render.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPointerIsFine(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  const eligible = hydrated && pointerIsFine && !isDismissed(KEY);
  const timeElapsed = useDelay(35_000);
  const exiting = useExitIntent(eligible);

  React.useEffect(() => {
    if (!eligible || open) return;
    if (!timeElapsed && !exiting) return;
    // Opening is a response to an external trigger (a timer or a pointer
    // leaving the viewport), not derived state, and it happens at most once.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    if (claimInterrupt(KEY)) setOpen(true);
  }, [eligible, open, timeElapsed, exiting, claimInterrupt]);

  const close = React.useCallback(() => {
    setOpen(false);
    releaseInterrupt(KEY);
    dismiss(KEY);
  }, [releaseInterrupt, dismiss]);

  if (!eligible) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md overflow-hidden">
        <div className="sunset-field relative px-6 pb-5 pt-7">
          <div
            className="aurora aurora-ember left-[-20%] top-[-60%] h-64 w-64 opacity-60"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-3">
            <RoutefoldMark className="size-11" />
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.11em] text-ember-deep">
              Private beta · open
            </span>
          </div>
        </div>

        <DialogHeader className="border-t-0">
          <DialogTitle className="text-[1.125rem]">
            Model your next chain before you commit engineering to it.
          </DialogTitle>
          <DialogDescription>
            Paste a product URL and get a chain-by-chain blueprint you can argue with — every score
            traced to a documented factor.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="pt-0">
          <ul className="flex flex-col gap-2.5">
            {[
              'Five complete reports included',
              'No card required',
              'Published methodology — check every number',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check className="size-3.5 shrink-0 text-ember" aria-hidden="true" />
                <span className="text-[0.875rem] text-ink-dim">{item}</span>
              </li>
            ))}
          </ul>
        </DialogBody>

        <DialogFooter className="justify-between">
          <button
            type="button"
            onClick={close}
            className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink-dim"
          >
            Not now
          </button>
          <Button asChild variant="accent" size="sm" onClick={close}>
            <Link href="/app/new">
              Analyze a product
              <ArrowRight />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
