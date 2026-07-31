'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Badge, Checkbox, RadioGroup, RadioGroupItem } from '@/components/ui/primitives';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/* ── Step indicator ─────────────────────────────────────────────────────── */

export function StepRail({
  steps,
  current,
  furthest,
  onSelect,
}: {
  steps: Array<{ id: string; label: string }>;
  current: number;
  furthest: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Analysis steps">
      <ol className="flex flex-col gap-0.5">
        {steps.map((step, index) => {
          const isCurrent = index === current;
          const isComplete = index < furthest;
          const isReachable = index <= furthest;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => isReachable && onSelect(index)}
                disabled={!isReachable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 border-l px-3 py-2.5 text-left transition-colors',
                  isCurrent
                    ? 'border-ember bg-ink/[0.05] text-ink backdrop-blur-md'
                    : isReachable
                      ? 'border-line text-ink-faint hover:border-ink-ghost hover:text-ink-dim'
                      : 'border-line text-ink-ghost',
                  !isReachable && 'cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center border text-[0.625rem]',
                    isComplete
                      ? 'border-positive bg-positive/15 text-positive'
                      : isCurrent
                        ? 'border-ember text-ember-bright'
                        : 'border-line-strong text-ink-ghost',
                  )}
                  data-numeric
                >
                  {isComplete ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="text-[0.8125rem]">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Option grids ───────────────────────────────────────────────────────── */

export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  disabled,
  as = 'button',
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  disabled?: boolean;
  as?: 'button' | 'label';
}) {
  const className = cn(
    'flex w-full flex-col gap-1.5 rounded-[3px] border px-4 py-3 text-left transition-colors backdrop-blur-md',
    selected
      ? 'border-ember/70 bg-ember/[0.1] shadow-[inset_0_1px_0_0_rgba(151,125,255,0.2)]'
      : 'border-line-strong bg-ink/[0.02] hover:border-ink-ghost hover:bg-ink/[0.055]',
    disabled && 'cursor-not-allowed opacity-45',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-bright',
  );

  const content = (
    <>
      <span className={cn('text-[0.875rem] font-medium', selected ? 'text-ink' : 'text-ink-dim')}>
        {title}
      </span>
      {description ? (
        <span className="text-xs leading-relaxed text-ink-faint">{description}</span>
      ) : null}
    </>
  );

  if (as === 'label') {
    return (
      <label className={cn(className, 'cursor-pointer')}>
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
        />
        {content}
      </label>
    );
  }

  return (
    <button type="button" onClick={onSelect} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

export function OptionGrid({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid gap-2.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {children}
    </div>
  );
}

export function RadioOptionGroup<T extends string>({
  value,
  onValueChange,
  options,
  name,
  columns = 2,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
  name: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      name={name}
      className={cn(
        'grid gap-2.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-[3px] border px-4 py-3 transition-colors backdrop-blur-md',
              selected
                ? 'border-ember/70 bg-ember/[0.1] shadow-[inset_0_1px_0_0_rgba(151,125,255,0.2)]'
                : 'border-line-strong bg-ink/[0.02] hover:border-ink-ghost hover:bg-ink/[0.055]',
            )}
          >
            <RadioGroupItem value={option.value} id={id} className="mt-0.5" />
            <span className="flex flex-col gap-1">
              <span
                className={cn('text-[0.875rem] font-medium', selected ? 'text-ink' : 'text-ink-dim')}
              >
                {option.label}
              </span>
              {option.description ? (
                <span className="text-xs leading-relaxed text-ink-faint">{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

export function CheckboxOptionGroup<T extends string>({
  values,
  onToggle,
  options,
  columns = 2,
  max,
}: {
  values: T[];
  onToggle: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
  columns?: 1 | 2 | 3;
  max?: number;
}) {
  return (
    <div
      className={cn(
        'grid gap-2.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {options.map((option) => {
        const selected = values.includes(option.value);
        const atLimit = !selected && max !== undefined && values.length >= max;
        return (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 rounded-[3px] border px-4 py-3 transition-colors backdrop-blur-md',
              selected
                ? 'border-ember/70 bg-ember/[0.1] shadow-[inset_0_1px_0_0_rgba(151,125,255,0.2)]'
                : 'border-line-strong bg-ink/[0.02] hover:border-ink-ghost hover:bg-ink/[0.055]',
              atLimit ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
            )}
          >
            <Checkbox
              checked={selected}
              disabled={atLimit}
              onCheckedChange={() => onToggle(option.value)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-1">
              <span
                className={cn('text-[0.875rem] font-medium', selected ? 'text-ink' : 'text-ink-dim')}
              >
                {option.label}
              </span>
              {option.description ? (
                <span className="text-xs leading-relaxed text-ink-faint">{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ── Tag input ──────────────────────────────────────────────────────────── */

export function TagInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  id,
  max = 20,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: Array<{ value: string; label: string }>;
  id?: string;
  max?: number;
}) {
  const [draft, setDraft] = React.useState('');

  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    if (values.includes(trimmed)) return;
    if (values.length >= max) return;
    onChange([...values, trimmed]);
    setDraft('');
  };

  const remove = (value: string) => onChange(values.filter((entry) => entry !== value));

  const unusedSuggestions = suggestions.filter((entry) => !values.includes(entry.value));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(draft);
            }
            if (event.key === 'Backspace' && draft.length === 0 && values.length > 0) {
              remove(values[values.length - 1] as string);
            }
          }}
          placeholder={placeholder}
          disabled={values.length >= max}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={draft.trim().length === 0 || values.length >= max}
          className="shrink-0 rounded-[2px] border border-line-strong px-3 text-[0.8125rem] text-ink-dim transition-colors hover:border-ink-ghost hover:text-ink disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((value) => {
            const label = suggestions.find((entry) => entry.value === value)?.label ?? value;
            return (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => remove(value)}
                  className="group flex items-center gap-1.5 rounded-[2px] border border-ember/40 bg-ember/10 px-2 py-1 text-xs text-ember-bright transition-colors hover:border-critical/50 hover:bg-critical/10 hover:text-critical"
                  aria-label={`Remove ${label}`}
                >
                  {label}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {unusedSuggestions.length > 0 && values.length < max ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-ghost">
            Suggested
          </span>
          {unusedSuggestions.slice(0, 10).map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => add(entry.value)}
              className="rounded-[2px] border border-line px-2 py-1 text-xs text-ink-faint transition-colors hover:border-line-strong hover:text-ink-dim"
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Misc ───────────────────────────────────────────────────────────────── */

export function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-[1.25rem] font-medium tracking-[-0.022em] text-ink">{title}</h2>
      <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-faint">{description}</p>
    </div>
  );
}

export function AutosaveIndicator({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return null;
  // Keyed on the save timestamp so each save remounts the badge. That makes
  // `settled` start false naturally instead of being reset from an effect.
  return <AutosaveBadge key={savedAt} />;
}

function AutosaveBadge() {
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  return <Badge tone="ghost">{settled ? 'Draft saved locally' : 'Draft saved'}</Badge>;
}
