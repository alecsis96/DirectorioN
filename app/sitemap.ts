import type { MetadataRoute } from 'next';
import { getAdminFirestore } from '../lib/server/firebaseAdmin';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://directorio-yajalon.com';

const STATIC_ROUTES = ['/', '/negocios', '/para-negocios', '/registro-negocio', '/mis-solicitudes'];

function absoluteUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
  }));

  let dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('businesses').where('status', '==', 'published').limit(500).get();
    dynamicEntries = snapshot.docs.map((doc) => {
      const data = doc.data() as { updatedAt?: any; slug?: string };
      const updatedRaw = data?.updatedAt;
      let lastModified: Date;
      if (updatedRaw?.toDate) {
        lastModified = updatedRaw.toDate();
      } else if (typeof updatedRaw === 'string') {
        lastModified = new Date(updatedRaw);
      } else {
        lastModified = now;
      }

      const slug = data?.slug && typeof data.slug === 'string' ? data.slug : doc.id;
      return {
        url: absoluteUrl(`/negocios/${slug}`),
        lastModified,
      };
    });
  } catch (error) {
    console.error('[sitemap] Failed to load businesses', error);
  }

  return [...staticEntries, ...dynamicEntries];
}
