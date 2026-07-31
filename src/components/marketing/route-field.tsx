'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The hero visualisation: a folded route field.
 *
 * A product node on the left, candidate ecosystem nodes placed at different
 * depths on the right, and hairline routes between them. One route resolves —
 * it traces, brightens to violet, and carries a travelling marker — which is the
 * product's premise rendered literally: many possible routes, one modelled
 * recommendation.
 *
 * Constraints held deliberately: no particles, no glow, no orb, no video-game
 * motion. Depth is communicated by scale, opacity and parallax factor only.
 *
 * The whole thing is one inline SVG (no images, no canvas, no WebGL) and it
 * degrades to a static composition under `prefers-reduced-motion`.
 */

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  /** 0 = far, 1 = near. Drives scale, opacity and parallax response. */
  depth: number;
};

const PRODUCT: Node = { id: 'product', label: 'Your product', x: 148, y: 250, depth: 1 };

const CANDIDATES: Node[] = [
  { id: 'c1', label: 'Candidate', x: 610, y: 96, depth: 0.34 },
  { id: 'c2', label: 'Candidate', x: 692, y: 186, depth: 0.62 },
  { id: 'c3', label: 'Recommended', x: 738, y: 286, depth: 1 },
  { id: 'c4', label: 'Candidate', x: 652, y: 378, depth: 0.5 },
  { id: 'c5', label: 'Candidate', x: 566, y: 448, depth: 0.24 },
];

const RECOMMENDED_ID = 'c3';

/** Routes fold: they travel out, break at a vertex, then run to the target. */
function foldedPath(from: Node, to: Node): string {
  const vertexX = from.x + (to.x - from.x) * 0.42;
  const vertexY = from.y + (to.y - from.y) * 0.16;
  return `M ${from.x} ${from.y} L ${vertexX} ${vertexY} L ${to.x} ${to.y}`;
}

