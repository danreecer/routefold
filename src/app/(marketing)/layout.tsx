import { SiteFooter, SiteHeader } from '@/components/marketing/site-chrome';
import { getClerkUserId } from '@/lib/auth';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const userId = await getClerkUserId();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isSignedIn={Boolean(userId)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
