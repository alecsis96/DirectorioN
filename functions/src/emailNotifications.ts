/**
 * Sistema de notificaciones por email para el Directorio de Negocios
 * 
 * Envía emails automáticos cuando:
 * 1. Se crea una nueva solicitud (application)
 * 2. Se aprueba una solicitud (application -> business draft)
 * 3. Se publica un negocio (business approved)
 * 4. Se rechaza una solicitud o negocio
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import type { Business, Review } from "./types/business";
import {
  MONETIZATION_DISABLED_RESULT,
  MONETIZATION_FEATURE_ENABLED,
} from "./featureFlags";
import {
  getApplicationNotificationReference,
  getSupportedApplicationSchemaVersion,
} from "./applicationReferences";

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

// Slack Webhook URL para notificaciones de admin
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Envía una notificación a Slack
 */
async function sendSlackNotification(message: {
  text: string;
  blocks?: any[];
}): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_URL not configured. Skipping Slack notification.");
    return;
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log("✅ Slack notification sent successfully");
  } catch (error) {
    console.error("❌ Error sending Slack notification:", error);
  }
}

// Configurar transporter de email usando variables de entorno
// Las credenciales se configuran en functions/.env
const gmailEmail = process.env.EMAIL_USER;
const gmailPassword = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    if (!gmailEmail || !gmailPassword) {
      console.error("Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in functions/.env file");
      return;
    }

    await transporter.sendMail({
      from: `"YajaGon" <${gmailEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// ========== TEMPLATES DE EMAIL ==========

function getApplicationReceivedTemplate(ownerName: string, businessName: string, ownerEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #38761D 0%, #2f5a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { width: 80px; height: 80px; margin: 0 auto 15px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #38761D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://directorio-1.vercel.app/images/logo.png" alt="YajaGon" class="logo" />
          <h1>¡Solicitud Recibida!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${ownerName}</strong>,</p>
          
          <p>¡Gracias por registrar tu negocio en el Directorio de Yajalón!</p>
          
          <p>Hemos recibido tu solicitud para <strong>${businessName}</strong> y nuestro equipo la está revisando.</p>
          
          <h3>¿Qué sigue?</h3>
          <ol>
            <li>📋 Nuestro equipo revisará tu solicitud (usualmente en 24-48 horas)</li>
            <li>✅ Si es aprobada, recibirás un correo con acceso para completar los datos de tu negocio</li>
            <li>🎉 Una vez completados los datos, tu negocio será publicado en el directorio</li>
          </ol>
          
          <p>Puedes verificar el estado de tu solicitud en cualquier momento:</p>
          
          <a href="https://directorio-1.vercel.app/solicitud/${encodeURIComponent(ownerEmail)}" class="button">
            🔍 Verificar Estado
          </a>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            <strong>Consejo:</strong> Guarda este correo o el enlace de arriba para consultar tu solicitud cuando quieras.
          </p>
        </div>
        <div class="footer">
          <p>Directorio de Negocios Yajalón</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getApplicationApprovedTemplate(ownerName: string, businessName: string, businessId: string, ownerEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #38761D 0%, #2f5a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .logo { width: 70px; height: 70px; margin: 0 auto 10px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://directorio-1.vercel.app/images/logo.png" alt="YajaGon" class="logo" />
          <h1>¡Solicitud Aprobada!</h1>
        </div>
        <div class="content">
          <p>¡Excelente noticia, <strong>${ownerName}</strong>!</p>
          
          <p>Tu solicitud para <strong>${businessName}</strong> ha sido aprobada por nuestro equipo. 🎉</p>
          
          <div class="highlight">
            <strong>📝 Siguiente paso: Completa los datos de tu negocio</strong>
            <p style="margin: 10px 0 0 0;">Ahora necesitas completar información adicional como fotos, horarios, ubicación, redes sociales, etc.</p>
          </div>
          
          <p>Haz clic en el botón de abajo para acceder al panel de tu negocio:</p>
          
          <a href="https://directorio-1.vercel.app/dashboard/${businessId}" class="button">
            🚀 Completar Datos de mi Negocio
          </a>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            <strong>Importante:</strong> Tendrás que iniciar sesión con el email <strong>${ownerEmail}</strong>. Una vez que completes todos los datos y envíes a revisión final, publicaremos tu negocio en el directorio.
          </p>
          
          <h3>¿Qué información necesitas preparar?</h3>
          <ul>
            <li>📷 Logo y fotos de tu negocio</li>
            <li>🕐 Horarios de atención</li>
            <li>📍 Ubicación exacta y referencias</li>
            <li>📱 Redes sociales (Facebook, Instagram, etc.)</li>
            <li>💳 Métodos de pago que aceptas</li>
            <li>🚚 Servicios adicionales (domicilio, pickup, etc.)</li>
          </ul>
        </div>
        <div class="footer">
          <p>Directorio de Negocios Yajalón</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getBusinessPublishedTemplate(ownerName: string, businessName: string, businessId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #38761D 0%, #2f5a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .celebration { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">🎉</div>
          <h1>¡Tu Negocio Está Publicado!</h1>
        </div>
        <div class="content">
          <p>¡Felicidades, <strong>${ownerName}</strong>!</p>
          
          <div class="celebration">
            <h2 style="margin: 0 0 10px 0; color: #38761D;">✨ <strong>${businessName}</strong> ya está en línea ✨</h2>
            <p style="margin: 0; font-size: 14px;">Tu negocio ahora es visible para todos en el Directorio de Yajalón</p>
          </div>
          
          <p>¡Tu negocio ha sido publicado exitosamente y ahora miles de personas pueden encontrarte!</p>
          
          <a href="https://directorio-1.vercel.app/negocios/${businessId}" class="button">
            👀 Ver mi Negocio Publicado
          </a>
          
          <h3>📊 Próximos pasos para destacar:</h3>
          <ul>
            <li>💡 Comparte el enlace de tu negocio en tus redes sociales</li>
            <li>⭐ Invita a tus clientes a dejar reseñas</li>
            <li>🚀 Considera mejorar a un plan destacado o patrocinado para mayor visibilidad</li>
            <li>📸 Mantén tus fotos y horarios actualizados</li>
          </ul>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Puedes editar tu negocio en cualquier momento desde tu <a href="https://directorio-1.vercel.app/dashboard/${businessId}">panel de control</a>.
          </p>
        </div>
        <div class="footer">
          <p>Directorio de Negocios Yajalón</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getRejectionTemplate(ownerName: string, businessName: string, reason: string, ownerEmail: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #38761D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .reason-box { background: #fee; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">⚠️</div>
          <h1>Solicitud Requiere Cambios</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${ownerName}</strong>,</p>
          
          <p>Hemos revisado tu solicitud para <strong>${businessName}</strong> y necesitamos que realices algunos cambios antes de poder publicarla.</p>
          
          <div class="reason-box">
            <strong>📋 Motivo:</strong>
            <p style="margin: 10px 0 0 0;">${reason || "Información incompleta o incorrecta. Por favor revisa los datos de tu negocio."}</p>
          </div>
          
          <p><strong>¿Qué puedes hacer?</strong></p>
          <ol>
            <li>Revisa el motivo del rechazo arriba</li>
            <li>Corrige la información necesaria</li>
            <li>Envía nuevamente tu solicitud</li>
          </ol>
          
          <a href="https://directorio-1.vercel.app/solicitud/${encodeURIComponent(ownerEmail)}" class="button">
            🔍 Ver mi Solicitud
          </a>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Si tienes dudas, no dudes en contactarnos. Estamos aquí para ayudarte.
          </p>
        </div>
        <div class="footer">
          <p>Directorio de Negocios Yajalón</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getPaymentFailedTemplate(ownerName: string, businessName: string, businessId: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #38761D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">⚠️</div>
          <h1>Problema con tu Suscripción</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${ownerName}</strong>,</p>
          
          <div class="warning-box">
            <p><strong>No pudimos procesar el pago de tu suscripción</strong> para <strong>${businessName}</strong>.</p>
          </div>
          
          <h3>¿Qué pasó?</h3>
          <p>El cargo automático de tu suscripción no pudo ser procesado. Esto puede deberse a:</p>
          <ul>
            <li>💳 Tarjeta vencida o caducada</li>
            <li>💰 Fondos insuficientes</li>
            <li>🔒 Bloqueo del banco por seguridad</li>
            <li>📋 Datos de pago incorrectos</li>
          </ul>
          
          <h3>¿Qué hacer ahora?</h3>
          <p>Para evitar la interrupción de tu plan, actualiza tu método de pago lo antes posible:</p>
          
          <a href="https://directorio-1.vercel.app/dashboard/${businessId}" class="button">
            💳 Actualizar Método de Pago
          </a>
          
          <p><strong>Importante:</strong> Si no se actualiza el método de pago, tu plan será degradado al plan gratuito y perderás los beneficios de tu plan actual.</p>
          
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            Si tienes dudas o necesitas ayuda, contáctanos.
          </p>
        </div>
        <div class="footer">
          <p>Directorio de Negocios Yajalón</p>
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendNewReviewNotification(review: Review, business: Business): Promise<void> {
  if (!business.ownerEmail) {
    console.warn("[emailNotifications] Business has no ownerEmail, skipping notification.");
    return;
  }

  const dashboardUrl = business.id
    ? `https://directorio-1.vercel.app/dashboard/${business.id}`
    : "https://directorio-1.vercel.app/dashboard";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .cta { display: inline-block; background: #38761D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .rating { font-size: 18px; color: #eab308; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>¡Nueva reseña para ${business.name}!</h2>
        </div>
        <p><strong>Calificación:</strong> <span class="rating">${review.rating ?? "N/A"} ★</span></p>
        <p><strong>Comentario:</strong></p>
        <p>${review.text || "Sin comentario adicional."}</p>
        <p>Puedes responder o gestionar esta reseña desde tu panel:</p>
        <p><a class="cta" href="${dashboardUrl}">Ir a mi panel</a></p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: business.ownerEmail,
    subject: `Nueva reseña para ${business.name}`,
    html,
  });
}

