'use client';

import * as React from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import { Badge } from '@/components/ui/primitives';
import { getChain } from '@/lib/chains/knowledge-base';
import type { ReportChainScore } from '@/lib/report-model';
import type { ExpansionSequence } from '@/lib/schemas/report';
import { cn, formatScore } from '@/lib/utils';

/**
 * Expansion map.
 *
 * A graph of the decision: the product at the origin, current deployments, the
 * recommended route, secondary candidates, and everything ruled out — with the
 * reason attached rather than implied. Layout is deterministic (computed from
 * rank), so the same analysis always produces the same picture.
 */

type MapNodeKind = 'product' | 'current' | 'primary' | 'secondary' | 'monitor' | 'blocked';

type MapNodeData = {
  label: string;
  kind: MapNodeKind;
  score?: number;
  confidence?: number;
  detail?: string;
  environment?: string;
};

const KIND_STYLE: Record<MapNodeKind, { border: string; text: string; badge: string; label: string }> = {
  product: {
    border: 'border-ink',
    text: 'text-ink',
    badge: 'bg-ink text-shell',
    label: 'Product',
  },
  current: {
    border: 'border-positive/50',
    text: 'text-positive',
    badge: 'bg-positive/15 text-positive',
    label: 'Live',
  },
  primary: {
    border: 'border-ember',
    text: 'text-ember-bright',
    badge: 'bg-ember text-white',
    label: 'Recommended',
  },
  secondary: {
    border: 'border-marine/45',
    text: 'text-marine',
    badge: 'bg-marine/15 text-marine',
    label: 'Secondary',
  },
  monitor: {
    border: 'border-line-strong',
    text: 'text-ink-dim',
    badge: 'bg-sand text-ink-faint',
    label: 'Monitor',
  },
  blocked: {
    border: 'border-critical/35',
    text: 'text-ink-ghost',
    badge: 'bg-critical/10 text-critical',
    label: 'Not recommended',
  },
};

