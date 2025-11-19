import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { rateLimit } from '../../../lib/rateLimit';
import { csrfProtection } from '../../../lib/csrfProtection';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 5 });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const PLAN_PRICES = {
  featured: 9900, // $99 MXN in cents
  sponsor: 19900, // $199 MXN in cents
};

const PLAN_NAMES = {
  featured: 'Plan Destacado',
  sponsor: 'Plan Patrocinado',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CSRF Protection
  if (!csrfProtection(req, res)) return;

  // Rate limiting: 5 requests per minute per IP
  if (!limiter.check(req, res, 5)) return;

  try {
    const { businessId, businessName, plan } = req.body;

    if (!businessId || !businessName || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!PLAN_PRICES[plan as keyof typeof PLAN_PRICES]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: PLAN_NAMES[plan as keyof typeof PLAN_NAMES],
              description: `Mejora para ${businessName}`,
            },
            unit_amount: PLAN_PRICES[plan as keyof typeof PLAN_PRICES],
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/${businessId}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/${businessId}?canceled=true`,
      metadata: {
        businessId,
        businessName,
        plan,
      },
      subscription_data: {
        metadata: {
          businessId,
          plan,
        },
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}