// ========== CLOUD FUNCTIONS ==========

/**
 * Trigger cuando se crea una nueva application
 * Envía email de confirmación al dueño
 */
export const onApplicationCreated = functions.firestore
  .document("applications/{applicationId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const reference = getApplicationNotificationReference(
      context.params.applicationId,
      data || {},
    );
    if (!data || getSupportedApplicationSchemaVersion(data) === null) {
      console.warn("Unsupported application schema; skipping email", reference);
      return;
    }
    
    if (!data.ownerEmail || !data.ownerName) {
      console.log("Missing email or name, skipping email", reference);
      return;
    }

    await sendEmail({
      to: data.ownerEmail,
      subject: "✅ Solicitud recibida - YajaGon",
      html: getApplicationReceivedTemplate(
        data.ownerName,
        data.businessName || "tu negocio",
        data.ownerEmail
      ),
    });
  });

/**
 * Trigger cuando cambia el status de una application
 * Si pasa a 'approved', envía email para completar datos
 */
export const onApplicationStatusChange = functions.firestore
  .document("applications/{applicationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Si el status cambió a 'approved'
    if (before.status !== "approved" && after.status === "approved") {
      const schemaVersion = getSupportedApplicationSchemaVersion(after);
      if (schemaVersion === null) {
        console.warn("Unsupported application schema; skipping approval email", {
          applicationId: context.params.applicationId,
        });
        return;
      }
      if (schemaVersion === 2) {
        console.log("V2 approval email deferred until ownership claims are activated", {
          applicationId: context.params.applicationId,
          businessId: after.businessId || null,
        });
        return;
      }

      const reference = getApplicationNotificationReference(
        context.params.applicationId,
        after,
      );
      if (!reference.businessId) {
        console.warn("Approved application has no exact businessId; skipping email", reference);
        return;
      }

      const businessDoc = await admin
        .firestore()
        .doc(`businesses/${reference.businessId}`)
        .get();
      if (!businessDoc.exists) {
        console.warn("Exact business not found for approved application", reference);
        return;
      }
      
      await sendEmail({
        to: after.ownerEmail,
        subject: "🎉 ¡Solicitud Aprobada! Completa los datos - YajaGon",
        html: getApplicationApprovedTemplate(
          after.ownerName,
          after.businessName || "tu negocio",
          reference.businessId,
          after.ownerEmail
        ),
      });
    }
  });

