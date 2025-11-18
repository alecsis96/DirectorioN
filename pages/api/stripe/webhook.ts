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
  switch (event.type) {
    case 'checkout.session.completed': {
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
          stripeCustomerId: session.customer,
        });

        console.log(`✅ Successfully updated business ${businessId} to plan ${plan}`);
      } catch (error: any) {
        console.error('Error updating business plan:', error);
        return res.status(500).json({ error: error.message });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const businessId = subscription.metadata?.businessId;

      if (!businessId) {
        console.error('Missing businessId in subscription metadata:', subscription.id);
        break;
      }

      try {
        const businessRef = doc(db, 'businesses', businessId);
        
        // Si la suscripción está activa, mantener el plan
        if (subscription.status === 'active') {
          await updateDoc(businessRef, {
            stripeSubscriptionStatus: subscription.status,
            planUpdatedAt: new Date().toISOString(),
          });
          console.log(`✅ Subscription ${subscription.id} updated to active for business ${businessId}`);
        }
        // Si fue cancelada o expiró, downgrade a free
        else if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
          await updateDoc(businessRef, {
            plan: 'free',
            stripeSubscriptionStatus: subscription.status,
            planUpdatedAt: new Date().toISOString(),
          });
          console.log(`⚠️ Subscription ${subscription.id} ${subscription.status}, downgraded business ${businessId} to free`);
        }
      } catch (error: any) {
        console.error('Error updating subscription status:', error);
        return res.status(500).json({ error: error.message });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const businessId = subscription.metadata?.businessId;

      if (!businessId) {
        console.error('Missing businessId in subscription metadata:', subscription.id);
        break;
      }

      try {
        // Downgrade a plan gratuito cuando se cancela la suscripción
        const businessRef = doc(db, 'businesses', businessId);
        await updateDoc(businessRef, {
          plan: 'free',
          stripeSubscriptionStatus: 'canceled',
          planUpdatedAt: new Date().toISOString(),
        });
        console.log(`❌ Subscription deleted, downgraded business ${businessId} to free plan`);
      } catch (error: any) {
        console.error('Error handling subscription deletion:', error);
        return res.status(500).json({ error: error.message });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) break;

      try {
        // Obtener metadata de la suscripción
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        const businessId = subscription.metadata?.businessId;

        if (businessId) {
          const businessRef = doc(db, 'businesses', businessId);
          await updateDoc(businessRef, {
            stripeSubscriptionStatus: 'payment_failed',
            planUpdatedAt: new Date().toISOString(),
          });
          console.log(`⚠️ Payment failed for business ${businessId}`);
          // TODO: Enviar email de notificación al negocio
        }
      } catch (error: any) {
        console.error('Error handling payment failure:', error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
