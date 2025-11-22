import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    
    const { businessId } = req.query;

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid businessId' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessData = businessDoc.data();

    // Verificar que el usuario es el dueño del negocio o es admin
    if (businessData?.ownerId !== decoded.uid && !(decoded as any).admin) {
      return res.status(403).json({ error: 'Forbidden: You do not own this business' });
    }

    const paymentHistory = businessData?.paymentHistory || [];

    return res.status(200).json({
      success: true,
      history: paymentHistory,
      nextPaymentDate: businessData?.nextPaymentDate,
      lastPaymentDate: businessData?.lastPaymentDate,
      paymentStatus: businessData?.paymentStatus,
      plan: businessData?.plan,
    });
  } catch (error: any) {
    console.error('[payment-history] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
