    # Guía de Optimización Firestore: Estados, Índices y Costos

    > **Análisis completo de tu estructura actual + recomendaciones específicas para reducir costos**

    ---

    ## 📊 Estado Actual de tu Sistema

    ### 1️⃣ Campos de Estado (identificados en tu código)

    **Sistema Dual-State:**
    ```typescript
    // types/business.ts
    businessStatus?: 'draft' | 'in_review' | 'published';
    applicationStatus?: 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected';
    status?: 'draft' | 'review' | 'published' | 'rejected'; // LEGACY
    ```

    **Ubicación Geográfica:**
    ```typescript
    colonia?: string;          // "Centro", "Norte", "Sur"
    neighborhood?: string;     // Alias de colonia
    // ⚠️ NO tienes campo `zone` separado
    ```

    **Planes:**
    ```typescript
    plan?: 'free' | 'featured' | 'sponsor';
    ```

    ---

    ## 🔍 Queries más Frecuentes (detectadas en tu código)

    ### **Query Pattern #1: Admin Dashboard (MUY FRECUENTE)**
    ```typescript
    // app/admin/businesses/page.tsx - línea 65
    db.collection('businesses')
    .where('businessStatus', '==', 'published')
    .get()

    // 💰 Costo: ~1 read por negocio
    // 📈 Con 200 negocios: 200 reads cada vez
    ```

    ### **Query Pattern #2: KPIs por Plan (MUY FRECUENTE)**
    ```typescript
    // app/admin/businesses/page.tsx - líneas 105-107
    db.collection('businesses')
    .where('businessStatus', '==', 'published')
    .where('plan', '==', 'featured')
    .count().get()

    // ⚠️ PROBLEMA: .count() en queries compuestas = CARO
    // 💰 Costo: 1 read mínimo (puede ser más según tamaño)
    ```

    ### **Query Pattern #3: Sistema de Escasez**
    ```typescript
    // functions/src/scarcityFunctions.ts - línea 44-48
    db.collection('businesses')
    .where('category', '==', categoryId)
    .where('plan', '==', plan)
    .where('status', '==', 'published')  // ⚠️ Usa 'status' legacy!
    .where('zone', '==', zone)  // ⚠️ Campo 'zone' NO EXISTE en types!
    .get()

    // 💥 PROBLEMA CRÍTICO: 
    // - Estás usando 'zone' en queries pero NO lo guardas en documentos
    // - Mezclas 'status' (legacy) con 'businessStatus' (nuevo)
    ```

    ### **Query Pattern #4: Solicitudes Pendientes**
    ```typescript
    // app/admin/applications/page.tsx - línea 52
    db.collection('applications')
    .where('status', 'in', ['pending', 'solicitud'])
    .get()
    ```

    ---

    ## 🚨 Problemas Identificados

    ### ❌ **Problema 1: Campo "zone" inexistente**

    **En tu código:**
    ```typescript
    // firestore.indexes.json - línea 195
    {
    "fields": [
        { "fieldPath": "category" },
        { "fieldPath": "plan" },
        { "fieldPath": "zone" },  // ⚠️ Este campo NO existe
        { "fieldPath": "status" }
    ]
    }
    ```

    **En tus types:**
    ```typescript
    colonia?: string;      // ✅ Existe
    neighborhood?: string; // ✅ Existe
    // ❌ zone?: string;  NO EXISTE
    ```

    **Impacto:**
    - Estás creando índices para un campo que no usas
    - Las queries con `zone` nunca encuentran datos
    - Desperdicio de cuota de índices

    ---

    ### ❌ **Problema 2: Mezcla de campos legacy y nuevos**

    **En scarcityFunctions.ts:**
    ```typescript
    .where('status', '==', 'published')  // Legacy
    ```

    **En otros archivos:**
    ```typescript
    .where('businessStatus', '==', 'published')  // Nuevo
    ```

    **Impacto:**
    - Inconsistencia: algunos queries leen data vieja, otros nueva
    - Necesitas mantener AMBOS campos actualizados
    - Doble escritura en cada update

    ---

    ### ❌ **Problema 3: Uso excesivo de .count()**

    **Tu código actual:**
    ```typescript
    // 6 queries count solo para KPIs dashboard
    const [totalCount, freeCount, featuredCount, sponsorCount] = await Promise.all([
    db.collection('businesses').where('businessStatus', '==', 'published').count().get(),
    db.collection('businesses').where('businessStatus', '==', 'published').where('plan', '==', 'free').count().get(),
    db.collection('businesses').where('businessStatus', '==', 'published').where('plan', '==', 'featured').count().get(),
    db.collection('businesses').where('businessStatus', '==', 'published').where('plan', '==', 'sponsor').count().get(),
    ]);
    ```

    **Costo real:**
    - Cada `.count()` con filtros compuestos = mínimo 1 read
    - 4 queries × 1 read = **4 reads por carga de dashboard**
    - Si el admin refresh dashboard 10 veces al día = **40 reads/día solo en KPIs**

    ---

    ## ✅ Soluciones y Optimizaciones

    ### 🎯 **Solución 1: Estandarizar campo de zona**

    **Opción A: Usar `colonia` directamente (RECOMENDADO)**
    ```typescript
    // No crear nuevo campo, usar el existente
    db.collection('businesses')
    .where('category', '==', categoryId)
    .where('plan', '==', plan)
    .where('businessStatus', '==', 'published')
    .where('colonia', '==', 'Centro')  // Usa colonia en vez de zone
    .get()
    ```

    **Opción B: Agregar campo `zone` normalizado**
    ```typescript
    // types/business.ts
    zone?: 'centro' | 'norte' | 'sur' | 'este' | 'oeste';  // Normalizado

    // Migración necesaria:
    const businesses = await db.collection('businesses').get();
    for (const doc of businesses.docs) {
    const colonia = doc.data().colonia || '';
    const zone = normalizeZone(colonia); // "Centro" → "centro"
    await doc.ref.update({ zone });
    }
    ```

    **Recomendación:** **Opción A** (usar `colonia`) porque:
    - ✅ No requiere migración
    - ✅ No duplica datos
    - ✅ Más flexible (no limita a 5 zonas)

    ---

    ### 🎯 **Solución 2: Deprecar campo `status` legacy**

    **Migración de 2 pasos:**

    **Paso 1: Asegurar dual-write (YA LO TIENES)**
    ```typescript
    // En todos los updates, escribir ambos campos temporalmente
    await businessRef.update({
    businessStatus: 'published',
    status: 'published',  // Legacy para compatibilidad
    });
    ```

    **Paso 2: Migración de queries (2-3 semanas después)**
    ```typescript
    // ANTES (scarcityFunctions.ts línea 46)
    .where('status', '==', 'published')

    // DESPUÉS
    .where('businessStatus', '==', 'published')
    ```

    **Paso 3: Limpieza final (1 mes después)**
    - Eliminar campo `status` de types
    - Eliminar índices con `status`
    - Eliminar dual-write

    ---

    ### 🎯 **Solución 3: Cache de KPIs con contadores agregados**

    **Problema actual:**
    ```typescript
    // Cada load del dashboard: 4 queries count
    const featuredCount = await db
    .where('businessStatus', '==', 'published')
    .where('plan', '==', 'featured')
    .count().get();
    ```

    **Solución: Colección de contadores agregados**

    **Estructura:**
    ```
    counters/
    ├─ business_stats/
    │  ├─ total: 47
    │  ├─ free: 32
    │  ├─ featured: 12
    │  ├─ sponsor: 3
    │  ├─ in_review: 5
    │  └─ updatedAt: timestamp
    ```

    **Implementación con Cloud Functions:**

    ```typescript
    // functions/src/counterFunctions.ts
    import { onDocumentWritten } from 'firebase-functions/v2/firestore';

    export const updateBusinessCounters = onDocumentWritten(
    'businesses/{businessId}',
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        
        const counterRef = db.collection('counters').doc('business_stats');
        
        // Documento creado
        if (!before && after) {
        if (after.businessStatus === 'published') {
            await counterRef.update({
            total: FieldValue.increment(1),
            [after.plan || 'free']: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
            });
        }
        }
        
        // Documento actualizado
        if (before && after) {
        const statusChanged = before.businessStatus !== after.businessStatus;
        const planChanged = before.plan !== after.plan;
        
        if (statusChanged || planChanged) {
            const updates: any = { updatedAt: FieldValue.serverTimestamp() };
            
            // Status cambió
            if (statusChanged) {
            if (before.businessStatus === 'published') {
                updates.total = FieldValue.increment(-1);
                updates[before.plan || 'free'] = FieldValue.increment(-1);
            }
            if (after.businessStatus === 'published') {
                updates.total = FieldValue.increment(1);
                updates[after.plan || 'free'] = FieldValue.increment(1);
            }
            }
            
            // Solo plan cambió (ambos published)
            if (planChanged && after.businessStatus === 'published' && before.businessStatus === 'published') {
            updates[before.plan || 'free'] = FieldValue.increment(-1);
            updates[after.plan || 'free'] = FieldValue.increment(1);
            }
            
            await counterRef.update(updates);
        }
        }
        
        // Documento eliminado
        if (before && !after) {
        if (before.businessStatus === 'published') {
            await counterRef.update({
            total: FieldValue.increment(-1),
            [before.plan || 'free']: FieldValue.increment(-1),
            updatedAt: FieldValue.serverTimestamp(),
            });
        }
        }
    }
    );
    ```

    **Uso en dashboard:**
    ```typescript
    // ANTES: 4 queries
    const [totalCount, freeCount, featuredCount, sponsorCount] = await Promise.all([
    db.collection('businesses').where('businessStatus', '==', 'published').count().get(),
    // ... 3 queries más
    ]);
    // 💰 Costo: 4 reads

    // DESPUÉS: 1 query
    const statsDoc = await db.collection('counters').doc('business_stats').get();
    const { total, free, featured, sponsor } = statsDoc.data();
    // 💰 Costo: 1 read

    // 🎉 Ahorro: 75% menos reads
    ```

    **Inicialización de contadores (1 vez):**
    ```typescript
    // scripts/init-counters.ts
    async function initCounters() {
    const snapshot = await db.collection('businesses')
        .where('businessStatus', '==', 'published')
        .get();
    
    const stats = { total: 0, free: 0, featured: 0, sponsor: 0 };
    
    snapshot.docs.forEach(doc => {
        const plan = doc.data().plan || 'free';
        stats.total++;
        stats[plan]++;
    });
    
    await db.collection('counters').doc('business_stats').set({
        ...stats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Contadores inicializados:', stats);
    }
    ```

    ---

    ### 🎯 **Solución 4: Contadores por Categoría (sistema escasez)**

    **Problema actual:**
    ```typescript
    // Cada vez que verificas disponibilidad:
    const count = await db.collection('businesses')
    .where('category', '==', 'restaurantes')
    .where('plan', '==', 'featured')
    .where('businessStatus', '==', 'published')
    .where('colonia', '==', 'Centro')
    .count().get();

    // Con 10 categorías × 3 planes × 4 zonas = 120 queries potenciales
    ```

    **Solución: Contadores jerárquicos**

    **Estructura:**
    ```
    counters/
    ├─ scarcity_centro/
    │  ├─ restaurantes_featured: 7
    │  ├─ restaurantes_sponsor: 2
    │  ├─ cafeterias_featured: 5
    │  └─ ...
    ├─ scarcity_norte/
    │  └─ ...
    ```

    **O mejor aún, documento único con subcampos:**
    ```
    counters/scarcity/
    {
    "centro": {
        "restaurantes": { "featured": 7, "sponsor": 2 },
        "cafeterias": { "featured": 5, "sponsor": 1 }
    },
    "norte": {
        "restaurantes": { "featured": 4, "sponsor": 1 }
    },
    "updatedAt": timestamp
    }
    ```

    **Uso:**
    ```typescript
    // ANTES: Query count (1+ read)
    const count = await countBusinessesInPlan('restaurantes', 'featured', 'Centro');

    // DESPUÉS: Leer contador (1 read para TODAS las zonas/categorías)
    const scarcityDoc = await db.collection('counters').doc('scarcity').get();
    const count = scarcityDoc.data()?.centro?.restaurantes?.featured || 0;

    // 🎉 1 read obtiene TODO el inventario premium
    ```

    ---

    ## 📋 Índices Optimizados Recomendados

    ### **Índices a ELIMINAR (desperdicio de cuota)**

    ```json
    // ❌ ELIMINAR: Usan campo 'zone' que no existe
    {
    "fields": [
        { "fieldPath": "category" },
        { "fieldPath": "plan" },
        { "fieldPath": "zone" },        // ❌ NO EXISTE
        { "fieldPath": "status" }
    ]
    }
    ```

    ```json
    // ❌ ELIMINAR: Usan 'status' legacy
    {
    "fields": [
        { "fieldPath": "category" },
        { "fieldPath": "plan" },
        { "fieldPath": "status" }        // ❌ LEGACY
    ]
    }
    ```

    ---

    ### **Índices a MANTENER (necesarios)**

    ```json
    // ✅ NECESARIO: Admin dashboard con filtros
    {
    "collectionGroup": "businesses",
    "fields": [
        { "fieldPath": "businessStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
    }
    ```

    ```json
    // ✅ NECESARIO: Queries por owner
    {
    "collectionGroup": "businesses",
    "fields": [
        { "fieldPath": "ownerEmail", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
    }
    ```

    ```json
    // ✅ NECESARIO: Sistema dual-state en solicitudes
    {
    "collectionGroup": "businesses",
    "fields": [
        { "fieldPath": "applicationStatus", "order": "ASCENDING" },
        { "fieldPath": "businessStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
    }
    ```

    ---

    ### **Índices a AGREGAR (si usas colonia)**

    **Solo si decides NO usar contadores agregados:**

    ```json
    // Para sistema escasez con colonia
    {
    "collectionGroup": "businesses",
    "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "plan", "order": "ASCENDING" },
        { "fieldPath": "businessStatus", "order": "ASCENDING" },
        { "fieldPath": "colonia", "order": "ASCENDING" }
    ]
    }
    ```

    **⚠️ Recomendación:** **NO agregues este índice** si implementas contadores agregados (Solución 4).

    ---

    ## 💰 Estimación de Ahorro de Costos

    ### **Escenario Actual (sin optimizaciones)**

    ```
    Dashboard admin (10 cargas/día):
    ├─ KPIs: 4 queries × 10 = 40 reads/día
    ├─ Lista negocios: 200 reads × 10 = 2,000 reads/día
    ├─ Stats página: 6 queries × 10 = 60 reads/día
    └─ Scarcity checks: 20 queries/día = 20 reads/día
    ────────────────────────────────────────────
    TOTAL: ~2,120 reads/día = 63,600 reads/mes
    ```

    **Costo Firestore:** 
    - Primeros 50k reads/día: Gratis
    - Siguientes 13,600 reads: ~$0.04/mes
    - **Total: $0.04/mes** (casi gratis, pero puede crecer)

    ---

    ### **Con Optimizaciones (contadores agregados)**

    ```
    Dashboard admin (10 cargas/día):
    ├─ KPIs: 1 read × 10 = 10 reads/día  ✅ 75% menos
    ├─ Lista negocios: 200 reads × 10 = 2,000 reads/día (igual)
    ├─ Stats: 1 read × 10 = 10 reads/día  ✅ 83% menos
    ├─ Scarcity: 1 read × 10 = 10 reads/día  ✅ 95% menos
    ────────────────────────────────────────────
    TOTAL: ~2,030 reads/día = 60,900 reads/mes

    🎉 Ahorro: 90 reads/día = 2,700 reads/mes
    ```

    **Escala a futuro (200 negocios → 1000 negocios):**

    **Sin optimización:**
    - Lista negocios: 1000 reads × 10 = 10,000 reads/día
    - **Total: ~300k reads/mes**
    - **Costo: ~$1.00/mes**

    **Con optimización:**
    - Lista negocios: 1000 reads × 10 = 10,000 reads/día
    - KPIs/Stats/Scarcity: 30 reads/día
    - **Total: ~300k reads/mes** (igual, porque lista es dominante)
    - **Costo: ~$1.00/mes**

    **⚠️ La optimización real viene de reducir fetches de lista:**
    - Implementar paginación real (50 por página)
    - Cache client-side con SWR/React Query

    ---

    ## 🚀 Plan de Implementación (Priorizado)

    ### **Semana 1: Quick Wins (bajo riesgo)**

    **1. Estandarizar queries a `businessStatus`**
    ```bash
    # Buscar y reemplazar en todo el código
    - .where('status', '==', 'published')
    + .where('businessStatus', '==', 'published')
    ```

    **Files a actualizar:**
    - `functions/src/scarcityFunctions.ts` (5 ocurrencias)
    - Cualquier otro file que use `status` en queries

    **2. Eliminar índices con `zone` que no existe**
    ```bash
    # Editar firestore.indexes.json
    # Eliminar índices que incluyan "zone"
    firebase deploy --only firestore:indexes
    ```

    ---

    ### **Semana 2: Contadores Agregados**

    **1. Crear colección `counters`**
    ```typescript
    // scripts/init-counters.ts
    // Ver código completo en Solución 3
    ```

    **2. Deploy Cloud Function para auto-update**
    ```typescript
    // functions/src/counterFunctions.ts
    // Ver código completo en Solución 3

    firebase deploy --only functions:updateBusinessCounters
    ```

    **3. Actualizar dashboard para usar contadores**
    ```typescript
    // app/admin/page.tsx
    const statsDoc = await db.collection('counters').doc('business_stats').get();
    ```

    ---

    ### **Semana 3: Contadores de Escasez**

    **1. Crear contador de inventario premium**
    ```typescript
    // scripts/init-scarcity-counters.ts
    const snapshot = await db.collection('businesses')
    .where('businessStatus', '==', 'published')
    .get();

    const scarcity: any = {};

    snapshot.docs.forEach(doc => {
    const { colonia, category, plan } = doc.data();
    if (!scarcity[colonia]) scarcity[colonia] = {};
    if (!scarcity[colonia][category]) scarcity[colonia][category] = { featured: 0, sponsor: 0 };
    if (plan === 'featured' || plan === 'sponsor') {
        scarcity[colonia][category][plan]++;
    }
    });

    await db.collection('counters').doc('scarcity').set(scarcity);
    ```

    **2. Actualizar scarcityFunctions.ts para usar contadores**

    ---

    ### **Semana 4: Testing & Limpieza**

    **1. Verificar consistencia de contadores**
    ```typescript
    // Comparar contadores vs queries reales
    const counterTotal = (await db.collection('counters').doc('business_stats').get()).data().total;
    const queryTotal = (await db.collection('businesses').where('businessStatus', '==', 'published').count().get()).data().count;

    if (counterTotal !== queryTotal) {
    console.error('❌ Inconsistencia detectada!');
    // Re-inicializar contadores
    }
    ```

    **2. Eliminar campo `status` legacy (opcional)**
    ```typescript
    // Solo después de verificar que TODO usa businessStatus
    const businesses = await db.collection('businesses').get();
    for (const doc of businesses.docs) {
    await doc.ref.update({ status: FieldValue.delete() });
    }
    ```

    ---

    ## 📊 Monitoring y Alertas

    ### **Dashboard de Firestore Usage**

    **Queries a monitorear:**
    ```
    1. Reads/day trend (debe bajar tras optimizaciones)
    2. Queries con > 100 documentos leídos (candidatos a paginación)
    3. Count operations (deben bajar a casi 0)
    ```

    **Alertas recomendadas:**
    ```typescript
    // Cloud Function para verificar consistencia diaria
    export const dailyCounterCheck = onSchedule('every day 02:00', async () => {
    const counterDoc = await db.collection('counters').doc('business_stats').get();
    const snapshot = await db.collection('businesses')
        .where('businessStatus', '==', 'published')
        .count().get();
    
    const counterTotal = counterDoc.data()?.total || 0;
    const queryTotal = snapshot.data().count;
    
    if (Math.abs(counterTotal - queryTotal) > 5) {
        // Enviar alerta por email/Slack
        console.error(`❌ Counter drift: ${counterTotal} vs ${queryTotal}`);
        // Re-sincronizar
        await initCounters();
    }
    });
    ```

    ---

    ## 🎯 Resumen Ejecutivo

    ### **Problemas Críticos Actuales:**
    1. ❌ Índice con campo `zone` que no existe
    2. ❌ Mezcla de `status` (legacy) y `businessStatus` (nuevo)
    3. ⚠️ Uso excesivo de `.count()` en queries compuestas

    ### **Optimizaciones Recomendadas:**
    1. ✅ Estandarizar a `businessStatus` en todas las queries
    2. ✅ Eliminar índices con `zone` 
    3. ✅ Implementar contadores agregados para KPIs
    4. ✅ Implementar contadores de escasez por zona/categoría

    ### **Impacto Esperado:**
    - **Reducción de reads:** 75-90% en queries de dashboard
    - **Mejor performance:** Dashboard carga en <500ms vs 2-3s actual
    - **Escalabilidad:** Sistema funciona igual con 1,000 negocios
    - **Costo:** Insignificante (<$1/mes incluso con 1000 negocios)

    ---

    ## ❓ Preguntas para Refinamiento

    **Antes de implementar, confirmar:**

    1. **¿Quieres usar `colonia` directamente o crear campo `zone` normalizado?**
    - Recomendación: Usar `colonia` (menos trabajo)

    2. **¿Cuántos admins usan el dashboard simultáneamente?**
    - Si >1: Necesitas real-time listeners en contadores
    - Si 1: Fetch estático es suficiente

    3. **¿Qué tan seguido cambian planes (free → featured)?**
    - Si >10/día: Contadores agregados son críticos
    - Si <3/día: Cálculos en memoria son OK

    4. **¿Tienes budget para Cloud Functions?**
    - Spark (free): 125k invocations/mes (suficiente)
    - Blaze: Sin límite pero pagas uso

    5. **¿Prefieres optimización gradual o rewrite completo?**
    - Gradual: 4 semanas, bajo riesgo
    - Rewrite: 1 semana, requiere testing exhaustivo

    ---

    **📝 Próximo paso:** Responde las preguntas y te genero los scripts exactos de migración.
