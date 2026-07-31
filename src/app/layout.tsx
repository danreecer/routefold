import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/primitives';
import { capabilities, env } from '@/lib/env';
import './globals.css';

/**
 * Fonts are self-hosted at build time by next/font, with `display: swap` and a
 * matching size-adjusted fallback, so there is no layout shift and no
 * third-party request at runtime (which the CSP would block anyway).
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  adjustFontFallback: true,
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-face',
  weight: ['400', '500'],
});

const title = 'Routefold — Model the next chain before you move.';
const description =
  'AI multichain expansion intelligence for onchain products. Paste your product and receive a transparent, chain-by-chain expansion blueprint covering ecosystem fit, architecture, risks, and execution.';

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: title,
    template: '%s — Routefold',
  },
  description,
  applicationName: 'Routefold',
  keywords: [
    'multichain expansion',
    'blockchain ecosystem selection',
    'chain fit score',
    'onchain product strategy',
    'multichain architecture',
    'expansion blueprint',
  ],
  authors: [{ name: 'Routefold' }],
  creator: 'Routefold',
  openGraph: {
    type: 'website',
    siteName: 'Routefold',
    title,
    description,
    url: env.appUrl,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Next serves src/app/icon.png and src/app/apple-icon.png from the file
  // convention; no explicit `icons` entry is needed and adding one would
  // override the generated, correctly-sized variants.
  formatDetection: { telephone: false, address: false, email: false },
  /**
   * Site-ownership verification. Declared on the root layout so the tag is
   * emitted into <head> on every route — nested metadata only overrides the
   * fields it declares, so this survives page-level `metadata` exports.
   */
  other: {
    'ory-verify': 'orynth-a96586f4b37341489d038c75fd64de26',
  },
};

export const viewport: Viewport = {
  themeColor: '#fdfaf6',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

function Content({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[3px] focus:border focus:border-ember focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <TooltipProvider delayDuration={280} skipDelayDuration={200}>
        {children}
      </TooltipProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'routefold-toast',
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            border: '1px solid var(--color-line)',
            borderRadius: '12px',
            color: 'var(--color-ink)',
            fontSize: '0.8125rem',
            boxShadow: 'var(--frost-shadow-lifted)',
          },
        }}
      />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Clerk's provider throws without a publishable key. The public site and the
  // built-in example must keep working on a deployment where auth has not been
  // configured yet, so the provider is only mounted when it can function.
  const authReady = capabilities().auth;

  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-paper antialiased">
        {authReady ? (
          <ClerkAppProvider>
            <Content>{children}</Content>
          </ClerkAppProvider>
        ) : (
          <Content>{children}</Content>
        )}
      </body>
    </html>
  );
}

/** Clerk provider carrying Routefold's visual system into the hosted UI. */
function ClerkAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#e2570b',
          colorBackground: '#ffffff',
          colorForeground: '#1c1815',
          colorMutedForeground: '#4d453d',
          colorInput: '#ffffff',
          colorInputForeground: '#1c1815',
          colorDanger: '#c93b2b',
          colorSuccess: '#17845b',
          borderRadius: '12px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        },
        elements: {
          card: 'frost frost-sheen shadow-none',
          headerTitle: 'text-ink',
          headerSubtitle: 'text-ink-faint',
          socialButtonsBlockButton: 'border-line-strong hover:bg-ink/[0.07] backdrop-blur-md',
          formButtonPrimary: 'bg-ember hover:bg-ember-bright text-white normal-case',
          footerActionLink: 'text-ember-bright hover:text-ember',
          formFieldInput: 'bg-shell/40 border-line-strong backdrop-blur-sm',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
