import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

const VALID_PLANS = ['featured', 'sponsor'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminFirestore();

    const { businessId, plan, notes, fileName, fileType, fileData } = req.body ?? {};

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing businessId' });
    }
    if (!plan || typeof plan !== 'string' || !VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!fileName || !fileType || !fileData || typeof fileData !== 'string') {
      return res.status(400).json({ error: 'Missing file' });
    }
    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

    // Validar tamaño (base64 ~1.37x)
    const sizeBytes = Math.ceil((fileData.length * 3) / 4);
    if (sizeBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Archivo demasiado grande (max 3MB)' });
    }

    // Validar ownership/admin
    const bizRef = db.doc(`businesses/${businessId}`);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const bizData = bizSnap.data() as Record<string, unknown> | undefined;
    const ownerId = bizData?.ownerId;
    const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
    const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const now = new Date();
    const receiptRef = db.collection('paymentReceipts').doc();
    await receiptRef.set({
      id: receiptRef.id,
      businessId,
      businessName: bizData?.name || bizData?.businessName || 'Negocio',
      ownerEmail: bizData?.ownerEmail || decoded.email || null,
      ownerId: ownerId ?? decoded.uid,
      plan,
      paymentMethod: 'transfer',
      notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
      fileName,
      fileType,
      fileData, // base64 (sin cabecera)
      status: 'pending',
      createdAt: now,
      createdBy: decoded.email || decoded.uid,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[upload-transfer] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
