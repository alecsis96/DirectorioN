import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

const ALLOWED_STATUS = new Set(['pending', 'approved', 'rejected']);

type Body = {
  uid?: string;
  status?: string;
  notes?: string;
};

type ApplicationData = {
  email?: string;
  displayName?: string;
  ownerPhone?: string;
  address?: string;
  status?: string;
  formData?: Record<string, unknown>;
  [key: string]: unknown;
};

function toStringValue(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length ? str : fallback;
}

function shouldReplace(current: unknown) {
  if (current === null || current === undefined) return true;
  if (typeof current === 'string') {
    const trimmed = current.trim();
    return trimmed.length === 0 || trimmed === 'Negocio sin nombre' || trimmed === 'Nuevo negocio';
  }
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const isAdmin = (decoded as any).admin === true;
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { uid, status, notes }: Body = req.body ?? {};
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Missing uid' });
    }
    if (!status || typeof status !== 'string' || !ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getAdminFirestore();
    const ref = db.doc(`applications/${uid}`);
    const snapshot = await ref.get();
    const now = new Date();

    const payload: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (typeof notes === 'string' && notes.trim()) {
      payload.adminNotes = notes.trim();
    }

    if (status === 'approved') {
      payload.approvedAt = now;
    }

    await ref.set(payload, { merge: true });

    if (status === 'approved') {
      try {
        const appData: ApplicationData = snapshot.exists ? ((snapshot.data() as ApplicationData) ?? {}) : {};
        const formData = (appData.formData ?? {}) as Record<string, unknown>;

        const businessRef = db.doc(`businesses/${uid}`);
        const businessSnap = await businessRef.get();
        const existing: Record<string, any> = businessSnap.exists ? ((businessSnap.data() as Record<string, any>) ?? {}) : {};

        const businessPayload: Record<string, unknown> = {
          status: 'approved',
          approvedAt: now,
          updatedAt: now,
          ownerId: uid,
        };

        const name = toStringValue(formData.businessName ?? formData.name ?? (appData as any).businessName);
        const category = toStringValue(formData.category ?? (appData as any).category);
        const address = toStringValue(formData.address ?? appData.address);
        const description = toStringValue(formData.description ?? (appData as any).description);
        const phone = toStringValue(
          formData.phone ?? formData.ownerPhone ?? appData.ownerPhone ?? formData.whatsappNumber
        );
        const whatsapp = toStringValue(formData.whatsapp ?? formData.whatsappNumber ?? (appData as any).whatsapp);
        const plan = toStringValue(formData.plan ?? (existing as any).plan ?? 'free');
        const ownerEmail = toStringValue(appData.email ?? formData.ownerEmail ?? formData.email);
        const ownerName = toStringValue(formData.ownerName ?? appData.displayName ?? '');

        if (name && (shouldReplace(existing.name) || !existing.name)) businessPayload.name = name;
        if (category && (shouldReplace(existing.category) || !existing.category)) businessPayload.category = category;
        if (address && (shouldReplace(existing.address) || !existing.address)) businessPayload.address = address;
        if (description && (shouldReplace(existing.description) || !existing.description)) {
          businessPayload.description = description;
        }
        if (phone && (shouldReplace(existing.phone) || !existing.phone)) businessPayload.phone = phone;
        if (whatsapp && (shouldReplace(existing.WhatsApp) || !existing.WhatsApp)) businessPayload.WhatsApp = whatsapp;
        if (ownerEmail) businessPayload.ownerEmail = ownerEmail;
        if (ownerName) businessPayload.ownerName = ownerName;

        businessPayload.plan = plan || 'free';
        if (!('isOpen' in existing)) businessPayload.isOpen = 'si';
        if (!('createdAt' in existing)) businessPayload.createdAt = now;

        const featuredPlans = new Set(['featured', 'sponsor']);
        if (featuredPlans.has(plan)) {
          businessPayload.featured = 'si';
        } else if (!('featured' in existing)) {
          businessPayload.featured = 'no';
        }

        await businessRef.set(businessPayload, { merge: true });
      } catch (updateError) {
        console.error('[admin/applications/update] failed to update business doc', updateError);
      }
    }

    return res.status(200).json({ ok: true, status });
  } catch (error) {
    console.error('[admin/applications/update] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
