# 🎯 Modo "Nuevo Negocio" - Implementación Completa

## 📋 Resumen Ejecutivo

Permite a usuarios con negocios existentes crear negocios adicionales usando el query param `?mode=new`, evitando la detección de duplicados y el bloqueo de registro.

---

## 🔧 Cambios Implementados

### 1. **Frontend: `components/BusinessWizard.tsx`**

#### ✅ Detección del modo nuevo negocio
```typescript
// Importar useSearchParams
import { useRouter, useSearchParams } from "next/navigation";

// En el componente interno
const searchParams = useSearchParams();
const wizardMode = searchParams?.get('mode');
const isNewBusinessMode = wizardMode === 'new';
```

#### ✅ Condicionar carga de progreso guardado
```typescript
useEffect(() => {
  async function loadProgress() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    // 🚫 Si mode=new, NO cargar progreso viejo
    if (isNewBusinessMode) {
      reset(defaultValues);
      setLoading(false);
      return;
    }
    
    // Continuar con carga normal...
  }
  loadProgress();
}, [user?.uid, reset, isNewBusinessMode]);
```

#### ✅ Banners informativos diferenciados
```typescript
{/* Banner normal: bloquea si existe negocio */}
{existingBusiness && user && !isNewBusinessMode && (
  <div className="... bg-blue-50">
    Ya tienes un negocio registrado...
    <button>Ir a mi Dashboard</button>
  </div>
)}

{/* Banner modo nuevo: solo informa, NO bloquea */}
{existingBusiness && user && isNewBusinessMode && (
  <div className="... bg-amber-50">
    ℹ️ Registrando un negocio adicional...
    <a href={`/dashboard/${existingBusiness.id}`} target="_blank">
      Ver mi negocio existente →
    </a>
  </div>
)}
```

#### ✅ Pasar modo al backend en submit
```typescript
const formData = new FormData();
formData.append("token", token);
formData.append("formData", JSON.stringify(merged));

// ✅ Agregar mode=new
if (isNewBusinessMode) {
  formData.append("mode", "new");
}

const result = await createBusinessImmediately(formData);
```

#### ✅ Wrapper con Suspense para useSearchParams
```typescript
// Cambiar export default a función interna
function BusinessWizardProInner() { ... }

// Exportar wrapper con Suspense
export default function BusinessWizardPro() {
  return (
    <Suspense fallback={<div>Cargando formulario...</div>}>
      <BusinessWizardProInner />
    </Suspense>
  );
}
```

---

### 2. **Backend: `app/actions/businessActions.ts`**

#### ✅ Actualizar schema Zod
```typescript
const createBusinessSchema = z.object({
  token: z.string().min(1, 'Missing auth token'),
  formPayload: z.string().min(2, 'Missing form data JSON'),
  mode: z.enum(['new', 'default']).optional(), // 🆕 Modo nuevo negocio
});
```

#### ✅ Lógica condicional de dedupe
```typescript
export async function createBusinessImmediately(formData: FormData) {
  const parsed = createBusinessSchema.parse({
    token: formData.get('token'),
    formPayload: formData.get('formData'),
    mode: formData.get('mode') || 'default',
  });

  const isNewBusinessMode = parsed.mode === 'new';
  
  // ✅ VALIDACIÓN DE DUPLICADOS: Solo si NO es modo "new"
  if (!isNewBusinessMode) {
    const existingBusinessQuery = await db
      .collection('businesses')
      .where('ownerId', '==', decoded.uid)
      .limit(1)
      .get();
    
    if (!existingBusinessQuery.empty) {
      // Retornar negocio existente (dedupe)
      return {
        success: true,
        businessId: existingBusiness.id,
        isDuplicate: true,
        // ...
      };
    }
  }
  
  // Si mode=new o no existe negocio, crear NUEVO negocio
  const businessRef = db.collection('businesses').doc();
  await businessRef.set({ ...businessData });
  // ...
}
```

---

## 🧪 Prueba Manual

### **Escenario 1: Usuario nuevo (sin negocio existente)**

1. ✅ Navegar a `/registro-negocio`
2. ✅ Completar formulario
3. ✅ Crear negocio exitosamente
4. ✅ Redirigir a `/dashboard/{businessId}`

**Resultado esperado**: Funciona igual que antes (sin cambios).

---

### **Escenario 2: Usuario con negocio existente (modo normal)**

1. ✅ Iniciar sesión con cuenta que tiene negocio
2. ✅ Navegar a `/registro-negocio` (sin query param)
3. ✅ Ver banner azul: "Ya tienes un negocio registrado"
4. ✅ Al enviar formulario, redirigir al dashboard existente (dedupe)

**Resultado esperado**: 
- Banner bloquea el registro
- Backend detecta duplicado y retorna negocio existente
- Usuario redirigido al negocio existente

---

### **Escenario 3: Usuario con negocio existente (modo NEW) ⭐**

