# 🎯 Arquitectura de Planes - YajaGon Marketplace

## 📋 Tabla de Contenidos

1. [Tabla de Permisos](#tabla-de-permisos)
2. [Lógica de Implementación](#lógica-de-implementación)
3. [UI Bloqueada Elegante](#ui-bloqueada-elegante)
4. [Estrategias de Conversión](#estrategias-de-conversión)
5. [Features Visibles Bloqueados](#features-visibles-bloqueados)
6. [Evitar Que FREE Se Vea Pobre](#evitar-que-free-se-vea-pobre)
7. [Reglas de Firestore](#reglas-de-firestore)
8. [Ejemplos de Código](#ejemplos-de-código)

---

## 1️⃣ Tabla de Permisos por Feature

### 📸 **IMÁGENES**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Logo** | ✅ 1 obligatorio | ✅ 1 obligatorio | ✅ 1 obligatorio |
| **Foto perfil/local** | ✅ 1 obligatoria | ✅ 1 | ✅ 1 |
| **Portada hero** | ❌ NO | ✅ 1 obligatoria | ✅ 1 obligatoria |
| **Galería adicional** | ❌ 0 fotos | ✅ Hasta 5 fotos | ✅ Hasta 10 fotos |
| **Total de fotos** | 2 fotos | 7 fotos | 12 fotos |

**Filosofía:**
- FREE: Digno con logo + 1 foto. Sin portada ni galería.
- DESTACADO: +Portada hero + galería de 5 fotos
- PATROCINADO: Galería extendida (10 fotos)

---

### 📄 **INFORMACIÓN BÁSICA**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Nombre, categoría** | ✅ | ✅ | ✅ |
| **Descripción** | ✅ 500 chars | ✅ 1000 chars | ✅ 2000 chars |
| **Teléfono** | ✅ | ✅ | ✅ |
| **WhatsApp** | ✅ | ✅ | ✅ |
| **Facebook** | ✅ | ✅ | ✅ |
| **Ubicación/Mapa** | ✅ | ✅ | ✅ |
| **Horarios** | ✅ | ✅ | ✅ |

**Filosofía:**
- Toda la información de contacto es universal (sin restricciones)
- Solo se limita el largo de la descripción

---

### 📊 **MÉTRICAS Y ANALYTICS**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Todas las métricas** | ❌ NO | ❌ NO | ✅ SÍ (7 métricas) |
| **Métricas básicas** | ❌ NO | ✅ Vistas, WhatsApp, Teléfono | ✅ Incluidas |
| **Métricas avanzadas** | ❌ NO | ❌ NO | ✅ Maps, Favoritos, Reseñas, Rating |

**Filosofía:**
- FREE: Sin métricas (CTA motivacional)
- DESTACADO: 3 métricas básicas (contacto)
- PATROCINADO: 7 métricas completas

---

### 🎖️ **BRANDING Y BADGES**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Badge distintivo** | ❌ NO | ⭐ Negocio Destacado | 👑 Líder en la Zona |
| **Badge verificado** | ❌ NO | ❌ NO | ✅ (futuro) |
| **Estilo badge** | - | Amber gradient + shadow | Purple gradient + pulse |

**Filosofía:**
- FREE: Sin badge (limpio)
- DESTACADO: Badge aspiracional amber
- PATROCINADO: Badge de autoridad purple con animación

---

### 🔍 **VISIBILIDAD Y POSICIONAMIENTO**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Posición en listados** | Estándar | Prioritaria (arriba de FREE) | Hero (primera posición absoluta) |
| **Z-index** | 0 | 10 | 20 |
| **Ranking score** | 3 (bajo) | 2 (medio) | 1 (alto) |
| **Altura de tarjeta** | 120px | 145px (+20%) | 180px (+50%) |

**Filosofía:**
- FREE: Posición estándar, altura base
- DESTACADO: Aparece arriba + 20% más grande
- PATROCINADO: Hero absoluto + 50% más grande

---

### 🎨 **JERARQUÍA VISUAL**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Border** | gray-200 (1px) | amber-300 (2px) | purple-400 (3px) |
| **Shadow** | Ninguna | shadow-lg amber | shadow-2xl purple |
| **Hover effect** | scale-1.01 | scale-1.02 + glow | scale-1.03 + glow + shimmer |
| **Estilo descripción** | Limpio, neutral | Notable, premium | Dominante, hero |

**Filosofía:**
- Diferenciación progresiva sin que FREE se vea mal
- Cada nivel es claramente mejor visualmente

---

### 🌟 **RESEÑAS Y SOCIAL PROOF**

| Feature | FREE | DESTACADO | PATROCINADO |
|---------|------|-----------|-------------|
| **Reseñas de clientes** | ✅ Aparecen | ✅ Destacadas | ✅ Premium + Stats |
| **Rating stars** | ✅ | ✅ | ✅ |
| **Módulo de reseñas** | Básico | Destacado | Premium |

**Filosofía:**
- FREE: Reseñas disponibles pero no destacadas
- DESTACADO: Reseñas con mejor presentación
- PATROCINADO: Stats avanzadas de reseñas

---

## 2️⃣ Lógica de Implementación

### 📁 Archivos Creados

```
lib/
  planPermissions.ts       ← Sistema maestro de permisos
components/
  FeatureUpsell.tsx        ← Componentes de upsell reutilizables
```

### 🔐 Validación de Permisos

```typescript
import { 
  hasFeatureAccess, 
  isFeatureLocked,
  getResourceLimit,
  isResourceRequired,
  getUpsellMessage,
  normalizePlan 
} from '@/lib/planPermissions';

// Ejemplo 1: Validar acceso a portada
const plan = normalizePlan(business.plan); // 'free' | 'featured' | 'sponsor'

if (hasFeatureAccess(plan, 'coverImage')) {
  // Mostrar uploader de portada
} else {
  // Mostrar FeatureUpsell para portada
}

// Ejemplo 2: Límites de galería
const galleryLimit = getResourceLimit(plan, 'galleryPhotos');
// FREE: 0, FEATURED: 5, SPONSOR: 10

// Ejemplo 3: Validar si algo es obligatorio
const isCoverRequired = isResourceRequired(plan, 'coverImage');
// FREE: false, FEATURED: true, SPONSOR: true
```

---

## 3️⃣ UI Bloqueada Elegante

### 🎨 Principios de Diseño

**❌ NO HACER:**
- Ocultar completamente features (frustración)
- Mostrar mensajes negativos ("No tienes acceso")
- UI gris y triste
- Bloqueos agresivos

**✅ SÍ HACER:**
- Mostrar features bloqueadas con estilo aspiracional
- Mensajes positivos y motivacionales
- Diseño premium para bloqueos
- CTAs claros y tentadores

### 🎴 Variantes de Upsell

```tsx
import FeatureUpsell from '@/components/FeatureUpsell';

// 1. CARD: Secciones grandes (galería, métricas)
<FeatureUpsell
  feature="gallery"
  currentPlan={business.plan}
  variant="card"
  showPricing={true}
/>

// 2. BANNER: Arriba de secciones
<FeatureUpsell
  feature="metricsAdvanced"
  currentPlan="featured"
  variant="banner"
  showPricing={false}
/>

// 3. INLINE: Dentro de formularios
<FeatureUpsell
  feature="coverImage"
  currentPlan="free"
  variant="inline"
/>

// 4. TOOLTIP: Iconos bloqueados
<FeatureUpsell
  feature="badge"
  currentPlan="free"
  variant="tooltip"
/>
```

---

## 4️⃣ Estrategias de Conversión

### 🎯 Psicología de Monetización

#### **FREE: Hacer Sentir Bien**
- ✅ "Tu negocio ya se ve profesional"
- ✅ "Tienes todo lo esencial"
- ✅ "Crece cuando estés listo"
- ❌ NO: "Plan limitado", "Básico", "Incompleto"

#### **DESTACADO: Aspiracional**
- ✅ "⭐ Plan Más Popular"
- ✅ "3X más visibilidad"
- ✅ "Negocio Destacado en tu zona"
- ✅ "La mayoría de negocios exitosos usan este plan"

#### **PATROCINADO: Autoridad**
- ✅ "👑 Para líderes del mercado"
- ✅ "Domina tu categoría"
- ✅ "Negocio verificado y líder"
- ✅ "Máxima visibilidad garantizada"

### 💡 Mensajes de Valor (No de Restricción)

**❌ MAL:**
```
"Solo plan Destacado tiene galería"
"Tu plan no incluye métricas"
"Actualiza para desbloquear"
```

**✅ BIEN:**
```
"Los negocios con fotos reciben 3X más clientes. Disponible en Plan Destacado."
"Conoce cuántas personas te contactan cada día. Activa métricas desde $199/mes."
"Aparece primero en búsquedas y atrae más clientes. Ver Plan Destacado."
```

### 🎁 Incentivos de Upgrade

```typescript
// Gatillos emocionales
const conversionTriggers = {
  scarcity: "Solo 2 espacios Patrocinados disponibles en tu zona",
  social_proof: "El 80% de negocios exitosos usa Plan Destacado",
  authority: "Únete a los líderes de tu categoría",
  value: "Invierte $199/mes, recupera con 2 clientes extra",
  urgency: "Precio especial válido por 48 horas",
};
```

---

## 5️⃣ Features Visibles pero Bloqueados

### 🔒 Qué Mostrar Bloqueado

**SÍ mostrar bloqueado:**
1. **Galería** (FREE)
   - Mostrar sección con mensaje aspiracional
   - "Los negocios con fotos reciben 3X más clientes"
   - CTA: "Ver planes"

2. **Métricas** (FREE)
   - Mostrar tarjeta de métricas con candado
   - "Descubre cuántas personas te contactan"
   - CTA: "Activar métricas"

3. **Portada** (FREE en dashboard)
   - Mostrar uploader bloqueado
   - "Agrega una portada llamativa"
   - CTA: "Upgrade a Destacado"

4. **Métricas avanzadas** (FEATURED)
   - Mostrar métricas con candado
   - "Disponible en Plan Patrocinado"
   - CTA: "Ver plan completo"

**NO mostrar bloqueado:**
- Información de contacto (siempre permitida)
- Features muy básicos
- Configuraciones técnicas

### 📐 Ejemplos de UI

#### Galería Bloqueada (FREE)

```tsx
{plan === 'free' ? (
  <FeatureUpsell
    feature="gallery"
    currentPlan="free"
    variant="card"
  />
) : (
  <GalleryUploader limit={getResourceLimit(plan, 'galleryPhotos')} />
)}
```

#### Métricas Parciales (FEATURED)

```tsx
<div className="space-y-4">
  {/* Métricas permitidas */}
  {ALLOWED_METRICS.map(metric => (
    <MetricCard key={metric} data={data[metric]} />
  ))}
  
  {/* Banner de upgrade */}
  <FeatureUpsell
    feature="metricsAdvanced"
    currentPlan="featured"
    variant="banner"
  />
  
  {/* Métricas bloqueadas */}
  {LOCKED_METRICS.map(metric => (
    <LockedMetricCard key={metric} metric={metric} />
  ))}
</div>
```

---

## 6️⃣ Evitar Que FREE Se Vea Pobre

### ✨ Principios de Diseño Inclusivo

#### **1. Lenguaje Positivo**

**❌ Evitar:**
- "Plan básico"
- "Versión limitada"
- "Solo gratis"
- "Para emprendedores pequeños"

**✅ Usar:**
- "Plan Gratuito" o "Plan Esencial"
- "Perfecto para empezar"
- "Todo lo esencial incluido"
- "Sin costo, siempre"

#### **2. Features Completas (No Degradadas)**

```typescript
// ❌ MAL: Logo pixelado o sin upload
if (plan === 'free') {
  return <PlaceholderLogo />;
}

// ✅ BIEN: Logo de calidad, igual diseño
<LogoUploader 
  maxSize={plan === 'free' ? 2 : 5} // MB
  quality={0.9} // Misma calidad
/>
```

#### **3. Diseño Digno**

```tsx
// FREE debe verse limpio y profesional
const freeCardStyle = {
  bg: 'white',           // Fondo limpio
  border: 'gray-200',    // Border neutro (no gris feo)
  shadow: '',            // Sin sombra (minimalista)
  padding: 'p-4',        // Espacio suficiente
  typography: 'clean',   // Tipografía clara
};

// NO hacer FREE con:
// - Bordes punteados
// - Backgrounds grises tristes
// - Tipografía pequeña o comprimida
// - Espacios reducidos
```

#### **4. Comparaciones Aspiracionales**

```tsx
// ❌ MAL: Hacer sentir inferior
"Upgrade para dejar de ser básico"

// ✅ BIEN: Hacer sentir potencial
"Crece con nosotros. Agrega portada y galería cuando estés listo."
```

#### **5. Testimonios de Éxito en FREE**

```tsx
<div className="bg-green-50 p-4 rounded-lg border border-green-200">
  <p className="text-sm text-green-900 mb-2">
    💚 <strong>María's Café</strong> empezó con Plan Gratuito y ahora recibe 
    50+ clientes semanales.
  </p>
  <p className="text-xs text-green-700">
    "El plan gratis me ayudó a validar mi negocio antes de invertir."
  </p>
</div>
```

#### **6. Evitar Comparaciones Directas Negativas**

```tsx
// ❌ MAL
<p>Plan FREE: Sin galería (malo)</p>
<p>Plan DESTACADO: Con galería (bueno)</p>

// ✅ BIEN
<p>Plan FREE: Logo + Foto de perfil ✅</p>
<p>Plan DESTACADO: + Portada + Galería de 5 fotos ⭐</p>
```

---

## 7️⃣ Reglas de Firestore

### 🔥 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Businesses collection
    match /businesses/{businessId} {
      
      // Read: Publicados son públicos
      allow read: if resource.data.businessStatus == 'published';
      
      // Create: Usuario autenticado
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid
        && validateBusinessData(request.resource.data);
      
      // Update: Solo owner o admin
      allow update: if request.auth != null
        && (resource.data.ownerId == request.auth.uid 
            || hasAdminRole(request.auth))
        && validateBusinessUpdate(request.resource.data);
      
      // Delete: Solo admin
      allow delete: if hasAdminRole(request.auth);
    }
  }
  
  // Funciones de validación
  function validateBusinessData(data) {
    let plan = data.get('plan', 'free');
    
    // FREE: Validar límites
    return plan != 'free' || (
      data.keys().hasAll(['logoUrl', 'name', 'category'])
      && (!data.keys().hasAny(['coverUrl']) || data.coverUrl == null)
      && (!data.keys().hasAny(['images']) || data.images.size() == 0)
    );
  }
  
  function validateBusinessUpdate(data) {
    let plan = data.get('plan', 'free');
    let oldPlan = resource.data.get('plan', 'free');
    
    // Si downgrade de PREMIUM a FREE, validar restricciones
    return !(plan == 'free' && oldPlan != 'free') || (
      data.get('coverUrl', null) == null
      && data.get('images', []).size() == 0
    );
  }
  
  function hasAdminRole(auth) {
    return auth.token.get('admin', false) == true;
  }
}
```

### 📊 Estructura de Datos

```typescript
interface BusinessDocument {
  // Básico
  id: string;
  name: string;
  category: string;
  description: string; // Límite en cliente según plan
  
  // Plan
  plan: 'free' | 'featured' | 'sponsor';
  planUpdatedAt: Timestamp;
  
  // Imágenes (validar en cliente según plan)
  logoUrl: string;        // Obligatorio todos
  profilePhoto: string;   // Obligatorio todos (foto local)
  coverUrl?: string;      // Solo featured/sponsor
  images?: string[];      // Galería: FREE=0, FEATURED=5, SPONSOR=10
  
  // Contacto (todos los planes)
  phone: string;
  whatsapp: string;
  facebook?: string;
  address: string;
  location: { lat: number; lng: number };
  hours: BusinessHours;
  
  // Estados
  businessStatus: 'draft' | 'in_review' | 'published';
  applicationStatus: 'submitted' | 'approved' | 'rejected';
  
  // Meta
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 8️⃣ Ejemplos de Código

### 🎯 Ejemplo 1: Dashboard con Validación de Plan

```tsx
'use client';

import { hasFeatureAccess, getResourceLimit } from '@/lib/planPermissions';
import FeatureUpsell from '@/components/FeatureUpsell';
import { ImageUploader } from '@/components/ImageUploader';

export default function DashboardGallery({ business }: Props) {
  const plan = business.plan;
  const galleryLimit = getResourceLimit(plan, 'galleryPhotos');
  const hasCoverAccess = hasFeatureAccess(plan, 'coverImage');
  const hasGalleryAccess = hasFeatureAccess(plan, 'gallery');
  
  return (
    <div className="space-y-6">
      {/* Portada */}
      <section>
        <h2 className="text-xl font-bold mb-4">Portada de Negocio</h2>
        
        {hasCoverAccess ? (
          <ImageUploader
            type="cover"
            currentUrl={business.coverUrl}
            businessId={business.id}
            onUploadSuccess={handleCoverUpload}
          />
        ) : (
          <FeatureUpsell
            feature="coverImage"
            currentPlan={plan}
            variant="card"
            showPricing={true}
          />
        )}
      </section>
      
      {/* Galería */}
      <section>
        <h2 className="text-xl font-bold mb-4">Galería de Fotos</h2>
        
        {hasGalleryAccess ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Puedes subir hasta {galleryLimit} fotos adicionales
            </p>
            <ImageUploader
              type="gallery"
              currentImages={business.images || []}
              businessId={business.id}
              maxImages={galleryLimit}
              onUploadSuccess={handleGalleryUpload}
            />
          </>
        ) : (
          <FeatureUpsell
            feature="gallery"
            currentPlan={plan}
            variant="card"
            showPricing={true}
          />
        )}
      </section>
    </div>
  );
}
```

### 🎯 Ejemplo 2: Listado con Ordenamiento por Plan

```tsx
import { getPlanRankingScore, normalizePlan } from '@/lib/planPermissions';

// Ordenar negocios por plan (sponsor > featured > free)
const sortedBusinesses = businesses.sort((a, b) => {
  const planA = normalizePlan(a.plan);
  const planB = normalizePlan(b.plan);
  
  const rankA = getPlanRankingScore(planA); // 1, 2, o 3
  const rankB = getPlanRankingScore(planB);
  
  // Menor ranking = mayor prioridad
  return rankA - rankB;
});

// Render
sortedBusinesses.map(business => (
  <BusinessCard key={business.id} business={business} />
));
```

### 🎯 Ejemplo 3: Validación en Formulario

```tsx
import { isResourceRequired, getResourceLimit } from '@/lib/planPermissions';

function validateBusinessForm(data: BusinessFormData, plan: BusinessPlan) {
  const errors: string[] = [];
  
  // Logo obligatorio para todos
  if (isResourceRequired(plan, 'logo') && !data.logoUrl) {
    errors.push('El logo es obligatorio');
  }
  
  // Portada obligatoria para premium
  if (isResourceRequired(plan, 'coverImage') && !data.coverUrl) {
    errors.push('La portada es obligatoria para planes premium');
  }
  
  // Validar límite de galería
  const galleryLimit = getResourceLimit(plan, 'galleryPhotos');
  if (data.images.length > galleryLimit) {
    errors.push(`Tu plan permite máximo ${galleryLimit} fotos en galería`);
  }
  
  // Validar límite de descripción
  const descLimit = getResourceLimit(plan, 'description');
  if (data.description.length > descLimit) {
    errors.push(`Descripción máxima: ${descLimit} caracteres`);
  }
  
  return errors;
}
```

### 🎯 Ejemplo 4: Métricas con Feature Gating

```tsx
import { hasFeatureAccess } from '@/lib/planPermissions';
import FeatureUpsell from '@/components/FeatureUpsell';

export default function BusinessMetrics({ business, metrics }: Props) {
  const plan = business.plan;
  const hasBasicMetrics = hasFeatureAccess(plan, 'metricsBasic');
  const hasAdvancedMetrics = hasFeatureAccess(plan, 'metricsAdvanced');
  
  // Plan FREE: Sin acceso
  if (!hasBasicMetrics) {
    return (
      <FeatureUpsell
        feature="metrics"
        currentPlan={plan}
        variant="card"
        showPricing={true}
      />
    );
  }
  
  // Plan FEATURED: Métricas básicas
  return (
    <div className="space-y-4">
      {/* Métricas permitidas */}
      <MetricCard icon="eye" label="Vistas" value={metrics.views} />
      <MetricCard icon="phone" label="Llamadas" value={metrics.phoneClicks} />
      <MetricCard icon="whatsapp" label="WhatsApp" value={metrics.whatsappClicks} />
      
      {/* Upgrade para métricas avanzadas */}
      {!hasAdvancedMetrics && (
        <>
          <FeatureUpsell
            feature="metricsAdvanced"
            currentPlan={plan}
            variant="banner"
            showPricing={false}
          />
          
          {/* Métricas bloqueadas */}
          <LockedMetricCard icon="map" label="Cómo llegar" />
          <LockedMetricCard icon="heart" label="Favoritos" />
          <LockedMetricCard icon="star" label="Reseñas" />
        </>
      )}
      
      {/* Métricas avanzadas (solo sponsor) */}
      {hasAdvancedMetrics && (
        <>
          <MetricCard icon="map" label="Cómo llegar" value={metrics.mapClicks} />
          <MetricCard icon="heart" label="Favoritos" value={metrics.favoriteAdds} />
          <MetricCard icon="star" label="Reseñas" value={metrics.totalReviews} />
          <MetricCard icon="rating" label="Rating" value={metrics.avgRating} />
        </>
      )}
    </div>
  );
}
```

---

## 🎯 Checklist de Implementación

### ✅ Backend

- [ ] Firestore rules implementadas
- [ ] Validación de límites en API routes
- [ ] Migration script para negocios existentes
- [ ] Índices de Firestore para ordenamiento por plan

### ✅ Frontend

- [ ] `planPermissions.ts` integrado en toda la app
- [ ] `FeatureUpsell.tsx` usado en secciones bloqueadas
- [ ] BusinessCard con jerarquía visual por plan
- [ ] Dashboard con validaciones de plan
- [ ] Formulario de registro con límites dinámicos

### ✅ UX

- [ ] FREE se ve digno y profesional
- [ ] Mensajes aspiracionales (no restrictivos)
- [ ] CTAs claros para upgrade
- [ ] Comparación de planes visible
- [ ] Testimonios de éxito en todos los planes

### ✅ Testing

- [ ] FREE: Solo logo + 1 foto, sin portada/galería
- [ ] FEATURED: Portada + 5 galería + métricas básicas
- [ ] SPONSOR: Portada + 10 galería + todas métricas
- [ ] Ordenamiento correcto en listados
- [ ] Upsells aparecen correctamente

---

## 📊 KPIs de Conversión

### Métricas a Monitorear

```typescript
const conversionMetrics = {
  // Engagement con upsells
  upsellImpressions: 0,      // Cuántas veces se ve un upsell
  upsellClicks: 0,           // Cuántos clics en CTAs
  
  // Conversión por feature
  coverImageUpgrades: 0,     // Upgrades por portada
  galleryUpgrades: 0,        // Upgrades por galería
  metricsUpgrades: 0,        // Upgrades por métricas
  
  // Tasas
  freeToFeatured: 0,         // % FREE → DESTACADO
  featuredToSponsor: 0,      // % DESTACADO → PATROCINADO
  
  // Retención
  planDowngrades: 0,         // Cuántos bajan de plan
  planChurn: 0,              // Cuántos cancelan
};
```

### Objetivos

- **FREE → DESTACADO:** 12% conversión en 30 días
- **DESTACADO → PATROCINADO:** 8% conversión en 60 días
- **Retención PREMIUM:** >85% mensual
- **Engagement upsell:** >15% CTR

---

## 🚀 Deployment

### 1. Deploy Backend

```bash
# Firestore rules
firebase deploy --only firestore:rules

# Firestore indexes
firebase deploy --only firestore:indexes
```

### 2. Deploy Frontend

```bash
# Build
npm run build

# Deploy Vercel
vercel --prod
```

### 3. Migration Script

```bash
# Migrar negocios existentes
npm run migrate:plans
```

---

## 📞 Soporte

Para dudas sobre implementación:
- Revisar `lib/planPermissions.ts` como fuente de verdad
- Usar `FeatureUpsell.tsx` para todos los bloqueos
- Seguir principios de "FREE digno, PREMIUM irresistible"

**🎯 FREE no es inferior. Es el punto de partida para grandes negocios.**
