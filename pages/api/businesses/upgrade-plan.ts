import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

const VALID_PLANS = ['featured', 'sponsor'];
const VALID_PAYMENTS = ['card', 'transfer'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenHeader = req.headers.authorization ?? '';
  const token = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : tokenHeader;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { businessId, plan, paymentMethod } = req.body ?? {};
  if (!businessId || typeof businessId !== 'string') {
    return res.status(400).json({ error: 'Missing businessId' });
  }
  if (!VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  if (!VALID_PAYMENTS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const db = getAdminFirestore();
    const ref = db.doc(`businesses/${businessId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const data = snap.data() as Record<string, unknown> | undefined;
    const ownerId = data?.ownerId;
    const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
    const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates: Record<string, unknown> = {
      plan,
      featured: plan !== 'free',
      planPaymentMethod: paymentMethod,
      paymentStatus: 'active',
      planRequestedAt: new Date(),
      planUpdatedAt: new Date(),
      planUpdatedBy: decoded.email || decoded.uid,
      planActivatedAt: new Date(),
    };

    // Si paga por transferencia, limpiamos fechas automáticas de Stripe
    if (paymentMethod === 'transfer') {
      updates.nextPaymentDate = null;
      updates.lastPaymentDate = null;
      updates.stripeSubscriptionStatus = null;
    }

    await ref.set(updates, { merge: true });

    return res.status(200).json({ ok: true, plan });
  } catch (error) {
    console.error('[upgrade-plan] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
