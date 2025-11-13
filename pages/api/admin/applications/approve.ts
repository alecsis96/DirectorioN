// pages/api/admin/applications/approve.ts
/**
 * Endpoint para aprobar solicitudes de registro de negocios
 * Crea automáticamente un negocio en estado 'draft' que el dueño puede completar
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminAuth, getAdminFirestore } from "../../../../lib/server/firebaseAdmin";
import * as admin from "firebase-admin";

/**
 * Normaliza y valida una cadena de texto
 * @param value - Valor a normalizar
 * @param defaultValue - Valor por defecto si está vacío
 * @param maxLength - Longitud máxima permitida
 * @returns String normalizado
 */
function normalizeString(value: unknown, defaultValue = "", maxLength = 500): string {
  if (value === null || value === undefined) return defaultValue;
  const str = String(value).trim();
  if (str.length === 0) return defaultValue;
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

/**
 * Extrae y normaliza el email del dueño desde múltiples fuentes posibles
 */
function extractOwnerEmail(app: any, form: any): string {
  const candidates = [
    form.ownerEmail,
    form.emailContact,
    form.email,
    app.email,
    app.ownerEmail
  ];
  
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate, "", 200).toLowerCase();
    if (normalized && normalized.includes('@')) {
      return normalized;
    }
  }
  
  return "";
}

/**
 * Extrae el UID del dueño desde múltiples fuentes posibles
 */
function extractOwnerId(app: any, form: any): string {
  return normalizeString(
    app.uid || app.ownerId || form.uid || form.ownerId || "",
    "",
    128
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Validar método HTTP
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const auth = getAdminAuth();
    const db = getAdminFirestore();

    // 2. Verificar autenticación y permisos de admin
    const idToken = (req.headers.authorization || "").replace("Bearer ", "");
    if (!idToken) {
      return res.status(401).json({ error: "No se proporcionó token de autenticación" });
    }

    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded.admin) {
      return res.status(403).json({ error: "Se requieren permisos de administrador" });
    }

    // 3. Validar parámetros de entrada
    const { id, applicationId, removeSource = false } = req.body || {};
    const appId = applicationId || id; // Soporta ambos nombres por compatibilidad
    if (!appId || typeof appId !== 'string') {
      return res.status(400).json({ error: "applicationId es obligatorio y debe ser string" });
    }

    // 4. Leer la solicitud desde Firestore
    const appRef = db.collection("applications").doc(appId);
    const appSnap = await appRef.get();
    
    if (!appSnap.exists) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const app = appSnap.data() || {};
    const form = app.formData || {};

    // 5. Validar que la solicitud no haya sido ya aprobada
    if (app.status === "approved") {
      return res.status(400).json({ 
        error: "Esta solicitud ya fue aprobada", 
        businessId: app.businessId 
      });
    }

    // 6. Extraer y normalizar datos del dueño
    const ownerId = extractOwnerId(app, form);
    const ownerEmail = extractOwnerEmail(app, form);

    // Validar que tengamos al menos uno de los dos identificadores
    if (!ownerId && !ownerEmail) {
      return res.status(400).json({ 
        error: "No se encontró ownerId ni ownerEmail válido en la solicitud" 
      });
    }

    // 7. Construir datos del negocio en estado DRAFT
    const businessData = {
      // Información básica
      name: normalizeString(form.businessName, "Negocio sin nombre", 140),
      category: normalizeString(form.category, "", 80),
      description: normalizeString(form.description, "", 1500),
      
      // Ubicación
      address: normalizeString(form.address, "", 300),
      colonia: normalizeString(form.colonia, "", 120),
      
      // Contacto
      phone: normalizeString(form.ownerPhone || form.phone, "", 30),
      WhatsApp: normalizeString(form.whatsapp || form.WhatsApp, "", 30),
      Facebook: normalizeString(form.facebookPage || form.Facebook, "", 300),
      
      // Horarios y precios (opcionales en esta fase)
      hours: normalizeString(form.hours, "", 200),
      price: normalizeString(form.price, "", 100),

      // Identificación del dueño
      ownerId,                // ← UID del dueño (si está disponible)
      ownerEmail,             // ← Email normalizado en minúsculas
      ownerName: normalizeString(form.ownerName, "", 140),
      
      // Estado y configuración
      plan: normalizeString(form.plan, "free", 30),
      featured: false,        // ← Solo admin puede marcar como destacado
      isOpen: "si",           // ← Por defecto abierto
      status: "draft",        // ← 🔑 CLAVE: Empieza como borrador

      // Metadatos
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 8. Crear el negocio en Firestore
    // Usamos auto-ID para evitar conflictos si un usuario tiene múltiples negocios
    const bizRef = db.collection("businesses").doc();
    await bizRef.set(businessData);

    // 9. Actualizar la solicitud como aprobada
    await appRef.update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      businessId: bizRef.id,
      processedBy: decoded.uid, // ??? Auditor??a: qui?n aprob??
    });

    try {
      await db.collection("events").add({
        t: "app_approved",
        ts: admin.firestore.FieldValue.serverTimestamp(),
        uid: decoded.uid || null,
        sd: false,
      });
    } catch (telemetryError) {
      console.warn("[telemetry] app_approved", telemetryError);
    }
    // 10. Opcional: Eliminar la solicitud original si se especificó
    if (removeSource === true) {
      await appRef.delete();
    }

    // 11. TODO: Enviar notificación por email al dueño
    // await sendEmail(ownerEmail, {
    //   subject: "¡Tu negocio fue aprobado!",
    //   body: `Completa los datos de tu negocio en: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/${bizRef.id}`
    // });

    console.info(`✅ Negocio creado en draft: ${bizRef.id} para ${ownerEmail || ownerId}`);

    return res.status(200).json({ 
      ok: true, 
      businessId: bizRef.id,
      status: "draft",
      message: "Negocio creado correctamente en estado borrador"
    });

  } catch (e: any) {
    console.error("❌ Error al aprobar solicitud:", e);
    return res.status(500).json({ 
      error: "Error interno del servidor", 
      details: e.message 
    });
  }
}




