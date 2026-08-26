# 🚀 WhatsApp Notifications - Inicio Rápido

## ⚡ Setup en 5 minutos

### 1. Elige tu proveedor

**CallMeBot (Gratis, más simple):**
```bash
# Guarda en contactos: +34 644 34 78 89
# Envía WhatsApp: "I allow callmebot to send me messages"
# Recibirás tu API key (ej: 123456)
```

**O Twilio (Profesional):**
```bash
# Crea cuenta en twilio.com
# Obtén Account SID y Auth Token del dashboard
```

### 2. Configura variables de entorno

Agrega a tu `.env.local`:

```bash
# CallMeBot (opción simple)
WHATSAPP_PROVIDER=callmebot
CALLMEBOT_API_KEY=<CALLMEBOT_API_KEY>
ADMIN_WHATSAPP_NUMBER=5219191565865
ADMIN_WHATSAPP_TO=+5219191565865

# O Twilio (opción profesional)
# WHATSAPP_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
# TWILIO_AUTH_TOKEN=tu_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# ADMIN_WHATSAPP_TO=+5219191565865

# Requerido
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Prueba el sistema

```bash
npm run test:whatsapp
```

Deberías ver:
```
✅ ¡Éxito! Deberías recibir el mensaje en WhatsApp
```

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. ¡Listo!

Completa el wizard en `/registro-negocio` y recibirás la notificación.

---

## 🐛 Solución rápida de problemas

### No recibo WhatsApp

**CallMeBot:**
- ¿Guardaste +34 644 34 78 89 en contactos?
- ¿Enviaste el mensaje de activación?
- ¿El API key es correcto?
- ¿ADMIN_WHATSAPP_NUMBER sin + y sin espacios?

**Twilio:**
- ¿Tu número está unido al sandbox?
- ¿Credenciales correctas?
- ¿FROM incluye `whatsapp:` al inicio?

### Ver logs

```bash
# Desarrollo
npm run dev
# Completa wizard y revisa la consola

# Producción (Vercel)
# Dashboard → Logs → Filtrar por "WhatsApp"
```

### Verificar Firestore

Ve a Firebase Console → Firestore → `notifications/`
Busca documentos con patrón: `{userId}_wizard_complete`

---

## 📖 Documentación completa

Ver [WHATSAPP_WIZARD_NOTIFICATIONS.md](./WHATSAPP_WIZARD_NOTIFICATIONS.md)

---

## 🔑 Datos importantes

**"Cambié de teléfono y dejó de funcionar"**

Si cambió el teléfono del ADMIN (quien recibe):
1. Reactivar CallMeBot con el nuevo número
2. Actualizar `ADMIN_WHATSAPP_TO` y `ADMIN_WHATSAPP_NUMBER`
3. Redeploy

Si cambió tu teléfono personal (no afecta):
- El API usa números, no dispositivos
- No necesitas reconfigurar nada

**Formato de números:**
```
CallMeBot ADMIN_WHATSAPP_NUMBER: 5219191565865 (sin +)
Twilio FROM: whatsapp:+14155238886
Destino ADMIN_WHATSAPP_TO: +5219191565865 (con +)
```

**Idempotencia:**
- Si recargas el wizard, NO enviará duplicado
- Los logs quedan en Firestore: `notifications/`
- Para forzar reenvío: elimina el documento de Firestore

---

## 🎯 Checklist de deployment

- [ ] Variables de entorno configuradas
- [ ] CallMeBot/Twilio activado
- [ ] `npm run test:whatsapp` exitoso
- [ ] Firestore rules desplegadas
- [ ] Variables en Vercel (producción)
- [ ] Probado con usuario real

---

## 📞 Testing manual

**Endpoint directo (Postman):**
```bash
POST http://localhost:3000/api/notify/wizard-complete
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_FIREBASE_TOKEN

Body:
{
  "businessId": "test-123",
  "businessName": "Test Business",
  "category": "Restaurante",
  "phone": "6671234567",
  "ownerName": "Test Owner"
}
```

**Desde el wizard:**
1. `/registro-negocio`
2. Login con Google
3. Completa todos los pasos
4. "✓ Enviar solicitud"
5. ✅ Recibes WhatsApp

---

## 🆘 Ayuda

Si nada funciona:

1. ✅ `NEXT_PUBLIC_BASE_URL` correcto
2. ✅ Variables sin espacios ni comillas extra
3. ✅ Firestore rules desplegadas
4. ✅ `npm run test:whatsapp` muestra configuración
5. ✅ Logs en consola muestran el intento

Revisa [WHATSAPP_WIZARD_NOTIFICATIONS.md](./WHATSAPP_WIZARD_NOTIFICATIONS.md) sección Troubleshooting.
