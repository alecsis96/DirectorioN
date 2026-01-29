# Testing del Sistema de Feature Gating de Métricas

## Cómo Probar el Sistema

### 1. Preparación del Entorno

```bash
# Asegurarse de que el proyecto compila
npm run build

# Levantar el servidor de desarrollo
npm run dev
```

### 2. Escenarios de Prueba

#### A) Negocio con Plan FREE

**Setup en Firestore:**
```javascript
// Documento: businesses/{businessId}
{
  "name": "Mi Negocio Gratis",
  "plan": "free", // o sin plan
  "ownerId": "user123",
  "status": "published"
}
```

**Navegación:**
1. Ir a `/metricas`
2. Buscar el negocio "Mi Negocio Gratis"

**Resultado Esperado:**
- ✅ Tarjeta con borde punteado y fondo gris
- ✅ Icono de candado grande (Lock)
- ✅ Mensaje: "Las métricas están disponibles a partir del plan Destacado..."
- ✅ Botón "Actualizar Plan" que lleva a `/para-negocios#planes`
- ✅ NO se muestran números de métricas

**Screenshot esperado:**
```
┌─────────────────────────────────────┐
│ Mi Negocio Gratis                   │
│ 🆓 Free  ✓ Publicado               │
├─────────────────────────────────────┤
│                                     │
│          🔒 (candado grande)        │
│                                     │
│  Las métricas están disponibles     │
│  a partir del plan Destacado...     │
│                                     │
│    [👑 Actualizar Plan]             │
└─────────────────────────────────────┘
```

---

#### B) Negocio con Plan FEATURED

**Setup en Firestore:**
```javascript
// Documento: businesses/{businessId}
{
  "name": "Mi Negocio Destacado",
  "plan": "featured",
  "ownerId": "user123",
  "status": "published"
}
```

**Navegación:**
1. Ir a `/metricas`
2. Buscar el negocio "Mi Negocio Destacado"

**Resultado Esperado:**
- ✅ Banner ámbar informativo arriba de las métricas
- ✅ Texto: "Métricas parciales: Tu plan Destacado incluye Vistas, WhatsApp y Llamadas"
- ✅ Link "Actualiza a Patrocinado para ver todas las métricas"
- ✅ 3 métricas desbloqueadas con valores reales:
  - Vistas (fondo azul)
  - Tel. (fondo verde)
  - WhatsApp (fondo esmeralda)
- ✅ 4 métricas bloqueadas con candado:
  - Maps (fondo gris, texto "Solo Sponsor")
  - ❤️ (fondo gris, texto "Solo Sponsor")
  - Reseñas (fondo gris, texto "Solo Sponsor")
  - Rating (fondo gris, texto "Solo Sponsor")

**Screenshot esperado:**
```
┌─────────────────────────────────────┐
│ Mi Negocio Destacado                │
│ ⭐ Featured  ✓ Publicado            │
├─────────────────────────────────────┤
│ 👑 Métricas parciales: Tu plan      │
│    Destacado incluye Vistas,        │
│    WhatsApp y Llamadas.             │
│    [Actualiza a Patrocinado...]     │
├─────────────────────────────────────┤
│ ┌────┬────┬────┬────┬────┬────┬───┐│
│ │124 │ 45 │ 78 │ 🔒 │ 🔒 │ 🔒 │🔒││
│ │    │    │    │Solo│Solo│Solo│So││
│ │Vis │Tel │WA  │Spo │Spo │Spo │Sp││
│ └────┴────┴────┴────┴────┴────┴───┘│
└─────────────────────────────────────┘
```

---

#### C) Negocio con Plan SPONSOR

**Setup en Firestore:**
```javascript
// Documento: businesses/{businessId}
{
  "name": "Mi Negocio Sponsor",
  "plan": "sponsor",
  "ownerId": "user123",
  "status": "published"
}
```

**Navegación:**
1. Ir a `/metricas`
2. Buscar el negocio "Mi Negocio Sponsor"