/**
 * Trigger cuando cambia el status de un business
 * Envía email cuando se publica o rechaza
 * También notifica al admin cuando el dueño envía el negocio a revisión (status: pending)
 */
export const onBusinessStatusChange = functions.firestore
  .document("businesses/{businessId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (!after.ownerEmail || !after.ownerName) {
      return;
    }
    
    // Si el negocio fue enviado a revisión (status cambió a 'pending')
    if (before.status !== "pending" && after.status === "pending") {
      // Enviar notificación a Slack
      await sendSlackNotification({
        text: `🔔 *Nuevo negocio para revisar*`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔔 Nuevo negocio para revisar",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Negocio:*\n${after.businessName || after.name || "Sin nombre"}`,
              },
              {
                type: "mrkdwn",
                text: `*Categoría:*\n${after.category || "No especificada"}`,
              },
              {
                type: "mrkdwn",
                text: `*Dueño:*\n${after.ownerName}`,
              },
              {
                type: "mrkdwn",
                text: `*Email:*\n${after.ownerEmail}`,
              },
            ],
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Teléfono:*\n${after.phone || "No proporcionado"}`,
              },
              {
                type: "mrkdwn",
                text: `*ID:*\n\`${context.params.businessId}\``,
              },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "👀 Revisar Negocio",
                  emoji: true,
                },
                url: `https://directorio-1.vercel.app/admin/pending-businesses`,
                style: "primary",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "📊 Ver Dashboard",
                  emoji: true,
                },
                url: `https://directorio-1.vercel.app/dashboard/${context.params.businessId}`,
              },
            ],
          },
        ],
      });
      
      console.log(`✅ Slack notification sent for business ${context.params.businessId} (${after.businessName})`);
    }
    
    // Si se publicó (status cambió a 'approved')
    if (before.status !== "approved" && after.status === "approved") {
      await sendEmail({
        to: after.ownerEmail,
        subject: "🎉 ¡Tu negocio está publicado! - YajaGon",
        html: getBusinessPublishedTemplate(
          after.ownerName,
          after.businessName || "tu negocio",
          context.params.businessId
        ),
      });
    }
    
    // Si fue rechazado
    if (before.status !== "rejected" && after.status === "rejected") {
      await sendEmail({
        to: after.ownerEmail,
        subject: "⚠️ Solicitud requiere cambios - YajaGon",
        html: getRejectionTemplate(
          after.ownerName,
          after.businessName || "tu negocio",
          after.rejectionReason || "",
          after.ownerEmail
        ),
      });
    }
  });

