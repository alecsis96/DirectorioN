import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from '@google-cloud/storage';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { v4 as uuid } from 'uuid';

// Firebase Admin (for verifying the user's ID token)
function ensureAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT');
  try {
    const sa = JSON.parse(raw as string);
    initializeApp({ credential: cert(sa) });
  } catch (e) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
  }
}

// Google Cloud Storage client
function getStorageClient() {
  const projectId = process.env.GCP_PROJECT_ID as string | undefined;
  const rawKey = process.env.GCP_SA_KEY as string | undefined;
  if (!projectId) throw new Error('Missing GCP_PROJECT_ID');
  if (!rawKey) throw new Error('Missing GCP_SA_KEY');
  let credentials: any;
  try {
    credentials = JSON.parse(rawKey);
  } catch {
    throw new Error('Invalid GCP_SA_KEY JSON');
  }
  return new Storage({ credentials, projectId });
}

const BUCKET = process.env.GCS_BUCKET as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    ensureAdmin();
    const storage = getStorageClient();
    // Auth: verify Firebase ID token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const decoded = await getAuth().verifyIdToken(token);

    const { businessId, fileName, contentType } = req.body as {
      businessId: string; fileName: string; contentType: string;
    };
    if (!businessId || !fileName || !contentType) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Build object path inside the bucket
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]+/g, '_');
    const objectPath = `businesses/${businessId}/images/${uuid()}-${safeName}`;

    if (!BUCKET) return res.status(500).json({ error: 'Missing GCS_BUCKET' });
    const bucket = storage.bucket(BUCKET);
    const file = bucket.file(objectPath);

    // Signed URL (V4) for upload
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires,
      contentType,
    });

    // Public URL (if you set objects public) or use signed GETs
    const publicUrl = `https://storage.googleapis.com/${BUCKET}/${objectPath}`;

    return res.status(200).json({ uploadUrl, publicUrl, objectPath, expires });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
