import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

function toIso(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch { return null; }
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
    const isAdmin = (decoded as any).admin === true;
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const db = getAdminFirestore();
    const snapshot = await db.collection('applications').get();

    const applications = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      const formData = (data.formData as Record<string, any>) || {};
      return {
        uid: doc.id,
        status: data.status || 'pending',
        businessName: data.businessName || formData.businessName || '',
        plan: formData.plan || 'free',
        ownerName: data.ownerName || formData.ownerName || '',
        email: data.email || formData.ownerEmail || '',
        phone: data.ownerPhone || formData.ownerPhone || formData.whatsappNumber || '',
        notes: data.adminNotes || '',
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    });

    const sorted = applications.sort((a, b) => {
      const aDate = a.updatedAt || a.createdAt;
      const bDate = b.updatedAt || b.createdAt;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return bDate.localeCompare(aDate);
    });
    return res.status(200).json({ ok: true, applications: sorted });
  } catch (error) {
    console.error('[admin/applications/list] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}

