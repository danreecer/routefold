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
          backgroundColor: '#FDFAF6',
          color: '#1C1815',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          {/* Plain <img>: this boundary replaces the root layout, so next/image
              and the design system are both unavailable here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Routefold" width={72} height={72} />

          <p
            style={{
              margin: '1.75rem 0 0.75rem',
              fontSize: '0.6875rem',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: '#7D736A',
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

          <p style={{ marginTop: '1rem', color: '#4D453D', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            The error has been logged. Your saved reports are unaffected.
          </p>

          {error.digest ? (
            <p
              style={{
                marginTop: '0.75rem',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.6875rem',
                color: '#A89D93',
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
              backgroundColor: '#E2570B',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>

          <p style={{ marginTop: '1.75rem', fontSize: '0.75rem', color: '#A89D93' }}>
            Powered by{' '}
            <a href="https://www.zefi.ae" target="_blank" rel="noopener noreferrer" style={{ color: '#7D736A' }}>
              ZeFi
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
