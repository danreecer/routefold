'use client';

/**
 * Last-resort boundary. This replaces the root layout, so it renders its own
 * html/body and cannot rely on any provider, font variable or global stylesheet.
 * Styles are inline for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0b0f',
          color: '#edeae4',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <svg viewBox="0 0 32 32" width="40" height="40" fill="none" aria-hidden="true">
            <path d="M3 26.5 L13.4 16.1" stroke="#EDEAE4" strokeWidth="1.6" opacity="0.55" />
            <path d="M13.4 16.1 L29 16.1" stroke="#7D5CFF" strokeWidth="1.6" />
            <path d="M13.4 16.1 L24.5 5" stroke="#EDEAE4" strokeWidth="1.6" opacity="0.85" />
            <path d="M13.4 16.1 L24.5 27.2" stroke="#EDEAE4" strokeWidth="1.6" opacity="0.35" />
            <rect x="11.6" y="14.3" width="3.6" height="3.6" fill="#7D5CFF" />
          </svg>

          <p
            style={{
              margin: '1.75rem 0 0.75rem',
              fontSize: '0.6875rem',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: '#7c7973',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            Application error
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 500,
              letterSpacing: '-0.03em',
            }}
          >
            Routefold could not start
          </h1>

          <p style={{ marginTop: '1rem', color: '#b9b5ad', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            The error has been logged. Your saved reports are unaffected.
          </p>

          {error.digest ? (
            <p
              style={{
                marginTop: '0.75rem',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.6875rem',
                color: '#4e4c48',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              height: '2.75rem',
              padding: '0 1.75rem',
              backgroundColor: '#edeae4',
              color: '#06070a',
              border: 'none',
              borderRadius: '2px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
