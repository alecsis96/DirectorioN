import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';

/**
 * API para notificar al administrador cuando un negocio es enviado a revisión
 * Solo el dueño del negocio puede enviar esta notificación
 */
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

    const { businessId, businessName } = req.body;

    if (!businessId || !businessName) {
      return res.status(400).json({ error: 'Missing businessId or businessName' });
    }

    const db = getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const businessData = businessDoc.data();

    // Verificar que el usuario es el dueño del negocio
    if (businessData?.ownerId !== decoded.uid) {
      return res.status(403).json({ error: 'Forbidden: You are not the owner of this business' });
    }

    // Construir mensaje para Slack/webhook
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.NOTIFY_WEBHOOK_URL;
    
    if (webhookUrl) {
      const message = {
        text: `🔔 Nuevo negocio enviado a revisión`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 Negocio enviado a revisión',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Negocio:*\n${businessName}`
              },
              {
                type: 'mrkdwn',
                text: `*Dueño:*\n${decoded.email || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Categoría:*\n${businessData?.category || 'N/A'}`
              },
              {
                type: 'mrkdwn',
                text: `*Colonia:*\n${businessData?.colonia || 'N/A'}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Descripción:*\n${businessData?.description?.substring(0, 150) || 'Sin descripción'}${businessData?.description?.length > 150 ? '...' : ''}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '👀 Ver en Admin Panel',
                  emoji: true
                },
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/pending-businesses`,
                style: 'primary'
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📅 ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`
              }
            ]
          }
        ]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Notification sent successfully' 
    });

  } catch (error) {
    console.error('[notify-business-review] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