function MapNode({ data }: NodeProps<Node<MapNodeData>>) {
  const style = KIND_STYLE[data.kind];
  return (
    <div
      className={cn(
        'min-w-[11rem] max-w-[15rem] rounded-[2px] border bg-surface px-3 py-2.5',
        style.border,
        data.kind === 'blocked' && 'opacity-70',
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[0.8125rem] font-medium leading-tight', style.text)}>
          {data.label}
        </span>
        {data.score !== undefined ? (
          <span data-numeric className="shrink-0 text-xs text-ink-faint">
            {formatScore(data.score)}
          </span>
        ) : null}
      </div>

      <span
        className={cn(
          'mt-2 inline-block rounded-[2px] px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.08em]',
          style.badge,
        )}
      >
        {style.label}
      </span>

      {data.environment ? (
        <p className="mt-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.07em] text-ink-ghost">
          {data.environment}
        </p>
      ) : null}

      {data.detail ? (
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-ink-ghost">{data.detail}</p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { routefold: MapNode };

function buildGraph(
  productName: string,
  scores: ReportChainScore[],
  sequence: ExpansionSequence | null,
): { nodes: Node<MapNodeData>[]; edges: Edge[] } {
  const nodes: Node<MapNodeData>[] = [];
  const edges: Edge[] = [];

  const ORIGIN_X = 0;
  const COL_CURRENT = 300;
  const COL_TARGET = 640;
  const ROW = 108;

  nodes.push({
    id: 'product',
    type: 'routefold',
    position: { x: ORIGIN_X, y: 260 },
    data: { label: productName, kind: 'product', detail: 'Origin of the expansion' },
    draggable: true,
  });

  const current = scores.filter((score) => score.recommendation === 'current');
  current.forEach((score, index) => {
    const id = `current-${score.chainSlug}`;
    nodes.push({
      id,
      type: 'routefold',
      position: { x: COL_CURRENT, y: 260 + (index - (current.length - 1) / 2) * ROW },
      data: {
        label: score.chainName,
        kind: 'current',
        score: score.finalScore,
        environment: getChain(score.chainSlug)?.executionEnvironment,
        detail: 'Existing deployment',
      },
      draggable: true,
    });
    edges.push({
      id: `e-product-${id}`,
      source: 'product',
      target: id,
      style: { stroke: 'var(--color-positive)', strokeWidth: 1.2, opacity: 0.55 },
      animated: false,
    });
  });

  const sourceForTargets = current.length > 0 ? `current-${current[0]?.chainSlug}` : 'product';

  const candidates = scores.filter((score) => score.recommendation !== 'current').slice(0, 8);

  const primarySlug = sequence?.primary.chainSlug;
  const secondarySlugs = new Set(sequence?.secondary.map((entry) => entry.chainSlug) ?? []);
  const notRecommendedReason = new Map(
    (sequence?.notRecommended ?? []).map((entry) => [entry.chainSlug, entry.reason]),
  );

  candidates.forEach((score, index) => {
    const id = `chain-${score.chainSlug}`;
    const kind: MapNodeKind =
      score.chainSlug === primarySlug
        ? 'primary'
        : secondarySlugs.has(score.chainSlug)
          ? 'secondary'
          : score.recommendation === 'blocked' || score.recommendation === 'not_recommended'
            ? 'blocked'
            : 'monitor';

    const detail =
      score.blockers[0] ?? notRecommendedReason.get(score.chainSlug) ?? undefined;

    nodes.push({
      id,
      type: 'routefold',
      position: {
        x: COL_TARGET,
        y: 260 + (index - (candidates.length - 1) / 2) * ROW,
      },
      data: {
        label: score.chainName,
        kind,
        score: score.finalScore,
        confidence: score.confidence,
        environment: getChain(score.chainSlug)?.executionEnvironment,
        detail: detail ? (detail.length > 96 ? `${detail.slice(0, 93)}…` : detail) : undefined,
      },
      draggable: true,
    });

    const isRoute = kind === 'primary' || kind === 'secondary';
    edges.push({
      id: `e-${sourceForTargets}-${id}`,
      source: sourceForTargets,
      target: id,
      animated: kind === 'primary',
      label: kind === 'primary' ? 'recommended route' : undefined,
      labelStyle: {
        fill: 'var(--color-ember-bright)',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      },
      labelBgStyle: { fill: 'var(--color-paper)' },
      labelBgPadding: [6, 3],
      style: {
        stroke:
          kind === 'primary'
            ? 'var(--color-ember)'
            : kind === 'secondary'
              ? 'var(--color-marine)'
              : 'var(--color-line-strong)',
        strokeWidth: kind === 'primary' ? 1.8 : 1.1,
        opacity: isRoute ? 0.9 : 0.32,
        strokeDasharray: kind === 'blocked' ? '4 4' : undefined,
      },
    });
  });

  // Rollout dependency edges, drawn between target nodes.
  for (const step of sequence?.rolloutOrder ?? []) {
    for (const dependency of step.dependsOn) {
      const from = `chain-${dependency}`;
      const to = `chain-${step.chainSlug}`;
      if (from === to) continue;
      if (!nodes.some((node) => node.id === from) || !nodes.some((node) => node.id === to)) continue;
      const edgeId = `dep-${dependency}-${step.chainSlug}`;
      if (edges.some((edge) => edge.id === edgeId)) continue;
      edges.push({
        id: edgeId,
        source: from,
        target: to,
        style: {
          stroke: 'var(--color-ink-ghost)',
          strokeWidth: 1,
          strokeDasharray: '2 5',
          opacity: 0.5,
        },
        label: 'depends on',
        labelStyle: { fill: 'var(--color-ink-ghost)', fontSize: 9, fontFamily: 'var(--font-mono)' },
        labelBgStyle: { fill: 'var(--color-paper)' },
        labelBgPadding: [4, 2],
      });
    }
  }

  return { nodes, edges };
}

function MapInner({
  productName,
  scores,
  sequence,
}: {
  productName: string;
  scores: ReportChainScore[];
  sequence: ExpansionSequence | null;
}) {
  const { nodes, edges } = React.useMemo(
    () => buildGraph(productName, scores, sequence),
    [productName, scores, sequence],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
      minZoom={0.25}
      maxZoom={1.6}
      proOptions={{ hideAttribution: false }}
      nodesConnectable={false}
      edgesFocusable={false}
      className="bg-paper"
      aria-label="Expansion map"
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(28,24,21,0.14)" />
      <Controls
        showInteractive={false}
        className="!border !border-line !bg-surface"
        aria-label="Map controls"
      />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => {
          const kind = (node.data as MapNodeData).kind;
          if (kind === 'primary') return '#e2570b';
          if (kind === 'current') return '#17845b';
          if (kind === 'secondary') return '#2a4d73';
          if (kind === 'product') return '#1c1815';
          return '#c9bcae';
        }}
        maskColor="rgba(253,250,246,0.72)"
        className="!hidden md:!block"
      />
    </ReactFlow>
  );
}

export function ExpansionMap({
  productName,
  scores,
  sequence,
  height = 560,
}: {
  productName: string;
  scores: ReportChainScore[];
  sequence: ExpansionSequence | null;
  height?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full overflow-hidden rounded-[2px] border border-line bg-paper"
        style={{ height }}
      >
        <ReactFlowProvider>
          <MapInner productName={productName} scores={scores} sequence={sequence} />
        </ReactFlowProvider>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendItem colour="bg-ink" label="Product" />
        <LegendItem colour="bg-positive" label="Current deployment" />
        <LegendItem colour="bg-ember" label="Recommended route" />
        <LegendItem colour="bg-marine" label="Secondary candidate" />
        <LegendItem colour="bg-stone" label="Monitor" />
        <LegendItem colour="bg-critical/60" label="Not recommended / blocked" />
      </div>

      <p className="text-xs text-ink-ghost">
        Drag nodes to rearrange. Scroll to zoom, drag the canvas to pan. Layout is derived from the
        ranking, so the same analysis always produces the same map.
      </p>
    </div>
  );
}

function LegendItem({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('size-2 shrink-0', colour)} aria-hidden="true" />
      <span className="font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-faint">
        {label}
      </span>
    </span>
  );
}

/** Compact static preview used on the landing page. */
export function ExpansionMapPreview({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Badge tone="accent" className="absolute right-3 top-3 z-10">
        Interactive in report
      </Badge>
    </div>
  );
}
