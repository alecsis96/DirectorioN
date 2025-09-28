import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    if ((decoded as any).admin !== true) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { uid } = req.body as { uid?: string };
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Missing uid' });
    }

    const db = getAdminFirestore();
    await db.doc(`applications/${uid}`).delete();
    await db.doc(`businesses/${uid}`).delete();
    await db.doc(`business_wizard/${uid}`).delete().catch(() => {});

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[admin/applications/delete] error', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
