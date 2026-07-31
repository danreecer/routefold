'use client';

import * as React from 'react';
import { CircleCheck, Loader2, RotateCcw } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/primitives';
import { Field, Input, Textarea } from '@/components/ui/field';
import { TagInput } from './wizard-primitives';
import { ConfidenceMeter } from '@/components/report/score-primitives';
import { CHAIN_KNOWLEDGE_BASE } from '@/lib/chains/knowledge-base';
import {
  PRODUCT_CATEGORY_LABELS,
  TRANSACTION_PROFILE_LABELS,
  USER_PROFILE_LABELS,
  type DigitalTwin,
  type ProductCategory,
  type Sensitivity,
  type TransactionProfile,
  type UserProfileType,
} from '@/lib/schemas/twin';
import { humanizeEnum } from '@/lib/utils';

/**
 * Step 5 — Digital Twin review.
 *
 * Every field the scoring engine reads is editable here, because the twin is
 * the contract between the user and the engine. Fields are labelled with their
 * provenance so a user can see what was found in their sources, what they typed,
 * and what the model inferred — and correct the inferences, which is where the
 * errors live.
 */

const CHAIN_OPTIONS = CHAIN_KNOWLEDGE_BASE.map((chain) => ({
  value: chain.slug,
  label: chain.shortName,
}));

const SENSITIVITIES: Sensitivity[] = ['low', 'medium', 'high', 'critical'];