/**
 * Enviar notificación cuando falla el pago de una suscripción
 * Esta función es llamada desde el webhook de Stripe
 */
export async function sendPaymentFailedNotification(businessId: string): Promise<void> {
  if (!MONETIZATION_FEATURE_ENABLED) return;

  try {
    const businessDoc = await admin.firestore().doc(`businesses/${businessId}`).get();
    
    if (!businessDoc.exists) {
      console.warn(`[sendPaymentFailedNotification] Business ${businessId} not found`);
      return;
    }
    
    const business = businessDoc.data();
    
    if (!business?.ownerEmail || !business?.ownerName) {
      console.warn(`[sendPaymentFailedNotification] Business ${businessId} missing owner data`);
      return;
    }
    
    await sendEmail({
      to: business.ownerEmail,
      subject: "⚠️ Problema con tu suscripción - YajaGon",
      html: getPaymentFailedTemplate(
        business.ownerName,
        business.businessName || "tu negocio",
        businessId
      ),
    });
    
    console.log(`✅ Payment failed notification sent to ${business.ownerEmail} for business ${businessId}`);
  } catch (error) {
    console.error("[sendPaymentFailedNotification] Error:", error);
    throw error;
  }
}

export const onNewReviewCreated = functions.firestore
  .document("businesses/{businessId}/reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    try {
      const review = snap.data() as Review | undefined;
      const businessId = context.params.businessId;
      if (!review || !businessId) {
        console.warn("[onNewReviewCreated] Missing review data or businessId");
        return;
      }

      const businessDoc = await admin.firestore().doc(`businesses/${businessId}`).get();
      if (!businessDoc.exists) {
        console.warn(`[onNewReviewCreated] Business ${businessId} not found`);
        return;
      }

      const business = { id: businessId, ...(businessDoc.data() as Business) };
      await sendNewReviewNotification(review, business);
    } catch (error) {
      console.error("[onNewReviewCreated] Failed to send review notification", error);
    }
  });

