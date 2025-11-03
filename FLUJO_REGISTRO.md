# 📋 Flujo de Registro de Negocios - Documentación Completa

## 🎯 Descripción General

Sistema simplificado de registro de negocios en 2 fases:
1. **Fase Pública**: Solicitud rápida con datos mínimos
2. **Fase Privada**: Completar detalles después de aprobación

---

## 🔄 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1: SOLICITUD PÚBLICA (BusinessWizard)                     │
├─────────────────────────────────────────────────────────────────┤
│  Usuario completa:                                              │
│  • Datos del dueño (nombre, email, teléfono)                   │
│  • Datos del negocio (nombre, categoría, teléfono/WhatsApp)    │
│                                                                 │
│  ➜ Guarda en: applications/{uid}                               │
│  ➜ Status: "pending"                                           │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  REVISIÓN ADMIN (Panel /admin/applications)                     │
├─────────────────────────────────────────────────────────────────┤
│  Admin revisa y aprueba la solicitud                           │
│                                                                 │
│  ➜ Llama a: /api/admin/applications/approve                    │
│  ➜ Crea: businesses/{autoId} con status="draft"               │
│  ➜ Actualiza: applications/{uid} status="approved"            │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2: COMPLETAR DETALLES (Dashboard)                        │
├─────────────────────────────────────────────────────────────────┤
│  Dueño accede a /dashboard/{id} y ve:                          │
│  🟡 Banner amarillo: "Completa tus datos y envíalo a revisión" │
│                                                                 │
│  Puede agregar:                                                │
│  • Ubicación (dirección, colonia, municipio, coordenadas)      │
│  • Horarios por día                                            │
│  • Imágenes (logo, portada, galería)                           │
│  • Redes sociales (Facebook, Instagram, TikTok)                │
│  • Servicios y métodos de pago                                 │
│  • Descripción completa                                        │
│                                                                 │
│  ➜ Clic en "Enviar a revisión"                                 │
│  ➜ Cambia status de "draft" a "pending"                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  REVISIÓN FINAL (Panel Admin - Tab Negocios)                   │
├─────────────────────────────────────────────────────────────────┤
│  Admin revisa el negocio completo                              │
│                                                                 │
│  ➜ Cambia status a "approved"                                  │
│  ➜ Negocio aparece en directorio público                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  VISIBLE EN PÚBLICO (/negocios)                                 │
├─────────────────────────────────────────────────────────────────┤
│  • Solo negocios con status="approved" son visibles            │
│  • Dueños ven botón "Gestionar negocio"                        │
│  • Pueden editar info en cualquier momento desde dashboard      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Colecciones de Firestore

### `applications/{uid}`
Solicitudes de registro inicial

