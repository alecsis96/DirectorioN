/**
 * Servicio de notificaciones con idempotencia
 */

import { getAdminFirestore } from '../server/firebaseAdmin';
import { sendWhatsApp, formatWizardCompleteMessage, type WhatsAppResult } from './adapters';

export interface NotificationPayload {
  businessId: string;
  businessName: string;
  category?: string;
  phone?: string;
  ownerName?: string;
  ownerEmail?: string;
  timestamp?: string;
}

export interface NotificationLog {
  businessId: string;
  type: 'wizard_complete';
  status: 'sent' | 'failed';
  provider?: string;
  messageId?: string;
  error?: string;
  attempts: number;
  createdAt: Date;
  lastAttemptAt: Date;
}

/**
 * Verifica si ya se envió una notificación para este businessId
 * (Idempotencia)
 */
export async function checkNotificationSent(businessId: string, type: string = 'wizard_complete'): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const notificationId = `${businessId}_${type}`;
    const docRef = db.doc(`notifications/${notificationId}`);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return false;
    }

    const data = snapshot.data();
    return data?.status === 'sent';
  } catch (error) {
    console.error('[checkNotificationSent] Error:', error);
    return false; // En caso de error, permitir el reenvío
  }
}

/**
 * Guarda el log de la notificación en Firestore
 */
export async function saveNotificationLog(
  businessId: string,
  type: string,
  result: WhatsAppResult,
  attempts: number = 1
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const notificationId = `${businessId}_${type}`;
    const docRef = db.doc(`notifications/${notificationId}`);

    const log: NotificationLog = {
      businessId,
      type: type as any,
      status: result.success ? 'sent' : 'failed',
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
      attempts,
      createdAt: new Date(),
      lastAttemptAt: new Date(),
    };

    await docRef.set(log, { merge: false });
    console.log(`✅ [saveNotificationLog] Saved log for ${notificationId}`);
  } catch (error) {
    console.error('[saveNotificationLog] Error saving log:', error);
  }
}

/**
 * Envía notificación con idempotencia y logging
 */
export async function sendWizardCompleteNotification(payload: NotificationPayload): Promise<{
  sent: boolean;
  duplicate: boolean;
  error?: string;
}> {
  const { businessId } = payload;

  // 1. Verificar idempotencia
  const alreadySent = await checkNotificationSent(businessId, 'wizard_complete');
  if (alreadySent) {
    console.log(`ℹ️ [sendWizardCompleteNotification] Duplicate avoided for ${businessId}`);
    return { sent: false, duplicate: true };
  }

  // 2. Formatear mensaje
  const message = formatWizardCompleteMessage({
    businessName: payload.businessName,
    category: payload.category,
    phone: payload.phone,
    ownerName: payload.ownerName,
    businessId: payload.businessId,
    timestamp: payload.timestamp || new Date().toLocaleString('es-MX'),
  });

  // 3. Obtener número de destino
  const toNumber = process.env.ADMIN_WHATSAPP_TO || process.env.ADMIN_WHATSAPP_NUMBER || '';
  if (!toNumber) {
    const error = 'ADMIN_WHATSAPP_TO or ADMIN_WHATSAPP_NUMBER not configured';
    console.error(`❌ [sendWizardCompleteNotification] ${error}`);
    
    // Guardar log de fallo
    await saveNotificationLog(businessId, 'wizard_complete', {
      success: false,
      provider: 'twilio', // Default provider for logging
      error,
    });

    return { sent: false, duplicate: false, error };
  }

  // 4. Enviar WhatsApp
  const result = await sendWhatsApp({
    to: toNumber,
    body: message,
  });

  // 5. Guardar log
  await saveNotificationLog(businessId, 'wizard_complete', result);

  // 6. Log en consola
  if (result.success) {
    console.log(`✅ [WhatsApp] Sent wizard complete notification for ${businessId} via ${result.provider}`);
  } else {
    console.error(`❌ [WhatsApp] Failed to send notification for ${businessId}: ${result.error}`);
  }

  return {
    sent: result.success,
    duplicate: false,
    error: result.error,
  };
}

/**
 * Envía notificación a Slack como fallback
 */
export async function sendSlackFallback(payload: NotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.NOTIFY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack] Webhook not configured, skipping');
    return false;
  }

  try {
    const message = `🆕 *NUEVO REGISTRO*\n\n` +
      `Negocio: *${payload.businessName}*\n` +
      `Categoría: ${payload.category || 'N/A'}\n` +
      `Propietario: ${payload.ownerName || 'N/A'}\n` +
      `Email: ${payload.ownerEmail || 'N/A'}\n` +
      `Tel: ${payload.phone || 'N/A'}\n` +
      `ID: ${payload.businessId}`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (response.ok) {
      console.log('✅ [Slack] Notification sent');
      return true;
    } else {
      console.error(`❌ [Slack] Failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[Slack] Error:', error);
    return false;
  }
}