export function TwinReview({
  twin,
  fieldSources,
  onChange,
  onSave,
  onRebuild,
  saving,
  rebuilding,
  savedAt,
}: {
  twin: DigitalTwin;
  fieldSources: Record<string, string> | null;
  onChange: (next: DigitalTwin) => void;
  onSave: (confirm: boolean) => void;
  onRebuild: () => void;
  saving: boolean;
  rebuilding: boolean;
  savedAt: number | null;
}) {
  const provenance = (key: string) =>
    (fieldSources?.[key] as 'source' | 'user' | 'inferred' | 'default' | undefined) ?? undefined;

  const set = <K extends keyof DigitalTwin>(key: K, value: DigitalTwin[K]) =>
    onChange({ ...twin, [key]: value });

  const setNested = <S extends keyof DigitalTwin>(
    section: S,
    patch: Partial<DigitalTwin[S]>,
  ) => onChange({ ...twin, [section]: { ...(twin[section] as object), ...patch } as DigitalTwin[S] });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-[1.25rem] font-medium tracking-[-0.022em] text-ink">
          Review the Digital Twin
        </h2>
        <p className="max-w-2xl text-[0.875rem] leading-relaxed text-ink-faint">
          This is the model Routefold built of your product. Every chain score is derived from it, so
          correcting it here is the highest-leverage thing you can do. Inferred fields are the ones
          most worth checking.
        </p>
      </div>

      <Panel className="border-ember/30 bg-ember/[0.05]">
        <PanelBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <ConfidenceMeter value={twin.confidence} label="Extraction confidence" />
            {savedAt ? (
              <Badge tone="positive">
                <CircleCheck className="size-2.5" />
                Saved
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRebuild}
            disabled={rebuilding || saving}
          >
            {rebuilding ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            Rebuild from sources
          </Button>
        </PanelBody>
      </Panel>

      {/* Identity */}
      <TwinGroup title="Identity">
        <Field label="Product name" htmlFor="twin-name" provenance={provenance('productName')}>
          <Input
            id="twin-name"
            value={twin.productName}
            onChange={(event) => set('productName', event.target.value)}
          />
        </Field>

        <Field label="Category" provenance={provenance('productCategory')}>
          <Select
            value={twin.productCategory}
            onValueChange={(value) => set('productCategory', value as ProductCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {PRODUCT_CATEGORY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="One-line description"
          htmlFor="twin-desc"
          provenance={provenance('oneLineDescription')}
          className="md:col-span-2"
        >
          <Input
            id="twin-desc"
            value={twin.oneLineDescription}
            onChange={(event) => set('oneLineDescription', event.target.value)}
          />
        </Field>
      </TwinGroup>

      {/* Architecture */}
      <TwinGroup title="Architecture">
        <Field
          label="Architecture summary"
          htmlFor="twin-arch"
          provenance={provenance('architecture.summary')}
          className="md:col-span-2"
        >
          <Textarea
            id="twin-arch"
            rows={4}
            value={twin.architecture.summary}
            onChange={(event) => setNested('architecture', { summary: event.target.value })}
          />
        </Field>

        <Field
          label="Contract complexity"
          provenance={provenance('architecture.contractComplexity')}
        >
          <SensitivitySelect
            value={twin.architecture.contractComplexity}
            onChange={(value) => setNested('architecture', { contractComplexity: value })}
          />
        </Field>

        <Field label="Upgradeability" provenance={provenance('architecture.upgradeability')}>
          <Select
            value={twin.architecture.upgradeability}
            onValueChange={(value) =>
              setNested('architecture', {
                upgradeability: value as DigitalTwin['architecture']['upgradeability'],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immutable">Immutable</SelectItem>
              <SelectItem value="proxy-upgradeable">Proxy-upgradeable</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="External dependencies"
          provenance={provenance('architecture.externalDependencies')}
          className="md:col-span-2"
        >
          <TagInput
            values={twin.architecture.externalDependencies}
            onChange={(next) => setNested('architecture', { externalDependencies: next })}
            placeholder="e.g. price oracle"
          />
        </Field>
      </TwinGroup>

      {/* Execution */}
      <TwinGroup title="Execution environment">
        <Field label="Current chains" provenance={provenance('currentChains')}>
          <TagInput
            values={twin.currentChains}
            onChange={(next) => set('currentChains', next)}
            suggestions={CHAIN_OPTIONS}
            placeholder="Add a chain"
          />
        </Field>

        <Field label="Contract languages" provenance={provenance('contractLanguages')}>
          <TagInput
            values={twin.contractLanguages}
            onChange={(next) => set('contractLanguages', next)}
            placeholder="e.g. Solidity"
            max={10}
          />
        </Field>

        <Field
          label="Virtual machine requirement"
          provenance={provenance('vmRequirement')}
          hint="Set in the constraints step. Change it there if it is wrong."
        >
          <Input value={twin.vmRequirement} readOnly className="opacity-70" />
        </Field>

        <Field label="VM rationale" provenance={provenance('vmRequirement')}>
          <Input
            value={twin.vmRequirementReason}
            onChange={(event) => set('vmRequirementReason', event.target.value)}
          />
        </Field>
      </TwinGroup>

      {/* Users */}
      <TwinGroup title="Users">
        <Field label="Primary user profile" provenance={provenance('users.primaryProfile')}>
          <Select
            value={twin.users.primaryProfile}
            onValueChange={(value) => setNested('users', { primaryProfile: value as UserProfileType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(USER_PROFILE_LABELS) as UserProfileType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {USER_PROFILE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Orientation" provenance={provenance('orientation')}>
          <Select
            value={twin.orientation}
            onValueChange={(value) => set('orientation', value as DigitalTwin['orientation'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consumer">Consumer</SelectItem>
              <SelectItem value="institutional">Institutional</SelectItem>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Estimated sophistication"
          provenance={provenance('users.estimatedSophistication')}
        >
          <SensitivitySelect
            value={twin.users.estimatedSophistication}
            onChange={(value) => setNested('users', { estimatedSophistication: value })}
          />
        </Field>

        <Field label="Target geographies" provenance={provenance('targetGeographies')}>
          <TagInput
            values={twin.targetGeographies}
            onChange={(next) => set('targetGeographies', next)}
            placeholder="Add a region"
            max={12}
          />
        </Field>
      </TwinGroup>

      {/* Liquidity */}
      <TwinGroup title="Liquidity">
        <Field
          label="Requires deep liquidity"
          provenance={provenance('liquidity.requiresDeepLiquidity')}
          hint="True when the core product loop consumes on-chain liquidity — swaps, lending, liquidations."
        >
          <div className="flex h-10 items-center gap-3">
            <Switch
              checked={twin.liquidity.requiresDeepLiquidity}
              onCheckedChange={(checked) =>
                setNested('liquidity', { requiresDeepLiquidity: checked })
              }
            />
            <span className="text-[0.8125rem] text-ink-dim">
              {twin.liquidity.requiresDeepLiquidity ? 'Yes' : 'No'}
            </span>
          </div>
        </Field>

        <Field
          label="Stablecoin dependency"
          provenance={provenance('liquidity.stablecoinDependency')}
        >
          <SensitivitySelect
            value={twin.liquidity.stablecoinDependency}
            onChange={(value) => setNested('liquidity', { stablecoinDependency: value })}
          />
        </Field>

        <Field label="Required assets" className="md:col-span-2">
          <TagInput
            values={twin.liquidity.requiredAssets}
            onChange={(next) => setNested('liquidity', { requiredAssets: next })}
            placeholder="e.g. USDC"
          />
        </Field>
      </TwinGroup>

      {/* Transactions */}
      <TwinGroup title="Transactions">
        <Field label="Transaction profile" provenance={provenance('transactions.profile')}>
          <Select
            value={twin.transactions.profile}
            onValueChange={(value) =>
              setNested('transactions', { profile: value as TransactionProfile })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TRANSACTION_PROFILE_LABELS) as TransactionProfile[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {TRANSACTION_PROFILE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Finality requirement"
          provenance={provenance('transactions.finalityRequirement')}
        >
          <Select
            value={twin.transactions.finalityRequirement}
            onValueChange={(value) =>
              setNested('transactions', {
                finalityRequirement: value as DigitalTwin['transactions']['finalityRequirement'],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sub-second">Sub-second</SelectItem>
              <SelectItem value="seconds">Seconds</SelectItem>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Latency sensitivity"
          provenance={provenance('transactions.latencySensitivity')}
        >
          <SensitivitySelect
            value={twin.transactions.latencySensitivity}
            onChange={(value) => setNested('transactions', { latencySensitivity: value })}
          />
        </Field>

        <Field label="Cost sensitivity" provenance={provenance('transactions.costSensitivity')}>
          <SensitivitySelect
            value={twin.transactions.costSensitivity}
            onChange={(value) => setNested('transactions', { costSensitivity: value })}
          />
        </Field>
      </TwinGroup>

      {/* Security */}
      <TwinGroup title="Security">
        <Field label="Security sensitivity" provenance={provenance('security.sensitivity')}>
          <SensitivitySelect
            value={twin.security.sensitivity}
            onChange={(value) => setNested('security', { sensitivity: value })}
          />
        </Field>

        <Field label="Value at risk" provenance={provenance('security.valueAtRisk')}>
          <Select
            value={twin.security.valueAtRisk}
            onValueChange={(value) =>
              setNested('security', { valueAtRisk: value as DigitalTwin['security']['valueAtRisk'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['low', 'moderate', 'high', 'very-high', 'unknown'].map((key) => (
                <SelectItem key={key} value={key}>
                  {humanizeEnum(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Audit status" provenance={provenance('security.auditStatus')}>
          <Select
            value={twin.security.auditStatus}
            onValueChange={(value) =>
              setNested('security', { auditStatus: value as DigitalTwin['security']['auditStatus'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['none', 'planned', 'in-progress', 'completed', 'unknown'].map((key) => (
                <SelectItem key={key} value={key}>
                  {humanizeEnum(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </TwinGroup>

      {/* Assumptions */}
      <TwinGroup title="Assumptions and gaps">
        <Field
          label="Assumptions"
          className="md:col-span-2"
          hint="Inferences a reader could reasonably disagree with. Remove any that are wrong."
        >
          <TagInput
            values={twin.assumptions}
            onChange={(next) => set('assumptions', next)}
            placeholder="Add an assumption"
            max={24}
          />
        </Field>

        <Field
          label="Missing data"
          className="md:col-span-2"
          hint="Recorded in the report and reflected in every confidence value."
        >
          <TagInput
            values={twin.missingData}
            onChange={(next) => set('missingData', next)}
            placeholder="Add a known gap"
            max={24}
          />
        </Field>
      </TwinGroup>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button type="button" variant="outline" onClick={() => onSave(false)} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save without generating
        </Button>
        <p className="text-xs text-ink-ghost">
          Saving does not consume a report generation. Only a completed report does.
        </p>
      </div>
    </div>
  );
}

function TwinGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
      </PanelHeader>
      <PanelBody className="grid gap-6 md:grid-cols-2">{children}</PanelBody>
    </Panel>
  );
}

function SensitivitySelect({
  value,
  onChange,
}: {
  value: Sensitivity;
  onChange: (value: Sensitivity) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Sensitivity)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SENSITIVITIES.map((key) => (
          <SelectItem key={key} value={key}>
            {humanizeEnum(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
