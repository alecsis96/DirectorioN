# Sistema de Degradación Automática de Planes

## 📋 Descripción General

Este sistema garantiza que los negocios que no paguen sus planes premium (Featured/Sponsor) pasen automáticamente al **Plan Gratis** después de un período de gracia de **7 días**, manteniendo su visibilidad básica sin perder el registro.

---

## 🔄 Flujo Completo del Sistema

### Fase 1: Recordatorios Preventivos (ANTES del vencimiento)
**Cron:** `check-payment-reminders` - Ejecuta a las 9:00 AM diariamente

- **Día -7**: Recordatorio informativo 🔔
  - Email y WhatsApp con aviso anticipado
  - Tono amigable y preventivo
  
- **Día -3**: Recordatorio de advertencia ⚠️
  - Email y WhatsApp con urgencia moderada
  - Enfatiza fecha próxima de vencimiento

- **Día -1**: Recordatorio URGENTE 🚨
  - Email y WhatsApp con máxima urgencia
  - "Vence MAÑANA" - último aviso preventivo

### Fase 2: Día de Vencimiento (Día 0)
**Cron:** `check-expired-payments` - Ejecuta a las 10:00 AM diariamente

- `paymentStatus` cambia de `active` → `overdue`
- El negocio **mantiene su plan premium**
- Inicia período de gracia de 7 días
- No se envían notificaciones aún (se da 1 día de cortesía)

### Fase 3: Período de Gracia (Días +1 a +7)
**Estado:** `paymentStatus: 'overdue'`, mantiene plan

- Se envían **recordatorios diarios urgentes** por email y WhatsApp
- Mensajes incluyen:
  - Días vencido
  - Días restantes de gracia
  - Advertencia de degradación automática
  - Instrucciones de pago

**Características del período de gracia:**
- ✅ Mantiene plan premium activo (Featured/Sponsor)
- ✅ Negocio sigue destacado en el directorio
- ✅ Todas las funciones premium funcionan normalmente
- ⚠️ Recordatorios diarios intensivos
- ⏰ Cuenta regresiva de días restantes

### Fase 4: Degradación Automática (Día +8)
**Acción:** Si el pago NO se recibió después de 7 días de gracia

**Cambios en Firestore:**
```javascript
{
  plan: 'free',              // De 'featured'/'sponsor' a 'free'
  paymentStatus: 'canceled',  // De 'overdue' a 'canceled'
  previousPlan: 'sponsor',    // Guarda plan anterior
  downgradedAt: '2026-01-13T10:00:00.000Z',
  planUpdatedAt: '2026-01-13T10:00:00.000Z',
  disabledReason: 'Pago vencido desde hace 8 días'
}
```

**Notificación de degradación:**
- Email explicando el cambio a Plan Gratis
- Detalle de funciones perdidas
- Instrucciones para recuperar plan premium
- Tono comprensivo pero firme

**Consecuencias:**
- ❌ Pierde posición destacada
- ❌ Menor visibilidad en búsquedas
- ❌ Sin funciones premium
- ✅ Negocio sigue visible en el directorio (Plan Gratis)
- ✅ Puede recuperar plan pagando en cualquier momento

---

## 🗓️ Cronología Completa (Ejemplo)

| Día | Fecha | Estado | Plan | Acción |
|-----|-------|--------|------|--------|
| -7 | 05 Ene | `active` | `sponsor` | 🔔 Recordatorio informativo |
| -3 | 09 Ene | `active` | `sponsor` | ⚠️ Recordatorio advertencia |
| -1 | 11 Ene | `active` | `sponsor` | 🚨 Recordatorio URGENTE |
| **0** | **12 Ene** | `overdue` | `sponsor` | **Vencimiento** - Inicia gracia |
| +1 | 13 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (6 días restantes) |
| +2 | 14 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (5 días restantes) |
| +3 | 15 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (4 días restantes) |
| +4 | 16 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (3 días restantes) |
| +5 | 17 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (2 días restantes) |
| +6 | 18 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (1 día restante) |
| +7 | 19 Ene | `overdue` | `sponsor` | 🚨 Recordatorio diario (ÚLTIMO DÍA) |
| **+8** | **20 Ene** | `canceled` | `free` | **DEGRADACIÓN AUTOMÁTICA** |

---

## 🛠️ Arquitectura Técnica

