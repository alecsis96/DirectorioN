/**
 * WhatsApp Provider Adapters
 * Soporta múltiples proveedores: Twilio y CallMeBot
 */

export type WhatsAppProvider = 'twilio' | 'callmebot';

export interface WhatsAppMessage {
  to: string; // Número de destino con código de país (ej: +5219191565865)
  body: string; // Contenido del mensaje
}

export interface WhatsAppResult {
  success: boolean;
  provider: WhatsAppProvider;
  messageId?: string;
  error?: string;
}

/**
 * Adapter para Twilio WhatsApp
 */
export async function sendViaTwilio(message: WhatsAppMessage): Promise<WhatsAppResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // ej: whatsapp:+14155238886

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      provider: 'twilio',
      error: 'Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)',
    };
  }

  try {
    // Formatear números para Twilio (agregar prefijo whatsapp:)
    const toNumber = message.to.startsWith('whatsapp:') 
      ? message.to 
      : `whatsapp:${message.to.replace(/[^0-9+]/g, '')}`;
    
    const from = fromNumber.startsWith('whatsapp:') 
      ? fromNumber 
      : `whatsapp:${fromNumber}`;

    // Twilio REST API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: toNumber,
        Body: message.body,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        provider: 'twilio',
        messageId: data.sid,
      };
    } else {
      return {
        success: false,
        provider: 'twilio',
        error: `Twilio API error: ${data.message || response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      provider: 'twilio',
      error: `Twilio exception: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Adapter para CallMeBot (gratuito)
 */
export async function sendViaCallMeBot(message: WhatsAppMessage): Promise<WhatsAppResult> {
  const apiKey = process.env.CALLMEBOT_API_KEY;
  const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!apiKey || !adminPhone) {
    return {
      success: false,
      provider: 'callmebot',
      error: 'Missing CallMeBot credentials (CALLMEBOT_API_KEY, ADMIN_WHATSAPP_NUMBER)',
    };
  }

  try {
    // CallMeBot solo soporta envío al número configurado (el del admin)
    const encodedMessage = encodeURIComponent(message.body);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${adminPhone}&text=${encodedMessage}&apikey=${apiKey}`;

    const response = await fetch(url, { method: 'GET' });

    if (response.ok) {
      return {
        success: true,
        provider: 'callmebot',
        messageId: `callmebot_${Date.now()}`,
      };
    } else {
      const text = await response.text();
      return {
        success: false,
        provider: 'callmebot',
        error: `CallMeBot API error: ${response.status} - ${text}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      provider: 'callmebot',
      error: `CallMeBot exception: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Función principal de envío con selección automática de provider
 */
export async function sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
  // Intentar detectar el provider configurado
  const preferredProvider = (process.env.WHATSAPP_PROVIDER || 'callmebot').toLowerCase() as WhatsAppProvider;

  let result: WhatsAppResult;

  // Intentar con el provider preferido
  if (preferredProvider === 'twilio') {
    result = await sendViaTwilio(message);
    // Si Twilio falla, intentar con CallMeBot como fallback
    if (!result.success && process.env.CALLMEBOT_API_KEY) {
      console.warn('⚠️ Twilio failed, trying CallMeBot as fallback...');
      result = await sendViaCallMeBot(message);
    }
  } else {
    result = await sendViaCallMeBot(message);
    // Si CallMeBot falla, intentar con Twilio como fallback
    if (!result.success && process.env.TWILIO_ACCOUNT_SID) {
      console.warn('⚠️ CallMeBot failed, trying Twilio as fallback...');
      result = await sendViaTwilio(message);
    }
  }

  return result;
}

/**
 * Formatea un mensaje de notificación de wizard completado
 */
export function formatWizardCompleteMessage(data: {
  businessName: string;
  category?: string;
  phone?: string;
  ownerName?: string;
  businessId?: string;
  timestamp?: string;
}): string {
  const lines = [
    '✅ *NUEVO REGISTRO COMPLETADO*',
    '',
    `📝 Negocio: *${data.businessName}*`,
  ];

  if (data.category) {
    lines.push(`🏷️ Categoría: ${data.category}`);
  }

  if (data.ownerName) {
    lines.push(`👤 Propietario: ${data.ownerName}`);
  }

  if (data.phone) {
    lines.push(`📞 Tel: ${data.phone}`);
  }

  if (data.businessId) {
    lines.push(`🆔 ID: ${data.businessId}`);
  }

  if (data.timestamp) {
    lines.push(`📅 Fecha: ${data.timestamp}`);
  }

  lines.push('', '👉 Revisa en el panel de admin');

  return lines.join('\n');
}
