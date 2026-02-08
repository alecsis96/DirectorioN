# 🔍 Motor de Búsqueda con Algolia - Guía Completa

**Estado:** ✅ IMPLEMENTADO  
**Fecha:** 2026-02-07  
**Impacto:** Búsquedas 10-20x más rápidas, mejor UX, reducción costos Firestore

---

## 📋 Tabla de Contenidos

1. [¿Qué es Algolia?](#qué-es-algolia)
2. [Configuración Inicial](#configuración-inicial)
3. [Sincronización de Datos](#sincronización-de-datos)
4. [Uso del Componente](#uso-del-componente)
5. [Mantenimiento](#mantenimiento)
6. [Troubleshooting](#troubleshooting)

---

## ¿Qué es Algolia?

Algolia es un motor de búsqueda como servicio (SaaS) que reemplaza las búsquedas lentas de Firestore con:

### Ventajas:
- ⚡ **Velocidad:** Respuestas en <50ms
- 🔍 **Búsqueda inteligente:** Typo tolerance, sinónimos, ranking personalizado
- 🎯 **Faceted filters:** Filtros por categoría, ciudad, estado
- 📱 **InstantSearch UI:** Componentes React listos
- 💰 **Free tier:** 10,000 búsquedas/mes, 10,000 registros

### Comparación con Firestore:
| Característica | Firestore | Algolia |
|----------------|-----------|---------|
| Velocidad búsqueda | 500-2000ms | <50ms |
| Búsqueda texto completo | ❌ | ✅ |
| Typo tolerance | ❌ | ✅ |
| Faceted filters | Manual | Automático |
| Ranking personalizado | Manual | Automático |
| Costo (10k queries) | ~$0.36 | Gratis |

---

## Configuración Inicial

### 1. Crear Cuenta en Algolia

1. Ir a [algolia.com](https://www.algolia.com)
2. Crear cuenta gratuita
3. Crear aplicación (ej: "DirectorioNegocios")

### 2. Obtener Credenciales

En el dashboard de Algolia → API Keys:

```
Application ID: XXXXXX
Search-Only API Key: xxxxxxxxxxxxxxxx
Admin API Key: xxxxxxxxxxxxxxxx (⚠️ NUNCA expongas públicamente)
```

### 3. Configurar Variables de Entorno

Agregar a `.env.local`:

```bash
# Algolia Search
NEXT_PUBLIC_ALGOLIA_APP_ID=tu_app_id_aqui
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=tu_search_key_aqui
ALGOLIA_ADMIN_KEY=tu_admin_key_aqui
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=businesses
```

⚠️ **IMPORTANTE:**
- `NEXT_PUBLIC_*` son visibles en el cliente (solo search key)
- `ALGOLIA_ADMIN_KEY` debe mantenerse SECRETA (solo servidor)

### 4. Configurar en Vercel

```bash
vercel env add NEXT_PUBLIC_ALGOLIA_APP_ID
vercel env add NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
vercel env add ALGOLIA_ADMIN_KEY
vercel env add NEXT_PUBLIC_ALGOLIA_INDEX_NAME
```

---

## Sincronización de Datos

### Primera Sincronización

```bash
# Sincronizar todos los negocios publicados
npm run sync-algolia
```

**Output esperado:**
```
🔄 Iniciando sincronización Firestore → Algolia...

⚙️  Configurando índice...
✅ Índice configurado

📖 Leyendo negocios de Firestore...
📊 Encontrados 156 negocios publicados

📤 Enviando a Algolia...
✅ Sincronización completada!
📊 Estadísticas:
   - Negocios indexados: 156
   - ObjectIDs: 156
   - Índice: businesses

📈 Distribución por categoría:
   - Restaurante: 42
   - Tienda: 28
   - Servicios: 25
   ...

✅ Sincronización exitosa
```

### Limpiar Índice (Reset)

```bash
# Eliminar todos los registros del índice
npm run clear-algolia

# Luego re-sincronizar
npm run sync-algolia
```

### Sincronización Automática

**Opción 1: Cloud Functions (Recomendado)**

Crear función que se ejecute en cambios de Firestore:

```typescript
// functions/src/syncToAlgolia.ts
import * as functions from 'firebase-functions';
import { getAdminClient, ALGOLIA_INDEX_NAME } from './algoliaClient';

export const onBusinessWrite = functions.firestore
  .document('businesses/{businessId}')
  .onWrite(async (change, context) => {
    const algoliaClient = getAdminClient();
    const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

    // Eliminar
    if (!change.after.exists) {
      await index.deleteObject(context.params.businessId);
      return;
    }

    // Crear o actualizar
    const business = change.after.data();
    if (business.status === 'published') {
      await index.saveObject({
        objectID: context.params.businessId,
        ...transformBusinessForAlgolia(business),
      });
    } else {
      // Eliminar si cambió a no publicado
      await index.deleteObject(context.params.businessId);
    }
  });
```

**Opción 2: Webhook desde Dashboard**

Cuando un negocio se actualiza, llamar a un API endpoint:

```typescript
// app/api/sync-algolia/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, ALGOLIA_INDEX_NAME } from '@/lib/algoliaClient';

export async function POST(req: NextRequest) {
  // Verificar auth token
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId, action } = await req.json();
  
  const algoliaClient = getAdminClient();
  const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

  if (action === 'delete') {
    await index.deleteObject(businessId);
  } else {
    // Obtener de Firestore y actualizar
    const business = await fetchBusinessById(businessId);
    if (business.status === 'published') {
      await index.saveObject({
        objectID: businessId,
        ...transformBusinessForAlgolia(business),
      });
    }
  }

  return NextResponse.json({ success: true });
}
```

**Opción 3: Cron Job**

```bash
# Agregar a package.json
"sync-algolia-cron": "tsx scripts/syncAlgolia.ts"

# Configurar en Vercel Cron (vercel.json)
{
  "crons": [{
    "path": "/api/cron/sync-algolia",
    "schedule": "0 */6 * * *"  // Cada 6 horas
  }]
}
```

---

## Uso del Componente

### Página Básica con Búsqueda

```tsx
'use client';

import AlgoliaSearch from '@/components/AlgoliaSearch';

export default function NegociosPage() {
  return (
    <div className="container mx-auto py-8">
      <h1>Directorio de Negocios</h1>
      <AlgoliaSearch />
    </div>
  );
}
```

### Con Filtros Iniciales

```tsx
<AlgoliaSearch
  initialFilters={{
    category: 'Restaurante',
    city: 'Yajalón',
    state: 'Chiapas',
  }}
  hitsPerPage={20}
  showFilters={true}
/>
```

### Con Callback al Hacer Click

```tsx
const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

<AlgoliaSearch
  onBusinessClick={(business) => {
    setSelectedBusiness(business);
    // Abrir modal, navegar, etc.
  }}
/>
```

### Solo Búsqueda (Sin Filtros)

```tsx
<AlgoliaSearch
  showFilters={false}
  hitsPerPage={10}
/>
```

---

## Mantenimiento

### Monitorear Uso

Dashboard Algolia → Analytics:
- Búsquedas totales
- Búsquedas sin resultados (optimizar)
- Términos más buscados
- Latencia promedio

### Actualizar Configuración del Índice

Si cambias la configuración en `lib/algoliaClient.ts`:

```bash
# Re-sincronizar para aplicar nuevas settings
npm run sync-algolia
```

### Optimizar Rankings

En `INDEX_SETTINGS`:

```typescript
customRanking: [
  'desc(isPremium)',      // Prioridad 1: Premium
  'desc(isFeatured)',     // Prioridad 2: Destacados
  'desc(rating)',         // Prioridad 3: Rating
  'desc(reviewCount)',    // Prioridad 4: Reseñas
],
```

### Agregar Sinónimos

Dashboard Algolia → Configuration → Synonyms:

```
taqueria => tacos, taquería
reposteria => panadería, pastelería
ferreteria => tlapalería, herrería
```

### Actualizar Typo Tolerance

```typescript
minWordSizefor1Typo: 4,    // "caf" → "cafe"
minWordSizefor2Typos: 8,   // "restaurnate" → "restaurante"
```

---

## Troubleshooting

### Error: "Index does not exist"

**Causa:** El índice no se ha creado en Algolia.

**Solución:**
```bash
npm run sync-algolia
```

### Error: "Search key is invalid"

**Causa:** Variables de entorno mal configuradas.

**Solución:**
1. Verificar `.env.local` tiene las keys correctas
2. Reiniciar servidor: `npm run dev`
3. En Vercel, verificar environment variables

### No aparecen resultados

**Causa:** Filtro `status:published` muy estricto.

**Solución:**
1. Verificar que negocios tienen `status: 'published'`
2. Temporalmente quitar filtro para debug:

```typescript
<Configure
  filters=""  // Sin filtros
  hitsPerPage={20}
/>
```

### Búsqueda muy lenta (>500ms)

**Causa:** Configuración del índice subóptima.

**Solución:**
1. Reducir `attributesToRetrieve` (solo campos necesarios)
2. Reducir `maxValuesPerFacet` (default: 100)
3. Usar CDN más cercano en Algolia settings

### Error: "Rate limit exceeded"

**Causa:** Excediste 10,000 búsquedas/mes del free tier.

**Solución:**
1. Implementar debounce en SearchBox (ya incluido)
2. Cache de búsquedas frecuentes
3. Upgrade a plan pago ($1/1000 búsquedas adicionales)

### Cambios en Firestore no se reflejan

**Causa:** Sincronización manual no automática.

**Solución:**
1. Re-sincronizar manualmente: `npm run sync-algolia`
2. Implementar sincronización automática (Cloud Functions)

---

## Mejoras Futuras

### 1. Búsqueda Geográfica

```typescript
<Configure
  aroundLatLng={`${lat}, ${lng}`}
  aroundRadius={5000}  // 5km
/>
```

### 2. Personalización de Búsqueda

```typescript
// Guardar búsquedas del usuario
analytics.logSearch(query, resultsCount);

// Usar para mejorar rankings
customRanking: ['desc(popularityScore)']
```

### 3. A/B Testing

Algolia dashboard → A/B Testing:
- Probar diferentes rankings
- Probar diferentes typo tolerances
- Medir conversión (clicks → contactos)

### 4. Federated Search

Buscar en múltiples índices simultáneamente:

```typescript
// Buscar negocios + artículos + eventos
<InstantSearch indexName="multi_index">
  <Index indexName="businesses" />
  <Index indexName="articles" />
  <Index indexName="events" />
</InstantSearch>
```

---

## Recursos

- [Algolia Docs](https://www.algolia.com/doc/)
- [React InstantSearch](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/)
- [Algolia Dashboard](https://www.algolia.com/dashboard)
- [Best Practices](https://www.algolia.com/doc/guides/managing-results/relevance-overview/)

---

## Contacto

Si tienes problemas o preguntas:
1. Revisar [Troubleshooting](#troubleshooting)
2. Consultar logs en Dashboard Algolia
3. Contactar soporte Algolia (free tier incluido)

---

**¡Motor de búsqueda listo! 🚀**
