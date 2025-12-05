/**
 * Sistema de notificaciones de WhatsApp para eventos del directorio
 * Usa CallMeBot API (gratuita) para enviar mensajes
 * 
 * Setup:
 * 1. Agregar el número de CallMeBot a tus contactos: +34 644 34 78 89
 * 2. Enviar mensaje "I allow callmebot to send me messages" al contacto
 * 3. Recibirás tu API key
 * 4. Agregar en .env.local:
 *    ADMIN_WHATSAPP_NUMBER=521234567890 (tu número con código de país)
 *    CALLMEBOT_API_KEY=tu_api_key
 */

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_NUMBER || '';
const API_KEY = process.env.CALLMEBOT_API_KEY || '';

interface WhatsAppNotification {
  type: 'new_registration' | 'business_review' | 'new_review';
  businessName: string;
  ownerName?: string;
  ownerEmail?: string;
  additionalInfo?: string;
}

/**
 * Envía notificación de WhatsApp al admin
 */
export async function sendWhatsAppNotification(notification: WhatsAppNotification): Promise<boolean> {
  // Si no está configurado, solo log en consola
  if (!ADMIN_PHONE || !API_KEY) {
    console.log('📱 [WhatsApp] Not configured. Notification would be sent:', notification);
    return false;
  }

  try {
    const message = formatMessage(notification);
    const encodedMessage = encodeURIComponent(message);
    
    // CallMeBot API endpoint
    const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_PHONE}&text=${encodedMessage}&apikey=${API_KEY}`;
    
    const response = await fetch(url, { method: 'GET' });
    
    if (response.ok) {
      console.log('✅ [WhatsApp] Notification sent successfully');
      return true;
    } else {
      console.error('❌ [WhatsApp] Failed to send notification:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ [WhatsApp] Error sending notification:', error);
    return false;
  }
}

/**
 * Formatea el mensaje según el tipo de notificación
 */
function formatMessage(notification: WhatsAppNotification): string {
  const { type, businessName, ownerName, ownerEmail, additionalInfo } = notification;
  
  switch (type) {
    case 'new_registration':
      return `🆕 *NUEVO REGISTRO*\n\n` +
        `Negocio: *${businessName}*\n` +
        `Propietario: ${ownerName || 'Sin nombre'}\n` +
        `Email: ${ownerEmail || 'Sin email'}\n\n` +
        `✅ El negocio ha sido creado automáticamente.\n` +
        `📋 Revisa los detalles en el panel admin.`;
    
    case 'business_review':
      return `📝 *SOLICITUD DE REVISIÓN*\n\n` +
        `Negocio: *${businessName}*\n` +
        `Propietario: ${ownerName || 'Sin nombre'}\n` +
        `Email: ${ownerEmail || 'Sin email'}\n\n` +
        `⏳ Pendiente de aprobación\n` +
        `👉 Ir a: https://localhost:3000/admin/pending-businesses`;
    
    case 'new_review':
      return `⭐ *NUEVA RESEÑA*\n\n` +
        `Negocio: *${businessName}*\n` +
        `${additionalInfo || ''}\n\n` +
        `📋 Revisa la reseña en el panel de moderación.`;
    
    default:
      return `📢 *NOTIFICACIÓN*\n\nNegocio: ${businessName}`;
  }
}

/**
 * Notifica cuando se registra un nuevo negocio
 */
export async function notifyNewRegistration(businessName: string, ownerName?: string, ownerEmail?: string) {
  return sendWhatsAppNotification({
    type: 'new_registration',
    businessName,
    ownerName,
    ownerEmail
  });
}

/**
 * Notifica cuando un negocio se envía a revisión
 */
export async function notifyBusinessReview(businessName: string, ownerName?: string, ownerEmail?: string) {
  return sendWhatsAppNotification({
    type: 'business_review',
    businessName,
    ownerName,
    ownerEmail
  });
}

/**
 * Notifica cuando se crea una nueva reseña
 */
export async function notifyNewReview(businessName: string, reviewerName: string, rating: number) {
  return sendWhatsAppNotification({
    type: 'new_review',
    businessName,
    additionalInfo: `Usuario: ${reviewerName}\nCalificación: ${'⭐'.repeat(rating)}`
  });
}