**Resultado Esperado:**
- ✅ Sin banner informativo (acceso completo)
- ✅ Badge "👑 Sponsor" en color morado
- ✅ 7 métricas desbloqueadas con valores reales:
  - Vistas (azul)
  - Tel. (verde)
  - WhatsApp (esmeralda)
  - Maps (cielo)
  - ❤️ (rosa)
  - Reseñas (ámbar)
  - Rating (morado)
- ✅ Todas con fondos de colores y números visibles
- ✅ Ningún candado visible

**Screenshot esperado:**
```
┌─────────────────────────────────────┐
│ Mi Negocio Sponsor                  │
│ 👑 Sponsor  ✓ Publicado            │
├─────────────────────────────────────┤
│ ┌────┬────┬────┬────┬────┬────┬───┐│
│ │350 │120 │ 89 │ 56 │ 34 │ 12 │4.5││
│ │    │    │    │    │    │    │   ││
│ │Vis │Tel │WA  │Map │❤️  │Res │Ra││
│ └────┴────┴────┴────┴────┴────┴───┘│
└─────────────────────────────────────┘
```

---

#### D) Usuario con Múltiples Negocios (Mixed Plans)

**Setup en Firestore:**
```javascript
// Usuario tiene 3 negocios:
businesses: [
  { name: "Negocio A", plan: "free", ownerId: "user123" },
  { name: "Negocio B", plan: "featured", ownerId: "user123" },
  { name: "Negocio C", plan: "sponsor", ownerId: "user123" }
]
```

**Navegación:**
1. Ir a `/metricas`
2. Ver resumen general en la parte superior

**Resultado Esperado en Resumen General:**
- ✅ Las 6 tarjetas del resumen se muestran
- ✅ Tarjetas de métricas básicas (Vistas, Tel, WA) desbloqueadas
- ✅ Tarjetas de métricas avanzadas (Maps, ❤️, Reseñas) desbloqueadas
- ✅ Totales calculados correctamente:
  - Vistas: suma de Negocio B + C (Negocio A no cuenta)
  - Tel: suma de Negocio B + C
  - WhatsApp: suma de Negocio B + C
  - Maps: solo Negocio C
  - Favoritos: solo Negocio C
  - Reseñas: solo Negocio C

**Resultado Esperado en Detalle:**
- ✅ Negocio A: tarjeta bloqueada completa
- ✅ Negocio B: banner + 3 métricas + 4 bloqueadas
- ✅ Negocio C: 7 métricas completas

---

### 3. Testing del Resumen General

#### Estado con Todos los Negocios FREE
**Esperado:**
- Las 6 tarjetas deben estar bloqueadas
- Fondo gris, candado, texto "Plan Patrocinado"

#### Estado con Al Menos 1 Negocio Featured/Sponsor
**Esperado:**
- Métricas básicas (Vistas, Tel, WA) desbloqueadas
- Métricas avanzadas dependen de si hay al menos 1 Sponsor

---

### 4. Testing de Normalización de Planes

Probar con diferentes valores en Firestore:

```javascript
// Estos deben tratarse como 'free':
{ plan: "gratis" }
{ plan: "FREE" }
{ plan: null }
{ plan: undefined }
{ /* sin campo plan */ }
{ plan: "invalid_value" }

// Estos deben tratarse como 'featured':
{ plan: "featured" }
{ plan: "FEATURED" }
{ plan: "destacado" }
{ plan: "Destacado" }

// Estos deben tratarse como 'sponsor':
{ plan: "sponsor" }
{ plan: "SPONSOR" }
{ plan: "patrocinado" }
{ plan: "Patrocinado" }
```

---

### 5. Testing de Migración de ownerId

**Caso:** Negocio sin `ownerId` pero con `ownerEmail` que coincide con el email del usuario

**Setup:**
```javascript
// Documento en Firestore:
{
  "name": "Negocio Antiguo",
  "ownerEmail": "user@example.com", // Email del usuario actual
  // sin campo ownerId
  "plan": "featured"
}
```

**Navegación:**
1. Login con `user@example.com`
2. Ir a `/metricas`

**Resultado Esperado:**
- ✅ El negocio aparece en la lista
- ✅ En consola del servidor: `[metricas] Updating ownerId for business {id}`
- ✅ El documento en Firestore ahora tiene `ownerId` actualizado
- ✅ Las métricas se muestran correctamente según el plan

