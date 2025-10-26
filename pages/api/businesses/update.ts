import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';

const ALLOWED_FIELDS = new Set([
  'name',
  'category',
  'address',
  'description',
  'phone',
  'WhatsApp',
  'Facebook',
  'hours',
  'images',
  'lat',
  'lng',
]);

type UpdateBody = {
  businessId?: string;
  updates?: Record<string, unknown>;
};

function sanitizeUpdates(source: Record<string, unknown>) {
  const target: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (value === undefined) continue;
    target[key] = value;
  }
  return target;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const { businessId, updates }: UpdateBody = req.body ?? {};
    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing businessId' });
    }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Missing updates' });
    }

    const db = getAdminFirestore();
    const ref = db.doc(`businesses/${businessId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const data = snap.data() as Record<string, unknown> | undefined;
    const ownerId = data?.ownerId;
    const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
    const isAdmin = (decoded as any).admin === true;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sanitized = sanitizeUpdates(updates);
    if (!Object.keys(sanitized).length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    sanitized.updatedAt = new Date();
    await ref.set(sanitized, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[businesses/update] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

