import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API para enviar notificaciones por WhatsApp usando Twilio
 * Tipos: approved, rejected, payment_received
 */

interface WhatsAppRequest {
  type: 'approved' | 'rejected' | 'payment_received';
  to: string; // Número de teléfono con formato internacional (+52...)
  businessName: string;
  ownerName?: string;
  rejectionNotes?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar que Twilio esté configurado
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // whatsapp:+14155238886

  if (!accountSid || !authToken || !twilioWhatsAppNumber) {
    console.warn('WhatsApp/Twilio not configured. Set TWILIO_* env variables');
    return res.status(200).json({ ok: true, message: 'WhatsApp not configured, skipped' });
  }

  const { type, to, businessName, ownerName, rejectionNotes }: WhatsAppRequest = req.body;

  if (!type || !to || !businessName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validar formato de teléfono
  if (!to.startsWith('+')) {
    return res.status(400).json({ error: 'Phone number must include country code (e.g., +52...)' });
  }

  try {
    let message = '';

    switch (type) {
      case 'approved':
        message = `🎉 *¡Felicitaciones ${ownerName || ''}!*\n\n` +
          `Tu negocio *"${businessName}"* ha sido *aprobado y publicado* en YajaGon.\n\n` +
          `✅ Ya apareces en el directorio\n` +
          `📱 Los clientes pueden contactarte\n` +
          `🎯 Accede a tu dashboard para más opciones\n\n` +
          `🔗 Ver mi negocio: ${process.env.NEXT_PUBLIC_BASE_URL}/negocios\n\n` +
          `_Gracias por confiar en YajaGon_`;
        break;

      case 'rejected':
        message = `⚠️ *Atención ${ownerName || ''}*\n\n` +
          `Tu negocio *"${businessName}"* requiere algunos ajustes antes de ser publicado.\n\n` +
          `📝 *Motivo:*\n${rejectionNotes || 'No especificado'}\n\n` +
          `👉 Por favor, actualiza la información y vuelve a enviar a revisión.\n\n` +
          `🔗 Ir a mi dashboard: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`;
        break;

      case 'payment_received':
        message = `✅ *Pago recibido - ${ownerName || ''}*\n\n` +
          `Hemos recibido tu pago para el negocio *"${businessName}"*.\n\n` +
          `⏳ Estamos validando tu comprobante y activaremos tu plan premium en breve.\n\n` +
          `Te notificaremos cuando esté activo.\n\n` +
          `_Gracias por tu preferencia_`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    // Enviar mensaje usando Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const params = new URLSearchParams();
    params.append('From', twilioWhatsAppNumber);
    params.append('To', `whatsapp:${to}`);
    params.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twilio error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log(`✅ WhatsApp sent to ${to}: ${type}`, result.sid);
    
    return res.status(200).json({ 
      ok: true, 
      message: 'WhatsApp notification sent successfully',
      messageSid: result.sid 
    });

  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return res.status(500).json({ error: 'Failed to send WhatsApp notification' });
  }
}
