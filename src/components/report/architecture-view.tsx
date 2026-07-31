'use client';

import * as React from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Badge } from '@/components/ui/primitives';
import { CopyButton } from '@/components/report/copy-button';
import type { ArchitectureBrief } from '@/lib/schemas/report';
import { cn } from '@/lib/utils';

/**
 * Architecture view.
 *
 * The diagram is laid out by layer (client → onchain → external → data →
 * offchain) rather than by an automatic force algorithm, because an
 * architecture diagram whose position carries no meaning is decoration.
 */

const LAYER_ORDER = ['client', 'onchain', 'external', 'data', 'offchain'] as const;
type Layer = (typeof LAYER_ORDER)[number];

const LAYER_LABEL: Record<Layer, string> = {
  client: 'Client',
  onchain: 'Onchain',
  external: 'External',
  data: 'Data',
  offchain: 'Offchain',
};

const LAYER_ACCENT: Record<Layer, string> = {
  client: 'border-ink-ghost',
  onchain: 'border-ember/55',
  external: 'border-caution/45',
  data: 'border-marine/40',
  offchain: 'border-line-strong',
};

const CONNECTION_COLOUR: Record<string, string> = {
  message: 'var(--color-ember)',
  state: 'var(--color-marine)',
  liquidity: 'var(--color-positive)',
  data: 'var(--color-ink-ghost)',
  user: 'var(--color-ink-faint)',
};

type ArchNodeData = {
  name: string;
  layer: Layer;
  description: string;
  chainSlug: string | null;
};

