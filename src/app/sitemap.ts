import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/**
 * Only public, indexable routes appear here. Application routes are behind auth
 * and share pages are private-by-URL, so neither belongs in a sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.appUrl.replace(/\/+$/, '');
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/docs`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/whitepaper`, lastModified, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/methodology`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/security`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
