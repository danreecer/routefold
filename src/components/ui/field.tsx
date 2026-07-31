'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export function Label({
  className,
  required,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {props.children}
      {required ? (
        <span className="text-ember-bright" aria-hidden="true">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-[12px] border border-line-strong bg-white/80 px-3.5 text-sm text-ink backdrop-blur-sm',
        'placeholder:text-ink-ghost',
        'transition-colors duration-150',
        'hover:border-ink-ghost/60',
        'focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-critical aria-[invalid=true]:ring-critical',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-[12px] border border-line-strong bg-white/80 px-3.5 py-3 text-sm leading-relaxed text-ink backdrop-blur-sm',
        'placeholder:text-ink-ghost',
        'transition-colors duration-150 resize-y min-h-24',
        'hover:border-ink-ghost/60',
        'focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/25',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-critical',
        className,
      )}
      {...props}
    />
  );
}

/** Label + control + help/error, wired for accessibility. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
  provenance,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  provenance?: 'source' | 'user' | 'inferred' | 'default';
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
        {provenance ? <ProvenanceTag provenance={provenance} /> : null}
      </div>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs leading-relaxed text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const PROVENANCE_META = {
  source: { label: 'From source', className: 'text-marine border-marine/30 bg-marine/8' },
  user: { label: 'You entered', className: 'text-ink-dim border-line-strong bg-sand' },
  inferred: { label: 'Inferred', className: 'text-ember-deep border-ember/35 bg-ember-wash' },
  default: { label: 'Default', className: 'text-ink-ghost border-line bg-transparent' },
} as const;

export function ProvenanceTag({
  provenance,
}: {
  provenance: 'source' | 'user' | 'inferred' | 'default';
}) {
  const meta = PROVENANCE_META[provenance];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5',
        'font-mono text-[0.625rem] uppercase tracking-[0.08em]',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
