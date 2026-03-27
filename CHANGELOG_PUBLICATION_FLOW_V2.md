# 🚀 Flujo de Publicación v2 - CHANGELOG

## 📅 Fecha: 2024

## 🎯 Objetivo
Corregir el flujo de publicación para usar correctamente el estado `ready_for_review` con el sistema dual de estados (businessStatus + applicationStatus), agregando notificaciones automáticas solo cuando el negocio esté listo para revisión admin.

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **✅ Estados Corregidos en requestPublish**
**Archivo:** `app/actions/businessActions.ts`
**Líneas:** 415-445

**ANTES:**
```typescript
businessStatus: 'in_review',  // ❌ Incorrecto - bloqueaba edición
applicationStatus: 'ready_for_review',
```

**DESPUÉS:**
```typescript
businessStatus: 'draft',  // ✅ Correcto - permite seguir editando
applicationStatus: 'ready_for_review',
submittedForReviewAt: new Date(),
submittedForReviewBy: decoded.uid,
lastReviewRequestedAt: new Date(),
```

**Razón del Cambio:**
- El negocio debe permanecer editable (`draft`) mientras está en revisión
- Solo cambia a `published` cuando admin aprueba
- `applicationStatus` rastrea el flujo de revisión
- Nuevos timestamps permiten auditoría y throttling de notificaciones

---

### 2. **🔔 Sistema de Notificaciones con Throttling**
**Archivo:** `pages/api/notify-business-review.ts`
**Líneas:** 38-56

**AGREGADO:**
```typescript
// Throttling: prevenir notificaciones duplicadas en 30 minutos
const lastNotified = businessData?.submittedForReviewAt;
if (lastNotified) {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  const lastNotifiedTime = lastNotified.toMillis?.() || lastNotified.seconds * 1000 || 0;
  
  if (lastNotifiedTime > thirtyMinutesAgo) {
    return res.status(200).json({ 
      throttled: true,
      message: 'Notification already sent recently' 
    });
  }
}
```

**Flujo de Notificación:**
1. ✅ Usuario completa wizard → `applicationStatus: 'submitted'` → **NO se envía notificación**
2. ✅ Usuario completa perfil → `applicationStatus: 'ready_for_review'` (automático)
3. ✅ Usuario click "🚀 Enviar a revisión" → Llama `requestPublish` → **SÍ se envía notificación**
4. ✅ Throttling: Si usuario hace clic de nuevo < 30 min → **No se reenvía**

**Canales de Notificación:**
- 🔔 Slack (webhook configurado en `.env.local`)
- 📱 WhatsApp (vía `lib/whatsappNotifier.ts`)

---

### 3. **📝 Tipos TypeScript Actualizados**
**Archivo:** `types/business.ts`
**Líneas:** ~65

**AGREGADO:**
```typescript
submittedForReviewAt?: string;      // ISO timestamp - cuando se envió a revisión
submittedForReviewBy?: string;       // userId - quien envió a revisión
lastReviewRequestedAt?: string;      // ISO timestamp - última solicitud
```

**Beneficios:**
- Type safety completo
- Auditoría de cambios
- Soporte para throttling de notificaciones
- Trazabilidad de quién solicitó la publicación

---

### 4. **✨ Badge Único en Admin Panel**
**Archivo:** `components/AdminBusinessPanel.tsx`
**Líneas:** 542-577

**ANTES:**
```typescript
// Mostraba AMBOS badges siempre:
// 📝 draft + 🔍 ready_for_review (confuso)
```

**DESPUÉS:**
```typescript
// Lógica inteligente:
// - Si tiene applicationStatus en revisión → mostrar SOLO applicationStatus
// - Si no → mostrar businessStatus
// + Badge del plan (FREE/FEATURED/SPONSOR)
```

**Ejemplo Visual:**
```
ANTES: [📝 draft] [🔍 ready_for_review]  ← Redundante
DESPUÉS: [🔍 Listo para revisar] [🆓 FREE]  ← Claro y conciso
```

---

### 5. **🔧 Estado Local Corregido en Dashboard**
**Archivo:** `components/DashboardEditor.tsx`
**Líneas:** 530-568

**CAMBIO:**
```typescript
// ANTES
businessStatus: 'in_review',  // ❌ Inconsistente con Firestore

// DESPUÉS
businessStatus: 'draft',      // ✅ Consistente - refleja estado real
```

**Impacto:**
- Evita inconsistencias entre UI y base de datos
- Permite seguir editando después de enviar a revisión
- Banner se actualiza correctamente después del envío

---

## 📊 ARQUITECTURA DEL SISTEMA

### Estados Duales (businessStatus + applicationStatus)