### Archivos Clave

```
pages/api/cron/
├── check-payment-reminders.ts    # Recordatorios preventivos (día -7, -3, -1)
└── check-expired-payments.ts     # Degradación y período de gracia (día 0 a +8)

pages/api/
└── send-payment-reminder.ts      # Envío de emails/WhatsApp
    ├── action: 'reminder'         → Recordatorios preventivos
    ├── action: 'overdue'          → Recordatorios de gracia
    └── action: 'downgraded'       → Notificación de degradación

types/
└── business.ts                    # Interface con campos previousPlan y downgradedAt
```

### Cron Jobs en Vercel

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/check-payment-reminders",
      "schedule": "0 9 * * *"   // 9:00 AM UTC (3:00 AM México)
    },
    {
      "path": "/api/cron/check-expired-payments",
      "schedule": "0 10 * * *"  // 10:00 AM UTC (4:00 AM México)
    }
  ]
}
```

### Seguridad

Ambos cron jobs requieren el header de autorización:
```bash
Authorization: Bearer <CRON_SECRET>
```

Variable de entorno: `CRON_SECRET`

---

## 📧 Tipos de Notificaciones

### 1. Recordatorio Preventivo (`action: 'reminder'`)
**Cuándo:** 7, 3, 1 días antes del vencimiento
**Tono:** Amigable, preventivo
**Urgencia:** Baja → Media → Alta

**Contenido:**
- Fecha de vencimiento
- Plan actual
- Opciones de pago
- Link al dashboard

### 2. Recordatorio de Gracia (`action: 'overdue'`)
**Cuándo:** Días +1 a +7 (después de vencer)
**Tono:** Urgente, pero comprensivo
**Urgencia:** Muy alta

**Contenido:**
- Días vencido
- Días restantes de gracia
- Advertencia de degradación automática
- Opciones de pago urgentes
- Enfatiza pérdida de funciones

### 3. Notificación de Degradación (`action: 'downgraded'`)
**Cuándo:** Día +8 (después de terminar gracia)
**Tono:** Informativo, neutral
**Urgencia:** Informativa

**Contenido:**
- Confirmación de cambio a Plan Gratis
- Lista de funciones perdidas
- Explicación del motivo
- Instrucciones para recuperar plan
- Tono comprensivo ("Estamos aquí para ayudar")

---

## 🔍 Consultas Firestore

### Check Payment Reminders (Preventivos)
```javascript
db.collection('businesses')
  .where('plan', 'in', ['featured', 'sponsor'])
  .where('paymentStatus', '==', 'active')
  .where('isActive', '==', true)
  .get()
```

### Check Expired Payments (Degradación)
```javascript
db.collection('businesses')
  .where('plan', 'in', ['featured', 'sponsor'])
  .where('isActive', '==', true)
  .get()
