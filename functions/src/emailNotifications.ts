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

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
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
      from: `"Directorio Yajalón" <${gmailEmail}>`,
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
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #38761D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .icon { font-size: 48px; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">🏪</div>
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
          <div class="icon">✅</div>
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

// ========== CLOUD FUNCTIONS ==========

/**
 * Trigger cuando se crea una nueva application
 * Envía email de confirmación al dueño
 */
export const onApplicationCreated = functions.firestore
  .document("applications/{applicationId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    if (!data || !data.ownerEmail || !data.ownerName) {
      console.log("Missing email or name, skipping email");
      return;
    }

    await sendEmail({
      to: data.ownerEmail,
      subject: "✅ Solicitud recibida - Directorio Yajalón",
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
      // Buscar el business creado con el mismo ownerEmail
      const businessesRef = admin.firestore().collection("businesses");
      const snapshot = await businessesRef
        .where("ownerEmail", "==", after.ownerEmail)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log("No business found for approved application");
        return;
      }
      
      const businessDoc = snapshot.docs[0];
      
      await sendEmail({
        to: after.ownerEmail,
        subject: "🎉 ¡Solicitud Aprobada! Completa los datos - Directorio Yajalón",
        html: getApplicationApprovedTemplate(
          after.ownerName,
          after.businessName || "tu negocio",
          businessDoc.id,
          after.ownerEmail
        ),
      });
    }
  });

/**
 * Trigger cuando cambia el status de un business
 * Envía email cuando se publica o rechaza
 */
export const onBusinessStatusChange = functions.firestore
  .document("businesses/{businessId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (!after.ownerEmail || !after.ownerName) {
      return;
    }
    
    // Si se publicó (status cambió a 'approved')
    if (before.status !== "approved" && after.status === "approved") {
      await sendEmail({
        to: after.ownerEmail,
        subject: "🎉 ¡Tu negocio está publicado! - Directorio Yajalón",
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
        subject: "⚠️ Solicitud requiere cambios - Directorio Yajalón",
        html: getRejectionTemplate(
          after.ownerName,
          after.businessName || "tu negocio",
          after.rejectionReason || "",
          after.ownerEmail
        ),
      });
    }
  });
