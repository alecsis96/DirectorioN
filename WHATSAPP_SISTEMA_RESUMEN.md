# Sistema de Notificaciones WhatsApp - Resumen Ejecutivo

## ✅ ¿Qué se implementó?

Sistema robusto y profesional de notificaciones por WhatsApp cuando un usuario completa el wizard de registro de negocio.

### Características implementadas

✅ **Idempotencia garantizada**
- No envía duplicados aunque el cliente recargue
- Log persistente en Firestore (`notifications/`)

✅ **Multi-proveedor con fallback**
- Twilio WhatsApp (profesional, para producción)
- CallMeBot (gratuito, más simple)
- Fallback automático si uno falla

✅ **Seguridad**
- Endpoint API con autenticación Firebase
- Validación de ownership del negocio
- No expone secretos en el cliente

✅ **Manejo de errores**
- Logs detallados en consola y Firestore
- Fallback a Slack opcional
- Reintentos automáticos entre proveedores

✅ **Documentación completa**
- Guía de configuración paso a paso
- Scripts de prueba
- Troubleshooting detallado

---

## 📁 Archivos creados/modificados

### Nuevos archivos

1. **[lib/whatsapp/adapters.ts](lib/whatsapp/adapters.ts)**  
   - Adapters para Twilio y CallMeBot
   - Función principal `sendWhatsApp()` con auto-fallback
   - Formateador de mensajes

2. **[lib/whatsapp/notificationService.ts](lib/whatsapp/notificationService.ts)**  
   - Lógica de idempotencia con Firestore
   - Logs de notificaciones
   - Fallback a Slack

3. **[app/api/notify/wizard-complete/route.ts](app/api/notify/wizard-complete/route.ts)**  
   - Endpoint POST seguro
   - Validación de auth y ownership
   - Llamado desde server actions

4. **[WHATSAPP_WIZARD_NOTIFICATIONS.md](WHATSAPP_WIZARD_NOTIFICATIONS.md)**  
   - Documentación completa (325 líneas)
   - Setup detallado para ambos proveedores
   - Troubleshooting extensivo

5. **[WHATSAPP_QUICKSTART.md](WHATSAPP_QUICKSTART.md)**  
   - Guía de inicio rápido (5 minutos)
   - Checklist de deployment
   - Soluciones quick-fix

6. **[test-whatsapp-notifications.js](test-whatsapp-notifications.js)**  
   - Script de prueba con `npm run test:whatsapp`
   - Tests de adapters y servicio completo
   - Verifica idempotencia

### Archivos modificados

7. **[app/actions/businesses.ts](app/actions/businesses.ts)**  
   - Actualizado `submitNewBusiness()` para usar nuevo endpoint
   - Reemplazo de llamada directa por API call segura

8. **[.env.local.example](.env.local.example)**  
   - Variables para Twilio y CallMeBot
   - Comentarios explicativos detallados

9. **[firestore.rules](firestore.rules)**  
   - Reglas para colección `notifications/`
   - Permisos de lectura/escritura

10. **[package.json](package.json)**  
    - Script `test:whatsapp` agregado

---

## 🚀 Cómo usar (Quick Start)

### 1. Configurar proveedor

**Opción A: CallMeBot (gratuito, recomendado para empezar)**

```bash
# 1. Guarda en contactos: +34 644 34 78 89
# 2. Envía WhatsApp: "I allow callmebot to send me messages"
# 3. Recibes API key (ej: 123456)
```

**Opción B: Twilio (profesional)**

```bash
# 1. Crea cuenta en twilio.com
# 2. Obtén credenciales del dashboard
# 3. Únete al sandbox (desarrollo) o solicita número (producción)
```

### 2. Configurar variables de entorno

Agrega a `.env.local`:

