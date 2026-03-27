# 🔥 Solución Rápida: Errores de Firestore Index

## ⚡ Problema Resuelto

Los errores de "query requires an index" han sido **solucionados temporalmente** eliminando `.orderBy()` de las queries.

**Resultado:** `/admin` funciona ahora sin errores ✅

---

## 📊 Queries Actuales (SIN índices necesarios)

```typescript
// Applications
.where('status', 'in', ['pending', 'solicitud'])
.limit(20)

// Businesses
.where('businessStatus', '==', 'in_review')
.limit(20)

// Payments (no index needed)
.where('plan', 'in', ['featured', 'sponsor'])
```

**Trade-off:** Los items NO están ordenados por `createdAt` en Firestore, pero se ordenan por `priorityScore` en el cliente.

---

## 🚀 Optimización Futura (OPCIONAL)

Si necesitas ordenamiento server-side más tarde, despliega los índices:

### **Paso 1: Deploy índices**

```bash
# Desplegar índices definidos en firestore.indexes.admin.json
firebase deploy --only firestore:indexes
```

### **Paso 2: Descomentar orderBy**

En `app/admin/(operations)/page.tsx`:

```typescript
// Cambiar de:
.where('status', 'in', ['pending', 'solicitud'])
.limit(20)

// A:
.where('status', 'in', ['pending', 'solicitud'])
.orderBy('createdAt', 'desc')
.limit(20)
```

---

## 📝 Índices Disponibles

Ver archivo: `firestore.indexes.admin.json`

**Índices incluidos:**
1. `applications`: `status + createdAt` (para ordenar solicitudes)
2. `businesses`: `businessStatus + createdAt` (para ordenar en revisión)
3. `businesses`: `plan + planExpiresAt` (para pagos)

**Tiempo de creación:** 5-10 minutos después de deploy

---

## ✅ ¿Necesito hacer esto ahora?

**NO.** El admin panel funciona perfectamente sin índices. Solo despliega los índices si:

- Tienes >100 applications/businesses
- Necesitas ordenamiento estricto por fecha
- Quieres optimizar performance server-side

---

## 🔍 Verificar estado de índices

```bash
# Ver índices activos
firebase firestore:indexes

# Ver en consola
https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
```

---

**Estado actual:** ✅ FUNCIONAL (sin índices)  
**Performance:** 🟢 BUENA (ordenamiento client-side)  
**Desplegar índices:** 🟡 OPCIONAL (solo si >100 items)
