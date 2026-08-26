# Sistema de Notificaciones WhatsApp - Guía Completa

## 📱 Resumen

Sistema robusto de notificaciones por WhatsApp cuando un usuario completa el wizard de registro de negocio.

**Características principales:**
- ✅ Idempotencia garantizada (no duplicados aunque se recargue)
- 🔐 Autenticación y autorización verificadas
- 📊 Logs persistentes en Firestore
- 🔄 Soporte para múltiples proveedores (Twilio y CallMeBot)
- 🆘 Fallback automático a Slack
- 🛡️ Manejo robusto de errores

---

## 🏗️ Arquitectura

```
Usuario completa wizard
    ↓
submitNewBusiness() [server action]
    ↓
POST /api/notify/wizard-complete [API route]
    ↓
    ├─ Valida auth token
    ├─ Verifica que business existe
    ├─ Verifica ownership
    ├─ Chequea idempotencia (Firestore)
    └─ Si no fue enviado antes:
        ├─ Intenta enviar WhatsApp (Twilio o CallMeBot)
        ├─ Guarda log en Firestore
        └─ Fallback a Slack (opcional)
```

---

## ⚙️ Configuración

### Opción A: Twilio WhatsApp (Recomendado para producción)

**1. Crear cuenta en Twilio:**
- Ve a [Twilio.com](https://www.twilio.com/try-twilio)
- Regístrate y verifica tu teléfono

**2. Configurar WhatsApp Sandbox (desarrollo):**
- En el dashboard: **Messaging** → **Try it out** → **Send a WhatsApp message**
- Envía un mensaje de WhatsApp a: `+1 (415) 523-8886`
- Mensaje: `join <tu-codigo>` (ej: `join nice-window`)
- El número del sandbox: `whatsapp:+14155238886`

**3. Variables de entorno (.env.local):**
```bash
# Proveedor preferido
WHATSAPP_PROVIDER=twilio

# Credenciales Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Número de destino (admin)
ADMIN_WHATSAPP_TO=+5219191565865
```

**Para producción:**
- Solicita un número WhatsApp Business aprobado
- Sigue el proceso de verificación de Meta
- Usa tu número aprobado en `TWILIO_WHATSAPP_FROM`

---

### Opción B: CallMeBot (Gratuito, más simple)

**1. Configurar CallMeBot:**
- Guarda en tus contactos: `+34 644 34 78 89` (nombre: "CallMeBot")
- Envía un WhatsApp con: `I allow callmebot to send me messages`
- Recibirás tu API key (ej: `123456`)

**2. Variables de entorno (.env.local):**
```bash
# Proveedor preferido
WHATSAPP_PROVIDER=callmebot

# Credenciales CallMeBot
CALLMEBOT_API_KEY=<CALLMEBOT_API_KEY>
ADMIN_WHATSAPP_NUMBER=5219191565865  # Sin + ni espacios

# Número de destino
ADMIN_WHATSAPP_TO=+5219191565865
```

**Limitaciones:**
- Solo envía al número configurado (tu admin)
- Rate limits menores que Twilio
- No es para alto volumen

---

### Configuración Slack (Fallback opcional)

```bash
# Slack Webhook (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALWAYS_SEND=false  # true para enviar siempre (además de WhatsApp)
```

**Cómo obtener el webhook:**
1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Crea una app → "Incoming Webhooks"
3. Activa webhooks y copia la URL

---

## 📁 Estructura de Archivos

```
lib/whatsapp/
├── adapters.ts              # Adapters para Twilio y CallMeBot
└── notificationService.ts   # Lógica de idempotencia y logs

app/api/notify/
└── wizard-complete/
    └── route.ts             # Endpoint POST seguro

app/actions/
└── businesses.ts            # Actualizado para usar nuevo endpoint
```

---

## 🔧 Variables de Entorno Completas

Copia esto a tu `.env.local`:

```bash
# ============================================
# WHATSAPP NOTIFICATIONS
# ============================================

# Proveedor preferido: 'twilio' o 'callmebot'
WHATSAPP_PROVIDER=callmebot

# --- TWILIO (Opción A - Producción) ---
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=tu_auth_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# --- CALLMEBOT (Opción B - Gratuito) ---
CALLMEBOT_API_KEY=<CALLMEBOT_API_KEY>
ADMIN_WHATSAPP_NUMBER=5219191565865

# Número de destino (admin que recibe notificaciones)
ADMIN_WHATSAPP_TO=+5219191565865

# --- SLACK FALLBACK (Opcional) ---
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
# SLACK_ALWAYS_SEND=false

# Base URL (necesario para llamar al endpoint)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 🧪 Pruebas

### 1. Probar el endpoint directamente (Postman/cURL)

**Paso 1: Obtener un token de Firebase Auth**

```bash
# En la consola del navegador (con un usuario logueado):
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log(token);
```

**Paso 2: Hacer la petición POST**

```bash
curl -X POST http://localhost:3000/api/notify/wizard-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN_HERE" \
  -d '{
    "businessId": "test-123",
    "businessName": "Test Business",
    "category": "Restaurante",
    "phone": "6671234567",
    "ownerName": "Juan Pérez",
    "ownerEmail": "juan@test.com",
    "timestamp": "09/02/2026, 14:30"
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "whatsapp": {
    "sent": true,
    "duplicate": false,
    "error": null
  },
  "slack": {
    "sent": false
  },
  "businessId": "test-123",
  "timestamp": "09/02/2026, 14:30"
}
```

### 2. Probar desde el wizard (flujo real)

1. Ve a `/registro-negocio`
2. Inicia sesión con Google
3. Completa el wizard hasta el último paso
4. Haz clic en "✓ Enviar solicitud"
5. Revisa los logs del servidor:

```
✅ [WhatsApp] Sent wizard complete notification for user-uid-123 via callmebot
✅ [saveNotificationLog] Saved log for user-uid-123_wizard_complete
✅ [WhatsApp] Notification sent: { whatsapp: { sent: true, ... } }
```

6. Deberías recibir el WhatsApp en el número configurado

### 3. Probar idempotencia

1. Completa el wizard una vez (recibes WhatsApp)
2. Recarga el último paso e intenta enviar de nuevo
3. Verifica en los logs:

```
ℹ️ [sendWizardCompleteNotification] Duplicate avoided for user-uid-123
```

4. NO deberías recibir un segundo WhatsApp

---

## 📊 Logs y Monitoreo

### Ver logs en Firestore

Los logs se guardan en: `notifications/{businessId}_wizard_complete`

**Estructura del documento:**
```json
{
  "businessId": "user-uid-123",
  "type": "wizard_complete",
  "status": "sent",  // "sent" o "failed"
  "provider": "callmebot",
  "messageId": "callmebot_1707493200000",
  "error": null,
  "attempts": 1,
  "createdAt": "2026-02-09T14:30:00.000Z",
  "lastAttemptAt": "2026-02-09T14:30:00.000Z"
}
```

### Ver logs en consola (desarrollo)

```bash
npm run dev
# Luego completa el wizard y observa:
```

**Logs exitosos:**
```
✅ [WhatsApp] Sent wizard complete notification for user-123 via callmebot
✅ [saveNotificationLog] Saved log for user-123_wizard_complete
✅ [WhatsApp] Notification sent: { whatsapp: { sent: true, duplicate: false } }
```

**Logs de error:**
```
❌ [WhatsApp] Failed to send notification for user-123: Missing credentials
⚠️ CallMeBot failed, trying Twilio as fallback...
✅ [Slack] Notification sent
```

### Ver logs en Vercel (producción)

1. Ve a [vercel.com/tu-proyecto](https://vercel.com)
2. Click en "Logs"
3. Filtra por: `/api/notify/wizard-complete`
4. Busca mensajes con `[WhatsApp]` o `[Slack]`

---

## 🐛 Troubleshooting

### ❌ No recibo WhatsApp

**1. Verificar variables de entorno:**
```bash
# En el servidor, verifica que las variables estén cargadas:
console.log('WHATSAPP_PROVIDER:', process.env.WHATSAPP_PROVIDER);
console.log('CALLMEBOT_API_KEY:', process.env.CALLMEBOT_API_KEY);
console.log('ADMIN_WHATSAPP_TO:', process.env.ADMIN_WHATSAPP_TO);
```

**2. Verificar configuración del proveedor:**

Para **CallMeBot**:
- ¿Guardaste el número +34 644 34 78 89 en tus contactos?
- ¿Enviaste el mensaje de activación?
- ¿El API key es correcto?
- ¿El número de destino NO tiene + en ADMIN_WHATSAPP_NUMBER?

Para **Twilio**:
- ¿El número está unido al sandbox? (si es cuenta gratuita)
- ¿Las credenciales son correctas?
- ¿El formato incluye `whatsapp:` al inicio?

**3. Verificar logs en Firestore:**
- Ve a `notifications/{uid}_wizard_complete`
- Revisa el campo `error`

**4. Revisar formato de número:**
```
CallMeBot: 5219191565865 (sin +, sin espacios)
Twilio: whatsapp:+5219191565865
ADMIN_WHATSAPP_TO: +5219191565865
```

---

### ❌ "Cambié de teléfono y dejó de funcionar"

**Lo que SÍ afecta:**
- ❌ Si usas CallMeBot y cambiaste el número del admin, necesitas:
  1. Reconfigurar CallMeBot con el nuevo número
  2. Actualizar `ADMIN_WHATSAPP_NUMBER` y `ADMIN_WHATSAPP_TO`
- ❌ Si perdiste el API key de CallMeBot, necesitas generarlo de nuevo

**Lo que NO afecta:**
- ✅ Cambiar el dispositivo físico (el API funciona con el número, no el device)
- ✅ Reinstalar WhatsApp en el mismo número

**Solución:**
1. Accede al nuevo número de WhatsApp
2. Envía de nuevo el mensaje a CallMeBot/Twilio
3. Actualiza las variables de entorno
4. Redeploy la aplicación

---

### ❌ Duplicados (recibo 2+ mensajes)

**Causa:** La idempotencia no está funcionando.

**Verificar:**
1. Firestore debe tener el documento: `notifications/{businessId}_wizard_complete`
2. Si no se crea, verificar permisos de Firestore Rules:

```javascript
// firestore.rules
match /notifications/{notificationId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == resource.data.businessId;
}
```

3. Si el documento se crea pero igual envía duplicado:
   - Verificar que el `businessId` sea el mismo en ambas llamadas
   - Agregar log para debuggear:
     ```typescript
     console.log('Checking idempotency for:', businessId);
     const alreadySent = await checkNotificationSent(businessId);
     console.log('Already sent?', alreadySent);
     ```

---

### ⚠️ Slack no funciona

**Verificar:**
1. `SLACK_WEBHOOK_URL` está configurado correctamente
2. El webhook está activo (probar con curl):
   ```bash
   curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
     -H "Content-Type: application/json" \
     -d '{"text":"Test"}'
   ```
3. El canal de destino existe y el bot tiene permisos

---

## 🚀 Deploy a Producción

### 1. Vercel

**Agregar variables de entorno:**
1. Ve a Settings → Environment Variables
2. Agrega todas las variables de `.env.local`
3. Marca "Production", "Preview", "Development"
4. Click "Save"

**Redeploy:**
```bash
git add .
git commit -m "feat: sistema robusto de notificaciones WhatsApp"
git push
```

### 2. Firestore Rules

Asegúrate de tener reglas para la colección `notifications`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... otras reglas ...
    
    // Logs de notificaciones
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid == resource.data.businessId;
    }
  }
}
```

