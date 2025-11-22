# Sistema de Telemetría - Directorio de Yajalón

Este documento describe el sistema completo de telemetría implementado para monitorear el comportamiento de usuarios y el rendimiento de la aplicación.

## 📊 Visión General

El sistema de telemetría captura eventos de usuario y métricas de la aplicación para:
- Entender el comportamiento de los usuarios
- Identificar negocios más populares
- Medir efectividad de CTAs (llamadas, WhatsApp, mapas)
- Detectar errores y problemas
- Optimizar la experiencia del usuario
- Tomar decisiones basadas en datos

## 🎯 Eventos Capturados

### Navegación
- **`page_view`**: Vista de página (home, negocios, detalle, dashboard, etc.)
- **`search`**: Búsqueda realizada por usuario
- **`filter_applied`**: Filtro aplicado (categoría, colonia)
- **`sort_changed`**: Orden cambiado (rating, alfabético, etc.)

### Interacciones con Negocios
- **`business_viewed`**: Usuario ve detalles de un negocio
- **`business_card_clicked`**: Click en tarjeta de negocio
- **`business_image_viewed`**: Ver imagen en galería
- **`business_hours_checked`**: Consultar horarios
- **`business_shared`**: Compartir negocio

### CTAs (Llamadas a la Acción)
- **`cta_call`**: Click en botón de llamada
- **`cta_whatsapp`**: Click en botón de WhatsApp
- **`cta_maps`**: Click en botón de Google Maps
- **`cta_facebook`**: Click en botón de Facebook
- **`cta_instagram`**: Click en botón de Instagram
- **`cta_website`**: Click en botón de sitio web
- **`cta_email`**: Click en botón de email

### Favoritos
- **`favorite_added`**: Agregar negocio a favoritos
- **`favorite_removed`**: Quitar negocio de favoritos
- **`favorites_viewed`**: Ver lista de favoritos

### Reviews
- **`review_started`**: Usuario comienza a escribir review
- **`review_submitted`**: Review enviada
- **`review_edited`**: Review editada
- **`review_deleted`**: Review eliminada

### Registro y Autenticación
- **`register_started`**: Usuario inicia registro de negocio
- **`register_step_completed`**: Usuario completa un paso del wizard
- **`register_completed`**: Registro completado exitosamente
- **`login_initiated`**: Usuario intenta iniciar sesión
- **`login_completed`**: Sesión iniciada exitosamente
- **`logout`**: Usuario cierra sesión

### Dashboard de Negocios
- **`dashboard_viewed`**: Dueño ve su dashboard
- **`business_edited`**: Negocio editado por dueño
- **`business_payment_initiated`**: Usuario inicia proceso de pago
- **`business_payment_completed`**: Pago completado

### Errores
- **`error_occurred`**: Error en cliente
- **`api_error`**: Error en API

## 📝 Estructura de Datos

Cada evento almacena la siguiente información:

```typescript
{
  // Datos del evento
  event: string,                    // Tipo de evento
  page?: string,                    // Página donde ocurrió
  businessId?: string,              // ID del negocio (si aplica)
  businessName?: string,            // Nombre del negocio (si aplica)
  category?: string,                // Categoría del negocio
  value?: number,                   // Valor numérico (rating, step, etc.)
  searchQuery?: string,             // Término de búsqueda
  filters?: Record<string, any>,    // Filtros aplicados
  metadata?: Record<string, any>,   // Datos adicionales
  error?: {                         // Info de error (si aplica)
    message: string,
    code?: string,
    stack?: string
  },
  
  // Datos del usuario
  userId: string | null,            // UID de Firebase (si autenticado)
  userEmail: string | null,         // Email (si autenticado)
  isAnonymous: boolean,             // true si usuario no autenticado
  
  // Datos de sesión
  userAgent: string,                // Navegador y sistema operativo
  ip: string,                       // Dirección IP (anonimizada)
  saveData: boolean,                // Modo Save Data activado
  
  // Timestamp
  timestamp: string,                // ISO 8601
  createdAt: Date                   // Firestore Timestamp
}
```

## 🔧 Uso en el Código

### Tracking de Page Views

```typescript
import { trackPageView } from '../lib/telemetry';

// En componente de página
useEffect(() => {
  trackPageView('negocios', {
    totalBusinesses: 50,
    filters: 'category:restaurantes'
  });
}, []);
```

### Tracking de Interacciones con Negocios

```typescript
import { trackBusinessInteraction } from '../lib/telemetry';

// Click en tarjeta de negocio
const handleClick = () => {
  trackBusinessInteraction(
    'business_card_clicked',
    business.id,
    business.name,
    business.category
  );
};
```

### Tracking de CTAs

```typescript
import { trackCTA } from '../lib/telemetry';

// Click en botón de WhatsApp
<button onClick={() => trackCTA('whatsapp', business.id, business.name)}>
  WhatsApp
</button>
```

### Tracking de Errores

```typescript
import { trackError } from '../lib/telemetry';

try {
  // código que puede fallar
} catch (error) {
  trackError(error as Error, {
    context: 'BusinessDetailView',
    businessId: business.id
  });
}
```

### Tracking Manual

```typescript
import { sendEvent } from '../lib/telemetry';

sendEvent({
  event: 'review_submitted',
  businessId: business.id,
  businessName: business.name,
  value: rating,
  metadata: {
    reviewLength: text.length,
    hasPhotos: photos.length > 0
  }
});
```

## 📊 Dashboard de Analytics

