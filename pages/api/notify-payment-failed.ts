import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Endpoint para enviar notificación de pago fallido
 * Llamado desde el webhook de Stripe
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing businessId' });
    }

    // Obtener datos del negocio
    const businessRef = doc(db, 'businesses', businessId);
    const businessDoc = await getDoc(businessRef);
    
    if (!businessDoc.exists()) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessDoc.data();

    if (!business?.ownerEmail || !business?.ownerName) {
      return res.status(400).json({ error: 'Business missing owner data' });
    }

    // Llamar a la Cloud Function para enviar el email
    const functionsUrl = process.env.FIREBASE_FUNCTIONS_URL || 'https://us-central1-directorion-48816.cloudfunctions.net';
    
    const response = await fetch(`${functionsUrl}/sendPaymentFailedEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId,
        ownerEmail: business.ownerEmail,
        ownerName: business.ownerName,
        businessName: business.businessName || 'tu negocio',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud Function error:', errorText);
      throw new Error('Failed to send notification via Cloud Function');
    }

    console.log(`✅ Payment failed notification sent for business ${businessId}`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error sending payment failed notification:', error);
    res.status(500).json({ error: error.message });
  }
}
