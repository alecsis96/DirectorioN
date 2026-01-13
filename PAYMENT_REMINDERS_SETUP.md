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

# WhatsApp (Twilio - opcional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

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

## 📱 Configuración de WhatsApp con Twilio

### Paso 1: Crear Cuenta en Twilio
1. Regístrate en [twilio.com](https://www.twilio.com/try-twilio)
2. Verifica tu número de teléfono

### Paso 2: Activar WhatsApp Sandbox
1. En el dashboard de Twilio, ve a **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Sigue las instrucciones para unir tu número al sandbox
3. Envía el código de activación desde tu WhatsApp

### Paso 3: Obtener Credenciales
- **Account SID**: En el dashboard principal
- **Auth Token**: Click en "Show" junto al Auth Token
- **WhatsApp Number**: Número del sandbox (ej: `+14155238886`)

### Paso 4: Configurar Variables
Agrega en Vercel y `.env.local`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Paso 5: Producción (Opcional)
Para usar un número propio de WhatsApp:
1. Solicita aprobación de WhatsApp Business en Twilio
2. Configura tu número verificado
3. Actualiza `TWILIO_WHATSAPP_NUMBER` con tu número

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
- Verifica credenciales de Twilio
- Confirma que el sandbox esté activo
- Verifica formato del número (`+521` para México)

## 📝 Notas Importantes

1. **Costo de WhatsApp:** Twilio cobra por mensaje. Sandbox es gratis para pruebas.
2. **Límites de Gmail:** Máximo ~500 emails/día con cuenta personal.
3. **Zona Horaria:** El cron usa UTC. Ajusta según tu zona.
4. **Duplicados:** El sistema registra recordatorios enviados para evitar duplicados.

## 🎯 Próximos Pasos

- [ ] Dashboard para ver historial de recordatorios
- [ ] Opción para que usuarios configuren preferencias de notificación
- [ ] Plantillas personalizables desde admin
- [ ] Notificaciones push web
- [ ] Integración con más proveedores de SMS