---

### 6. Testing de Logs de Debugging

**Abrir consola del servidor** (no del navegador) y buscar:

```
[metricas] Fetching businesses for userId: abc123 email: user@example.com
[metricas] Found businesses by ownerId: 2
[metricas] Business: {
  id: 'business1',
  name: 'Mi Negocio',
  ownerId: 'abc123',
  ownerEmail: 'user@example.com',
  status: 'published',
  plan: 'featured'
}
[metricas] Total businesses to show: 2
```

---

### 7. Testing de Links y CTAs

#### Links de "Actualizar Plan"
- ✅ Deben llevar a `/para-negocios#planes`
- ✅ Deben abrir en la misma pestaña
- ✅ Deben funcionar desde:
  - Tarjeta de negocio FREE
  - Banner de negocio Featured
  - Métricas bloqueadas en resumen

#### Link de "Ver Dashboard"
- ✅ Debe llevar a `/dashboard/{businessId}`
- ✅ Solo visible para negocios Featured/Sponsor

---

### 8. Checklist de Validación Final

Antes de marcar como completo, verificar:

- [ ] Plan FREE: sin métricas, solo CTA
- [ ] Plan FEATURED: 3 métricas visibles, 4 bloqueadas, banner ámbar
- [ ] Plan SPONSOR: 7 métricas visibles, sin restricciones
- [ ] Resumen general calcula totales correctamente
- [ ] Normalización de planes funciona (FREE/free/gratis → free)
- [ ] Migración de ownerId funciona para negocios antiguos
- [ ] Links de upgrade funcionan correctamente
- [ ] Estados de publicación (draft/review/published) se muestran
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en consola del servidor
- [ ] Responsive: se ve bien en móvil, tablet y desktop

---

## Troubleshooting

### Problema: No aparecen negocios en /metricas

**Soluciones:**
1. Verificar que el usuario tenga sesión activa
2. Verificar en Firestore que los negocios tengan `ownerId` o `ownerEmail`
3. Ver logs del servidor para errores de autenticación
4. Verificar reglas de seguridad de Firestore

### Problema: Todas las métricas están bloqueadas incluso en Sponsor

**Soluciones:**
1. Verificar que `plan` en Firestore sea exactamente `"sponsor"` (lowercase)
2. Comprobar que `normalizePlan()` funciona correctamente
3. Ver logs para verificar el plan detectado

### Problema: Métricas muestran 0 para todos los negocios

**Soluciones:**
1. Verificar que existe la colección `telemetry_events` en Firestore
2. Verificar que los eventos tienen el campo `businessId` correcto
3. Ver logs: `[metricas] Error fetching metrics for {id}`
4. Verificar que hay eventos en los últimos 30 días

---

## Comandos Útiles

```bash
# Compilar y verificar errores
npm run build

# Modo desarrollo con hot-reload
npm run dev

# Ver logs del servidor en tiempo real
# (Vercel Dev Tools o terminal donde corre npm run dev)

# Limpiar cache de Next.js
rm -rf .next

# Verificar configuración de métricas
node scripts/test-metrics-config.js
```

---

## Próximos Pasos Después del Testing

1. ✅ Validar todos los escenarios listados arriba
2. ✅ Tomar screenshots de cada estado para documentación
3. ✅ Hacer testing con usuarios reales (staging)
4. ✅ Verificar performance con muchos negocios (>20)
5. ✅ Testing cross-browser (Chrome, Firefox, Safari, Edge)
6. ✅ Testing mobile (iOS Safari, Android Chrome)
7. ✅ Remover console.logs de debugging antes de producción
8. ✅ Deploy a staging
9. ✅ Testing final en staging
10. ✅ Deploy a producción

---

## Contacto para Feedback

Si encuentras algún bug o comportamiento inesperado:
- Tomar screenshot
- Copiar logs de consola (servidor y navegador)
- Anotar pasos para reproducir
- Verificar plan del negocio en Firestore

---

**Última actualización:** 2026-01-28
**Versión del sistema:** 1.0.0
**Estado:** ✅ Listo para testing
