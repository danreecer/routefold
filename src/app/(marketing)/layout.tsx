import { SiteFooter, SiteHeader } from '@/components/marketing/site-chrome';
import { AnnouncementBar, PromoProvider, PromoSurfaces } from '@/components/marketing/promo';
import { TokenBar } from '@/components/token/token-bar';
import { getClerkUserId } from '@/lib/auth';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const userId = await getClerkUserId();
  return (
    <PromoProvider>
      <div className="flex min-h-dvh flex-col">
        <TokenBar />
        <AnnouncementBar />
        <SiteHeader isSignedIn={Boolean(userId)} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Bottom padding clears the sticky CTA bar so it never covers the footer. */}
        <div className="h-20" aria-hidden="true" />
        <PromoSurfaces />
      </div>
    </PromoProvider>
  );
}
