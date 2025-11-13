import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// Importante: deshabilitar el body parser de Next.js para webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[stripe/webhook] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Manejar el evento
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.info('[stripe/webhook] Payment successful:', session.id);
        console.info('[stripe/webhook] Metadata:', session.metadata);

        const { businessId, plan } = session.metadata || {};

        if (!businessId || !plan) {
          console.error('[stripe/webhook] Missing businessId or plan in metadata');
          return res.status(400).json({ error: 'Missing metadata' });
        }

        // Actualizar el negocio en Firestore
        const db = getAdminFirestore();
        const businessRef = db.doc(`businesses/${businessId}`);

        const now = new Date();
        const expirationDate = new Date(now);
        expirationDate.setMonth(expirationDate.getMonth() + 1); // Plan válido por 1 mes

        await businessRef.update({
          plan,
          featured: plan === 'featured' || plan === 'sponsor' ? 'si' : 'no',
          planPurchaseDate: now,
          planExpirationDate: expirationDate,
          stripeSessionId: session.id,
          stripePaymentStatus: 'paid',
          updatedAt: now
        });

        console.info(`[stripe/webhook] Business ${businessId} upgraded to ${plan}`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.info('[stripe/webhook] Session expired:', session.id);
        break;
      }

      default:
        console.info(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[stripe/webhook] Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}
