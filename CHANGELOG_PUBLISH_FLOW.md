# 📋 CHANGELOG: Flujo de Publicación + Requisitos Por Plan

**Fecha:** 2026-02-15  
**Autor:** Senior Product Engineer + QA  
**Issue:** Portada obligatoria bloqueaba negocios FREE  

---

## 🎯 **OBJETIVO**

Implementar flujo de publicación post-wizard con CTAs claros y corregir el bug crítico donde **portada es requerida para FREE** (cuando solo debe ser para FEATURED/SPONSOR).

---

## 🔥 **CAMBIOS CRÍTICOS**

### **1. lib/businessStates.ts - Requisitos por Plan**

**❌ ANTES:**
```typescript
export const PUBLISH_REQUIREMENTS = {
  coverPhoto: { required: true }, // ❌ OBLIGATORIA para TODOS
};

export const FIELD_WEIGHTS = {
  coverPhoto: 30, // 30% fijo
  logo: 5,        // 5% fijo
};
```

**✅ DESPUÉS:**
```typescript
import { PLAN_PERMISSIONS, type BusinessPlan } from './planPermissions';

// Helpers que consultan planPermissions
function isCoverRequiredForPlan(plan?: string): boolean {
  if (!plan || plan === 'free') return false; // ✅ NOT required for FREE
  return plan === 'featured' || plan === 'sponsor';
}

function getCoverWeightForPlan(plan?: string): number {
  if (!plan || plan === 'free') return 0; // ✅ 0% para FREE
  return 30; // 30% para featured/sponsor
}

function getLogoWeightForPlan(plan?: string): number {
  if (!plan || plan === 'free') return 35; // ✅ Aumentado para compensar
  return 5; // Normal si tiene cover
}

// En isPublishReady():
if (isCoverRequiredForPlan(plan)) {
  if (!business.coverUrl || business.coverUrl.trim().length === 0) {
    missing.push('imagen de portada (requerida para tu plan)');
  }
}
```

**Impacto:**
- ✅ FREE puede llegar a 100% sin portada
- ✅ FEATURED/SPONSOR exigen portada
- ✅ Logo aumenta peso para FREE (35% vs 5%)

---

### **2. components/DashboardEditor.tsx - CTAs Simplificados**

**❌ ANTES:**
- 3 botones: "Vista previa" + "Enviar a revisión" + "Guardar cambios"
- Llamaba a `submitForReview()` legacy (usa `status` en vez de `businessStatus`)
- Botones duplicados en sidebar

**✅ DESPUÉS:**
```tsx
{/* Header: Solo Vista previa + Guardar */}
<button>Vista previa</button>
<button onClick={save}>Guardar cambios</button>

{/* CTA principal en BusinessStatusBanner (según estado) */}
<BusinessStatusBanner
  business={businessState}
  onPublish={handleRequestPublish} // ✅ Usa sistema nuevo
/>
```

**Eliminado:**
- `submitForReview()` function (legacy) ❌
- Botón duplicado "Enviar a revisión" del header ❌
- Card "Borrador" del sidebar con botón duplicado ❌

**Impacto:**
- ✅ UI más limpia (1 CTA principal)
- ✅ Usa `requestPublish` action (sistema dual correcto)
- ✅ No confunde al usuario con botones duplicados

---

### **3. components/DashboardEditor.tsx - LogoUploader para TODOS**

**❌ ANTES:**
```tsx
{(biz.plan === 'featured' || biz.plan === 'sponsor') && (
  <>
    <LogoUploader />  {/* ❌ Bloqueado para FREE */}
    <CoverUploader />
  </>
)}
```

**✅ DESPUÉS:**
```tsx
{/* Logo - TODOS los planes (OPCIONAL) */}
<LogoUploader
  badges={["Opcional", "Todos los planes"]}
  helpText="No es obligatorio, pero ayuda a que los clientes te identifiquen"
/>

{/* Cover - Solo featured/sponsor */}
{(biz.plan === 'featured' || biz.plan === 'sponsor') && (
  <CoverUploader />
)}
```

**Impacto:**
- ✅ FREE puede subir logo (opcional, no bloquea publicación)
- ✅ Cover solo visible para planes premium