```bash
# Proveedor
WHATSAPP_PROVIDER=callmebot

# CallMeBot
CALLMEBOT_API_KEY=123456
ADMIN_WHATSAPP_NUMBER=5219191565865  # Sin +
ADMIN_WHATSAPP_TO=+5219191565865      # Con +

# O Twilio
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
# TWILIO_AUTH_TOKEN=tu_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Opcional: Slack fallback
# SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Requerido
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Probar

```bash
npm run test:whatsapp
```

**Output esperado:**
```
✅ [WhatsApp] Sent wizard complete notification for test-xxx via callmebot
✅ ¡Éxito! Deberías recibir el mensaje en WhatsApp
```

### 4. Desplegar Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Probar en vivo

1. Ve a `/registro-negocio`
2. Completa el wizard
3. Haz clic en "✓ Enviar solicitud"
4. ✅ Recibes el WhatsApp

---

## 🔍 ¿Por qué dejó de funcionar? (Tu caso)

**Probable causa: Cambio de teléfono**

Si cambiaste el número que **recibe** las notificaciones (admin):

1. ❌ El API key de CallMeBot está asociado a tu número viejo
2. ❌ Las variables de entorno apuntan al número viejo

**Solución:**

```bash
# 1. Con tu NUEVO número, reactivar CallMeBot:
# Guarda +34 644 34 78 89
# Envía: "I allow callmebot to send me messages"
# Recibes nuevo API key

# 2. Actualizar .env.local:
CALLMEBOT_API_KEY=nuevo_api_key
ADMIN_WHATSAPP_NUMBER=52[tu_nuevo_numero]
ADMIN_WHATSAPP_TO=+52[tu_nuevo_numero]

# 3. Si usas Vercel, actualizar variables ahí también

# 4. Redeploy
git push
```

**Lo que NO afecta:**
- Cambiar de dispositivo físico (mismo número)
- Reinstalar WhatsApp
- Cambiar de SIM card (mismo número)

---

## 📊 Monitoreo

### Ver logs en desarrollo

```bash
npm run dev
# Completa el wizard y observa:
```

```
✅ [WhatsApp] Sent wizard complete notification for user-123 via callmebot
✅ [saveNotificationLog] Saved log for user-123_wizard_complete
```

### Ver logs en Firestore

Firebase Console → Firestore → `notifications/`

Documentos con patrón: `{userId}_wizard_complete`

```json
{
  "businessId": "user-123",
  "type": "wizard_complete",
  "status": "sent",
  "provider": "callmebot",
  "messageId": "callmebot_1707493200000",
  "attempts": 1,
  "createdAt": "2026-02-09T14:30:00Z"
}
```

### Ver logs en Vercel (producción)

1. Dashboard de Vercel → tu proyecto
2. Logs → Runtime Logs
3. Filtrar por: `api/notify/wizard-complete`
4. Buscar: `[WhatsApp]` o `[Slack]`

---

## 🐛 Troubleshooting rápido

### ❌ No recibo WhatsApp

```bash
# 1. Verificar variables
npm run test:whatsapp