#### Pasos:
1. ✅ Iniciar sesión con cuenta que tiene negocio
2. ✅ Navegar a `/registro-negocio?mode=new`
3. ✅ Ver banner amarillo informativo: "Registrando un negocio adicional"
4. ✅ Formulario muestra valores por defecto (NO carga progreso viejo)
5. ✅ Completar datos del NUEVO negocio
6. ✅ Enviar formulario
7. ✅ Backend crea NUEVO negocio (nuevo docId en Firestore)
8. ✅ Redirigir a `/dashboard/{newBusinessId}`

**Resultado esperado**:
```
✅ Banner amarillo con link al negocio existente
✅ Formulario limpio (sin progreso cargado)
✅ Nuevo negocio creado en Firestore con docId diferente
✅ Ambos negocios con el mismo ownerId
✅ NO autoredirect al negocio existente
```

---

## 📊 Diff de Cambios

### **BusinessWizard.tsx**
```diff
+ import { useRouter, useSearchParams } from "next/navigation";
+ import { Suspense } from "react";

- export default function BusinessWizardPro() {
+ function BusinessWizardProInner() {
+   const searchParams = useSearchParams();
+   const wizardMode = searchParams?.get('mode');
+   const isNewBusinessMode = wizardMode === 'new';

    useEffect(() => {
+     // Si mode=new, NO cargar progreso viejo
+     if (isNewBusinessMode) {
+       reset(defaultValues);
+       setLoading(false);
+       return;
+     }
      // ... continuar carga normal
-   }, [user?.uid, reset]);
+   }, [user?.uid, reset, isNewBusinessMode]);

+   // Banner informativo diferenciado
+   {existingBusiness && user && isNewBusinessMode && (
+     <div className="bg-amber-50">
+       ℹ️ Registrando un negocio adicional...
+     </div>
+   )}

    const formData = new FormData();
+   if (isNewBusinessMode) {
+     formData.append("mode", "new");
+   }

+ export default function BusinessWizardPro() {
+   return (
+     <Suspense fallback={<div>Cargando formulario...</div>}>
+       <BusinessWizardProInner />
+     </Suspense>
+   );
+ }
```

### **businessActions.ts**
```diff
  const createBusinessSchema = z.object({
    token: z.string().min(1),
    formPayload: z.string().min(2),
+   mode: z.enum(['new', 'default']).optional(),
  });

  export async function createBusinessImmediately(formData: FormData) {
    const parsed = createBusinessSchema.parse({
      token: formData.get('token'),
      formPayload: formData.get('formData'),
+     mode: formData.get('mode') || 'default',
    });

+   const isNewBusinessMode = parsed.mode === 'new';

-   // VALIDACIÓN DE DUPLICADOS
+   // VALIDACIÓN DE DUPLICADOS: Solo si NO es modo "new"
+   if (!isNewBusinessMode) {
      const existingQuery = await db.collection('businesses')
        .where('ownerId', '==', decoded.uid).limit(1).get();
      
      if (!existingQuery.empty) {
        return { isDuplicate: true, businessId: existing.id, ... };
      }
+   }

    // Crear nuevo negocio (siempre si mode=new)
    const businessRef = db.collection('businesses').doc();
    await businessRef.set({ ...businessData });
  }
```

---

## 🔗 URLs de Prueba

| Modo | URL | Comportamiento |
|------|-----|----------------|
| **Normal** | `/registro-negocio` | Dedupe activado, carga progreso |
| **Nuevo** | `/registro-negocio?mode=new` | Dedupe desactivado, formulario limpio |

---

## ✅ Checklist de Implementación

- [x] Importar `useSearchParams` y `Suspense`
- [x] Detectar query param `mode`
- [x] Condicionar carga de progreso en useEffect
- [x] Diferenciar banners (bloqueo vs informativo)
- [x] Pasar `mode` al backend en formData
- [x] Agregar Suspense boundary
- [x] Actualizar schema Zod con campo `mode`
- [x] Lógica condicional de dedupe en backend
- [x] Compilación exitosa sin errores
- [x] Documentación completa

---

## 🚀 Próximos Pasos

1. **Testing en dev**: `npm run dev` → `/registro-negocio?mode=new`
2. **Verificar Firestore**: Comprobar que se crean múltiples docs con mismo `ownerId`
3. **UX**: Agregar link en dashboard "Registrar otro negocio" con `?mode=new`
4. **Analytics**: Trackear cuántos usuarios crean negocios adicionales

---

## 📝 Notas Técnicas

- **Next.js App Router**: `useSearchParams()` requiere Suspense boundary
- **React Hook Form**: `reset(defaultValues)` limpia el formulario completamente
- **Firebase**: Múltiples docs con mismo `ownerId` son válidos
- **Zod**: `mode` es opcional con default `'default'` para retrocompatibilidad

---

**Implementado por**: Senior Engineer  
**Fecha**: 2026-02-15  
**Status**: ✅ COMPLETADO Y COMPILADO
