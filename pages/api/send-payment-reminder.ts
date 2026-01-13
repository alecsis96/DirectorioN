import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

/**
 * API para enviar recordatorios de pago por email y WhatsApp
 * WhatsApp usa CallMeBot (gratuito, sin necesidad de Twilio)
 */

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const isEmailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const isWhatsAppConfigured = Boolean(process.env.CALLMEBOT_API_KEY);

interface ReminderRequest {
  type: 'email' | 'whatsapp';
  to: string;
  businessName: string;
  plan: string;
  daysUntilDue: number;
  nextPaymentDate: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, to, businessName, plan, daysUntilDue, nextPaymentDate }: ReminderRequest = req.body;

  if (!type || !to || !businessName || !plan || daysUntilDue === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (type === 'email') {
      return await sendEmailReminder(res, to, businessName, plan, daysUntilDue, nextPaymentDate);
    } else if (type === 'whatsapp') {
      return await sendWhatsAppReminder(res, to, businessName, plan, daysUntilDue, nextPaymentDate);
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (error) {
    console.error(`Error sending ${type} reminder:`, error);
    return res.status(500).json({ error: `Failed to send ${type} reminder` });
  }
}

async function sendEmailReminder(
  res: NextApiResponse,
  to: string,
  businessName: string,
  plan: string,
  daysUntilDue: number,
  nextPaymentDate: string
) {
  if (!isEmailConfigured) {
    console.warn('Email not configured. Skipping email reminder.');
    return res.status(200).json({ ok: true, message: 'Email not configured, skipped' });
  }

  const planName = plan === 'sponsor' ? 'Patrocinado' : 'Destacado';
  const urgencyLevel = daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'warning' : 'info';
  
  const subject = daysUntilDue === 1 
    ? `⏰ ¡Tu plan vence MAÑANA! - ${businessName}`
    : `🔔 Recordatorio: Tu plan vence en ${daysUntilDue} días - ${businessName}`;

  const html = getEmailTemplate(businessName, planName, daysUntilDue, nextPaymentDate, urgencyLevel);

  await transporter.sendMail({
    from: `"Directorio Yajalón" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`✅ Email reminder sent to ${to} (${daysUntilDue} days)`);
  return res.status(200).json({ ok: true, message: 'Email reminder sent' });
}

async function sendWhatsAppReminder(
  res: NextApiResponse,
  to: string,
  businessName: string,
  plan: string,
  daysUntilDue: number,
  nextPaymentDate: string
) {
  if (!isWhatsAppConfigured) {
    console.warn('CallMeBot not configured. Skipping WhatsApp reminder.');
    return res.status(200).json({ ok: true, message: 'WhatsApp not configured, skipped' });
  }

  const planName = plan === 'sponsor' ? 'Patrocinado' : 'Destacado';
  const formattedDate = new Date(nextPaymentDate).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const urgencyEmoji = daysUntilDue <= 1 ? '🚨' : daysUntilDue <= 3 ? '⚠️' : '🔔';
  
  const message = daysUntilDue === 1
    ? `${urgencyEmoji} *RECORDATORIO URGENTE*\n\n` +
      `Hola, tu plan *${planName}* para "${businessName}" vence *MAÑANA* (${formattedDate}).\n\n` +
      `Para mantener tu negocio activo:\n` +
      `💰 *Transferencia Bancaria*\n` +
      `Banco: NU MEXICO\n` +
      `CLABE: 638180010198636464\n` +
      `Cuenta: 01019863646\n` +
      `Beneficiario: Oscar Alexis Gonzalez Perez\n\n` +
      `📧 Envía tu comprobante a: al36xiz@gmail.com\n` +
      `📱 O por WhatsApp al: 5219191565865\n\n` +
      `🏢 También puedes pagar en nuestra sucursal.\n\n` +
      `¿Necesitas ayuda? Responde este mensaje.`
    : `${urgencyEmoji} *Recordatorio de Pago*\n\n` +
      `Hola, tu plan *${planName}* para "${businessName}" vence en *${daysUntilDue} días* (${formattedDate}).\n\n` +
      `Renueva ahora para mantener todos los beneficios:\n` +
      `💰 Transferencia:\n` +
      `Banco: NU MEXICO\n` +
      `CLABE: 638180010198636464\n` +
      `Cuenta: 01019863646\n` +
      `📧 Comprobante a: al36xiz@gmail.com\n` +
      `📱 WhatsApp: 5219191565865\n\n` +
      `Gracias por confiar en Directorio Yajalón 🙏`;

  // CallMeBot API - Simple y gratuito
  const normalizedPhone = to.replace(/\D/g, '');
  const phone = normalizedPhone.startsWith('521') ? normalizedPhone : `521${normalizedPhone}`;
  const encodedMessage = encodeURIComponent(message);
  const apiKey = process.env.CALLMEBOT_API_KEY;
  
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;
  
  const response = await fetch(url, { method: 'GET' });
  
  if (!response.ok) {
    throw new Error(`CallMeBot API error: ${response.status}`);
  }

  console.log(`✅ WhatsApp reminder sent to ${to} (${daysUntilDue} days) via CallMeBot`);
  return res.status(200).json({ ok: true, message: 'WhatsApp reminder sent' });
}

// ============ EMAIL TEMPLATE ============

function getEmailTemplate(
  businessName: string,
  planName: string,
  daysUntilDue: number,
  nextPaymentDate: string,
  urgencyLevel: 'urgent' | 'warning' | 'info'
): string {
  const formattedDate = new Date(nextPaymentDate).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://directorio-1.vercel.app/'}/dashboard`;
  
  const urgencyColors = {
    urgent: { bg: '#DC2626', text: '#FEE2E2', border: '#991B1B' },
    warning: { bg: '#EA580C', text: '#FED7AA', border: '#9A3412' },
    info: { bg: '#2563EB', text: '#DBEAFE', border: '#1E40AF' }
  };

  const colors = urgencyColors[urgencyLevel];
  const emoji = urgencyLevel === 'urgent' ? '🚨' : urgencyLevel === 'warning' ? '⚠️' : '🔔';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recordatorio de Pago</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.border} 100%); padding: 32px 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">${emoji}</div>
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
            ${daysUntilDue === 1 ? '¡Tu plan vence MAÑANA!' : `Tu plan vence en ${daysUntilDue} días`}
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hola,
          </p>
          
          <div style="background-color: ${colors.text}; border-left: 4px solid ${colors.bg}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.5;">
              Tu plan <strong>${planName}</strong> para "<strong>${businessName}</strong>" vencerá el 
              <strong>${formattedDate}</strong>.
            </p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Para mantener activos todos los beneficios de tu plan, realiza tu pago lo antes posible.
          </p>

          <!-- Opciones de pago -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">💰 Formas de pago:</h3>
            
            <div style="margin-bottom: 16px;">
              <strong style="color: #1f2937;">Transferencia Bancaria:</strong>
              <div style="background-color: white; padding: 12px; border-radius: 6px; margin-top: 8px; font-family: 'Courier New', monospace; font-size: 14px;">
                <div>🏦 Banco: <strong>NU MEXICO</strong></div>
                <div>💳 CLABE: <strong>638180010198636464</strong></div>
                <div>💳 Cuenta: <strong>01019863646</strong></div>
                <div>👤 Beneficiario: <strong>Oscar Alexis Gonzalez Perez</strong></div>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <strong style="color: #1f2937;">📧 Envía tu comprobante a:</strong>
              <div style="margin-top: 8px;">
                <a href="mailto:al36xiz@gmail.com" style="color: #2563EB; text-decoration: none;">
                  al36xiz@gmail.com
                </a>
              </div>
            </div>

            <div style="margin-bottom: 0;">
              <strong style="color: #1f2937;">📱 O por WhatsApp:</strong>
              <div style="margin-top: 8px;">
                <a href="https://wa.me/5219191565865" style="color: #25D366; text-decoration: none; font-weight: 600;">
                  521 919 156 5865
                </a>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #38761D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Ir a mi Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            Si ya realizaste tu pago, por favor ignora este mensaje. Validaremos tu comprobante en breve.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Directorio Yajalón - Tu negocio, más visible
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
            Este es un mensaje automático, por favor no respondas a este correo.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}
