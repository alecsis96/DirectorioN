# Sistema de Recordatorios de Pago Automáticos

## 📋 Descripción

Sistema que envía recordatorios automáticos por **Email** y **WhatsApp** cuando el plan de pago de un negocio está próximo a vencer.

## ⏰ Frecuencia de Notificaciones

Los recordatorios se envían en:
- **7 días** antes del vencimiento
- **3 días** antes del vencimiento  
- **1 día** antes del vencimiento (urgente)

## 🔧 Componentes

### 1. Cron Job (`/api/cron/check-payment-reminders`)
- Se ejecuta **diariamente a las 9:00 AM** (hora del servidor)
- Verifica todos los negocios con planes `featured` o `sponsor` activos
- Identifica cuáles necesitan recordatorio según su `nextPaymentDate`
- Registra en Firestore cada recordatorio enviado

### 2. API de Notificaciones (`/api/send-payment-reminder`)
- Envía recordatorios por Email (vía Gmail/Nodemailer)
- Envía recordatorios por WhatsApp (vía Twilio)
- Templates personalizados según urgencia (7, 3 o 1 día)

## 🚀 Configuración Requerida

### Variables de Entorno

Agrega en tu archivo `.env.local` y en Vercel:

```env
# Cron Job Security
CRON_SECRET=tu_clave_secreta_aleatoria_aqui

# Email (ya configurado)
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password

# WhatsApp (CallMeBot - GRATIS, sin tarjeta de crédito)
CALLMEBOT_API_KEY=tu_api_key_de_callmebot

# Base URL
NEXT_PUBLIC_BASE_URL=https://tu-dominio.vercel.app
```

### Configuración en Vercel

1. **Agregar Variables de Entorno:**
   - Ve a tu proyecto en Vercel
   - Settings → Environment Variables
   - Agrega todas las variables listadas arriba

2. **El Cron Job ya está configurado en `vercel.json`:**
   ```json
   "crons": [
     {
       "path": "/api/cron/check-payment-reminders",
       "schedule": "0 9 * * *"
     }
   ]
   ```

3. **Desplegar:**
   ```bash
   git push
   ```
   Vercel detectará automáticamente el cron y lo programará.

## 📱 Configuración de WhatsApp con CallMeBot

### ✅ Ventajas de CallMeBot:
- **100% GRATIS** - Sin costos ni límites
- **Sin registro** - No necesitas crear cuenta
- **Sin tarjeta de crédito** - Cero pagos
- **Setup en 2 minutos** - Súper rápido

### Paso 1: Agregar el Contacto de CallMeBot
1. Abre WhatsApp en tu teléfono
2. Agrega este número a tus contactos: **+34 644 34 78 89**
3. Nómbralo como "CallMeBot" o similar

### Paso 2: Obtener tu API Key
1. Envía un mensaje a ese contacto con el texto exacto:
   ```
   I allow callmebot to send me messages
   ```
2. Recibirás una respuesta automática con tu **API key**
3. Guarda ese código, lo necesitarás para configurar

### Paso 3: Configurar Variables
Agrega en Vercel y `.env.local`:
```env
CALLMEBOT_API_KEY=tu_api_key_aqui
```

### Paso 4: ¡Listo!
Ya puedes recibir notificaciones de WhatsApp automáticas. No necesitas nada más.

### 📝 Notas sobre CallMeBot:
- Los mensajes se envían desde tu propio número
- Es completamente gratuito y sin límites
- Funciona internacionalmente
- No requiere aprobación ni verificación
- Perfecto para recordatorios de pago

## 📧 Contenido de las Notificaciones

### Email
- Header con urgencia visual (colores según días restantes)
- Información del negocio y fecha de vencimiento
- Datos bancarios para transferencia
- Enlaces a WhatsApp y email de pagos
- Botón directo al dashboard

### WhatsApp
- Mensaje corto y directo
- Emoji según urgencia (🔔 → ⚠️ → 🚨)
- Datos para transferencia
- Contactos de soporte

## 🧪 Pruebas

### Probar Manualmente el Cron
```bash
# Desarrollo local
curl http://localhost:3000/api/cron/check-payment-reminders \
  -H "Authorization: Bearer tu_cron_secret"

# Producción
curl https://tu-dominio.vercel.app/api/cron/check-payment-reminders \
  -H "Authorization: Bearer tu_cron_secret"
```

### Probar Envío de Email
```bash
curl -X POST http://localhost:3000/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "test@ejemplo.com",
    "businessName": "Mi Negocio",
    "plan": "sponsor",
    "daysUntilDue": 3,
    "nextPaymentDate": "2026-01-20T00:00:00.000Z"
  }'
```

### Probar Envío de WhatsApp
```bash
curl -X POST http://localhost:3000/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "whatsapp",
    "to": "5219191234567",
    "businessName": "Mi Negocio",
    "plan": "sponsor",
    "daysUntilDue": 1,
    "nextPaymentDate": "2026-01-13T00:00:00.000Z"
  }'
```

## 📊 Monitoreo

### Ver Logs en Vercel
1. Ve a tu proyecto en Vercel
2. **Deployments** → Click en tu deployment
3. **Functions** → `api/cron/check-payment-reminders`
4. Ver logs de ejecución

### Verificar Recordatorios Enviados
Los recordatorios se registran en Firestore:
```javascript
businesses/{businessId}/paymentReminders/
  7days: timestamp
  3days: timestamp
  1days: timestamp
```

## 🔒 Seguridad

- El endpoint del cron está protegido con `CRON_SECRET`
- Solo Vercel puede ejecutar el cron automáticamente
- Las notificaciones solo se envían si hay configuración válida

## ⚙️ Personalización

### Cambiar Horario del Cron
Edita en `vercel.json`:
```json
"schedule": "0 9 * * *"  // 9:00 AM diario
```

Formatos comunes:
- `0 9 * * *` - 9:00 AM todos los días
- `0 8,20 * * *` - 8:00 AM y 8:00 PM
- `0 9 * * 1-5` - 9:00 AM solo días laborables

### Cambiar Días de Recordatorio
Edita en `/api/cron/check-payment-reminders.ts`:
```typescript
const REMINDER_DAYS = [7, 3, 1]; // Cambia a tus preferencias
```

## ❓ Troubleshooting

### El cron no se ejecuta
- Verifica que esté desplegado en Vercel
- Revisa que `vercel.json` esté en la raíz del proyecto
- Verifica logs en Vercel Dashboard

### No llegan emails
- Verifica `EMAIL_USER` y `EMAIL_PASS` en Vercel
- Verifica que uses App Password de Gmail
- Revisa logs del endpoint

### No llegan WhatsApp
- Verifica `CALLMEBOT_API_KEY` en Vercel
- Confirma que enviaste el mensaje de activación correctamente
- Verifica formato del número (`521` para México)
- Revisa que el contacto de CallMeBot esté guardado

## 📝 Notas Importantes

1. **Costo de WhatsApp:** CallMeBot es 100% gratuito, sin límites.
2. **Límites de Gmail:** Máximo ~500 emails/día con cuenta personal.
3. **Zona Horaria:** El cron usa UTC. Ajusta según tu zona.
4. **Duplicados:** El sistema registra recordatorios enviados para evitar duplicados.

## 🎯 Próximos Pasos

- [ ] Dashboard para ver historial de recordatorios
- [ ] Opción para que usuarios configuren preferencias de notificación
- [ ] Plantillas personalizables desde admin
- [ ] Notificaciones push web
- [ ] Integración con más proveedores de SMS
