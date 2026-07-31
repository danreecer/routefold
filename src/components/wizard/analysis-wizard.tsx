'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { AutosaveIndicator, StepRail } from './wizard-primitives';
import { StepConstraints, StepCurrentState, StepObjectives, StepSource, type FieldErrors } from './steps';
import { TwinReview } from './twin-review';
import { ProgressPanel, type StageRow, type StageState } from './progress-panel';
import {
  DEFAULT_WIZARD_INPUT,
  wizardInputStrictSchema,
  wizardStepConstraintsSchema,
  wizardStepCurrentStateSchema,
  wizardStepObjectivesSchema,
  wizardStepSourceSchema,
  type WizardInput,
} from '@/lib/schemas/wizard';
import { digitalTwinSchema, type DigitalTwin } from '@/lib/schemas/twin';
import { cn } from '@/lib/utils';

/**
 * The analysis wizard.
 *
 * Five steps, autosaved to localStorage so a refresh or an accidental
 * navigation does not lose the work. Analysis creation is idempotent — the
 * generated key is held in the draft, so a double submit resolves to one
 * analysis and one quota unit.
 */

const STORAGE_KEY = 'routefold.wizard.draft.v1';

const STEPS = [
  { id: 'source', label: 'Source' },
  { id: 'current', label: 'Current state' },
  { id: 'objectives', label: 'Objectives' },
  { id: 'constraints', label: 'Constraints' },
  { id: 'twin', label: 'Extracted profile' },
] as const;

const PREPARE_STAGE_ORDER = [
  { id: 'RETRIEVING_SOURCES', label: 'Retrieving sources' },
  { id: 'EXTRACTING_PROFILE', label: 'Extracting project profile' },
  { id: 'BUILDING_TWIN', label: 'Building Digital Twin' },
];

const GENERATE_STAGE_ORDER = [
  { id: 'SCORING_ECOSYSTEMS', label: 'Scoring ecosystems' },
  { id: 'DESIGNING_SEQUENCE', label: 'Designing expansion sequence' },
  { id: 'GENERATING_ARCHITECTURE', label: 'Generating architecture' },
  { id: 'BUILDING_RISK_REGISTER', label: 'Building risk register' },
  { id: 'CREATING_EXECUTION_PLAN', label: 'Creating execution plan' },
  { id: 'FINALIZING', label: 'Finalizing report' },
];

type Draft = {
  input: WizardInput;
  step: number;
  furthest: number;
  idempotencyKey: string;
  analysisId: string | null;
};

type Phase = 'form' | 'preparing' | 'review' | 'generating' | 'failed';

