'use client';

import { AnnouncementBar } from './announcement-bar';
import { PromoDialog } from './promo-dialog';
import { SocialRail } from './social-rail';
import { StickyCtaBar } from './sticky-cta-bar';

export { PromoProvider } from './promo-provider';
export { AnnouncementBar };

/**
 * Every floating marketing surface, mounted once.
 *
 * Kept together so their interaction is reviewable in one place: the rail and
 * sticky bar are ambient and can coexist, the dialog is the single interruptive
 * surface, and all four coordinate through PromoProvider.
 */
export function PromoSurfaces() {
  return (
    <>
      <SocialRail />
      <StickyCtaBar />
      <PromoDialog />
    </>
  );
}