Despliega las reglas:
```bash
firebase deploy --only firestore:rules
```

---

## 📈 Mejoras Futuras

- [ ] Dashboard para ver historial de notificaciones
- [ ] Retry automático con exponential backoff
- [ ] Templates personalizables por tipo de negocio
- [ ] Soporte para WhatsApp Business API (Meta Cloud)
- [ ] Webhook para recibir respuestas (conversación bidireccional)
- [ ] Notificaciones al usuario (no solo admin)
- [ ] Métricas y analytics de entregas

---

## 🆘 Soporte

Si algo no funciona después de seguir esta guía:

1. Revisa los logs del servidor
2. Verifica Firestore en `notifications/`
3. Prueba el endpoint con Postman/cURL
4. Revisa las variables de entorno

**Checklist rápido:**
- [ ] Variables de entorno configuradas
- [ ] Proveedor (Twilio/CallMeBot) activado correctamente
- [ ] NEXT_PUBLIC_BASE_URL apunta al dominio correcto
- [ ] Firebase Auth funciona (usuario puede loguearse)
- [ ] Firestore Rules permiten writes en `/notifications/`
- [ ] El wizard se completa sin errores en consola

---

## 📝 Changelog

**v2.0 (2026-02-09):**
- Sistema completamente refactorizado
- Idempotencia con Firestore
- Soporte para múltiples proveedores (adapter pattern)
- Endpoint API dedicado con validación
- Logs y monitoreo mejorado
- Fallback automático

**v1.0 (anterior):**
- Sistema básico con `lib/whatsappNotifier.ts`
- Solo CallMeBot
- Sin idempotencia
- Llamadas directas desde server actions
