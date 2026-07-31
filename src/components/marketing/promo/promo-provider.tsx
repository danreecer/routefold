'use client';

import * as React from 'react';

/**
 * Coordination layer for the marketing surfaces.
 *
 * Several promotional elements can be on screen at once — an announcement bar, a
 * sticky footer CTA, a social rail, a modal. Left uncoordinated they stack up,
 * fight for attention and read as spam, which costs more conversions than it
 * wins. This provider enforces three rules:
 *
 *  1. **Dismissal is permanent.** Every surface has a key; dismissing it writes
 *     to localStorage and it never returns. Nothing here nags.
 *  2. **Only one interruptive surface at a time.** A modal will not open while
 *     another modal is open, and not within the cooldown after any dismissal.
 *  3. **Nothing interrupts immediately.** Interruptive surfaces require the
 *     visitor to have engaged — scrolled, or spent real time on the page.
 *
 * Ambient surfaces (bars, rails) are exempt from rule 2 because they sit in the
 * page chrome rather than over the content.
 */

const STORAGE_KEY = 'routefold.promo.dismissed.v1';
/** After any dismissal, suppress interruptive surfaces for this long. */
const COOLDOWN_MS = 60_000;

type PromoContextValue = {
  hydrated: boolean;
  isDismissed: (key: string) => boolean;
  dismiss: (key: string) => void;
  /** True when an interruptive surface may open right now. */
  canInterrupt: boolean;
  claimInterrupt: (key: string) => boolean;
  releaseInterrupt: (key: string) => void;
};

const PromoContext = React.createContext<PromoContextValue | null>(null);

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function PromoProvider({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [activeInterrupt, setActiveInterrupt] = React.useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = React.useState(0);

  React.useEffect(() => {
    // Reads localStorage — an external store — once on mount. This is the
    // synchronisation case the rule permits; it cannot run during render
    // because localStorage does not exist on the server.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDismissed(readDismissed());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const isDismissed = React.useCallback(
    (key: string) => dismissed.includes(key),
    [dismissed],
  );

  const dismiss = React.useCallback((key: string) => {
    setDismissed((current) => {
      if (current.includes(key)) return current;
      const next = [...current, key];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode — the surface still closes for this session.
      }
      return next;
    });
    setActiveInterrupt((current) => (current === key ? null : current));
    setCooldownUntil(Date.now() + COOLDOWN_MS);
  }, []);

  const claimInterrupt = React.useCallback(
    (key: string) => {
      if (activeInterrupt !== null) return false;
      if (Date.now() < cooldownUntil) return false;
      setActiveInterrupt(key);
      return true;
    },
    [activeInterrupt, cooldownUntil],
  );

  const releaseInterrupt = React.useCallback((key: string) => {
    setActiveInterrupt((current) => (current === key ? null : current));
    setCooldownUntil(Date.now() + COOLDOWN_MS);
  }, []);

  const value = React.useMemo<PromoContextValue>(
    () => ({
      hydrated,
      isDismissed,
      dismiss,
      canInterrupt: activeInterrupt === null,
      claimInterrupt,
      releaseInterrupt,
    }),
    [hydrated, isDismissed, dismiss, activeInterrupt, claimInterrupt, releaseInterrupt],
  );

  return <PromoContext.Provider value={value}>{children}</PromoContext.Provider>;
}

export function usePromo(): PromoContextValue {
  const context = React.useContext(PromoContext);
  if (!context) {
    throw new Error('usePromo must be used inside <PromoProvider>.');
  }
  return context;
}

/**
 * Fires once the visitor has scrolled past `ratio` of the viewport height.
 * Used to gate surfaces on engagement rather than on a raw timer.
 */
export function useScrolledPast(ratio = 0.8): boolean {
  const [passed, setPassed] = React.useState(false);

  React.useEffect(() => {
    if (passed) return;
    const check = () => {
      if (window.scrollY > window.innerHeight * ratio) setPassed(true);
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => window.removeEventListener('scroll', check);
  }, [passed, ratio]);

  return passed;
}

/** True after `delayMs`, but only once the tab has actually been visible. */
export function useDelay(delayMs: number): boolean {
  const [elapsed, setElapsed] = React.useState(false);

  React.useEffect(() => {
    if (document.visibilityState !== 'visible') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          setTimeout(() => setElapsed(true), delayMs);
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return elapsed;
}

/** Fires when the pointer leaves through the top of the viewport. */
export function useExitIntent(enabled: boolean): boolean {
  const [triggered, setTriggered] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || triggered) return;
    const onLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) setTriggered(true);
    };
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, [enabled, triggered]);

  return triggered;
}