/**
 * Cloud Function programada para enviar recordatorios de pago
 * Se ejecuta diariamente a las 9:00 AM (hora del servidor)
 */
export const sendPaymentReminders = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone("America/Mexico_City")
  .onRun(async (context) => {
    if (!MONETIZATION_FEATURE_ENABLED) {
      return MONETIZATION_DISABLED_RESULT;
    }

    console.log("[sendPaymentReminders] Starting scheduled payment reminders");

    try {
      const db = admin.firestore();
      const now = new Date();

      // Obtener negocios con pagos próximos a vencer (3 y 7 días)
      const businessesSnapshot = await db.collection("businesses")
        .where("plan", "in", ["featured", "sponsor"])
        .where("isActive", "!=", false)
        .get();

      let remindersSent = 0;
      const errors: string[] = [];

      for (const doc of businessesSnapshot.docs) {
        const business = { id: doc.id, ...(doc.data() as any) };
        
        if (!business.nextPaymentDate || !business.ownerEmail) {
          continue;
        }

        const nextPayment = new Date(business.nextPaymentDate);
        const daysUntil = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        try {
          // Enviar recordatorio si faltan 7, 3 días o si ya venció (1 día después)
          if (daysUntil === 7 || daysUntil === 3 || daysUntil === -1) {
            await sendPaymentReminderEmail({
              businessId: business.id,
              businessName: business.name || "Tu negocio",
              ownerEmail: business.ownerEmail,
              nextPaymentDate: business.nextPaymentDate,
              daysUntil,
              plan: business.plan,
            });
            
            remindersSent++;
            console.log(`✅ Reminder sent to ${business.ownerEmail} (${daysUntil} days)`);
          }
        } catch (error: any) {
          console.error(`❌ Failed to send reminder for business ${business.id}:`, error);
          errors.push(`${business.id}: ${error.message}`);
        }
      }

      console.log(`[sendPaymentReminders] Sent ${remindersSent} reminders, ${errors.length} errors`);
      
      if (errors.length > 0) {
        console.error("[sendPaymentReminders] Errors:", errors);
      }

      return { success: true, remindersSent, errors: errors.length };
    } catch (error) {
      console.error("[sendPaymentReminders] Fatal error:", error);
      throw error;
    }
  });

/**
 * Envía un recordatorio de pago por email
 */
