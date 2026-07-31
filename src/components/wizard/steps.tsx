'use client';

import * as React from 'react';
import { CircleCheck, CircleX, Loader2, TriangleAlert } from 'lucide-react';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Badge } from '@/components/ui/primitives';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import {
  CheckboxOptionGroup,
  OptionGrid,
  RadioOptionGroup,
  StepIntro,
  TagInput,
} from './wizard-primitives';
import { CHAIN_KNOWLEDGE_BASE } from '@/lib/chains/knowledge-base';
import {
  BUDGET_LABELS,
  DEVELOPMENT_STAGE_LABELS,
  OBJECTIVE_DESCRIPTIONS,
  OBJECTIVE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  TEAM_CAPACITY_LABELS,
  TIME_HORIZON_LABELS,
  USER_PROFILE_LABELS,
  type BudgetSensitivity,
  type DevelopmentStage,
  type Objective,
  type ProductCategory,
  type Sensitivity,
  type TeamCapacity,
  type TimeHorizon,
  type UserProfileType,
  type VmRequirement,
} from '@/lib/schemas/twin';
import type { WizardInput } from '@/lib/schemas/wizard';
import { cn } from '@/lib/utils';

export type FieldErrors = Record<string, string | undefined>;

type StepProps = {
  value: WizardInput;
  update: <K extends keyof WizardInput>(key: K, next: WizardInput[K]) => void;
  errors: FieldErrors;
};

const CHAIN_OPTIONS = CHAIN_KNOWLEDGE_BASE.map((chain) => ({
  value: chain.slug,
  label: chain.shortName,
}));

const GEOGRAPHY_SUGGESTIONS = [
  'North America',
  'Europe',
  'Asia',
  'Southeast Asia',
  'Latin America',
  'Middle East',
  'Africa',
  'Global',
].map((value) => ({ value, label: value }));

const LANGUAGE_SUGGESTIONS = ['Solidity', 'Vyper', 'Rust', 'Move', 'Go', 'CosmWasm'].map((value) => ({
  value,
  label: value,
}));

/* ── Step 1: source ─────────────────────────────────────────────────────── */

type PreviewState =
  | { state: 'idle' }
  | { state: 'loading' }
  | {
      state: 'done';
      ok: boolean;
      status: string;
      message: string;
      title: string | null;
      wordCount: number;
      excerpt: string | null;
      discoveredDocLinks: string[];
    };

