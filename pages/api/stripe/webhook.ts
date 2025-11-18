import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { db } from '../../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { businessId, plan } = session.metadata || {};

    if (!businessId || !plan) {
      console.error('Missing metadata in checkout session:', session.id);
      return res.status(400).json({ error: 'Missing metadata' });
    }

    try {
      // Update business plan in Firestore
      const businessRef = doc(db, 'businesses', businessId);
      await updateDoc(businessRef, {
        plan,
        planUpdatedAt: new Date().toISOString(),
        stripeSessionId: session.id,
        stripeSubscriptionId: session.subscription,
      });

      console.log(`Successfully updated business ${businessId} to plan ${plan}`);
    } catch (error: any) {
      console.error('Error updating business plan:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(200).json({ received: true });
}