```
┌─────────────────────────────────────────────────────────────────┐
│  FLUJO COMPLETO DE PUBLICACIÓN                                  │
└─────────────────────────────────────────────────────────────────┘

1️⃣ Usuario completa wizard
   businessStatus: 'draft'
   applicationStatus: 'submitted'
   ❌ NO enviar notificación

2️⃣ Usuario completa perfil (50%+)
   businessStatus: 'draft'
   applicationStatus: 'ready_for_review' (automático)
   → Banner muestra: "✨ Perfil completo" + botón "🚀 Enviar a revisión"

3️⃣ Usuario hace clic en "🚀 Enviar a revisión"
   businessStatus: 'draft' (sin cambio)
   applicationStatus: 'ready_for_review'
   submittedForReviewAt: 2024-01-15T10:30:00Z
   ✅ ENVIAR notificación (Slack + WhatsApp)

4️⃣ Admin aprueba en panel /admin/solicitudes
   businessStatus: 'published' ✨
   applicationStatus: 'approved'
   publishedAt: 2024-01-15T14:00:00Z
   → Negocio visible públicamente

5️⃣ Admin rechaza
   businessStatus: 'draft'
   applicationStatus: 'rejected'
   rejectionReason: "Información incompleta"
   → Usuario puede editar y reenviar
```

---

## 🧪 TESTING CHECKLIST

### ✅ Test 1: Flujo Completo
```
1. Crear negocio nuevo
2. Completar información básica (nombre, categoría, ubicación, contacto)
3. Verificar que badge muestre "📝 Borrador"
4. Completar hasta 50%+
5. Verificar que badge cambie a "🔍 Listo para revisar"
6. Click en "🚀 Enviar a revisión"
7. Verificar notificación enviada (Slack/WhatsApp)
8. Verificar negocio aparece en admin panel tab "Listas para Publicar"
9. Admin aprueba
10. Verificar negocio cambia a "publicado" y aparece en directorio público
```

### ✅ Test 2: Throttling de Notificaciones
```
1. Enviar negocio a revisión → ✅ Notificación enviada
2. Esperar 5 minutos
3. Hacer clic de nuevo en "Enviar a revisión" → ❌ Notificación NO enviada (throttled)
4. Esperar 31 minutos
5. Hacer clic de nuevo → ✅ Notificación enviada (throttle expiró)
```

### ✅ Test 3: Badges en Admin Panel
```
1. Crear negocio draft sin enviar → Mostrar [📝 Borrador]
2. Enviar a revisión → Mostrar [🔍 Listo para revisar]
3. Admin solicita info → Mostrar [📝 Necesita info]
4. Admin aprueba → Mostrar [🏪 Publicado]
5. Admin rechaza → Mostrar [❌ Rechazado]
6. En todos los casos, verificar badge del plan (FREE/FEATURED/SPONSOR)
```

### ✅ Test 4: Edición Después de Envío
```
1. Enviar negocio a revisión (ready_for_review)
2. Verificar que botón "✏️ Editar" siga disponible
3. Editar descripción
4. Guardar cambios
5. Verificar que cambios se guardan correctamente
6. Verificar que estado permanece ready_for_review
```

---

## 🔍 QUERIES EN ADMIN PANEL

### Tab "Listas para Publicar"
```typescript
// app/actions/adminBusinessActions.ts
export async function getReadyForReview() {
  return db
    .collection('businesses')
    .where('applicationStatus', '==', 'ready_for_review')  // ✅ Correcto
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
}
```

**Estado Esperado:**
- `businessStatus: 'draft'`
- `applicationStatus: 'ready_for_review'`
- `submittedForReviewAt: timestamp`

---

## 📂 ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `app/actions/businessActions.ts` | 415-470 | Estados corregidos, timestamps, notificación |
| `pages/api/notify-business-review.ts` | 38-56 | Throttling de 30 min |
| `types/business.ts` | ~65 | Tipos para nuevos timestamps |
| `components/AdminBusinessPanel.tsx` | 542-577 | Badge único inteligente |
| `components/DashboardEditor.tsx` | 539 | Estado local corregido |

---

## 🎨 CAMBIOS VISUALES

### Banner de Estado (BusinessStatusBanner)
```typescript
// Estado: draft + ready_for_review
✨ Perfil completo
Tu negocio cumple todos los requisitos. Envíalo a revisión para publicarlo.
[🚀 Enviar a revisión]
```

### Admin Panel Badges
```
ANTES (Confuso):
┌─────────────────────────────────────┐
│ [📝 draft] [🔍 ready_for_review]    │
└─────────────────────────────────────┘

DESPUÉS (Claro):
┌─────────────────────────────────────┐
│ [🔍 Listo para revisar] [🆓 FREE]   │
└─────────────────────────────────────┘
```

