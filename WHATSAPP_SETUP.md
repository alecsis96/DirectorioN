# Notificaciones por WhatsApp - Configuración

## 📱 Sistema de Notificaciones WhatsApp

Este sistema envía notificaciones automáticas por WhatsApp usando **Twilio** cuando:
- ✅ Un negocio es aprobado
- ❌ Un negocio es rechazado
- 💳 Se recibe un pago

## 🔧 Configuración de Twilio

### 1. Crear cuenta en Twilio

1. Ve a [Twilio.com](https://www.twilio.com/try-twilio) y crea una cuenta gratuita
2. Verifica tu número de teléfono
3. Accede al [Console Dashboard](https://console.twilio.com/)

### 2. Obtener credenciales

En el dashboard encontrarás:
- **Account SID**: Tu identificador de cuenta (ej: `ACxxxxxxxxxxxxxxxxxx`)
- **Auth Token**: Tu token de autenticación (click en "Show" para revelarlo)

### 3. Configurar WhatsApp Sandbox

Para desarrollo (cuenta gratuita):

1. En el menú izquierdo: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Sigue las instrucciones para unir tu número al sandbox:
   - Envía un mensaje de WhatsApp a: `+1 (415) 523-8886`
   - Mensaje: `join <tu-codigo-sandbox>` (ej: `join nice-window`)
3. El número del sandbox es: `whatsapp:+14155238886`

Para producción (cuenta de pago):
1. Solicita un número de WhatsApp Business
2. Sigue el proceso de verificación de negocio
3. Usa tu número aprobado en lugar del sandbox

### 4. Agregar variables de entorno

En tu archivo `.env.local`, agrega:

```bash
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# URLs base (necesario para notificaciones)
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

### 5. Instalar dependencias (opcional)

Si quieres usar el SDK oficial de Twilio (más fácil):

```bash
npm install twilio
```

Luego modifica `send-whatsapp-notification.ts` para usar el SDK en lugar de fetch.

## 📝 Ejemplo de uso del SDK de Twilio

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  from: process.env.TWILIO_WHATSAPP_NUMBER,
  to: `whatsapp:${phoneNumber}`,
  body: message,
});
```

## 🔍 Verificación

Para verificar que todo funciona:

1. Aprueba un negocio desde el panel de admin
2. Revisa los logs del servidor para mensajes como:
   ```
   📱 WhatsApp notification sent to +52xxxxxxxxxx
   ```
3. El propietario del negocio debería recibir un mensaje de WhatsApp

## 💡 Notas importantes

### Formato de números
- Los números deben incluir código de país: `+52xxxxxxxxxx` (México)
- El sistema normaliza automáticamente números de 10 dígitos agregando `+52`

### Límites de Twilio
- **Sandbox (gratis)**: Solo puedes enviar a números que se hayan unido al sandbox
- **Producción**: Necesitas cuenta verificada y aprobar plantillas de mensajes
- **Rate limits**: 1 mensaje/segundo en cuentas gratuitas

### Plantillas de mensajes
Para producción, debes crear y aprobar plantillas en Twilio:
1. Ve a **Messaging** → **Content Editor**
2. Crea plantillas para: aprobación, rechazo, pago recibido
3. Usa las plantillas aprobadas en tu código

## 🐛 Troubleshooting

### "WhatsApp not configured, skipped"
- Verifica que las variables `TWILIO_*` estén en `.env.local`
- Reinicia el servidor de desarrollo después de agregar variables

### "Twilio error: 21408"
- El número de destino no está en el sandbox
- Pídele al usuario que envíe `join <codigo>` al número sandbox

### "Twilio error: 21211"
- Número de teléfono inválido
- Verifica el formato: debe ser `+52xxxxxxxxxx`

### El mensaje no llega
- Verifica que el número esté activo en WhatsApp
- Revisa los logs en [Twilio Console](https://console.twilio.com/us1/monitor/logs/messages)
- Asegúrate de que el mensaje no exceda 1600 caracteres

## 📚 Recursos

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp/api)
- [Twilio Console](https://console.twilio.com/)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)

## 🔐 Seguridad

⚠️ **NUNCA** subas tus credenciales de Twilio a GitHub:
- Usa siempre `.env.local` (ya está en `.gitignore`)
- En producción (Vercel), agrega las variables en el dashboard
- Rota tus tokens periódicamente

## 💰 Costos

- **Sandbox**: Gratis pero limitado
- **Producción**: ~$0.005 USD por mensaje enviado
- **Número de WhatsApp**: $1-15 USD/mes según el país
