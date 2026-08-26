import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import {
  AuthorizationError,
  isAdminIdentity,
  verifyIdTokenOrThrow,
} from '../../lib/server/authorization';

/**
 * API para enviar notificaciones por email
 * Tipos: approved, rejected, welcome
 */

type EmailType = 'approved' | 'rejected' | 'welcome';

interface EmailRequest {
  type: EmailType;
  to: string;
  businessName: string;
  ownerName?: string;
  rejectionNotes?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authorization = req.headers.authorization || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  let decoded;
  try {
    decoded = await verifyIdTokenOrThrow(token);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(401).json({ error: 'Autenticacion requerida.' });
  }

  const { type, to, businessName, ownerName, rejectionNotes }: EmailRequest = req.body;

  if (!type || !to || !businessName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const normalizedRecipient = String(to).trim().toLowerCase();
  const verifiedEmail = decoded.email?.trim().toLowerCase();
  const canSendOwnWelcome = type === 'welcome'
    && decoded.email_verified === true
    && Boolean(verifiedEmail)
    && verifiedEmail === normalizedRecipient;
  if (!isAdminIdentity(decoded) && !canSendOwnWelcome) {
    return res.status(403).json({ error: 'Permisos insuficientes para enviar esta notificacion.' });
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    return res.status(503).json({ error: 'Servicio de correo no disponible.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  try {
    let subject = '';
    let html = '';

    switch (type) {
      case 'approved':
        subject = `🎉 ¡Tu negocio "${businessName}" ha sido aprobado!`;
        html = getApprovedTemplate(businessName, ownerName || 'Estimado usuario');
        break;

      case 'rejected':
        subject = `⚠️ Tu negocio "${businessName}" requiere ajustes`;
        html = getRejectedTemplate(businessName, ownerName || 'Estimado usuario', rejectionNotes);
        break;

      case 'welcome':
        subject = `👋 Bienvenido a YajaGon`;
        html = getWelcomeTemplate(ownerName || 'Estimado usuario', businessName);
        break;

      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    await transporter.sendMail({
      from: `"YajaGon" <${emailUser}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}: ${subject}`);
    return res.status(200).json({ ok: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

// ============ TEMPLATES DE EMAIL ============

function getApprovedTemplate(businessName: string, ownerName: string): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`;
  const negociosUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/negocios`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Negocio Aprobado</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              
              <!-- Header con gradiente -->
              <tr>
                <td style="background: linear-gradient(135deg, #38761D 0%, #2d5418 100%); padding: 40px 30px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">¡Felicitaciones!</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Tu negocio ha sido aprobado</p>
                </td>
              </tr>

              <!-- Contenido principal -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                    Hola <strong>${ownerName}</strong>,
                  </p>
                  
                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
                    ¡Excelentes noticias! Tu negocio <strong style="color: #38761D;">"${businessName}"</strong> 
                    ha sido aprobado y ahora está <strong>publicado y visible</strong> en nuestro directorio.
                  </p>

                  <!-- Card de información -->
                  <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); border-left: 4px solid #38761D; padding: 20px; margin: 30px 0; border-radius: 8px;">
                    <p style="margin: 0 0 12px 0; color: #2d5418; font-weight: 600; font-size: 16px;">
                      ✨ ¿Qué significa esto?
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
                      <li>Tu negocio aparece en las búsquedas del directorio</li>
                      <li>Los clientes pueden ver tu información de contacto</li>
                      <li>Puedes recibir llamadas y mensajes de WhatsApp</li>
                      <li>Tienes acceso completo al dashboard</li>
                    </ul>
                  </div>

                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 20px 0;">
                    <strong>Próximos pasos:</strong>
                  </p>

                  <ol style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 30px 0; padding-left: 20px;">
                    <li>Revisa que toda tu información esté correcta</li>
                    <li>Agrega fotos de tu negocio para atraer más clientes</li>
                    <li>Actualiza tus horarios de atención</li>
                    <li>Considera mejorar a un plan destacado para mayor visibilidad</li>
                  </ol>

                  <!-- Botones de acción -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <a href="${dashboardUrl}" style="display: inline-block; background-color: #38761D; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(56, 118, 29, 0.3);">
                          🎯 Ir a Mi Dashboard
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <a href="${negociosUrl}" style="display: inline-block; background-color: #f5f5f5; color: #38761D; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; border: 2px solid #38761D;">
                          👀 Ver Mi Negocio en el Directorio
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Tip destacado -->
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 16px; margin: 30px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      💡 <strong>Consejo:</strong> Los negocios con fotos reciben <strong>3x más visitas</strong>. 
                      Agrega imágenes de calidad en tu dashboard.
                    </p>
                  </div>

                  <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    ¿Tienes preguntas? Responde a este email y te ayudaremos encantados.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    Gracias por ser parte del Directorio de Yajalón
                  </p>
                  <p style="color: #ccc; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} YajaGon
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getRejectedTemplate(businessName: string, ownerName: string, rejectionNotes?: string): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ajustes Requeridos</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 40px 30px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                  <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">Se Requieren Ajustes</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">Tu negocio necesita algunas correcciones</p>
                </td>
              </tr>

              <!-- Contenido -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                    Hola <strong>${ownerName}</strong>,
                  </p>
                  
                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
                    Hemos revisado tu negocio <strong>"${businessName}"</strong> y necesitamos que realices 
                    algunos ajustes antes de poder publicarlo.
                  </p>

                  ${rejectionNotes ? `
                    <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <p style="margin: 0 0 10px 0; color: #e65100; font-weight: 600; font-size: 16px;">
                        📝 Comentarios del revisor:
                      </p>
                      <p style="margin: 0; color: #555; line-height: 1.8; font-size: 15px;">
                        ${rejectionNotes}
                      </p>
                    </div>
                  ` : `
                    <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #555; line-height: 1.8; font-size: 15px;">
                        Por favor revisa que la información de tu negocio esté completa y sea precisa.
                      </p>
                    </div>
                  `}

                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 25px 0 15px 0;">
                    <strong>Qué hacer ahora:</strong>
                  </p>

                  <ol style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 30px 0; padding-left: 20px;">
                    <li>Ingresa a tu dashboard</li>
                    <li>Realiza las correcciones necesarias</li>
                    <li>Verifica que toda la información sea correcta</li>
                    <li>Vuelve a enviar tu negocio a revisión</li>
                  </ol>

                  <!-- Botón -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #ff9800; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);">
                      🔧 Corregir Mi Negocio
                    </a>
                  </div>

                  <!-- Nota informativa -->
                  <div style="background-color: #e3f2fd; border: 1px solid #2196f3; padding: 16px; margin: 30px 0 0 0; border-radius: 8px;">
                    <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;">
                      ℹ️ <strong>Nota:</strong> Este proceso es para asegurar que todos los negocios en nuestro 
                      directorio tengan información completa y precisa. ¡No te desanimes! Una vez que hagas 
                      los ajustes, tu negocio será publicado rápidamente.
                    </p>
                  </div>

                  <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    Si tienes dudas o necesitas ayuda, responde a este email.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    Estamos aquí para ayudarte
                  </p>
                  <p style="color: #ccc; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} YajaGon
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getWelcomeTemplate(ownerName: string, businessName: string): string {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #38761D 0%, #2d5418 100%); padding: 40px 30px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">👋</div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">¡Bienvenido!</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Tu registro ha sido recibido</p>
                </td>
              </tr>

              <!-- Contenido -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                    Hola <strong>${ownerName}</strong>,
                  </p>
                  
                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 0 0 20px 0;">
                    Gracias por registrar tu negocio <strong style="color: #38761D;">"${businessName}"</strong> 
                    en el Directorio de Yajalón.
                  </p>

                  <div style="background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%); padding: 20px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #38761D;">
                    <p style="margin: 0 0 15px 0; color: #2d5418; font-weight: 600; font-size: 16px;">
                      📋 Próximos pasos:
                    </p>
                    <ol style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
                      <li>Completa la información de tu negocio en el dashboard</li>
                      <li>Agrega fotos de calidad (opcional pero recomendado)</li>
                      <li>Configura tus horarios de atención</li>
                      <li>Envía tu negocio a revisión</li>
                    </ol>
                  </div>

                  <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 20px 0;">
                    Una vez que envíes tu negocio a revisión, nuestro equipo lo verificará y lo publicará 
                    en un plazo de <strong>24-48 horas</strong>.
                  </p>

                  <!-- Botón -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #38761D; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(56, 118, 29, 0.3);">
                      🚀 Completar Mi Perfil
                    </a>
                  </div>

                  <!-- Tips -->
                  <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 16px; margin: 30px 0 0 0; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0; color: #856404; font-weight: 600; font-size: 15px;">
                      💡 Tips para destacar:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.8;">
                      <li>Usa fotos profesionales y bien iluminadas</li>
                      <li>Escribe una descripción clara y atractiva</li>
                      <li>Mantén actualizados tus horarios</li>
                      <li>Responde rápido a mensajes y llamadas</li>
                    </ul>
                  </div>

                  <p style="color: #999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                    ¿Necesitas ayuda? Responde a este email y te asistiremos.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 13px; margin: 0 0 10px 0;">
                    ¡Nos alegra tenerte en nuestra comunidad!
                  </p>
                  <p style="color: #ccc; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} YajaGon
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
