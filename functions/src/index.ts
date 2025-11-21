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
// import * as logger from "firebase-functions/logger";

// Importar funciones de notificaciones por email
export {
  onApplicationCreated,
  onApplicationStatusChange,
  onBusinessStatusChange,
  onNewReviewCreated,
  sendPaymentFailedNotification,
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

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
