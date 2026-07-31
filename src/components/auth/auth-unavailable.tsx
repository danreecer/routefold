import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

/**
 * Shown when Clerk is not configured.
 *
 * The public site and the built-in example are fully functional without auth, so
 * the honest response here is an explanation of what is missing rather than a
 * crash or a sign-in form that cannot work.
 */
export function AuthUnavailable({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <Panel corners>
      <PanelHeader>
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-caution" />
          <div>
            <PanelTitle>Authentication is not configured</PanelTitle>
          </div>
        </div>
      </PanelHeader>
      <PanelBody className="flex flex-col gap-5">
        <p className="text-[0.875rem] leading-relaxed text-ink-dim">
          This deployment has no Clerk credentials, so {mode === 'sign-in' ? 'signing in' : 'account creation'}{' '}
          is unavailable. The public site and the full example report work without an account.
        </p>
        <div className="border border-line bg-paper px-4 py-3">
          <p className="eyebrow">Required environment variables</p>
          <pre className="mt-2 overflow-x-auto font-mono text-[0.6875rem] leading-relaxed text-ink-faint">
            {`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=`}
          </pre>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary" size="sm">
            <Link href="/app/example">Open the example report</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/methodology">Read the methodology</Link>
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
