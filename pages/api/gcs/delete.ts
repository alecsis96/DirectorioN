import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from '@google-cloud/storage';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin
function ensureAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  try {
    const sa = JSON.parse(raw as string);
    initializeApp({ credential: cert(sa) });
  } catch {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
  }
}

// GCS
function getStorageClient() {
  const projectId = process.env.GCP_PROJECT_ID as string | undefined;
  const rawKey = process.env.GCP_SA_KEY as string | undefined;
  if (!projectId) throw new Error('Missing GCP_PROJECT_ID');
  if (!rawKey) throw new Error('Missing GCP_SA_KEY');
  let credentials: any;
  try { credentials = JSON.parse(rawKey); } catch { throw new Error('Invalid GCP_SA_KEY JSON'); }
  return new Storage({ credentials, projectId });
}
const BUCKET = process.env.GCS_BUCKET as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    ensureAdmin();
    const storage = getStorageClient();
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const decoded = await getAuth().verifyIdToken(token);

    const { businessId, objectPath } = req.body as { businessId: string; objectPath: string };
    if (!businessId || !objectPath) return res.status(400).json({ error: 'Missing fields' });

    // Check ownership in Firestore
    const snap = await getFirestore().doc(`businesses/${businessId}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'Business not found' });
    const data = snap.data()!;
    if (data.ownerId !== decoded.uid && decoded.admin !== true) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!BUCKET) return res.status(500).json({ error: 'Missing GCS_BUCKET' });
    const bucket = storage.bucket(BUCKET);
    await bucket.file(objectPath).delete({ ignoreNotFound: true });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