type StreamEvent =
  | { type: 'stage'; stage: string; state: 'started' | 'completed' | 'failed'; label: string; progress: number; detail?: string }
  | { type: 'phase-complete'; status: string; analysisId: string }
  | { type: 'error'; code: string; message: string };

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for older browsers; only needs to be unique per draft.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4000-8000-${Math.random()
    .toString(16)
    .slice(2, 14)}`;
}

export function AnalysisWizard({ canGenerate, remaining }: { canGenerate: boolean; remaining: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('analysis');

  const [draft, setDraft] = React.useState<Draft>({
    input: DEFAULT_WIZARD_INPUT,
    step: 0,
    furthest: 0,
    idempotencyKey: '',
    analysisId: null,
  });
  const [hydrated, setHydrated] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [phase, setPhase] = React.useState<Phase>('form');
  const [stageStates, setStageStates] = React.useState<Record<string, StageState>>({});
  const [stageDetail, setStageDetail] = React.useState<Record<string, string>>({});
  const [progress, setProgress] = React.useState(0);
  const [runError, setRunError] = React.useState<{ code: string; message: string } | null>(null);
  const [twin, setTwin] = React.useState<DigitalTwin | null>(null);
  const [fieldSources, setFieldSources] = React.useState<Record<string, string> | null>(null);
  const [savingTwin, setSavingTwin] = React.useState(false);
  const [rebuilding, setRebuilding] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);

  /* ── Draft hydration ── */
  // Reads localStorage — an external store — exactly once on mount. This is the
  // external-synchronisation case the rule exists to permit; it cannot run
  // during render because localStorage does not exist on the server.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        const input = { ...DEFAULT_WIZARD_INPUT, ...(parsed.input ?? {}) };
        setDraft({
          input,
          step: typeof parsed.step === 'number' ? Math.min(parsed.step, 3) : 0,
          furthest: typeof parsed.furthest === 'number' ? Math.min(parsed.furthest, 3) : 0,
          idempotencyKey: parsed.idempotencyKey ?? newKey(),
          analysisId: parsed.analysisId ?? null,
        });
      } else {
        setDraft((current) => ({ ...current, idempotencyKey: newKey() }));
      }
    } catch {
      setDraft((current) => ({ ...current, idempotencyKey: newKey() }));
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ── Resume an analysis awaiting review ── */
  React.useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/analyses/${resumeId}/twin`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          twin: unknown;
          fieldSources: Record<string, string> | null;
        };
        const parsed = digitalTwinSchema.safeParse(data.twin);
        if (!cancelled && parsed.success) {
          setTwin(parsed.data);
          setFieldSources(data.fieldSources);
          setDraft((current) => ({ ...current, analysisId: resumeId, step: 4, furthest: 4 }));
          setPhase('review');
          setProgress(32);
          setStageStates(
            Object.fromEntries(PREPARE_STAGE_ORDER.map((stage) => [stage.id, 'complete'])),
          );
        }
      } catch {
        // Resume is best-effort; the wizard still works from scratch.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  /* ── Autosave ── */
  React.useEffect(() => {
    if (!hydrated || phase !== 'form') return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedAt(Date.now());
      } catch {
        // Storage may be unavailable (private mode); the wizard still works.
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, hydrated, phase]);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const update = React.useCallback(
    <K extends keyof WizardInput>(key: K, next: WizardInput[K]) => {
      setDraft((current) => ({ ...current, input: { ...current.input, [key]: next } }));
      setErrors((current) => ({ ...current, [key as string]: undefined }));
    },
    [],
  );

  const validateStep = (index: number): boolean => {
    const schemas = [
      wizardStepSourceSchema,
      wizardStepCurrentStateSchema,
      wizardStepObjectivesSchema,
      wizardStepConstraintsSchema,
    ];
    const schema = schemas[index];
    if (!schema) return true;

    const result = schema.safeParse(draft.input);
    if (result.success) {
      // Step 1 additionally needs a usable source of information.
      if (index === 0) {
        const hasSource =
          draft.input.websiteUrl.length > 0 || draft.input.docsUrl.length > 0;
        if (!hasSource && draft.input.manualDescription.trim().length < 40) {
          setErrors({
            websiteUrl:
              'Provide a website or documentation URL, or describe the product in at least 40 characters below.',
          });
          return false;
        }
      }
      setErrors({});
      return true;
    }

    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string' && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const goTo = (index: number) => {
    setDraft((current) => ({ ...current, step: index }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const next = () => {
    if (!validateStep(draft.step)) {
      toast.error('Some fields need attention before continuing.');
      return;
    }
    const target = Math.min(draft.step + 1, STEPS.length - 1);
    setDraft((current) => ({
      ...current,
      step: target,
      furthest: Math.max(current.furthest, target),
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => goTo(Math.max(draft.step - 1, 0));

  /* ── Streaming helper ── */
  const runStream = React.useCallback(
    async (url: string, stageOrder: Array<{ id: string; label: string }>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setRunError(null);
      setStageStates(Object.fromEntries(stageOrder.map((stage) => [stage.id, 'pending'])));
      setStageDetail({});

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string }
          | null;
        throw new Error(body?.message ?? 'The analysis could not be started.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed: StreamEvent | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim().length === 0) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }

          if (event.type === 'stage') {
            setProgress(event.progress);
            setStageStates((current) => ({
              ...current,
              [event.stage]:
                event.state === 'started'
                  ? 'running'
                  : event.state === 'completed'
                    ? 'complete'
                    : 'failed',
            }));
            if (event.detail) {
              setStageDetail((current) => ({ ...current, [event.stage]: event.detail as string }));
            }
          } else if (event.type === 'error') {
            setRunError({ code: event.code, message: event.message });
            completed = event;
          } else if (event.type === 'phase-complete') {
            completed = event;
          }
        }
      }

      return completed;
    },
    [],
  );

  /* ── Phase 1 ── */
  const startAnalysis = async () => {
    if (!validateStep(3)) {
      toast.error('Some constraints need attention.');
      return;
    }

    const parsed = wizardInputStrictSchema.safeParse(draft.input);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error('Some answers are invalid.');
      return;
    }

    setPhase('preparing');
    setProgress(2);

    try {
      const createResponse = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input: parsed.data,
          idempotencyKey: draft.idempotencyKey || newKey(),
          ...(draft.analysisId ? {} : {}),
        }),
      });

      const createBody = (await createResponse.json()) as {
        analysisId?: string;
        error?: string;
        message?: string;
      };

      if (!createResponse.ok || !createBody.analysisId) {
        setPhase('failed');
        setRunError({
          code: createBody.error ?? 'ERROR',
          message: createBody.message ?? 'The analysis could not be created.',
        });
        return;
      }

      const analysisId = createBody.analysisId;
      setDraft((current) => ({ ...current, analysisId }));

      const result = await runStream(`/api/analyses/${analysisId}/prepare`, PREPARE_STAGE_ORDER);

      if (result?.type === 'error') {
        setPhase('failed');
        return;
      }

      const twinResponse = await fetch(`/api/analyses/${analysisId}/twin`);
      if (!twinResponse.ok) {
        setPhase('failed');
        setRunError({
          code: 'TWIN_MISSING',
          message: 'The Digital Twin could not be loaded. Try starting the analysis again.',
        });
        return;
      }

      const twinBody = (await twinResponse.json()) as {
        twin: unknown;
        fieldSources: Record<string, string> | null;
      };
      const parsedTwin = digitalTwinSchema.safeParse(twinBody.twin);
      if (!parsedTwin.success) {
        setPhase('failed');
        setRunError({
          code: 'TWIN_INVALID',
          message: 'The Digital Twin that was produced is not valid. Try again.',
        });
        return;
      }

      setTwin(parsedTwin.data);
      setFieldSources(twinBody.fieldSources);
      setDraft((current) => ({ ...current, step: 4, furthest: 4 }));
      setPhase('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setPhase('failed');
      setRunError({
        code: 'NETWORK',
        message: error instanceof Error ? error.message : 'The connection was interrupted.',
      });
    }
  };

  /* ── Twin save / confirm ── */
  const saveTwin = async (confirm: boolean): Promise<boolean> => {
    if (!twin || !draft.analysisId) return false;
    setSavingTwin(true);
    try {
      const response = await fetch(`/api/analyses/${draft.analysisId}/twin`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ twin, confirm }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message ?? 'The Digital Twin could not be saved.');
        return false;
      }
      setSavedAt(Date.now());
      if (!confirm) toast.success('Digital Twin saved.');
      return true;
    } catch {
      toast.error('The Digital Twin could not be saved.');
      return false;
    } finally {
      setSavingTwin(false);
    }
  };

  /* ── Rebuild twin from sources ── */
  const rebuildTwin = async () => {
    if (!draft.analysisId) return;
    setRebuilding(true);
    setPhase('preparing');
    try {
      const result = await runStream(
        `/api/analyses/${draft.analysisId}/prepare`,
        PREPARE_STAGE_ORDER,
      );
      if (result?.type === 'error') {
        setPhase('failed');
        return;
      }
      const twinResponse = await fetch(`/api/analyses/${draft.analysisId}/twin`);
      const twinBody = (await twinResponse.json()) as {
        twin: unknown;
        fieldSources: Record<string, string> | null;
      };
      const parsedTwin = digitalTwinSchema.safeParse(twinBody.twin);
      if (parsedTwin.success) {
        setTwin(parsedTwin.data);
        setFieldSources(twinBody.fieldSources);
        toast.success('Digital Twin rebuilt from sources.');
      }
      setPhase('review');
    } catch {
      setPhase('failed');
      setRunError({ code: 'NETWORK', message: 'The rebuild could not be completed.' });
    } finally {
      setRebuilding(false);
    }
  };

  /* ── Phase 2 ── */
  const generateReport = async () => {
    if (!draft.analysisId) return;
    const saved = await saveTwin(true);
    if (!saved) return;

    setPhase('generating');
    setProgress(34);

    try {
      const result = await runStream(
        `/api/analyses/${draft.analysisId}/generate`,
        GENERATE_STAGE_ORDER,
      );

      if (result?.type === 'error') {
        setPhase('failed');
        return;
      }

      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      toast.success('Report complete.');
      router.push(`/app/reports/${draft.analysisId}`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setPhase('failed');
      setRunError({
        code: 'NETWORK',
        message: error instanceof Error ? error.message : 'The connection was interrupted.',
      });
    }
  };

  const stageRows = (order: Array<{ id: string; label: string }>): StageRow[] =>
    order.map((stage) => ({
      id: stage.id,
      label: stage.label,
      state: stageStates[stage.id] ?? 'pending',
      detail: stageDetail[stage.id],
    }));

  if (!hydrated) {
    return (
      <div className="flex items-center gap-3 px-5 py-16 md:px-8">
        <Loader2 className="size-4 animate-spin text-ink-ghost" />
        <span className="text-[0.8125rem] text-ink-faint">Loading your draft…</span>
      </div>
    );
  }

  /* ── Running phases ── */
  if (phase === 'preparing' || phase === 'generating') {
    const isPreparing = phase === 'preparing';
    return (
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto max-w-2xl">
          <ProgressPanel
            title={isPreparing ? 'Building your Digital Twin' : 'Generating your expansion blueprint'}
            stages={stageRows(isPreparing ? PREPARE_STAGE_ORDER : GENERATE_STAGE_ORDER)}
            progress={progress}
            error={runError}
          />
          <p className="mt-5 text-center text-xs leading-relaxed text-ink-ghost">
            Each step advances only when that stage actually completes. Keep this tab open — closing
            it interrupts the run.
          </p>
        </div>
      </div>
    );
  }

  /* ── Failure ── */
  if (phase === 'failed') {
    return (
      <div className="px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <ProgressPanel
            title="The analysis stopped"
            stages={stageRows(twin ? GENERATE_STAGE_ORDER : PREPARE_STAGE_ORDER)}
            progress={progress}
            error={runError}
          />
          <Panel>
            <PanelBody className="flex flex-col gap-4">
              <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                No report generation was consumed. You can retry, or go back and adjust your answers.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  onClick={() => (twin ? void generateReport() : void startAnalysis())}
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPhase(twin ? 'review' : 'form');
                    setRunError(null);
                  }}
                >
                  {twin ? 'Back to the Digital Twin' : 'Back to the form'}
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/app">Return to dashboard</Link>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    );
  }

  /* ── Form + review ── */
  const isReview = phase === 'review' && twin !== null;
  const currentStep = isReview ? 4 : draft.step;

  return (
    <div className="grid gap-10 px-5 py-8 md:px-8 md:py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="eyebrow">Steps</span>
          <AutosaveIndicator savedAt={savedAt} />
        </div>
        <StepRail
          steps={[...STEPS]}
          current={currentStep}
          furthest={isReview ? 4 : draft.furthest}
          onSelect={(index) => {
            if (isReview && index < 4) return;
            goTo(index);
          }}
        />
        {!canGenerate ? (
          <div className="mt-6 border-l-2 border-critical pl-3">
            <p className="text-xs leading-relaxed text-critical">
              No report generations remaining during the private beta.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-xs leading-relaxed text-ink-ghost">
            {remaining} report generation{remaining === 1 ? '' : 's'} remaining.
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        {isReview && twin ? (
          <>
            <TwinReview
              twin={twin}
              fieldSources={fieldSources}
              onChange={setTwin}
              onSave={(confirm) => void saveTwin(confirm)}
              onRebuild={() => void rebuildTwin()}
              saving={savingTwin}
              rebuilding={rebuilding}
              savedAt={savedAt}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <Badge tone="accent">Confirm to score every ecosystem</Badge>
              <Button
                variant="accent"
                size="lg"
                onClick={() => void generateReport()}
                disabled={!canGenerate || savingTwin}
              >
                <Sparkles />
                Confirm and generate report
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className={cn(draft.step === 0 ? 'block' : 'hidden')}>
              <StepSource value={draft.input} update={update} errors={errors} />
            </div>
            <div className={cn(draft.step === 1 ? 'block' : 'hidden')}>
              <StepCurrentState value={draft.input} update={update} errors={errors} />
            </div>
            <div className={cn(draft.step === 2 ? 'block' : 'hidden')}>
              <StepObjectives value={draft.input} update={update} errors={errors} />
            </div>
            <div className={cn(draft.step === 3 ? 'block' : 'hidden')}>
              <StepConstraints value={draft.input} update={update} errors={errors} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <Button variant="ghost" onClick={back} disabled={draft.step === 0}>
                <ArrowLeft />
                Back
              </Button>

              {draft.step < 3 ? (
                <Button variant="primary" onClick={next}>
                  Continue
                  <ArrowRight />
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => void startAnalysis()}
                  disabled={!canGenerate}
                >
                  <Sparkles />
                  Build Digital Twin
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
