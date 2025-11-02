import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

type ManageBody = {
  businessId?: string;
  data?: Record<string, unknown>;
};

function ensureString(value: unknown): string {
  if (Array.isArray(value)) return ensureString(value[0]);
  if (typeof value !== 'string') return '';
  return value.trim();
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sanitizeData(source: Record<string, unknown>) {
  const target: Record<string, unknown> = {};
  let lat: number | null = null;
  let lng: number | null = null;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    switch (key) {
      case 'lat':
      case 'latitude': {
        if (value === null || (typeof value === 'string' && value.trim().length === 0)) {
          lat = null;
          target.lat = null;
          target.latitude = null;
          target.location = null;
          break;
        }
        const num = toNumber(value);
        if (num !== null) lat = num;
        break;
      }
      case 'lng':
      case 'longitude': {
        if (value === null || (typeof value === 'string' && value.trim().length === 0)) {
          lng = null;
          target.lng = null;
          target.longitude = null;
          target.location = null;
          break;
        }
        const num = toNumber(value);
        if (num !== null) lng = num;
        break;
      }
      case 'images': {
        if (!Array.isArray(value)) break;
        const images = value
          .map((item) => {
            if (item && typeof item === 'object') {
              const maybe = item as Record<string, unknown>;
              const url = ensureString(maybe.url);
              if (!url) return null;
              const payload: Record<string, string> = { url };
              const publicId = ensureString(maybe.publicId);
              if (publicId) payload.publicId = publicId;
              return payload;
            }
            if (typeof item === 'string') {
              const url = item.trim();
              return url ? { url } : null;
            }
            return null;
          })
          .filter(Boolean);
        target.images = images;
        break;
      }
      default: {
        if (typeof value === 'string') {
          target[key] = value.trim();
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          target[key] = value;
        } else if (value === null) {
          target[key] = null;
        } else if (Array.isArray(value)) {
          target[key] = value;
        } else if (value && typeof value === 'object') {
          target[key] = value;
        }
        break;
      }
    }
  }

  if (lat !== null) {
    target.lat = lat;
    target.latitude = lat;
  }
  if (lng !== null) {
    target.lng = lng;
    target.longitude = lng;
  }
  if (lat !== null && lng !== null) {
    target.location = { lat, lng };
  }

  return target;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).end();
  }

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

    if (req.method === 'GET') {
      const businessId = ensureString(req.query.businessId ?? req.query.id);
      if (!businessId) {
        return res.status(400).json({ error: 'Missing businessId' });
      }
      const docRef = db.doc(`businesses/${businessId}`);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Business not found' });
      }
      return res.status(200).json({
        ok: true,
        business: {
          id: businessId,
          ...(snapshot.data() ?? {}),
        },
      });
    }

    const { businessId: rawId, data }: ManageBody = (req.body as ManageBody) ?? {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const sanitized = sanitizeData(data);
    const now = new Date();

    let businessId = ensureString(rawId);
    let docRef = businessId ? db.doc(`businesses/${businessId}`) : db.collection('businesses').doc();
    if (!businessId) {
      businessId = docRef.id;
      if (typeof sanitized.ownerId !== 'string' || !sanitized.ownerId.trim()) {
        sanitized.ownerId = decoded.uid;
      }
      sanitized.createdAt = sanitized.createdAt ?? now;
    } else {
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        sanitized.createdAt = sanitized.createdAt ?? now;
      }
    }

    if (!sanitized.status) sanitized.status = 'approved';
    if (!sanitized.isOpen) sanitized.isOpen = 'si';
    if (!sanitized.featured) sanitized.featured = 'no';
    if (!sanitized.plan) sanitized.plan = 'free';
    sanitized.updatedAt = now;

    await docRef.set(sanitized, { merge: true });

    return res.status(200).json({ ok: true, businessId });
  } catch (error) {
    console.error('[admin/businesses/manage] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
