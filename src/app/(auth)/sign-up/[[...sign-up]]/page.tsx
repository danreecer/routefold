import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { AuthUnavailable } from '@/components/auth/auth-unavailable';
import { capabilities } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a Routefold account to generate multichain expansion blueprints.',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  if (!capabilities().auth) return <AuthUnavailable mode="sign-up" />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Free during private beta</span>
        <h1 className="text-title font-medium text-ink">Create your account</h1>
        <p className="text-[0.875rem] leading-relaxed text-ink-faint">
          Five complete report generations are included. No card required.
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none',
            card: 'bg-surface border border-line shadow-none w-full',
          },
        }}
      />
    </div>
  );
}
