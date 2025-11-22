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

    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    await businessRef.update({
      isActive: true,
      disabledReason: null,
      enabledAt: new Date().toISOString(),
      enabledBy: decoded.email,
    });

    // Enviar notificación por email al dueño
    const businessData = businessDoc.data();
    if (businessData?.ownerEmail) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/admin/send-enabled-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: businessData.ownerEmail,
            businessName: businessData.name || 'Tu negocio',
          }),
        });
      } catch (emailError) {
        console.error('Error sending enabled notification:', emailError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[enable-business] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
