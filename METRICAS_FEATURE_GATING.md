# Sistema de Feature Gating para Métricas

## Descripción General

Sistema implementado que controla el acceso a métricas según el plan del negocio, siguiendo una estrategia de monetización basada en insights.

---

## Planes y Acceso a Métricas

### 🆓 **Plan GRATIS (Free)**
- **Acceso a métricas**: ❌ Ninguna
- **UI**: Tarjeta especial con candado y CTA "Actualizar Plan"
- **Mensaje**: "Las métricas están disponibles a partir del plan Destacado"
- **Acción**: Link a `/para-negocios#planes`

### ⭐ **Plan DESTACADO (Featured)**
- **Acceso a métricas**: ✅ Básicas (3)
  - ✅ Vistas (`views`)
  - ✅ Clics en WhatsApp (`whatsappClicks`)
  - ✅ Clics en Teléfono (`phoneClicks`)
- **Bloqueadas**: 🔒 Avanzadas (4)
  - 🔒 Cómo llegar / Maps (`mapClicks`)
  - 🔒 Favoritos (`favoriteAdds`)
  - 🔒 Reseñas (`totalReviews`)
  - 🔒 Rating promedio (`avgRating`)
- **UI**: Banner informativo ámbar + métricas bloqueadas con candado
- **Mensaje**: "Tu plan Destacado incluye métricas básicas. Actualiza a Patrocinado para ver métricas completas"
- **Acción**: Link a `/para-negocios#planes`

### 👑 **Plan PATROCINADO (Sponsor)**
- **Acceso a métricas**: ✅ Todas (7)
  - ✅ Vistas
  - ✅ WhatsApp
  - ✅ Teléfono
  - ✅ Maps
  - ✅ Favoritos
  - ✅ Reseñas
  - ✅ Rating
- **Bloqueadas**: Ninguna
- **UI**: Todas las tarjetas desbloqueadas, sin banners

---

## Arquitectura del Sistema

### 📁 Archivos Principales

#### 1. **`lib/metricsConfig.ts`** - Configuración Central
Define todas las reglas de feature gating:

```typescript
// Tipos
export type MetricType = 'views' | 'phoneClicks' | 'whatsappClicks' | ...
export type BusinessPlan = 'free' | 'featured' | 'sponsor'

// Configuración de métricas
export const ALL_METRICS: Record<MetricType, MetricConfig>

// Permisos por plan
export const ALLOWED_METRICS_BY_PLAN: Record<BusinessPlan, MetricType[]>
export const LOCKED_METRICS_BY_PLAN: Record<BusinessPlan, MetricType[]>

// Helpers
normalizePlan(plan?: string): BusinessPlan
isMetricAllowed(metric: MetricType, plan: BusinessPlan): boolean
isMetricLocked(metric: MetricType, plan: BusinessPlan): boolean
hasMetricsAccess(plan: BusinessPlan): boolean
getUpgradeMessage(plan: BusinessPlan): string
```

**Ventajas**:
- ✅ Configuración centralizada
- ✅ Fácil de mantener y extender
- ✅ Type-safe con TypeScript
- ✅ Normalización automática de planes

#### 2. **`components/MetricasClient.tsx`** - UI con Feature Gating

**Resumen General (6 tarjetas)**:
- Muestra todas las métricas, pero bloqueadas si el usuario no tiene al menos 1 negocio con acceso
- Tarjetas bloqueadas: fondo gris, icono de candado, texto "Plan Patrocinado"

**Detalle por Negocio**:
- **Plan Free**: Tarjeta especial con candado grande, mensaje y CTA
- **Plan Featured**: Banner ámbar informativo + 3 métricas visibles + 4 bloqueadas
- **Plan Sponsor**: 7 métricas visibles, sin restricciones

**Cálculo de Totales**:
```typescript
// Solo suma métricas si el negocio tiene acceso a ellas
if (isMetricAllowed('views', plan)) acc.views += m.views;
```

#### 3. **`app/metricas/page.tsx`** - Server Component
- Consulta negocios del usuario (por `ownerId` o `ownerEmail`)
- Migración automática de `ownerId` si falta
- Consulta métricas de telemetría (últimos 30 días)
- Pasa datos al componente cliente

---

