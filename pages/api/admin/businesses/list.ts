import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

function toIso(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    if ((decoded as any).admin !== true) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = getAdminFirestore();
    const snapshot = await db.collection('businesses').get();

    const businesses = snapshot.docs.map((doc) => {
      const data = (doc.data() as Record<string, any>) ?? {};
      return {
        id: doc.id,
        name: String(data.name ?? ''),
        plan: String(data.plan ?? ''),
        status: String(data.status ?? ''),
        ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
        ownerName: String(data.ownerName ?? ''),
        ownerEmail: String(data.ownerEmail ?? ''),
        category: String(data.category ?? ''),
        address: String(data.address ?? ''),
        featured: String(data.featured ?? ''),
        updatedAt: toIso(data.updatedAt),
        createdAt: toIso(data.createdAt),
      };
    });

    businesses.sort((a, b) => {
      const left = a.updatedAt || a.createdAt || '';
      const right = b.updatedAt || b.createdAt || '';
      return right.localeCompare(left);
    });

    return res.status(200).json({ ok: true, businesses });
  } catch (error) {
    console.error('[admin/businesses/list] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

