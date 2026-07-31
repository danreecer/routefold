import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = env.appUrl.replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Authenticated routes, private share links and the API are never public.
        disallow: ['/app/', '/api/', '/share/', '/sign-in', '/sign-up'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
