import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { MONETIZATION_FEATURE_ENABLED } from '../../lib/featureFlags';

/**
 * API para enviar recordatorios de pago por email y WhatsApp
 * WhatsApp usa CallMeBot (gratuito, sin necesidad de Twilio)
 */

const isEmailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const isWhatsAppConfigured = Boolean(process.env.CALLMEBOT_API_KEY);

interface ReminderRequest {
  type: 'email' | 'whatsapp';
  to: string;
  businessName: string;
  plan: string;
  daysUntilDue?: number;
  nextPaymentDate?: string;
  action?: 'reminder' | 'overdue' | 'downgraded';
  daysOverdue?: number;
  graceDaysLeft?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!MONETIZATION_FEATURE_ENABLED) {
    return res.status(503).json({ error: 'Monetization is temporarily disabled', code: 'MONETIZATION_DISABLED' });
  }

  const { 
    type, 
    to, 
    businessName, 
    plan, 
    daysUntilDue, 
    nextPaymentDate,
    action = 'reminder',
    daysOverdue,
    graceDaysLeft
  }: ReminderRequest = req.body;

  if (!type || !to || !businessName || !plan) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (type === 'email') {
      return await sendEmailReminder(res, to, businessName, plan, action, daysUntilDue, nextPaymentDate, daysOverdue, graceDaysLeft);
    } else if (type === 'whatsapp') {
      return await sendWhatsAppReminder(res, to, businessName, plan, action, daysUntilDue, nextPaymentDate, daysOverdue, graceDaysLeft);
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
  action: 'reminder' | 'overdue' | 'downgraded',
  daysUntilDue?: number,
  nextPaymentDate?: string,
  daysOverdue?: number,
  graceDaysLeft?: number
) {
  if (!isEmailConfigured) {
    console.warn('Email not configured. Skipping email reminder.');
    return res.status(200).json({ ok: true, message: 'Email not configured, skipped' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const planName = plan === 'sponsor' ? 'Patrocinado' : plan === 'featured' ? 'Destacado' : 'Premium';
  
  let subject: string;
  let html: string;

  if (action === 'downgraded') {
    subject = `⚠️ Tu plan ha cambiado a Gratis - ${businessName}`;
    html = getDowngradedEmailTemplate(businessName, planName);
  } else if (action === 'overdue') {
    subject = `🚨 URGENTE: Pago Vencido - ${businessName} (${graceDaysLeft} días restantes)`;
    html = getOverdueEmailTemplate(businessName, planName, daysOverdue || 0, graceDaysLeft || 0);
  } else {
    const urgencyLevel = (daysUntilDue || 0) <= 1 ? 'urgent' : (daysUntilDue || 0) <= 3 ? 'warning' : 'info';
    subject = (daysUntilDue || 0) === 1 
      ? `⏰ ¡Tu plan vence MAÑANA! - ${businessName}`
      : `🔔 Recordatorio: Tu plan vence en ${daysUntilDue} días - ${businessName}`;
    html = getEmailTemplate(businessName, planName, daysUntilDue || 0, nextPaymentDate || '', urgencyLevel);
  }

  await transporter.sendMail({
    from: `"YajaGon" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`✅ Email ${action} sent to ${to}`);
  return res.status(200).json({ ok: true, message: `Email ${action} sent` });
}

async function sendWhatsAppReminder(
  res: NextApiResponse,
  to: string,
  businessName: string,
  plan: string,
  action: 'reminder' | 'overdue' | 'downgraded',
  daysUntilDue?: number,
  nextPaymentDate?: string,
  daysOverdue?: number,
  graceDaysLeft?: number
) {
  if (!isWhatsAppConfigured) {
    console.warn('CallMeBot not configured. Skipping WhatsApp reminder.');
    return res.status(200).json({ ok: true, message: 'WhatsApp not configured, skipped' });
  }

  const planName = plan === 'sponsor' ? 'Patrocinado' : plan === 'featured' ? 'Destacado' : 'Premium';
  let message: string;

  if (action === 'downgraded') {
    message = 
      `⚠️ *IMPORTANTE: Plan Cambiado*\n\n` +
      `Tu plan *${planName}* para "${businessName}" ha sido cambiado a *Plan Gratis* por falta de pago.\n\n` +
      `💔 Has perdido temporalmente:\n` +
      `• Posición destacada\n` +
      `• Mayor visibilidad\n` +
      `• Funciones premium\n\n` +
      `✅ *¡Puedes recuperar tu plan!*\n` +
      `Realiza tu pago y contacta:\n` +
      `📧 al36xiz@gmail.com\n` +
      `📱 5219191565865\n\n` +
      `Gracias por confiar en YajaGon 🙏`;
  } else if (action === 'overdue') {
    message = 
      `🚨 *PAGO VENCIDO - Período de Gracia*\n\n` +
      `Tu pago para "${businessName}" está vencido hace *${daysOverdue} día(s)*.\n\n` +
      `⏰ Tienes *${graceDaysLeft} día(s)* más para pagar sin perder tu plan *${planName}*.\n\n` +
      `🚨 Si no pagas en ${graceDaysLeft} días, tu negocio pasará al *Plan Gratis* automáticamente.\n\n` +
      `*PAGA AHORA:*\n` +
      `💰 Transferencia:\n` +
      `Banco: NU MEXICO\n` +
      `CLABE: 638180010198636464\n` +
      `Cuenta: 01019863646\n` +
      `Beneficiario: Oscar Alexis Gonzalez Perez\n\n` +
      `📧 Comprobante a: al36xiz@gmail.com\n` +
      `📱 WhatsApp: 5219191565865\n\n` +
      `¡No pierdas tu plan premium!`;
  } else {
    const formattedDate = nextPaymentDate 
      ? new Date(nextPaymentDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const urgencyEmoji = (daysUntilDue || 0) <= 1 ? '🚨' : (daysUntilDue || 0) <= 3 ? '⚠️' : '🔔';
    
    message = (daysUntilDue || 0) === 1
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
        `Gracias por confiar en YajaGon 🙏`;
  }

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
            YajaGon - Tu negocio, más visible
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

function getOverdueEmailTemplate(
  businessName: string,
  planName: string,
  daysOverdue: number,
  graceDaysLeft: number
): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pago Vencido - Período de Gracia</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🚨 PAGO VENCIDO</h1>
          <p style="margin: 12px 0 0 0; font-size: 16px; opacity: 0.95;">
            Período de Gracia Activo
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hola, tu pago para "<strong>${businessName}</strong>" está vencido.
          </p>

          <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #991B1B; font-size: 15px; font-weight: 600;">
              ⏰ Estado del período de gracia:
            </p>
            <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.5;">
              • Vencido hace: <strong>${daysOverdue} día(s)</strong><br>
              • Tiempo restante: <strong>${graceDaysLeft} día(s)</strong><br>
              • Plan actual: <strong>${planName}</strong> (aún activo)
            </p>
          </div>

          <div style="background-color: #FEF9C3; border-left: 4px solid #EAB308; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; color: #854D0E; font-size: 14px; line-height: 1.5;">
              <strong>⚠️ IMPORTANTE:</strong> Si no realizas el pago en los próximos <strong>${graceDaysLeft} días</strong>, 
              tu negocio pasará automáticamente al <strong>Plan Gratis</strong> y perderás:
            </p>
            <ul style="margin: 12px 0 0 0; padding-left: 20px; color: #854D0E;">
              <li>Posición destacada en el directorio</li>
              <li>Mayor visibilidad</li>
              <li>Funciones premium</li>
            </ul>
          </div>

          <!-- Opciones de pago -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">💰 PAGA AHORA:</h3>
            
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
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #DC2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Ir a mi Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            ¿Necesitas ayuda o una extensión? Contáctanos, estamos aquí para apoyarte.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            YajaGon - Tu negocio, más visible
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

function getDowngradedEmailTemplate(
  businessName: string,
  planName: string
): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plan Cambiado a Gratis</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6B7280 0%, #374151 100%); color: white; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">⚠️ Plan Cambiado</h1>
          <p style="margin: 12px 0 0 0; font-size: 16px; opacity: 0.95;">
            Tu negocio ahora está en el Plan Gratis
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Estimado propietario de "<strong>${businessName}</strong>",
          </p>

          <div style="background-color: #F3F4F6; border-left: 4px solid #6B7280; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.5;">
              Tu plan <strong>${planName}</strong> ha sido cambiado a <strong>Plan Gratis</strong> 
              debido a que el período de gracia de 7 días ha expirado sin recibir el pago.
            </p>
          </div>

          <div style="background-color: #FEF2F2; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #991B1B; font-size: 16px;">📉 Cambios en tu cuenta:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #DC2626; line-height: 1.8;">
              <li>Ya no apareces en posición destacada</li>
              <li>Menor visibilidad en búsquedas</li>
              <li>Sin acceso a funciones premium</li>
              <li>Perfil básico sin características avanzadas</li>
            </ul>
          </div>

          <div style="background-color: #DCFCE7; border-left: 4px solid #16A34A; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 15px; font-weight: 600;">
              ✅ ¡Buenas noticias!
            </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
              Tu negocio sigue visible en el directorio y puedes <strong>recuperar tu plan ${planName}</strong> 
              en cualquier momento realizando el pago correspondiente.
            </p>
          </div>

          <!-- Opciones de pago -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">💰 Recupera tu plan premium:</h3>
            
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
              <strong style="color: #1f2937;">📧 Contáctanos:</strong>
              <div style="margin-top: 8px;">
                <a href="mailto:al36xiz@gmail.com" style="color: #2563EB; text-decoration: none;">
                  al36xiz@gmail.com
                </a>
              </div>
            </div>

            <div style="margin-bottom: 0;">
              <strong style="color: #1f2937;">📱 WhatsApp:</strong>
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
              Ver mi Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            Estamos aquí para ayudarte. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            YajaGon - Tu negocio, más visible
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
            Gracias por ser parte de nuestra comunidad
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}
