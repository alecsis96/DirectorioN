/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";
import * as https from "https";
// import * as logger from "firebase-functions/logger";

// Inicializar Firebase Admin
initializeApp();

// Importar funciones de notificaciones por email
export {
  onApplicationCreated,
  onApplicationStatusChange,
  onBusinessStatusChange,
  onNewReviewCreated,
  sendPaymentFailedNotification,
  sendPaymentReminders,
} from "./emailNotifications";

/**
 * Cloud Function HTTP para enviar notificación de pago fallido
 * Llamada desde el webhook de Stripe
 */
export const sendPaymentFailedEmail = onRequest(async (req, res) => {
  // Solo permitir POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { businessId } = req.body;

    if (!businessId) {
      res.status(400).json({ error: "Missing businessId" });
      return;
    }

    // Importar la función de notificación
    const { sendPaymentFailedNotification } = await import("./emailNotifications.js");
    
    await sendPaymentFailedNotification(businessId);

    res.status(200).json({ success: true, message: "Notification sent" });
  } catch (error: any) {
    console.error("Error in sendPaymentFailedEmail:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

/**
 * Cloud Function que actualiza el rating promedio del negocio
 * cuando se crea una nueva reseña
 */
export const onReviewCreated = onDocumentCreated(
  "businesses/{businessId}/reviews/{reviewId}",
  async (event) => {
    const businessId = event.params.businessId;
    await updateBusinessRating(businessId);

    // Notificar por WhatsApp al admin
    try {
      const reviewData = event.data?.data();
      const businessDoc = await getFirestore().collection('businesses').doc(businessId).get();
      const businessData = businessDoc.data();
      
      if (reviewData && businessData) {
        await notifyNewReviewWhatsApp(
          businessData.name || businessData.businessName || 'Negocio sin nombre',
          reviewData.name || 'Usuario anónimo',
          reviewData.rating || 0
        );
      }
    } catch (notifyError) {
      console.warn('[onReviewCreated] WhatsApp notification failed:', notifyError);
    }
  }
);

/**
 * Cloud Function que actualiza el rating promedio del negocio
 * cuando se actualiza una reseña existente
 */
export const onReviewUpdated = onDocumentUpdated(
  "businesses/{businessId}/reviews/{reviewId}",
  async (event) => {
    const businessId = event.params.businessId;
    await updateBusinessRating(businessId);
  }
);

/**
 * Cloud Function que actualiza el rating promedio del negocio
 * cuando se elimina una reseña
 */
export const onReviewDeleted = onDocumentDeleted(
  "businesses/{businessId}/reviews/{reviewId}",
  async (event) => {
    const businessId = event.params.businessId;
    await updateBusinessRating(businessId);
  }
);

/**
 * Función auxiliar que calcula y actualiza el rating promedio de un negocio
 */
async function updateBusinessRating(businessId: string): Promise<void> {
  try {
    const db = getFirestore();
    const reviewsRef = db.collection("businesses").doc(businessId).collection("reviews");
    
    // Obtener todas las reseñas del negocio
    const reviewsSnapshot = await reviewsRef.get();
    
    if (reviewsSnapshot.empty) {
      // Si no hay reseñas, establecer rating en 0
      await db.collection("businesses").doc(businessId).update({
        rating: 0,
        reviewCount: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Rating actualizado a 0 para negocio ${businessId} (sin reseñas)`);
      return;
    }

    // Calcular el promedio
    let totalRating = 0;
    let count = 0;

    reviewsSnapshot.forEach((doc) => {
      const review = doc.data();
      if (typeof review.rating === "number") {
        totalRating += review.rating;
        count++;
      }
    });

    const averageRating = count > 0 ? totalRating / count : 0;
    const roundedRating = Math.round(averageRating * 10) / 10; // Redondear a 1 decimal

    // Actualizar el negocio con el nuevo rating
    await db.collection("businesses").doc(businessId).update({
      rating: roundedRating,
      reviewCount: count,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Rating actualizado para negocio ${businessId}: ${roundedRating} (${count} reseñas)`);
  } catch (error) {
    console.error(`Error actualizando rating del negocio ${businessId}:`, error);
    throw error;
  }
}

/**
 * Envía notificación de WhatsApp cuando se crea una nueva reseña
 */
async function notifyNewReviewWhatsApp(
  businessName: string,
  reviewerName: string,
  rating: number
): Promise<void> {
  // Usar variables de entorno (método recomendado por Firebase)
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!adminPhone || !apiKey) {
    console.log("WhatsApp notifications not configured");
    return;
  }

  try {
    const stars = "⭐".repeat(Math.max(0, Math.min(5, rating)));
    const message = `⭐ *NUEVA RESEÑA*\n\nNegocio: *${businessName}*\nUsuario: ${reviewerName}\nCalificación: ${stars}\n\n📋 Revisa la reseña en el panel de moderación.`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${encodedMessage}&apikey=${apiKey}`;

    await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log("✅ WhatsApp notification sent");
          resolve(true);
        } else {
          console.error(`❌ WhatsApp notification failed: ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      }).on("error", reject);
    });
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
}

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// ============================================
// FUNCIONES DE SISTEMA DE ESCASEZ Y ALTA ASISTIDA
// ============================================
export {
  onBusinessPlanChange,
  addToWaitlistCallable,
  confirmWaitlistUpgrade,
  cleanExpiredWaitlist,
  checkUpgradeAvailability,
  getCategoryMetrics,
  onPackagePurchase,
  dailyMetricsReport,
} from "./scarcityFunctions";