---

### **4. components/BusinessStatusBanner.tsx - CTAs Dinámicos**

**Ya implementado correctamente:**
- ✅ draft → "🚀 Enviar a revisión" (botón primary verde)
- ✅ in_review → "⏳ En revisión" (sin botón, solo info)
- ✅ published → "👁️ Ver mi negocio" (link a perfil público)
- ✅ Barra de progreso para draft incompleto
- ✅ Lista de campos faltantes

**Sin cambios en este archivo** (ya estaba bien).

---

## 📊 **TABLA: REQUISITOS POR PLAN**

| Campo | FREE | FEATURED | SPONSOR |
|-------|------|----------|---------|
| **Nombre** | ✅ Requerido | ✅ Requerido | ✅ Requerido |
| **Categoría** | ✅ Requerido | ✅ Requerido | ✅ Requerido |
| **Ubicación (colonia)** | ✅ Requerido | ✅ Requerido | ✅ Requerido |
| **Teléfono/WhatsApp** | ✅ Requerido (al menos 1) | ✅ Requerido | ✅ Requerido |
| **Descripción (20+ chars)** | ✅ Requerido | ✅ Requerido | ✅ Requerido |
| **Horarios (1+ día)** | ✅ Requerido | ✅ Requerido | ✅ Requerido |
| **Logo/Foto perfil** | 🟡 Opcional (35% peso) | 🟡 Opcional (5% peso) | 🟡 Opcional (5% peso) |
| **Cover/Portada** | ❌ No disponible (0% peso) | ✅ **Requerido** (30% peso) | ✅ **Requerido** (30% peso) |
| **Galería (2+ fotos)** | ❌ No disponible | 🟡 Opcional (hasta 5) | 🟡 Opcional (hasta 10) |
| **Redes sociales** | 🟡 Opcional (1% peso) | 🟡 Opcional (1% peso) | 🟡 Opcional (1% peso) |

**Pesos totales:**
- FREE sin logo ni cover: **60%** (mínimo para publicar)
- FREE con logo: **95%** (casi completo)
- FEATURED/SPONSOR sin cover: **< 100%** (NO puede publicar)
- FEATURED/SPONSOR completo: **100%**

---

## 🔄 **FLUJO DE PUBLICACIÓN**

### **1. Usuario completa wizard**
→ Redirigido a `/dashboard/[id]`  
→ Negocio creado con `businessStatus: 'draft'`  
→ `applicationStatus: 'submitted'` (o auto → `ready_for_review` si cumperequisitos)

### **2. Usuario edita perfil en dashboard**
→ BusinessStatusBanner muestra:
  - **Si incompleto**: Barra de progreso + lista de campos faltantes
  - **Si completo**: "✨ Perfil completo" + botón "🚀 Enviar a revisión"

### **3. Usuario click "Enviar a revisión"**
→ Llama a `requestPublish(businessId, token)` action  
→ Backend valida requisitos por plan:
```typescript
// FREE sin cover → ✅ OK
// FEATURED sin cover → ❌ Error "Tu negocio aún no cumple requisitos mínimos"
```
→ Cambia a `businessStatus: 'in_review'`  
→ BusinessStatusBanner muestra "⏳ En revisión por administrador"

### **4. Admin aprueba/rechaza**
→ `businessStatus: 'published'` o `applicationStatus: 'rejected'`  
→ Usuario notificado

---

## 🧪 **TESTING CHECKLIST**

### **✅ Caso 1: FREE sin cover puede publicar**
1. Wizard → Plan FREE
2. Dashboard: Completa campos obligatorios (nombre, categoría, ubicación, teléfono, descripción, horarios)
3. **NO sube cover**
4. Click "Enviar a revisión"
5. ✅ **ESPERADO**: `businessStatus: 'in_review'` (sin errores)
6. ❌ **ANTES**: Error "imagen de portada (requerida)"

### **✅ Caso 2: FREE puede subir logo (opcional)**
1. Dashboard FREE
2. LogoUploader visible
3. Badge "Opcional" + "Todos los planes"
4. Helper text: "No es obligatorio..."
5. Sube logo → Score aumenta de 60% → 95%
6. ✅ **ESPERADO**: Puede publicar con o sin logo