# 2. Ver qué muestra la consola
# Si dice "Missing credentials" → revisar .env.local
# Si dice "API error" → verificar API key o credenciales Twilio
# Si dice "Duplicate avoided" → ya se envió antes, es normal
```

### ❌ Error "Missing authorization header"

- El endpoint requiere token de Firebase Auth
- Solo se puede llamar con usuario autenticado
- El wizard lo hace automáticamente

### ❌ Recibo duplicados

- Verificar que Firestore Rules estén desplegadas
- Verificar que la colección `notifications/` sea accesible
- Log debería decir: `Duplicate avoided`

---

## 📖 Documentación detallada

**Documentos de referencia:**

- **[WHATSAPP_QUICKSTART.md](WHATSAPP_QUICKSTART.md)** - Inicio rápido (5 min)
- **[WHATSAPP_WIZARD_NOTIFICATIONS.md](WHATSAPP_WIZARD_NOTIFICATIONS.md)** - Guía completa (todo el detalle)
- **[.env.local.example](.env.local.example)** - Todas las variables con comentarios

**Archivos de código:**

- **[lib/whatsapp/adapters.ts](lib/whatsapp/adapters.ts)** - Lógica de proveedores
- **[lib/whatsapp/notificationService.ts](lib/whatsapp/notificationService.ts)** - Idempotencia y logs
- **[app/api/notify/wizard-complete/route.ts](app/api/notify/wizard-complete/route.ts)** - Endpoint API

---

## ✅ Checklist de deployment a producción

Antes de hacer `git push`:

- [ ] Variables de entorno en `.env.local` funcionan localmente
- [ ] `npm run test:whatsapp` exitoso
- [ ] Wizard completado localmente envía WhatsApp
- [ ] Firestore rules desplegadas: `firebase deploy --only firestore:rules`
- [ ] Variables agregadas en Vercel (Settings → Environment Variables)
- [ ] CallMeBot/Twilio activado con número de producción
- [ ] `NEXT_PUBLIC_BASE_URL` apunta al dominio de producción
- [ ] Probado que no envía duplicados (recargar wizard)

---

## 🎯 Próximos pasos opcionales

**Mejoras futuras sugeridas:**

1. **Dashboard de notificaciones**
   - Ver historial en panel admin
   - Filtros por fecha/status
   - Reenvío manual

2. **Retry con exponential backoff**
   - Si falla, reintentar después de 1min, 5min, 30min
   - Guardar intentos en Firestore

3. **Templates personalizables**
   - Diferentes mensajes por categoría de negocio
   - Variables dinámicas configurables

4. **Meta WhatsApp Business API**
   - Más escalable que Twilio
   - Templates aprobados por Meta
   - Conversaciones bidireccionales

5. **Notificaciones al usuario**
   - Además del admin, notificar al dueño del negocio
   - Confirmación de recepción

---

## 📞 Testing manual del endpoint

**Con Postman/curl:**

```bash
# 1. Obtener token de Firebase (console del navegador):
const token = await firebase.auth().currentUser.getIdToken();
console.log(token);

# 2. Hacer petición:
curl -X POST http://localhost:3000/api/notify/wizard-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FIREBASE_TOKEN_AQUI" \
  -d '{
    "businessId": "test-123",
    "businessName": "Test Business",
    "category": "Restaurante",
    "phone": "6671234567",
    "ownerName": "Juan Pérez"
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

---

## 🆘 ¿Necesitas ayuda?

1. Lee [WHATSAPP_QUICKSTART.md](WHATSAPP_QUICKSTART.md) - inicio rápido
2. Lee [WHATSAPP_WIZARD_NOTIFICATIONS.md](WHATSAPP_WIZARD_NOTIFICATIONS.md) - detalle completo
3. Ejecuta `npm run test:whatsapp` - verifica configuración
4. Revisa logs de consola - mensajes de error detallados
5. Revisa Firestore `notifications/` - logs de intentos

---

## 📝 Resumen técnico

**Stack:**
- Next.js API Routes (endpoint seguro)
- Firebase Auth (validación de usuario)
- Firestore (logs e idempotencia)
- Twilio/CallMeBot (proveedores WhatsApp)
- Slack (fallback opcional)

**Flujo:**
1. Usuario completa wizard → `submitNewBusiness()` [server action]
2. Server action → `POST /api/notify/wizard-complete` [con token]
3. API route → valida auth + ownership
4. API route → chequea duplicado en Firestore
5. Si no existe → envía WhatsApp (Twilio o CallMeBot)
6. Guarda log en `notifications/{businessId}_wizard_complete`
7. Si falla WhatsApp → intenta Slack como fallback

**Ventajas:**
- No expone credenciales al cliente
- Idempotencia garantizada
- Fallback automático
- Logs auditables
- Fácil de probar y debuggear

---

**Sistema implementado por:** GitHub Copilot  
**Fecha:** 9 de febrero, 2026  
**Versión:** 2.0 (completa refactorización)