function ArchNode({ data }: NodeProps<Node<ArchNodeData>>) {
  return (
    <div
      className={cn(
        'w-[13rem] rounded-[2px] border bg-surface px-3 py-2.5',
        LAYER_ACCENT[data.layer],
      )}
    >
      <Handle type="target" position={Position.Top} />
      <p className="font-mono text-[0.5625rem] uppercase tracking-[0.09em] text-ink-ghost">
        {LAYER_LABEL[data.layer]}
        {data.chainSlug ? ` · ${data.chainSlug}` : ''}
      </p>
      <p className="mt-1 text-[0.8125rem] font-medium leading-tight text-ink">{data.name}</p>
      <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-ghost">
        {data.description.length > 118 ? `${data.description.slice(0, 115)}…` : data.description}
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { arch: ArchNode };

function buildArchitectureGraph(brief: ArchitectureBrief): { nodes: Node<ArchNodeData>[]; edges: Edge[] } {
  const byLayer = new Map<Layer, typeof brief.components>();
  for (const component of brief.components) {
    const layer = (LAYER_ORDER as readonly string[]).includes(component.layer)
      ? (component.layer as Layer)
      : 'offchain';
    const bucket = byLayer.get(layer) ?? [];
    bucket.push(component);
    byLayer.set(layer, bucket);
  }

  const nodes: Node<ArchNodeData>[] = [];
  const COLUMN_WIDTH = 250;
  const ROW_HEIGHT = 175;

  LAYER_ORDER.forEach((layer, rowIndex) => {
    const components = byLayer.get(layer) ?? [];
    components.forEach((component, columnIndex) => {
      nodes.push({
        id: component.id,
        type: 'arch',
        position: {
          x: (columnIndex - (components.length - 1) / 2) * COLUMN_WIDTH,
          y: rowIndex * ROW_HEIGHT,
        },
        data: {
          name: component.name,
          layer,
          description: component.description,
          chainSlug: component.chainSlug,
        },
        draggable: true,
      });
    });
  });

  const known = new Set(nodes.map((node) => node.id));
  const edges: Edge[] = brief.connections
    .filter((connection) => known.has(connection.from) && known.has(connection.to))
    .map((connection, index) => ({
      id: `arch-${index}-${connection.from}-${connection.to}`,
      source: connection.from,
      target: connection.to,
      label: connection.label,
      labelStyle: {
        fill: 'var(--color-ink-faint)',
        fontSize: 9.5,
        fontFamily: 'var(--font-mono)',
      },
      labelBgStyle: { fill: 'var(--color-paper)' },
      labelBgPadding: [5, 2] as [number, number],
      style: {
        stroke: CONNECTION_COLOUR[connection.kind] ?? 'var(--color-line-strong)',
        strokeWidth: 1.2,
        opacity: 0.75,
      },
    }));

  return { nodes, edges };
}

export function ArchitectureDiagram({ brief, height = 620 }: { brief: ArchitectureBrief; height?: number }) {
  const { nodes, edges } = React.useMemo(() => buildArchitectureGraph(brief), [brief]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full overflow-hidden rounded-[2px] border border-line bg-paper"
        style={{ height }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesConnectable={false}
            edgesFocusable={false}
            className="bg-paper"
            aria-label="Architecture diagram"
          >
            <Background variant={BackgroundVariant.Lines} gap={52} color="rgba(28,24,21,0.07)" />
            <Controls showInteractive={false} className="!border !border-line !bg-surface" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {Object.entries(CONNECTION_COLOUR).map(([kind, colour]) => (
          <span key={kind} className="flex items-center gap-2">
            <span className="h-px w-5" style={{ backgroundColor: colour }} aria-hidden="true" />
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-faint">
              {kind}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

const NARRATIVE_FIELDS: Array<{ key: keyof ArchitectureBrief; label: string }> = [
  { key: 'tokenModel', label: 'Token model' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'stateSynchronisation', label: 'State synchronisation' },
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'frontendAndWallets', label: 'Frontend & wallets' },
  { key: 'indexing', label: 'Indexing' },
];

export function ArchitectureView({ brief }: { brief: ArchitectureBrief }) {
  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>Deployment model — {brief.deploymentModel.approach}</PanelTitle>
          </div>
          <CopyButton
            value={brief.summary}
            label="Copy summary"
            successLabel="Summary copied"
          />
        </PanelHeader>
        <PanelBody className="flex flex-col gap-4">
          <p className="max-w-3xl text-[0.9375rem] leading-relaxed text-ink-dim">{brief.summary}</p>
          <div className="border-l-2 border-ember/40 pl-4">
            <p className="eyebrow">Why this model</p>
            <p className="mt-2 max-w-3xl text-[0.875rem] leading-relaxed text-ink-dim">
              {brief.deploymentModel.reasoning}
            </p>
          </div>
        </PanelBody>
      </Panel>

      <ArchitectureDiagram brief={brief} />

      <div className="grid gap-5 lg:grid-cols-2">
        {NARRATIVE_FIELDS.map((field) => (
          <Panel key={field.key} data-print="block">
            <PanelHeader>
              <PanelTitle>{field.label}</PanelTitle>
            </PanelHeader>
            <PanelBody>
              <p className="text-[0.875rem] leading-relaxed text-ink-dim">
                {String(brief[field.key])}
              </p>
            </PanelBody>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel data-print="block">
          <PanelHeader>
            <PanelTitle>Monitoring requirements</PanelTitle>
          </PanelHeader>
          <PanelBody>
            <ol className="flex flex-col gap-3">
              {brief.monitoring.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span
                    data-numeric
                    className="shrink-0 text-[0.6875rem] text-ink-ghost"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{item}</span>
                </li>
              ))}
            </ol>
          </PanelBody>
        </Panel>

        <Panel data-print="block">
          <PanelHeader>
            <div>
              <PanelTitle>Assumptions</PanelTitle>
            </div>
            <Badge tone="caution">Verify before building</Badge>
          </PanelHeader>
          <PanelBody>
            <ul className="flex flex-col gap-3">
              {brief.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-3">
                  <span
                    className="mt-[0.45rem] size-1 shrink-0 bg-caution"
                    aria-hidden="true"
                  />
                  <span className="text-[0.8125rem] leading-relaxed text-ink-dim">{assumption}</span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
