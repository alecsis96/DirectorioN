import type { NextApiRequest, NextApiResponse } from 'next';

import { hasAdminOverride } from '../../../lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';

const VALID_PLANS = ['free', 'featured', 'sponsor'];

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

    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { businessId, plan, expiresAt } = req.body ?? {};

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid businessId' });
    }

    if (!plan || typeof plan !== 'string' || !VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();

    if (!businessSnap.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const updates: Record<string, any> = {
      plan,
      featured: plan !== 'free',
      updatedAt: new Date(),
      planUpdatedAt: new Date(),
      planUpdatedBy: decoded.email || decoded.uid,
    };

    let expires: Date | null = null;
    if (plan === 'free') {
      updates.planExpiresAt = null;
      updates.stripeSubscriptionStatus = null;
      updates.nextPaymentDate = null;
    } else if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid expiresAt date' });
      }
      expires = parsed;
      updates.planExpiresAt = parsed;
    }

    await businessRef.update(updates);

    return res.status(200).json({
      ok: true,
      planExpiresAt: expires ? expires.toISOString() : null,
    });
  } catch (error) {
    console.error('[admin/update-plan] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
