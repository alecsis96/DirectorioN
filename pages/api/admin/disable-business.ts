import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { businessId, reason } = req.body;

    if (!businessId || !reason) {
      return res.status(400).json({ error: 'Missing businessId or reason' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    await businessRef.update({
      isActive: false,
      disabledReason: reason,
      disabledAt: new Date().toISOString(),
      disabledBy: decoded.email,
    });

    // Enviar notificación por email al dueño
    const businessData = businessDoc.data();
    if (businessData?.ownerEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/admin/send-disabled-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: businessData.ownerEmail,
            businessName: businessData.name || 'Tu negocio',
            reason,
          }),
        });
      } catch (emailError) {
        console.error('Error sending disabled notification:', emailError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[disable-business] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