### Acceso
- URL: `/admin/analytics`
- Solo accesible para administradores
- Requiere autenticación con Firebase

### Métricas Disponibles

#### Estadísticas Generales
- **Total de Eventos**: Cantidad total de eventos capturados
- **Usuarios Únicos**: Cantidad de usuarios diferentes
- **Page Views**: Total de vistas de página
- **Búsquedas**: Cantidad de búsquedas realizadas

#### Actividad por Período
- Hoy
- Ayer
- Últimos 7 días
- Últimos 30 días

#### Engagement de Usuarios
- Búsquedas realizadas
- Favoritos agregados/removidos
- Reviews enviadas
- Registros completados

#### Top Rankings
- **Eventos Principales**: Los 10 eventos más frecuentes
- **CTAs Más Usados**: Botones de acción más clickeados
- **Negocios Más Vistos**: Los 15 negocios con más interacciones

#### Errores Recientes
- Mensaje de error
- Cantidad de ocurrencias
- Última vez que ocurrió

### Filtros de Tiempo
- **Hoy**: Solo eventos del día actual
- **Últimos 7 días**: Última semana
- **Últimos 30 días**: Último mes
- **Todo el tiempo**: Todos los eventos históricos

## 🔐 Seguridad y Privacidad

### Firestore Rules
```
match /telemetry_events/{eventId} {
  // Solo admins pueden leer
  allow read: if isAdmin();
  
  // Nadie puede escribir directamente
  allow write: if false;
}
```

### Anonimización
- IPs son almacenadas pero no se usan para tracking individual
- Usuarios anónimos no tienen PII (Personally Identifiable Information)
- Eventos son agregados para reportes

### GDPR Compliance
- Usuarios pueden solicitar eliminación de sus datos
- No se rastrea información sensible
- Los datos se usan solo para mejorar el servicio

## ⚡ Optimizaciones

### Save Data Mode
El sistema respeta la preferencia `Save-Data` del navegador:
- Eventos no críticos no se envían si Save Data está activado
- Eventos críticos (CTAs, page views) siempre se envían

### Eventos Críticos
```typescript
const CRITICAL_EVENTS = [
  'page_view',
  'cta_call',
  'cta_whatsapp',
  'cta_maps',
  'cta_facebook',
  'register_completed',
  'business_payment_completed'
];
```

### Navigator.sendBeacon
Utiliza `sendBeacon` API cuando está disponible para:
- Enviar eventos incluso si el usuario cierra la página
- No bloquear la navegación
- Mejor rendimiento

### Batching (Futuro)
Considerar implementar batching para:
- Reducir número de requests
- Mejorar rendimiento
- Reducir costos de Firestore

## 📈 Índices de Firestore

Índices creados para optimizar queries:

```json
{
  "collectionGroup": "telemetry_events",
  "fields": [
    { "fieldPath": "event", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "telemetry_events",
  "fields": [
    { "fieldPath": "businessId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "telemetry_events",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

## 🚀 Despliegue

### Deploy de Reglas de Firestore
```bash
firebase deploy --only firestore:rules
```

### Deploy de Índices
```bash
firebase deploy --only firestore:indexes
```

### Verificar Índices
1. Ve a Firebase Console → Firestore → Índices
2. Verifica que todos los índices estén en estado "Enabled"
3. Si hay índices pendientes, espera a que se completen

## 🔄 Mantenimiento

### Limpieza de Datos Antiguos
Considera implementar Cloud Function para:
- Eliminar eventos mayores a 90 días
- Agregar eventos antiguos en tablas de resumen
- Reducir costos de almacenamiento

```typescript
// functions/src/cleanupTelemetry.ts
export const cleanupOldTelemetry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    
    const batch = db.batch();
    const snapshot = await db.collection('telemetry_events')
      .where('createdAt', '<', cutoff)
      .limit(500)
      .get();
    
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

### Monitoreo
- Revisar dashboard semanalmente
- Identificar patrones de uso
- Detectar errores recurrentes
- Optimizar flujos problemáticos

## 📚 Integraciones Futuras

### Google Analytics 4
```typescript
// lib/telemetry.ts
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', payload.event, {
    event_category: payload.page,
    event_label: payload.businessName,
    value: payload.value
  });
}
```

### Mixpanel
```typescript
if (typeof window !== 'undefined' && window.mixpanel) {
  window.mixpanel.track(payload.event, {
    page: payload.page,
    businessId: payload.businessId,
    // ...
  });
}
```

### PostHog
```typescript
if (typeof window !== 'undefined' && window.posthog) {
  window.posthog.capture(payload.event, payload);
}
```

## 🐛 Troubleshooting

### Los eventos no aparecen en el dashboard
1. Verifica que el endpoint `/api/telemetry/ingest` esté funcionando
2. Revisa la consola del navegador por errores
3. Verifica las reglas de Firestore
4. Confirma que los índices estén creados

### Dashboard carga lento
1. Verifica que los índices de Firestore estén activos
2. Considera agregar caché en el API endpoint
3. Reduce el rango de tiempo (usa "Últimos 7 días" en lugar de "Todo el tiempo")

### Errores de autenticación en Analytics
1. Verifica que el usuario sea admin
2. Confirma que el token de Firebase sea válido
3. Revisa la función `hasAdminOverride`

## 📞 Soporte

Para preguntas o problemas:
1. Revisa este documento
2. Verifica los logs en Firebase Console
3. Revisa el código en `lib/telemetry.ts`
4. Contacta al equipo de desarrollo

---

**Última actualización**: Noviembre 2025
**Versión**: 1.0.0
