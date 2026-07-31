import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { AuthUnavailable } from '@/components/auth/auth-unavailable';
import { capabilities } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Routefold to create and manage multichain expansion blueprints.',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  if (!capabilities().auth) return <AuthUnavailable mode="sign-in" />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Welcome back</span>
        <h1 className="text-title font-medium text-ink">Sign in to Routefold</h1>
      </div>
      <SignIn
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
