# 🚀 Configuración de Recordatorios de Pago en Vercel

## 📋 Variables de Entorno a Agregar en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables** y agrega:

### 1. Seguridad del Cron (REQUERIDO)
```env
CRON_SECRET=genera_una_clave_secreta_aleatoria_aqui
```
**Cómo generar:**
```bash
# En PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# O usa un generador online: https://randomkeygen.com/
```

### 2. Configuración de Email (REQUERIDO)
```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**⚠️ Importante para EMAIL_PASS:**
1. NO uses tu contraseña normal de Gmail
2. Genera un "App Password" desde Google:
   - Ve a: https://myaccount.google.com/security
   - Activa la verificación en 2 pasos si no la tienes
   - Ve a "App Passwords" (Contraseñas de aplicaciones)
   - Selecciona "Mail" y "Other" (Otro)
   - Copia la contraseña de 16 caracteres
   - Pégala en `EMAIL_PASS` (con o sin espacios)

### 3. WhatsApp con CallMeBot (REQUERIDO)
```env
CALLMEBOT_API_KEY=tu_api_key_de_callmebot
```

**Cómo obtener tu API Key de CallMeBot:**
1. Abre WhatsApp en tu teléfono
2. Agrega este contacto: **+34 644 34 78 89**
3. Envíale el mensaje exacto:
   ```
   I allow callmebot to send me messages
   ```
4. Recibirás una respuesta con tu API key
5. Cópiala y pégala aquí

### 4. URL Base (REQUERIDO)
```env
NEXT_PUBLIC_BASE_URL=https://tu-dominio.vercel.app
```
Reemplaza con tu URL real de Vercel (ejemplo: `https://directorio-yajalon.vercel.app`)

---

## ✅ Variables que YA deberías tener configuradas

Estas ya deberían estar en Vercel desde antes:

```env
# Firebase (necesario para el cron)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Firebase Web (cliente)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... etc
```

---

## 🔥 Configuración de Firestore

### ✅ NO necesitas hacer nada en Firestore

El sistema de recordatorios:
- ✅ Lee de la colección `businesses` existente
- ✅ Usa campos que ya existen (`plan`, `paymentStatus`, `nextPaymentDate`)
- ✅ Escribe en `paymentReminders` (un objeto dentro del documento del negocio)

### 📝 El sistema guardará esto en cada negocio:
```javascript
businesses/{businessId}/
  paymentReminders: {
    7days: timestamp,  // Cuándo se envió recordatorio de 7 días
    3days: timestamp,  // Cuándo se envió recordatorio de 3 días
    1days: timestamp   // Cuándo se envió recordatorio de 1 día
  }
```

Esto evita enviar recordatorios duplicados.

---

## 🧪 Cómo Probar que Funciona

### 1. Verificar que el Cron está activo
Después de desplegar, ve a:
- Vercel Dashboard → Tu Proyecto → **Settings** → **Cron Jobs**
- Deberías ver: `check-payment-reminders` programado para `0 9 * * *`

### 2. Probar manualmente el cron
```bash
curl https://tu-dominio.vercel.app/api/cron/check-payment-reminders \
  -H "Authorization: Bearer tu_cron_secret"
```

Deberías recibir:
```json
{
  "ok": true,
  "totalReminders": 0,
  "successful": 0,
  "failed": 0,
  "reminders": []
}
```

### 3. Probar envío de email
```bash
curl -X POST https://tu-dominio.vercel.app/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "tu_email@ejemplo.com",
    "businessName": "Mi Negocio Test",
    "plan": "sponsor",
    "daysUntilDue": 3,
    "nextPaymentDate": "2026-01-20T00:00:00.000Z"
  }'
```

### 4. Probar envío de WhatsApp
```bash
curl -X POST https://tu-dominio.vercel.app/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "whatsapp",
    "to": "5219191234567",
    "businessName": "Mi Negocio Test",
    "plan": "sponsor",
    "daysUntilDue": 1,
    "nextPaymentDate": "2026-01-13T00:00:00.000Z"
  }'
```

---

## 📊 Cómo Verificar en Firestore

Para ver los recordatorios enviados, ve a Firebase Console:

1. Abre **Firestore Database**
2. Ve a la colección `businesses`
3. Busca un negocio con plan premium
4. Verás un campo `paymentReminders` como:
   ```
   paymentReminders: {
     7days: January 5, 2026 at 9:00:00 AM UTC-6
     3days: January 9, 2026 at 9:00:00 AM UTC-6
   }
   ```

---

## 🔍 Ver Logs de Ejecución

### En Vercel:
1. Ve a tu proyecto en Vercel
2. **Deployments** → Click en tu deployment activo
3. **Functions** → Click en `api/cron/check-payment-reminders`
4. Verás logs como:
   ```
   🔔 Starting payment reminder check...
   📊 Found 2 businesses needing reminders
   ✅ Reminders sent: 2 successful, 0 failed
   ```

---

## ⏰ Horario del Cron

El cron se ejecuta automáticamente:
- **Frecuencia:** Todos los días
- **Hora:** 9:00 AM (UTC)
- **Zona horaria México:** ~3:00 AM (UTC-6)

### Cambiar el horario:
Edita `vercel.json`:
```json
"crons": [
  {
    "path": "/api/cron/check-payment-reminders",
    "schedule": "0 15 * * *"  // 3:00 PM UTC = 9:00 AM México
  }
]
```

Formato cron: `minuto hora día mes día_semana`
- `0 9 * * *` = 9:00 AM todos los días
- `0 15 * * *` = 3:00 PM todos los días
- `0 9 * * 1-5` = 9:00 AM solo días laborables

---

## ❓ Troubleshooting

### El cron no se ejecuta
- ✅ Verifica que `vercel.json` esté en la raíz del proyecto
- ✅ Haz un nuevo deployment (`git push`)
- ✅ Verifica en Settings → Cron Jobs que aparezca

### No llegan emails
- ✅ Verifica `EMAIL_USER` y `EMAIL_PASS` en Vercel
- ✅ Asegúrate de usar App Password, no tu contraseña normal
- ✅ Revisa la carpeta de Spam

### No llegan WhatsApp
- ✅ Verifica `CALLMEBOT_API_KEY` en Vercel
- ✅ Confirma que enviaste el mensaje de activación correcto
- ✅ Verifica el formato del número (521XXXXXXXXXX)

### Error 401 al probar manualmente
- ✅ Usa el header `Authorization: Bearer tu_cron_secret`
- ✅ Asegúrate que el `CRON_SECRET` coincida

---

## 📝 Resumen de Variables Nuevas

Solo necesitas agregar **4 variables nuevas** en Vercel:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `CRON_SECRET` | Clave secreta para proteger el cron | `abc123xyz789...` |
| `EMAIL_USER` | Tu email de Gmail | `pagos@directorioyajalon.com` |
| `EMAIL_PASS` | App Password de Gmail | `abcd efgh ijkl mnop` |
| `CALLMEBOT_API_KEY` | API key de CallMeBot | `123456` |
| `NEXT_PUBLIC_BASE_URL` | URL de tu sitio | `https://tu-sitio.vercel.app` |

¡Y listo! El sistema funcionará automáticamente. 🎉