export function StepSource({ value, update, errors }: StepProps) {
  const [preview, setPreview] = React.useState<PreviewState>({ state: 'idle' });

  const checkUrl = React.useCallback(
    async (url: string) => {
      if (!url) return;
      setPreview({ state: 'loading' });
      try {
        const response = await fetch('/api/retrieval-preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          status?: string;
          message?: string;
          title?: string | null;
          wordCount?: number;
          excerpt?: string | null;
          discoveredDocLinks?: string[];
        };
        setPreview({
          state: 'done',
          ok: Boolean(data.ok),
          status: data.status ?? 'ERROR',
          message: data.message ?? 'That URL could not be checked.',
          title: data.title ?? null,
          wordCount: data.wordCount ?? 0,
          excerpt: data.excerpt ?? null,
          discoveredDocLinks: data.discoveredDocLinks ?? [],
        });
      } catch {
        setPreview({
          state: 'done',
          ok: false,
          status: 'ERROR',
          message: 'The check could not be completed. You can continue and describe the product below.',
          title: null,
          wordCount: 0,
          excerpt: null,
          discoveredDocLinks: [],
        });
      }
    },
    [],
  );

  const retrievalFailed = preview.state === 'done' && !preview.ok;

  return (
    <div className="flex flex-col gap-8">
      <StepIntro
        title="Source"
        description="Routefold reads readable public content from the URLs you provide. Nothing is crawled beyond them, and private network addresses are refused."
      />

      <Field
        label="Product name"
        htmlFor="productName"
        required
        error={errors.productName}
        hint="How your product is referred to publicly."
      >
        <Input
          id="productName"
          value={value.productName}
          onChange={(event) => update('productName', event.target.value)}
          placeholder="e.g. Meridian Reserve"
          aria-invalid={Boolean(errors.productName)}
          autoComplete="off"
        />
      </Field>

      <Field
        label="Website URL"
        htmlFor="websiteUrl"
        error={errors.websiteUrl}
        hint="The public marketing or product site. Optional if you describe the product below."
      >
        <div className="flex gap-2">
          <Input
            id="websiteUrl"
            type="url"
            inputMode="url"
            value={value.websiteUrl}
            onChange={(event) => update('websiteUrl', event.target.value)}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && !next.startsWith('http')) update('websiteUrl', `https://${next}`);
            }}
            placeholder="https://example.com"
            aria-invalid={Boolean(errors.websiteUrl)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void checkUrl(value.websiteUrl)}
            disabled={!value.websiteUrl || preview.state === 'loading'}
            className="shrink-0"
          >
            {preview.state === 'loading' ? <Loader2 className="animate-spin" /> : null}
            Check
          </Button>
        </div>
      </Field>

      {preview.state === 'done' ? (
        <Panel
          className={cn(
            preview.ok ? 'border-positive/35 bg-positive/[0.05]' : 'border-caution/35 bg-caution/[0.05]',
          )}
        >
          <PanelBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {preview.ok ? (
                <CircleCheck className="size-4 shrink-0 text-positive" />
              ) : (
                <CircleX className="size-4 shrink-0 text-caution" />
              )}
              <span className="text-[0.875rem] font-medium text-ink">
                {preview.ok ? 'Readable' : 'Could not be read'}
              </span>
              <Badge tone={preview.ok ? 'positive' : 'caution'}>{preview.status}</Badge>
              {preview.ok ? (
                <Badge tone="ghost">{preview.wordCount.toLocaleString('en-US')} words</Badge>
              ) : null}
            </div>

            <p className="text-[0.8125rem] leading-relaxed text-ink-dim">{preview.message}</p>

            {preview.title ? (
              <p className="text-xs text-ink-faint">
                <span className="text-ink-ghost">Title · </span>
                {preview.title}
              </p>
            ) : null}

            {preview.excerpt ? (
              <p className="border-l border-line pl-3 text-xs leading-relaxed text-ink-ghost">
                {preview.excerpt}…
              </p>
            ) : null}

            {preview.discoveredDocLinks.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
                  Documentation found
                </span>
                {preview.discoveredDocLinks.map((link) => (
                  <button
                    key={link}
                    type="button"
                    onClick={() => update('docsUrl', link)}
                    className="max-w-full truncate rounded-[2px] border border-line px-2 py-1 text-xs text-ink-faint transition-colors hover:border-line-strong hover:text-ink-dim"
                  >
                    Use {new URL(link).pathname || link}
                  </button>
                ))}
              </div>
            ) : null}
          </PanelBody>
        </Panel>
      ) : null}

      <Field
        label="Documentation URL"
        htmlFor="docsUrl"
        error={errors.docsUrl}
        hint="Technical documentation gives the most useful signal about architecture and requirements."
      >
        <Input
          id="docsUrl"
          type="url"
          inputMode="url"
          value={value.docsUrl}
          onChange={(event) => update('docsUrl', event.target.value)}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && !next.startsWith('http')) update('docsUrl', `https://${next}`);
          }}
          placeholder="https://docs.example.com"
          aria-invalid={Boolean(errors.docsUrl)}
        />
      </Field>

      <Field
        label="Describe the product"
        htmlFor="manualDescription"
        error={errors.manualDescription}
        hint={
          retrievalFailed
            ? 'Your URL could not be read, so a description is the best input Routefold has. Cover what the product does, how it works onchain, and who uses it.'
            : 'Optional when a URL is readable, but it always improves the analysis. Required if no URL can be read.'
        }
      >
        <Textarea
          id="manualDescription"
          value={value.manualDescription}
          onChange={(event) => update('manualDescription', event.target.value)}
          rows={retrievalFailed ? 8 : 5}
          placeholder="What the product does, its core onchain mechanics, and who uses it."
          aria-invalid={Boolean(errors.manualDescription)}
        />
      </Field>
    </div>
  );
}

