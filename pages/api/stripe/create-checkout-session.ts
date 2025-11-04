import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const PLAN_PRICES = {
  featured: {
    amount: 29900, // $299.00 MXN
    name: 'Plan Featured',
    description: 'Tu negocio destacado en búsquedas durante 1 mes'
  },
  sponsor: {
    amount: 59900, // $599.00 MXN
    name: 'Plan Sponsor',
    description: 'Banner premium + destacado durante 1 mes'
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, businessId, businessName } = req.body;

    if (!plan || !businessId || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (plan !== 'featured' && plan !== 'sponsor') {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const planDetails = PLAN_PRICES[plan];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: planDetails.name,
              description: planDetails.description,
              metadata: {
                businessId,
                businessName
              }
            },
            unit_amount: planDetails.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        businessId,
        businessName,
        plan
      },
      success_url: `${baseUrl}/pago/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/${businessId}?payment=cancelled`,
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('[stripe/create-checkout-session] Error:', error);
    res.status(500).json({ error: error.message || 'Error creating checkout session' });
  }
}