export function RouteField({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 });
  const [reduced, setReduced] = React.useState(true);

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  React.useEffect(() => {
    if (reduced) return;
    const element = containerRef.current;
    if (!element) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        // −1 … 1 relative to the centre of the field.
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        setPointer({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      setPointer({ x: 0, y: 0 });
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  /** Nearer elements move more — the parallax cue that creates depth. */
  const shift = (depth: number, amount = 16) => ({
    transform: `translate(${pointer.x * amount * depth}px, ${pointer.y * amount * 0.55 * depth}px)`,
    transition: reduced ? 'none' : 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
  });

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full select-none', className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 860 540"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          {/* The resolved route's gradient: neutral at origin, violet at target. */}
          <radialGradient id="rf-node-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-ember)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="rf-route-active" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-ember)" stopOpacity="0.25" />
            <stop offset="55%" stopColor="var(--color-ember)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-ember-bright)" stopOpacity="1" />
          </linearGradient>

          <radialGradient id="rf-vignette" cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>

          <mask id="rf-field-mask">
            <rect width="860" height="540" fill="url(#rf-vignette)" />
          </mask>
        </defs>

        {/* ── Far plane: coordinate grid ────────────────────────────────── */}
        <g mask="url(#rf-field-mask)" style={shift(0.18, 22)}>
          <g stroke="rgba(176,63,0,0.09)" strokeWidth="1">
            {Array.from({ length: 11 }, (_, index) => (
              <line key={`h${index}`} x1="0" y1={index * 54} x2="860" y2={index * 54} />
            ))}
            {Array.from({ length: 17 }, (_, index) => (
              <line key={`v${index}`} x1={index * 54} y1="0" x2={index * 54} y2="540" />
            ))}
          </g>
        </g>

        {/* ── Mid plane: the folded wireframe surface ───────────────────── */}
        <g mask="url(#rf-field-mask)" style={shift(0.42, 20)}>
          <g stroke="rgba(176,63,0,0.2)" strokeWidth="1.1" fill="none">
            <path d="M 96 300 L 344 176 L 640 232 L 452 392 Z" opacity="0.55" />
            <path d="M 344 176 L 452 392" opacity="0.3" />
            <path d="M 96 300 L 640 232" opacity="0.22" />
            <path d="M 452 392 L 800 300 L 640 232" opacity="0.35" />
            <path d="M 344 176 L 428 66 L 700 118 L 640 232" opacity="0.28" />
          </g>
        </g>

        {/* ── Inactive routes ──────────────────────────────────────────── */}
        <g style={shift(0.7, 14)}>
          {CANDIDATES.filter((node) => node.id !== RECOMMENDED_ID).map((node) => (
            <path
              key={node.id}
              d={foldedPath(PRODUCT, node)}
              fill="none"
              stroke="rgba(28,24,21,0.28)"
              strokeWidth="1.25"
              opacity={0.4 + node.depth * 0.5}
            />
          ))}
        </g>

        {/* ── Resolved route ───────────────────────────────────────────── */}
        <g style={shift(1, 12)}>
          <path
            d={foldedPath(PRODUCT, CANDIDATES[2] as Node)}
            fill="none"
            stroke="url(#rf-route-active)"
            strokeWidth="2.25"
            strokeLinecap="square"
            style={
              reduced
                ? undefined
                : {
                    strokeDasharray: 1000,
                    strokeDashoffset: 1000,
                    animation: 'rf-trace 2.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards',
                  }
            }
          />
          {!reduced ? (
            <circle r="3.4" fill="var(--color-ember)">
              <animateMotion
                dur="4.2s"
                begin="1.6s"
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="spline"
                keySplines="0.4 0 0.2 1"
                path={foldedPath(PRODUCT, CANDIDATES[2] as Node)}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.12;0.82;1"
                dur="4.2s"
                begin="1.6s"
                repeatCount="indefinite"
              />
            </circle>
          ) : null}
        </g>

        {/* ── Candidate nodes ──────────────────────────────────────────── */}
        {CANDIDATES.map((node) => {
          const isRecommended = node.id === RECOMMENDED_ID;
          const size = 9 + node.depth * 8;
          return (
            <g key={node.id} style={shift(node.depth, 14)}>
              <rect
                x={node.x - size / 2}
                y={node.y - size / 2}
                width={size}
                height={size}
                fill={isRecommended ? 'var(--color-ember)' : 'transparent'}
                stroke={isRecommended ? 'var(--color-ember-bright)' : 'var(--color-ink-ghost)'}
                strokeWidth="1.4"
                opacity={isRecommended ? 1 : 0.45 + node.depth * 0.45}
              />
              {isRecommended ? (
                <>
                  <circle cx={node.x} cy={node.y} r="46" fill="url(#rf-node-halo)" />
                  <rect
                    x={node.x - size / 2 - 7}
                    y={node.y - size / 2 - 7}
                    width={size + 14}
                    height={size + 14}
                    fill="none"
                    stroke="var(--color-ember)"
                    strokeWidth="1"
                    opacity="0.45"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={node.x + size / 2 + 14}
                    y={node.y + 4}
                    className="font-mono"
                    fontSize="10.5"
                    letterSpacing="0.08em"
                    fill="var(--color-ember)"
                  >
                    RECOMMENDED
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {/* ── Product node ─────────────────────────────────────────────── */}
        <g style={shift(1, 12)}>
          <rect
            x={PRODUCT.x - 9}
            y={PRODUCT.y - 9}
            width="18"
            height="18"
            fill="#ffffff"
            stroke="var(--color-ink)"
            strokeWidth="1.4"
          />
          <rect x={PRODUCT.x - 3} y={PRODUCT.y - 3} width="6" height="6" fill="var(--color-ink)" />
          <text
            x={PRODUCT.x - 12}
            y={PRODUCT.y + 4}
            textAnchor="end"
            className="font-mono"
            fontSize="10.5"
            letterSpacing="0.08em"
            fill="var(--color-ink-dim)"
          >
            PRODUCT
          </text>
          {/* Coordinate ticks — the "measured" quality of the field. */}
          <line
            x1={PRODUCT.x}
            y1={PRODUCT.y - 26}
            x2={PRODUCT.x}
            y2={PRODUCT.y - 14}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
          />
          <line
            x1={PRODUCT.x}
            y1={PRODUCT.y + 14}
            x2={PRODUCT.x}
            y2={PRODUCT.y + 26}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
          />
        </g>
      </svg>

      <style>{`
        @keyframes rf-trace {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