## Flujo de Funcionamiento

### 1. **Carga de Página**
```
Usuario → /metricas
  ↓
getAuthUser() → Verificar sesión
  ↓
getUserBusinessMetrics(userId, email)
  ↓
  a) Buscar negocios por ownerId
  b) Si no encuentra, buscar por ownerEmail
  c) Migrar ownerId si falta
  ↓
Consultar telemetría para cada negocio
  ↓
Pasar metrics[] a MetricasClient
```

### 2. **Renderizado de Métricas**
```
MetricasClient recibe metrics[]
  ↓
Para cada negocio:
  a) Normalizar plan (free/featured/sponsor)
  b) Verificar hasMetricsAccess(plan)
  ↓
Si plan === 'free':
  → Mostrar tarjeta bloqueada con CTA
  ↓
Si plan === 'featured':
  → Mostrar banner ámbar
  → Renderizar 3 métricas permitidas
  → Mostrar 4 métricas bloqueadas con candado
  ↓
Si plan === 'sponsor':
  → Renderizar todas las métricas sin restricciones
```

### 3. **Cálculo de Totales**
```typescript
// Lógica condicional por plan
filteredMetrics.reduce((acc, m) => {
  const plan = normalizePlan(m.plan);
  
  if (isMetricAllowed('views', plan)) 
    acc.views += m.views;
  
  if (isMetricAllowed('mapClicks', plan)) 
    acc.mapClicks += m.mapClicks; // Solo sponsor
  
  return acc;
}, { views: 0, ... });
```

---

## Estados de UI

### 🔓 Métrica Desbloqueada
```jsx
<div className="text-center p-3 bg-blue-50 rounded-lg">
  <p className="text-xs text-gray-600 mb-1">Vistas</p>
  <p className="text-xl font-bold text-blue-600">{metric.views}</p>
</div>
```

### 🔒 Métrica Bloqueada
```jsx
<div className="text-center p-3 bg-gray-100 rounded-lg opacity-60">
  <p className="text-xs text-gray-500 mb-1">Maps</p>
  <Lock className="w-5 h-5 text-gray-400 mx-auto" />
  <p className="text-[10px] text-gray-500 mt-1">Solo Sponsor</p>
</div>
```

### 📢 Banner Informativo (Featured)
```jsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <Crown className="w-5 h-5 text-amber-600" />
  <p className="text-xs text-amber-800">
    <strong>Métricas parciales:</strong> Tu plan incluye Vistas, WhatsApp y Llamadas.
  </p>
  <Link href="/para-negocios#planes">
    Actualiza a Patrocinado para ver todas las métricas
  </Link>
</div>
```

### 🚫 Negocio Free (Sin acceso)
```jsx
<div className="border-dashed border-gray-300 bg-gray-50">
  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
  <p className="text-sm text-gray-600 mb-4">
    {getUpgradeMessage('free')}
  </p>
  <Link href="/para-negocios#planes">
    <Crown className="w-4 h-4" />
    Actualizar Plan
  </Link>
</div>
```

---

## Testing

### ✅ Escenarios de Prueba

#### 1. Negocio con Plan Free
```
✓ No debe ver ninguna métrica
✓ Debe ver tarjeta especial con candado
✓ Mensaje: "Las métricas están disponibles a partir del plan Destacado"
✓ CTA "Actualizar Plan" visible y funcional
```

#### 2. Negocio con Plan Featured
```
✓ Debe ver 3 métricas: Vistas, WhatsApp, Teléfono
✓ 4 métricas bloqueadas con candado: Maps, Favoritos, Reseñas, Rating
✓ Banner ámbar informativo presente
✓ Texto en bloqueadas: "Solo Sponsor"
✓ Link "Actualiza a Patrocinado" funcional
```

#### 3. Negocio con Plan Sponsor
```
✓ Debe ver todas las 7 métricas
✓ Ninguna métrica bloqueada
✓ Sin banners informativos
✓ Valores reales mostrados correctamente
```

#### 4. Usuario con Múltiples Negocios (Mixed Plans)
```
✓ Resumen general debe sumar solo métricas permitidas
✓ Cada negocio muestra su configuración según su plan
✓ Totales correctos incluso con planes mixtos
```

