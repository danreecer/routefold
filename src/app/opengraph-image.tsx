import { ImageResponse } from 'next/og';

/**
 * Open Graph / social preview image, composed at build time.
 *
 * Uses the product's own visual language: a warm sunset gradient field with the
 * folded-route geometry, rather than a screenshot.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Routefold — Model the next chain before you move.';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 76px',
          position: 'relative',
          background:
            'linear-gradient(158deg, #FFF0E0 0%, #FFFAF4 52%, #FDF7EF 100%)',
        }}
      >
        {/* Ambient warm light */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            left: -180,
            top: -220,
            width: 780,
            height: 780,
            borderRadius: 999,
            background:
              'radial-gradient(circle, rgba(255,168,104,0.85) 0%, rgba(255,178,122,0.4) 45%, rgba(255,178,122,0) 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            right: -140,
            bottom: -240,
            width: 620,
            height: 620,
            borderRadius: 999,
            background:
              'radial-gradient(circle, rgba(226,87,11,0.42) 0%, rgba(226,87,11,0) 70%)',
          }}
        />

        {/* Route geometry, right side */}
        <svg
          width="480"
          height="330"
          viewBox="0 0 480 330"
          style={{ position: 'absolute', right: 66, top: 158 }}
        >
          <path d="M14 280 L150 168" stroke="#1C1815" strokeWidth="2.4" opacity="0.35" strokeLinecap="round" />
          <path d="M150 168 L440 168" stroke="#E2570B" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M150 168 L370 36" stroke="#1C1815" strokeWidth="2.4" opacity="0.5" strokeLinecap="round" />
          <path d="M150 168 L370 300" stroke="#1C1815" strokeWidth="2.4" opacity="0.2" strokeLinecap="round" />
          <circle cx="150" cy="168" r="12" fill="#E2570B" />
          <circle cx="440" cy="168" r="9" fill="#FF7A2F" />
          <circle cx="370" cy="36" r="7" stroke="#1C1815" strokeWidth="2.2" fill="none" opacity="0.55" />
          <circle cx="370" cy="300" r="7" stroke="#1C1815" strokeWidth="2.2" fill="none" opacity="0.3" />
          <circle cx="14" cy="280" r="7" stroke="#1C1815" strokeWidth="2.2" fill="none" opacity="0.4" />
        </svg>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path d="M3 26.5 L13.4 16.1" stroke="#1C1815" strokeWidth="1.8" opacity="0.45" strokeLinecap="round" />
            <path d="M13.4 16.1 L29 16.1" stroke="#E2570B" strokeWidth="2" strokeLinecap="round" />
            <path d="M13.4 16.1 L24.5 5" stroke="#1C1815" strokeWidth="1.8" opacity="0.8" strokeLinecap="round" />
            <path d="M13.4 16.1 L24.5 27.2" stroke="#1C1815" strokeWidth="1.8" opacity="0.28" strokeLinecap="round" />
            <circle cx="13.4" cy="16.1" r="2.7" fill="#E2570B" />
          </svg>
          <span style={{ fontSize: 30, color: '#1C1815', letterSpacing: '-1.1px', fontWeight: 600 }}>
            Routefold
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700 }}>
          <span
            style={{
              fontSize: 15,
              letterSpacing: '2.6px',
              textTransform: 'uppercase',
              color: '#B03F00',
              marginBottom: 26,
            }}
          >
            AI multichain expansion intelligence
          </span>
          <span
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              letterSpacing: '-3px',
              color: '#1C1815',
              fontWeight: 600,
            }}
          >
            Model the next chain
          </span>
          <span
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              letterSpacing: '-3px',
              color: '#B03F00',
              fontWeight: 600,
            }}
          >
            before you move.
          </span>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            borderTop: '1px solid rgba(28,24,21,0.14)',
            paddingTop: 24,
          }}
        >
          {['Transparent scoring', 'Architecture brief', 'Risk register', '30-day plan'].map(
            (label) => (
              <span key={label} style={{ fontSize: 17, color: '#7D736A' }}>
                {label}
              </span>
            ),
          )}
        </div>
      </div>
    ),
    size,
  );
}
