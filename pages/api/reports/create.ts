import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { trackBusinessInteraction } from '../../../lib/telemetry';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId, businessName, reason, description } = req.body;

    // Validaciones
    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'businessId es requerido' });
    }

    if (!businessName || typeof businessName !== 'string') {
      return res.status(400).json({ error: 'businessName es requerido' });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason es requerido' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'La descripción debe tener al menos 10 caracteres' });
    }

    if (description.length > 1000) {
      return res.status(400).json({ error: 'La descripción no puede exceder 1000 caracteres' });
    }

    // Verificar que el negocio existe
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Obtener información del usuario (si está autenticado)
    let reporterId: string | null = null;
    let reporterEmail: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        reporterId = decoded.uid;
        reporterEmail = decoded.email || null;
      } catch {
        // Usuario anónimo, continuar
      }
    }

    // Crear el reporte
    const reportData = {
      businessId,
      businessName,
      reporterId,
      reporterEmail,
      reason,
      description: description.trim(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Metadata adicional
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
          req.socket.remoteAddress || 
          'Unknown',
    };

    const reportRef = await adminDb.collection('business_reports').add(reportData);

    // Track el evento
    if (typeof window !== 'undefined') {
      trackBusinessInteraction(
        'business_reported' as any,
        businessId,
        businessName,
        undefined,
        { reason, reportId: reportRef.id }
      );
    }

    // Enviar notificación a Slack (opcional)
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Nuevo Reporte de Negocio`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚨 Nuevo Reporte de Negocio',
                },
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Negocio:*\n${businessName}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Motivo:*\n${reason}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Estado:*\nPendiente`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Reportado por:*\n${reporterEmail || 'Usuario anónimo'}`,
                  },
                ],
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Descripción:*\n${description}`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: '👀 Ver en Admin',
                    },
                    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/reports`,
                  },
                ],
              },
            ],
          }),
        });
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError);
        // No fallar la request si Slack falla
      }
    }

    res.status(200).json({
      success: true,
      reportId: reportRef.id,
      message: 'Reporte enviado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Error al crear el reporte' });
  }
}
