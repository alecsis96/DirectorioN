import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride as checkAdminOverride } from '../../../lib/adminOverrides';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);

    // Verificar que sea admin
    const isAdmin = await checkAdminOverride({ uid: decoded.uid } as any);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Obtener todos los reportes
    const snapshot = await adminDb
      .collection('business_reports')
      .orderBy('createdAt', 'desc')
      .get();

    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || doc.data().resolvedAt,
    }));

    res.status(200).json({ reports });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