/* ── Step 2: current state ──────────────────────────────────────────────── */

const VM_OPTIONS: Array<{ value: VmRequirement; label: string; description: string }> = [
  { value: 'EVM', label: 'EVM', description: 'Solidity or Vyper contracts' },
  { value: 'SVM', label: 'SVM', description: 'Solana programs in Rust' },
  { value: 'MoveVM', label: 'Move', description: 'Sui or Aptos' },
  { value: 'CosmWasm', label: 'CosmWasm', description: 'Cosmos appchains' },
  { value: 'NEAR-VM', label: 'NEAR VM', description: 'NEAR native contracts' },
  { value: 'any', label: 'Not yet decided', description: 'No contracts deployed' },
];

export function StepCurrentState({ value, update, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <StepIntro
        title="Current state"
        description="Where the product runs today and what it is built on. This determines how much of your existing work carries over to each candidate."
      />

      <Field
        label="Current chains"
        htmlFor="currentChains"
        hint="Chains where the product is already deployed. They are scored for reference and excluded from the expansion ranking."
      >
        <TagInput
          id="currentChains"
          values={value.currentChains}
          onChange={(next) => update('currentChains', next)}
          suggestions={CHAIN_OPTIONS}
          placeholder="Add a chain and press Enter"
        />
      </Field>

      <Field label="Product category" error={errors.category} required>
        <RadioOptionGroup
          name="category"
          columns={3}
          value={value.category}
          onValueChange={(next) => update('category', next as ProductCategory)}
          options={(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((key) => ({
            value: key,
            label: PRODUCT_CATEGORY_LABELS[key],
          }))}
        />
      </Field>

      <Field
        label="Execution environment in use"
        hint="What your contracts are written for today."
        required
      >
        <RadioOptionGroup
          name="vmEnvironment"
          columns={3}
          value={value.vmEnvironment}
          onValueChange={(next) => update('vmEnvironment', next as VmRequirement)}
          options={VM_OPTIONS}
        />
      </Field>

      <Field
        label="Contract languages"
        htmlFor="contractLanguages"
        hint="Used to score how much of your existing codebase carries over."
      >
        <TagInput
          id="contractLanguages"
          values={value.contractLanguages}
          onChange={(next) => update('contractLanguages', next)}
          suggestions={LANGUAGE_SUGGESTIONS}
          placeholder="Add a language and press Enter"
          max={10}
        />
      </Field>

      <Field label="Token" required>
        <RadioOptionGroup
          name="hasToken"
          columns={3}
          value={value.hasToken}
          onValueChange={(next) => update('hasToken', next as WizardInput['hasToken'])}
          options={[
            { value: 'yes', label: 'Live token' },
            { value: 'planned', label: 'Token planned' },
            { value: 'no', label: 'No token' },
          ]}
        />
      </Field>

      <Field label="Development stage" required>
        <RadioOptionGroup
          name="developmentStage"
          columns={3}
          value={value.developmentStage}
          onValueChange={(next) => update('developmentStage', next as DevelopmentStage)}
          options={(Object.keys(DEVELOPMENT_STAGE_LABELS) as DevelopmentStage[]).map((key) => ({
            value: key,
            label: DEVELOPMENT_STAGE_LABELS[key],
          }))}
        />
      </Field>
    </div>
  );
}

/* ── Step 3: objectives ─────────────────────────────────────────────────── */

export function StepObjectives({ value, update, errors }: StepProps) {
  const toggleObjective = (objective: Objective) => {
    const next = value.objectives.includes(objective)
      ? value.objectives.filter((entry) => entry !== objective)
      : [...value.objectives, objective];
    update('objectives', next);
    // Keep the primary objective valid without making the user fix it manually.
    if (!next.includes(value.primaryObjective) && next[0]) {
      update('primaryObjective', next[0]);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <StepIntro
        title="Objectives"
        description="What this expansion is for. Objectives tilt the category weights in the scoring engine, then the weights are renormalised back to 100 points."
      />

      <Field
        label="Expansion objectives"
        error={errors.objectives}
        required
        hint="Select every objective that applies."
      >
        <CheckboxOptionGroup
          columns={2}
          values={value.objectives}
          onToggle={toggleObjective}
          options={(Object.keys(OBJECTIVE_LABELS) as Objective[]).map((key) => ({
            value: key,
            label: OBJECTIVE_LABELS[key],
            description: OBJECTIVE_DESCRIPTIONS[key],
          }))}
        />
      </Field>

      <Field
        label="Primary objective"
        error={errors.primaryObjective}
        required
        hint="Counts double when weighting the scoring categories."
      >
        <RadioOptionGroup
          name="primaryObjective"
          columns={2}
          value={value.primaryObjective}
          onValueChange={(next) => update('primaryObjective', next as Objective)}
          options={value.objectives.map((key) => ({
            value: key,
            label: OBJECTIVE_LABELS[key],
          }))}
        />
      </Field>

      <Field label="Primary users" required>
        <RadioOptionGroup
          name="primaryUsers"
          columns={3}
          value={value.primaryUsers}
          onValueChange={(next) => update('primaryUsers', next as UserProfileType)}
          options={(Object.keys(USER_PROFILE_LABELS) as UserProfileType[]).map((key) => ({
            value: key,
            label: USER_PROFILE_LABELS[key],
          }))}
        />
      </Field>

      <Field
        label="Target geographies"
        htmlFor="targetGeographies"
        hint="Leave empty if you have no regional preference — the geographic factor is then scored neutrally rather than penalised."
      >
        <TagInput
          id="targetGeographies"
          values={value.targetGeographies}
          onChange={(next) => update('targetGeographies', next)}
          suggestions={GEOGRAPHY_SUGGESTIONS}
          placeholder="Add a region and press Enter"
          max={10}
        />
      </Field>

      <Field
        label="Objective notes"
        htmlFor="objectiveNotes"
        hint="Anything specific about what you are trying to achieve."
      >
        <Textarea
          id="objectiveNotes"
          value={value.objectiveNotes}
          onChange={(event) => update('objectiveNotes', event.target.value)}
          rows={3}
          placeholder="e.g. counterparties increasingly hold treasury on other chains and will not bridge to subscribe"
        />
      </Field>
    </div>
  );
}

/* ── Step 4: constraints ────────────────────────────────────────────────── */

const SENSITIVITY_OPTIONS: Array<{ value: Sensitivity; label: string; description: string }> = [
  { value: 'low', label: 'Low', description: 'Limited value at risk' },
  { value: 'medium', label: 'Medium', description: 'Meaningful but bounded exposure' },
  { value: 'high', label: 'High', description: 'Significant user funds at risk' },
  { value: 'critical', label: 'Critical', description: 'A compromise is existential' },
];

export function StepConstraints({ value, update, errors }: StepProps) {
  const excludedOptions = CHAIN_OPTIONS.filter(
    (option) => !value.preferredEcosystems.includes(option.value),
  );
  const preferredOptions = CHAIN_OPTIONS.filter(
    (option) => !value.excludedEcosystems.includes(option.value),
  );

  return (
    <div className="flex flex-col gap-8">
      <StepIntro
        title="Constraints"
        description="What is actually possible for your team. Constraints apply hard blockers and penalties in the scoring engine and are never softened by the model."
      />

      <Field label="Time horizon" required>
        <RadioOptionGroup
          name="timeHorizon"
          columns={2}
          value={value.timeHorizon}
          onValueChange={(next) => update('timeHorizon', next as TimeHorizon)}
          options={(Object.keys(TIME_HORIZON_LABELS) as TimeHorizon[]).map((key) => ({
            value: key,
            label: TIME_HORIZON_LABELS[key],
          }))}
        />
      </Field>

      <Field label="Technical resources" required hint="Engineers who can work on this expansion.">
        <RadioOptionGroup
          name="teamCapacity"
          columns={2}
          value={value.teamCapacity}
          onValueChange={(next) => update('teamCapacity', next as TeamCapacity)}
          options={(Object.keys(TEAM_CAPACITY_LABELS) as TeamCapacity[]).map((key) => ({
            value: key,
            label: TEAM_CAPACITY_LABELS[key],
          }))}
        />
      </Field>

      <Field label="Budget sensitivity" required>
        <RadioOptionGroup
          name="budgetSensitivity"
          columns={2}
          value={value.budgetSensitivity}
          onValueChange={(next) => update('budgetSensitivity', next as BudgetSensitivity)}
          options={(Object.keys(BUDGET_LABELS) as BudgetSensitivity[]).map((key) => ({
            value: key,
            label: BUDGET_LABELS[key],
          }))}
        />
      </Field>

      <Field label="Security sensitivity" required>
        <RadioOptionGroup
          name="securitySensitivity"
          columns={2}
          value={value.securitySensitivity}
          onValueChange={(next) => update('securitySensitivity', next as Sensitivity)}
          options={SENSITIVITY_OPTIONS}
        />
      </Field>

      <Field
        label="Required virtual machine"
        hint="A hard requirement blocks every chain that cannot satisfy it. Leave as no requirement unless a rewrite is genuinely off the table."
      >
        <OptionGrid columns={3}>
          <button
            type="button"
            onClick={() => update('requiredVm', null)}
            className={cn(
              'rounded-[3px] border px-4 py-3 text-left text-[0.875rem] font-medium transition-colors backdrop-blur-md',
              value.requiredVm === null
                ? 'border-ember/70 bg-ember/[0.1] text-ink'
                : 'border-line-strong bg-ink/[0.02] text-ink-dim hover:border-ink-ghost hover:bg-ink/[0.055]',
            )}
          >
            No hard requirement
          </button>
          {VM_OPTIONS.filter((option) => option.value !== 'any').map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update('requiredVm', option.value)}
              className={cn(
                'rounded-[3px] border px-4 py-3 text-left text-[0.875rem] font-medium transition-colors backdrop-blur-md',
                value.requiredVm === option.value
                  ? 'border-ember/70 bg-ember/[0.1] text-ink'
                  : 'border-line-strong bg-ink/[0.02] text-ink-dim hover:border-ink-ghost hover:bg-ink/[0.055]',
              )}
            >
              {option.label} only
            </button>
          ))}
        </OptionGrid>
      </Field>

      <Field
        label="Excluded ecosystems"
        htmlFor="excludedEcosystems"
        error={errors.excludedEcosystems}
        hint="These are blocked outright and their score is forced to zero, with the reason recorded."
      >
        <TagInput
          id="excludedEcosystems"
          values={value.excludedEcosystems}
          onChange={(next) => update('excludedEcosystems', next)}
          suggestions={excludedOptions}
          placeholder="Add an ecosystem to exclude"
        />
      </Field>

      <Field
        label="Preferred ecosystems"
        htmlFor="preferredEcosystems"
        hint="Recorded in the Digital Twin as context. Preferences do not override the deterministic score."
      >
        <TagInput
          id="preferredEcosystems"
          values={value.preferredEcosystems}
          onChange={(next) => update('preferredEcosystems', next)}
          suggestions={preferredOptions}
          placeholder="Add a preferred ecosystem"
        />
      </Field>

      <Field
        label="Additional context"
        htmlFor="additionalContext"
        hint="Anything else that should shape the analysis: existing relationships, regulatory posture, integration commitments."
      >
        <Textarea
          id="additionalContext"
          value={value.additionalContext}
          onChange={(event) => update('additionalContext', event.target.value)}
          rows={4}
        />
      </Field>

      <Panel className="border-caution/30 bg-caution/[0.05]">
        <PanelBody className="flex gap-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" />
          <p className="text-[0.8125rem] leading-relaxed text-ink-dim">
            The next step retrieves your sources and builds a Digital Twin. You review and correct it
            before anything is scored. Your report quota is only consumed when a full report
            completes.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