// Luego filtra por nextPaymentDate vencido en código
```

---

## 💾 Campos de Base de Datos

### Campos Estándar
- `plan`: 'free' | 'featured' | 'sponsor'
- `paymentStatus`: 'active' | 'pending' | 'overdue' | 'canceled'
- `nextPaymentDate`: Timestamp - Fecha del próximo pago
- `lastPaymentDate`: Timestamp - Última vez que pagó
- `planUpdatedAt`: Timestamp - Última actualización del plan

### Campos Nuevos (Sistema de Degradación)
- `previousPlan`: string - Plan anterior antes de degradar (ej: 'sponsor')
- `downgradedAt`: Timestamp - Fecha cuando se degradó a free
- `disabledReason`: string - Motivo de la degradación

**Ejemplo de negocio degradado:**
```json
{
  "id": "ABC123",
  "name": "Restaurante El Buen Sabor",
  "plan": "free",
  "paymentStatus": "canceled",
  "previousPlan": "sponsor",
  "downgradedAt": "2026-01-20T10:00:00.000Z",
  "planUpdatedAt": "2026-01-20T10:00:00.000Z",
  "disabledReason": "Pago vencido desde hace 8 días",
  "nextPaymentDate": "2026-01-12T00:00:00.000Z",
  "lastPaymentDate": "2025-12-12T00:00:00.000Z"
}
```

---

## 🔄 Recuperación de Plan Premium

Si un negocio degradado quiere recuperar su plan:

1. **Cliente realiza pago** (transferencia/efectivo)
2. **Cliente envía comprobante** (email o WhatsApp)
3. **Admin verifica pago** en dashboard de admin
4. **Admin actualiza manualmente:**
   ```javascript
   {
     plan: 'sponsor',              // Restaura plan (usa previousPlan)
     paymentStatus: 'active',
     nextPaymentDate: new Date(+30 días),
     lastPaymentDate: new Date(),
     planUpdatedAt: new Date(),
     previousPlan: undefined,      // Limpia campo
     downgradedAt: undefined,
     disabledReason: undefined
   }
   ```

---

## 📊 Monitoreo y Logs

### Console Logs del Sistema

**check-payment-reminders.ts:**
```
🔔 Starting payment reminder check...
📊 Found 5 businesses needing reminders
✅ Sent 5 email reminders, 4 WhatsApp reminders
```

**check-expired-payments.ts:**
```
🔍 Starting expired payment check...
⚠️ Payment just expired for Restaurante X - marking as overdue
⏰ Grace period day 3/7 for Tienda Y
🔻 Downgrading Ferretería Z to FREE (8 days overdue)
✅ Expired payment check complete
```

### Response del Cron Job
```json
{
  "success": true,
  "markedOverdue": 2,
  "degradedToFree": 1,
  "overdueRemindersSent": 3,
  "gracePeriodBusinesses": 3,
  "message": "Processed 15 premium businesses"
}
```

---

## ⚙️ Variables de Entorno Requeridas

```env
# Autenticación de cron jobs
CRON_SECRET=tu_secret_aleatorio_32_chars

# Email (Gmail)
EMAIL_USER=al36xiz@gmail.com
EMAIL_PASS=tu_app_password_gmail

# WhatsApp (CallMeBot)
CALLMEBOT_API_KEY=tu_api_key_callmebot

# URL base
NEXT_PUBLIC_BASE_URL=https://directorio-1.vercel.app
```

---

## 🎯 Ventajas de este Sistema

✅ **Período de gracia generoso**: 7 días completos
✅ **Notificaciones múltiples**: 10 oportunidades de pago (7 preventivas + 3 durante gracia)
✅ **Sin pérdida de datos**: El negocio pasa a free, no se elimina
✅ **Recuperación fácil**: previousPlan permite restaurar rápido
✅ **Automatización completa**: Sin intervención manual
✅ **Profesional**: Estándar de la industria SaaS
✅ **Transparente**: Cliente sabe exactamente qué pasará y cuándo

---

## 🧪 Testing Manual

### 1. Probar recordatorio de gracia (overdue)
```bash
curl -X POST https://directorio-1.vercel.app/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "al36xiz@gmail.com",
    "businessName": "Test Business",
    "plan": "sponsor",
    "action": "overdue",
    "daysOverdue": 3,
    "graceDaysLeft": 4
  }'
```

### 2. Probar notificación de degradación
```bash
curl -X POST https://directorio-1.vercel.app/api/send-payment-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "to": "al36xiz@gmail.com",
    "businessName": "Test Business",
    "plan": "sponsor",
    "action": "downgraded"
  }'
```

### 3. Probar cron job de vencimientos
```bash
curl https://directorio-1.vercel.app/api/cron/check-expired-payments \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

---

## 📝 Notas Importantes

1. **No se elimina ningún negocio**: Solo cambia de plan, mantiene visibilidad básica
2. **Notificaciones graduales**: De amigable a urgente progresivamente
3. **Doble canal**: Email + WhatsApp para máxima efectividad
4. **Recuperación simple**: Admin puede restaurar plan en segundos
5. **Auditoría completa**: previousPlan y downgradedAt registran todo el historial
6. **Zona horaria**: Crons en UTC, convierte a hora local de México

---

## 🚀 Próximos Pasos

1. ✅ Sistema implementado
2. 🔄 Desplegar a Vercel
3. 🔍 Verificar cron jobs en Vercel Dashboard
4. 📧 Probar notificaciones
5. 📊 Monitorear primeras ejecuciones
6. 🎯 Ajustar textos según feedback de usuarios
7. 📈 Analizar efectividad de recordatorios (tasa de pago)

---

**Fecha de implementación:** 12 de Enero, 2026
**Desarrollador:** Sistema YajaGon
**Versión:** 1.0
