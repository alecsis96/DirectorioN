import type { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary } from 'cloudinary';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function ensureAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  const sa = JSON.parse(raw as string);
  initializeApp({ credential: cert(sa) });
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    ensureAdmin();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const decoded = await getAuth().verifyIdToken(token);

    const { businessId, publicId } = req.body as { businessId: string; publicId: string };
    if (!businessId || !publicId) return res.status(400).json({ error: 'Missing fields' });

    const snap = await getFirestore().doc(`businesses/${businessId}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'Business not found' });
    const data = snap.data()!;
    const isOwner = data.ownerId === decoded.uid;
    const isAdmin = (decoded as any).admin === true;
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    await cloudinary.uploader.destroy(publicId);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}