---

## 🚨 CONSIDERACIONES IMPORTANTES

### 1. **Requisitos por Plan**
```typescript
FREE:
  - Logo: Opcional
  - Portada: NO disponible (campo oculto)
  - Puede publicar sin portada

FEATURED/SPONSOR:
  - Logo: Opcional
  - Portada: REQUERIDA
  - Debe tener portada para ready_for_review
```

### 2. **Edición Después de Envío**
- Usuario PUEDE seguir editando después de enviar a revisión
- Estado permanece `draft` para permitir cambios
- Admin ve los cambios en tiempo real
- Si usuario edita campos críticos, considerar agregar `requiresReReview: boolean` (futura mejora)

### 3. **Sincronización Estado**
- `businesses` collection: Estado actual del negocio
- `applications` collection: Historial de solicitudes (legacy, sincronizado por compatibilidad)
- Admin panel lee SOLO de `businesses`

### 4. **Variables de Entorno Requeridas**
```env
# .env.local
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
WHATSAPP_PHONE_NUMBER=+1234567890
WHATSAPP_API_TOKEN=...
```

---

## 🔄 FLUJO DE APROBACIÓN ADMIN

```
Admin Panel → Tab "Listas para Publicar" (ready_for_review)
   ↓
[✅ Aprobar] → businessStatus: 'published'
               applicationStatus: 'approved'
               publishedAt: timestamp

[❌ Rechazar] → businessStatus: 'draft'
                applicationStatus: 'rejected'
                rejectionReason: "..."

[📝 Solicitar Info] → businessStatus: 'draft'
                       applicationStatus: 'needs_info'
                       adminNotes: "..."
```

---

## ✨ BENEFICIOS DE ESTE SISTEMA

### 1. **Experiencia de Usuario Mejorada**
- ✅ No se bloquea edición durante revisión
- ✅ Feedback visual claro del estado
- ✅ CTA button prominente cuando listo para publicar

### 2. **Administración Eficiente**
- ✅ Filtrado correcto en tabs admin
- ✅ Badge único sin redundancia
- ✅ Información de plan visible

### 3. **Notificaciones Inteligentes**
- ✅ Solo notifica cuando necesario (ready_for_review)
- ✅ Throttling previene spam
- ✅ Doble canal (Slack + WhatsApp)

### 4. **Auditoría Completa**
- ✅ Timestamps de cada transición
- ✅ Registro de quién solicitó publicación
- ✅ Trazabilidad de cambios

---

## 🚀 PRÓXIMOS PASOS (Futuras Mejoras)

### 1. **Re-Revisión Automática**
```typescript
// Detectar cambios en campos críticos y marcar para re-review
if (changedFields.includes('name', 'category', 'phone', 'description')) {
  applicationStatus = 'needs_info';
  requiresReReview = true;
}
```

### 2. **Notificaciones al Usuario**
```typescript
// Cuando admin aprueba/rechaza, notificar al usuario
// - Email
// - Notificación in-app
// - WhatsApp (opcional)
```

### 3. **Historial de Cambios**
```typescript
// Registrar cada transición de estado
businessStateHistory: [
  { from: 'submitted', to: 'ready_for_review', at: timestamp, by: userId },
  { from: 'ready_for_review', to: 'published', at: timestamp, by: adminId },
]
```

### 4. **Analytics Dashboard**
```typescript
// Métricas de revisión
- Tiempo promedio revisión
- Tasa de aprobación
- Razones comunes de rechazo
- Negocios pendientes por plan
```

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `SISTEMA_ESTADOS_GUIA.md` - Arquitectura completa de estados
- `CHANGELOG_PUBLISH_FLOW.md` - Changelog previo (Tasks 1-6)
- `lib/businessStates.ts` - Lógica de estados y validación
- `ADMIN_PANEL_REWRITE_ARCHITECTURE.md` - Arquitectura del panel admin

---

## 🤝 CÓMO USAR ESTE DOCUMENTO

### Para Desarrolladores:
1. Leer la sección "Cambios Implementados"
2. Revisar "Testing Checklist" antes de hacer cambios
3. Consultar "Consideraciones Importantes" para edge cases

### Para QA/Testing:
1. Seguir "Testing Checklist" completo
2. Verificar flujo en cada tab del admin panel
3. Probar throttling de notificaciones

### Para Product/Management:
1. Revisar "Beneficios de Este Sistema"
2. Consultar "Próximos Pasos" para roadmap
3. Verificar que cumple requisitos de negocio

---

**✅ SISTEMA VERIFICADO Y LISTO PARA PRODUCCIÓN**

_Última actualización: 2024_