async function sendPaymentReminderEmail(params: {
  businessId: string;
  businessName: string;
  ownerEmail: string;
  nextPaymentDate: string;
  daysUntil: number;
  plan: string;
}): Promise<void> {
  if (!MONETIZATION_FEATURE_ENABLED) return;

  const { businessName, ownerEmail, nextPaymentDate, daysUntil, plan } = params;
  
  const formattedDate = new Date(nextPaymentDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let subject = "";
  let urgencyLevel = "";
  let message = "";

  if (daysUntil === 7) {
    subject = `⏰ Recordatorio: Tu pago vence en 7 días - ${businessName}`;
    urgencyLevel = "informativo";
    message = "Tu próximo pago vence en 7 días.";
  } else if (daysUntil === 3) {
    subject = `⚠️ Importante: Tu pago vence en 3 días - ${businessName}`;
    urgencyLevel = "urgente";
    message = "Tu próximo pago vence en 3 días.";
  } else if (daysUntil === -1) {
    subject = `🚨 URGENTE: Tu pago venció ayer - ${businessName}`;
    urgencyLevel = "crítico";
    message = "Tu pago venció ayer. Por favor, actualiza tu método de pago lo antes posible.";
  } else {
    return; // No enviar para otros días
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const dashboardUrl = `${baseUrl}/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #38761D 0%, #2d5418 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">💳 Recordatorio de Pago</h1>
                </td>
              </tr>

              <!-- Nivel de urgencia -->
              <tr>
                <td style="padding: 20px; text-align: center; background-color: ${
                  daysUntil === 7 ? "#E3F2FD" : daysUntil === 3 ? "#FFF3E0" : "#FFEBEE"
                }; border-bottom: 3px solid ${
                  daysUntil === 7 ? "#2196F3" : daysUntil === 3 ? "#FF9800" : "#F44336"
                };">
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${
                    daysUntil === 7 ? "#1976D2" : daysUntil === 3 ? "#F57C00" : "#D32F2F"
                  }; text-transform: uppercase;">
                    Nivel: ${urgencyLevel}
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="color: #333; margin-top: 0;">Hola,</h2>
                  
                  <p style="color: #555; line-height: 1.6; font-size: 16px;">
                    ${message}
                  </p>

                  <div style="background-color: #f8f9fa; border-left: 4px solid #38761D; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 5px 0; color: #333;"><strong>Negocio:</strong> ${businessName}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Plan:</strong> <span style="text-transform: capitalize;">${plan}</span></p>
                    <p style="margin: 5px 0; color: #333;"><strong>Fecha de pago:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Días restantes:</strong> ${daysUntil > 0 ? daysUntil : "Vencido"}</p>
                  </div>

                  ${daysUntil < 0 ? `
                    <div style="background-color: #FFEBEE; border: 2px solid #F44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #D32F2F; font-weight: bold;">⚠️ ATENCIÓN:</p>
                      <p style="margin: 10px 0 0 0; color: #C62828;">
                        Tu negocio puede ser deshabilitado si no actualizas tu método de pago pronto.
                      </p>
                    </div>
                  ` : ""}

                  <p style="color: #555; line-height: 1.6; font-size: 16px;">
                    Para evitar la interrupción del servicio, asegúrate de que tu método de pago esté actualizado.
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #38761D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Ver Mi Dashboard
                    </a>
                  </div>

                  <p style="color: #999; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    <strong>¿Necesitas ayuda?</strong><br>
                    Si tienes alguna pregunta o problema, no dudes en contactarnos.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Este es un correo automático, por favor no respondas directamente.
                  </p>
                  <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                    © ${new Date().getFullYear()} YajaGon - Todos los derechos reservados
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

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@directorioyajalon.com",
    to: ownerEmail,
    subject,
    html,
  });

  console.log(`✅ Payment reminder email sent to ${ownerEmail}`);
}