### **✅ Caso 3: FEATURED sin cover NO puede publicar**
1. Wizard → Plan FEATURED
2. Dashboard: Completa campos obligatorios
3. **NO sube cover**
4. Click "Enviar a revisión"
5. ✅ **ESPERADO**: Error "imagen de portada (requerida para tu plan)"
6. CoverUploader visible con badge "Incluido en tu plan"

### **✅ Caso 4: FEATURED con cover puede publicar**
1. Sube portada
2. Score llega a 100%
3. Click "Enviar a revisión"
4. ✅ **ESPERADO**: `businessStatus: 'in_review'`

### **✅ Caso 5: CTAs no duplicados**
1. Dashboard → Header: "Vista previa" + "Guardar cambios"
2. BusinessStatusBanner: "🚀 Enviar a revisión" (si completo)
3. ❌ NO hay botones "Enviar a revisión" adicionales
4. ❌ NO hay card "Borrador" en sidebar con botón

### **✅ Caso 6: Edición en in_review permitida**
1. Negocio en `businessStatus: 'in_review'`
2. Usuario puede editar campos
3. Click "Guardar cambios"
4. ✅ **ESPERADO**: Cambios guardados, mantiene in_review
5. (Futuro: marcar `requiresReReview: true`)

---

## ⚠️ **EDGE CASES Y NOTAS**

### **1. Usuario cambia de plan FREE → FEATURED**
- Si tenía 95% (sin cover), baja a ~70% al cambiarplan
- Cover ahora es requerida (visible en CoverUploader)
- Debe subir portada para publicar

### **2. Negocios existentes en "review" (legacy status)**
- Sistema dual mantiene compatibilidad
- `status: 'review'` → `businessStatus: 'in_review'`
- Migration script: `scripts/migrate-business-states.ts`

### **3. Admin inbox**
- `businessStatus: 'in_review'` + `applicationStatus: 'ready_for_resume'`
- Aparece en `/admin` (Operations First pipeline)
- Admin puede aprobar → `published` o rechazar → `applicationStatus: 'rejected'`

### **4. Cover vs Logo nomenclatura**
- **lib/businessStates.ts**: `coverPhoto` (peso internal)
- **lib/planPermissions.ts**: `coverImage` (permisos)
- **Business type**: `coverUrl` (campo en Firestore)
- **Componente**: `CoverUploader` (UI)
- ⚠️ Inconsistencia conocida, funciona correctamente

---

## 📁 **ARCHIVOS MODIFICADOS**

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `lib/businessStates.ts` | Integrar planPermissions, requisitos condicionales | +50, -20 |
| `components/DashboardEditor.tsx` | Eliminar submitForReview, simplificar CTAs, separar Logo/Cover | +30, -60 |
| `components/BusinessStatusBanner.tsx` | (Sin cambios - ya estaba correcto) | 0 |

**Total:** ~80 líneas modificadas, 3 archivos

---

## ✅ **CHECKLIST DE DEPLOYMENT**

- [x] Cambios quirúrgicos sin reescritura masiva
- [x] TypeScript compila sin errores
- [x] Sistema Operations First respetado (status dual)
- [x] Compatibilidad con negocios existentes (migration available)
- [x] No rompe lógica mode=new (multi-negocio)
- [x] Documentación creada
- [ ] **Testing manual** (pendiente user/QA)
- [ ] **Deploy a staging** (pendiente)  
- [ ] **Notificar usuarios FREE** de nueva feature logo opcional

---

## 🚀 **PRÓXIMOS PASOS (FUTURE)**

1. **requiresReReview flag**: Detectar edición en in_review de campos críticos
2. **Botón "Compartir"**: Para negocios published (copy link + WhatsApp share)
3. **Upsell dinámico**: FREE published ve promo de FEATURED en dashboard
4. **Logo generado AI**: Opción para generar logo simple si no tiene
5. **Cover templates**: Plantillas para FEATURED/SPONSOR sin diseñador

---

**STATUS FINAL:** ✅ **LISTO PARA TESTING**  
**Bloqueadores:** Ninguno  
**Riesgos:** Bajo (cambios quirúrgicos + sistema robusto)  