```typescript
{
  uid: string,                    // UID del usuario
  email: string,                  // Email del usuario
  displayName: string,            // Nombre del usuario
  businessName: string,           // Nombre del negocio
  category: string,               // Categoría
  status: "pending" | "approved", // Estado de la solicitud
  ownerName: string,              // Nombre del dueño
  ownerEmail: string,             // Email del dueño
  ownerPhone: string,             // Teléfono del dueño
  phone: string,                  // Teléfono del negocio
  whatsapp: string,               // WhatsApp del negocio
  formData: {...},                // Todos los datos del formulario
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `businesses/{id}`
Negocios creados después de aprobación

```typescript
{
  id: string,                            // Auto-generado por Firestore
  status: "draft" | "pending" | "approved", // Estado del negocio
  ownerId: string,                       // UID del dueño
  ownerEmail: string,                    // Email del dueño (normalizado)
  ownerName: string,
  businessName: string,
  category: string,
  
  // Campos completados en dashboard:
  address: string,
  colonia: string,
  municipio: string,
  lat: number,
  lng: number,
  location: { lat, lng },
  
  phone: string,
  whatsapp: string,
  emailContact: string,
  facebookPage: string,
  instagramUser: string,
  tiktok: string,
  website: string,
  
  logoUrl: string,
  coverPhoto: string,
  images: Array<{ url, publicId? }>,
  gallery: string[],
  
  horarios: {...},
  hours: string,              // Resumen textual
  
  servicios: string[],
  metodoPago: string[],
  priceRange: string,
  promocionesActivas: string,
  
  tags: string[],
  description: string,
  
  plan: "free" | "featured" | "sponsor",
  featured: "si" | "no",
  
  processedBy: string,        // UID del admin que aprobó
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔑 Endpoints API

### `POST /api/businesses/submit`
Guarda solicitudes y progreso del wizard

**Body:**
```json
{
  "formData": { /* datos del formulario */ },
  "mode": "wizard" | "application",
  "step": 0 | 1  // Solo en modo wizard
}
```

**Respuesta:**
```json
{
  "ok": true,
  "submitted": true,
  "notified": true  // Si webhook fue enviado
}
```

### `POST /api/admin/applications/approve`
Aprueba solicitud y crea negocio en draft

**Headers:**
```
Authorization: Bearer {idToken}
```

**Body:**
```json
{
  "applicationId": "uid_del_usuario",
  "removeSource": true  // Opcional, elimina application después
}
```

**Respuesta:**
```json
{
  "ok": true,
  "businessId": "id_del_negocio_creado",
  "message": "Negocio creado en estado draft"
}
```

### `POST /api/businesses/update`
Actualiza datos del negocio (desde dashboard)

**Headers:**
```
Authorization: Bearer {idToken}
```

**Body:**
```json
{
  "businessId": "id_del_negocio",
  "updates": { /* campos a actualizar */ }
}
```

---

## 🎨 Componentes Principales

### `components/BusinessWizard.tsx`
- Formulario de 2 pasos para solicitud inicial
- **Paso 1**: Información básica (owner + business)
- **Paso 2**: Confirmación y envío
- Guarda en `applications` con `status: 'pending'`

### `pages/dashboard/[id].tsx`
- Dashboard privado del propietario
- Banners de estado según draft/pending/approved
- Formulario completo para agregar todos los detalles
- Botón "Enviar a revisión" cambia status a pending

### `pages/admin/applications.tsx`
- Panel administrativo con 3 tabs:
  - **Solicitudes**: applications pendientes
  - **Negocios**: businesses creados
  - **Configuración**: ajustes generales
- Botones Aprobar/Pendiente/Rechazar
- Filtros por estado y búsqueda

### `components/BusinessList.tsx` y `pages/negocios/index.tsx`
- Listado público de negocios
- **Filtro**: Solo muestra `status: 'approved'`
- Cards con info básica y modal de detalles

### `components/BusinessDetailView.tsx`
- Vista detallada de un negocio
- Botón "Gestionar negocio" visible para:
  - Propietario (por ownerId o ownerEmail)
  - Administradores

---

## 🔐 Permisos y Validaciones

### Quién puede aprobar solicitudes
- Solo usuarios con claim `admin: true` en Firebase Auth
- Validado en el endpoint con `decoded.admin`

### Quién puede editar un negocio
- Propietario: `user.uid === business.ownerId`
- Propietario por email: `user.email === business.ownerEmail`
- Administrador: `claims.admin === true`

### Filtrado público
- `fetchBusinesses()` en `lib/server/businessData.ts` filtra `status === 'approved'`
- `BusinessList.tsx` también aplica el filtro en cliente

---

## ✅ Estados y Transiciones

### Estados de Application
- `pending`: Recién enviada, esperando revisión
- `approved`: Aprobada por admin (se crea business)

### Estados de Business
- `draft`: Creado pero sin completar info
- `pending`: Completado, esperando aprobación final
- `approved`: Aprobado, visible en público

### Transiciones Válidas
```
application:pending → (admin aprueba) → business:draft
business:draft → (owner completa) → business:pending
business:pending → (admin aprueba) → business:approved
```

---

## 🚀 Testing del Flujo

### 1. Registro Inicial
```bash
# Acceder a /registro-negocio o /business/register
# Completar formulario básico
# Verificar que se guarde en applications con status=pending
```

### 2. Aprobación Admin
```bash
# Login como admin en /admin/applications
# Ver solicitud en tab "Solicitudes"
# Clic en "Aprobar"
# Verificar que se cree documento en businesses con status=draft
```

### 3. Completar Info
```bash
# Login como dueño
# Acceder a /dashboard/{id}
# Ver banner amarillo "Completa tus datos"
# Agregar ubicación, horarios, fotos, etc.
# Clic en "Enviar a revisión"
# Verificar que status cambie a pending
```

### 4. Aprobación Final
```bash
# Login como admin en /admin/applications
# Tab "Negocios"
# Buscar negocio con status=pending
# Cambiar status a approved
# Verificar que aparece en /negocios
```

---

## 🐛 Errores Comunes y Soluciones

### Error: "applicationId es obligatorio y debe ser string"
**Causa**: El frontend enviaba `applicationId` pero el endpoint esperaba `id`  
**Solución**: Endpoint actualizado para soportar ambos nombres

### Error: Negocio no aparece en listado público
**Causa**: Status no es "approved"  
**Solución**: Verificar en Firestore que `business.status === 'approved'`

### Error: No puedo editar mi negocio
**Causa**: `ownerId` o `ownerEmail` no coinciden  
**Solución**: Verificar que el campo esté correctamente guardado en Firestore

---

## 📝 Notas Adicionales

### Webhook de Notificación
- Configurar `SLACK_WEBHOOK_URL` o `NOTIFY_WEBHOOK_URL` en variables de entorno
- Se envía al aprobar una solicitud o completar wizard
- Formato: Texto con resumen de la solicitud

### Migración de Datos Antiguos
- Si tienes negocios sin campo `status`, agrégalo manualmente:
```javascript
// En consola de Firestore o script
batch.update(businessRef, { status: 'approved' });
```

### Reglas de Firestore (Recomendadas)
```javascript
// applications - solo lectura propia, admin puede todo
match /applications/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow write: if request.auth != null && 
               (request.auth.uid == uid || 
                request.auth.token.admin == true);
}

// businesses - lectura pública de approved, escritura restringida
match /businesses/{id} {
  allow read: if resource.data.status == 'approved' || 
                 request.auth.uid == resource.data.ownerId ||
                 request.auth.token.admin == true;
  allow write: if request.auth.uid == resource.data.ownerId ||
                  request.auth.token.admin == true;
}
```

---

**Última actualización**: Noviembre 2, 2025  
**Versión**: 2.0 (Flujo simplificado 2 fases)