#### 5. Edge Cases
```
✓ Negocio sin plan definido → Tratado como 'free'
✓ Plan en mayúsculas/minúsculas → Normalizado correctamente
✓ Plan con valor inválido → Fallback a 'free'
✓ Usuario sin negocios → Mensaje "Registrar negocio"
```

---

## Normalización de Planes

El sistema normaliza automáticamente variaciones:

```typescript
normalizePlan('SPONSOR') → 'sponsor'
normalizePlan('Patrocinado') → 'sponsor'
normalizePlan('Featured') → 'featured'
normalizePlan('Destacado') → 'featured'
normalizePlan('') → 'free'
normalizePlan(undefined) → 'free'
normalizePlan('invalid') → 'free'
```

---

## Extensibilidad

### Agregar una Nueva Métrica
1. Agregar tipo a `MetricType` en `metricsConfig.ts`
2. Definir configuración en `ALL_METRICS`
3. Agregar a `ALLOWED_METRICS_BY_PLAN` según el plan
4. Actualizar UI en `MetricasClient.tsx`

### Cambiar Permisos de un Plan
1. Modificar `ALLOWED_METRICS_BY_PLAN` en `metricsConfig.ts`
2. Automáticamente se actualiza `LOCKED_METRICS_BY_PLAN`
3. No requiere cambios en UI

### Agregar un Nuevo Plan
1. Agregar tipo a `BusinessPlan`
2. Definir métricas en `ALLOWED_METRICS_BY_PLAN`
3. Opcional: Agregar mensaje en `getUpgradeMessage()`

---

## Optimizaciones Futuras

### 🚀 Performance
- [ ] Cache de consultas de métricas (Redis/Vercel KV)
- [ ] Consultar solo métricas permitidas según plan (reducir queries)
- [ ] Server-side pagination para negocios con muchas métricas

### 📊 Funcionalidad
- [ ] Exportar métricas (solo Sponsor)
- [ ] Gráficos de tendencias (solo Sponsor)
- [ ] Comparativas entre períodos (solo Sponsor)
- [ ] Alertas de métricas (solo Sponsor)

### 🎯 UX
- [ ] Preview de métricas bloqueadas al hover
- [ ] Modal con comparación de planes desde métrica bloqueada
- [ ] Animaciones al desbloquear métricas tras upgrade
- [ ] Tooltips explicativos para cada métrica

---

## Integración con Sistema de Pagos

Cuando se actualiza el plan de un negocio:
1. Actualizar campo `plan` en Firestore (documento `businesses/{id}`)
2. Las métricas se desbloquean automáticamente en la próxima carga
3. No requiere invalidación de cache (siempre consulta el plan actual)

```typescript
// Después de procesar pago
await db.collection('businesses').doc(businessId).update({
  plan: 'sponsor', // o 'featured'
  updatedAt: new Date(),
  planUpdatedAt: new Date()
});

// El usuario verá las métricas desbloqueadas inmediatamente
```

---

## Mensajes de Upgrade por Plan

### Free → Featured
"Las métricas están disponibles a partir del plan Destacado. Actualiza tu plan para ver estadísticas de tu negocio."

### Featured → Sponsor
"Tu plan Destacado incluye métricas básicas. Actualiza a Patrocinado para ver métricas completas: Cómo llegar, Favoritos y Reseñas."

### Sponsor
(Sin mensaje - acceso completo)

---

## Validación Implementada

✅ **Type Safety**: TypeScript garantiza tipos correctos  
✅ **Configuración Centralizada**: Fácil de modificar  
✅ **Normalización Automática**: Maneja variaciones de planes  
✅ **UI Consistente**: Misma experiencia en resumen y detalle  
✅ **Fallbacks**: Plan inválido → free  
✅ **Sin Hardcoding**: Todo configurable en `metricsConfig.ts`  
✅ **Cálculos Correctos**: Totales solo de métricas permitidas  
✅ **Comunicación Clara**: Mensajes explícitos de upgrade  

---

## Resumen

El sistema de feature gating para métricas está **completamente funcional** y listo para producción. Controla el acceso a insights según el plan del negocio, incentivando upgrades mientras mantiene una experiencia de usuario clara y profesional.

**Próximo paso recomendado**: Testing en staging con usuarios reales de diferentes planes.
