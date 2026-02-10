# ✅ Checklist de Testing - Sistema de Estados Dual

**Fecha:** 10 de Febrero, 2026  
**Versión:** Post-migración v2.0

---

## 🎯 Flujo Completo a Probar

### 1️⃣ REGISTRO DE NEGOCIO (Usuario)

**Ruta:** `/registro-negocio`

- [ ] Usuario no logueado ve banner de login
- [ ] Usuario logueado sin negocio puede continuar
- [ ] Usuario con negocio existente ve banner "Ya tienes un negocio"
- [ ] Botón "Ir a Dashboard" redirige correctamente
- [ ] Formulario Paso 1: Validaciones funcionan
  - [ ] Campos obligatorios marcados
  - [ ] Email formato correcto
  - [ ] Teléfono formato correcto
- [ ] Formulario Paso 2 (Confirmación):
  - [ ] Resumen muestra datos correctos
  - [ ] Checkbox confirmación requerido
  - [ ] Contador "Tiempo estimado: 24-48h" visible
- [ ] Botón "Completar mi negocio":
  - [ ] Muestra loading "Redirigiendo..."
  - [ ] Crea negocio en Firestore con campos correctos:
    - `businessStatus: 'draft'`
    - `applicationStatus: 'submitted'`
    - `completionPercent: calculado`
    - `missingFields: array`
    - `isPublishReady: boolean`
  - [ ] Redirige a `/dashboard/[id]`
- [ ] **Prevención duplicados:**
  - [ ] Si usuario intenta registrar 2do negocio → redirige al existente
  - [ ] Mensaje: "Ya tienes un negocio registrado..."

---

### 2️⃣ DASHBOARD DEL NEGOCIO (Usuario)

**Ruta:** `/dashboard/[id]`

#### A. Carga Inicial
- [ ] BusinessStatusBanner se muestra correctamente
- [ ] No arroja error "Cannot read businessStatus of undefined"
- [ ] Loading state si negocio no existe aún
- [ ] Mensaje de error claro si no hay permisos

#### B. Banner de Estado
- [ ] **Draft (Borrador):**
  - [ ] Título: "📝 Borrador"
  - [ ] Descripción menciona completar perfil
  - [ ] Barra de progreso muestra % correcto
  - [ ] Lista de campos faltantes visible
  - [ ] Botón "Solicitar publicación" deshabilitado si <50%
  
- [ ] **Submitted (Enviado):**
  - [ ] Título: "⏳ En revisión"
  - [ ] Descripción: "Un administrador revisará..."
  - [ ] No muestra botón de publicar
  
- [ ] **Needs Info (Info solicitada):**
  - [ ] Título: "📝 Información requerida"
  - [ ] Muestra notas del admin en cuadro amarillo
  - [ ] Botón "Reenviar para revisión" habilitado
  
- [ ] **Rejected (Rechazado):**
  - [ ] Título: "❌ Solicitud rechazada"
  - [ ] Muestra motivo de rechazo en cuadro rojo
  - [ ] Link "contactar soporte" funcional

- [ ] **Published (Publicado):**
  - [ ] Título: "✅ Negocio publicado"
  - [ ] Descripción positiva
  - [ ] Link "Ver mi perfil público" funciona

#### C. Edición de Perfil
- [ ] Todos los campos se cargan correctamente
- [ ] Cambios se detectan (indicador "cambios sin guardar")
- [ ] Botón "Guardar cambios" funciona
- [ ] Toast de éxito aparece
- [ ] Timestamp "Guardado hace X min" actualiza
- [ ] Completitud se recalcula automáticamente

#### D. Subida de Imágenes
- [ ] Logo uploader funciona
- [ ] Cover uploader funciona
- [ ] Gallery uploader (múltiples imágenes)
- [ ] Compresión de imágenes activa
- [ ] Preview de imágenes correcto

---

### 3️⃣ PANEL ADMIN (Administrador)

**Ruta:** `/admin/solicitudes`

#### A. Navegación
- [ ] AdminQuickNav visible (botón verde flotante)
- [ ] Menu desplegable funciona
- [ ] Navegación entre 9 páginas funciona
- [ ] Página activa resaltada

#### B. Tabs del Sistema Nuevo
- [ ] **🆕 Nuevas Solicitudes:**
  - [ ] Muestra negocios con `applicationStatus: 'submitted'`
  - [ ] Contador de tab correcto
  - [ ] Cards muestran % completitud
  - [ ] Mensaje de ayuda si vacío
  
- [ ] **⏳ Pendientes:**
  - [ ] Muestra `applicationStatus: 'needs_info'` o `completionPercent < 100%`
  - [ ] Badge naranja "Esperando info"
  - [ ] Muestra notas previas del admin
  
- [ ] **✅ Listas para Publicar:**
  - [ ] Muestra `isPublishReady: true` + `applicationStatus: 'ready_for_review'`
  - [ ] Badge verde "Listo"
  - [ ] Solo acciones de aprobar/rechazar
  
- [ ] **🏪 Publicados:**
  - [ ] Muestra `businessStatus: 'published'`
  - [ ] Stats de plan (free/featured/sponsor)
  - [ ] Opción de despublicar
  
- [ ] **❌ Rechazados:**
  - [ ] Muestra `applicationStatus: 'rejected'`
  - [ ] Muestra motivo de rechazo
  - [ ] Opción de reabrir
  
- [ ] **📋 Todos:**
  - [ ] Muestra todos sin filtro
  - [ ] Filtros adicionales funcionan

#### C. Acciones del Admin
- [ ] **Aprobar negocio:**
  - [ ] Confirmación modal
  - [ ] Actualiza `businessStatus: 'published'`
  - [ ] Actualiza `applicationStatus: 'approved'`
  - [ ] Toast de éxito
  - [ ] Negocio desaparece del tab actual
  - [ ] Aparece en tab "Publicados"
  
- [ ] **Rechazar negocio:**
  - [ ] Modal con textarea
  - [ ] Validación mínimo 10 caracteres
  - [ ] Contador de caracteres dinámico
  - [ ] Botón deshabilitado si <10 chars
  - [ ] Error claro si intenta enviar sin suficientes caracteres
  - [ ] Actualiza `applicationStatus: 'rejected'`
  - [ ] Guarda `rejectionReason`
  
- [ ] **Solicitar más información:**
  - [ ] Modal con textarea para notas
  - [ ] Actualiza `applicationStatus: 'needs_info'`
  - [ ] Guarda `adminNotes`
  - [ ] Usuario lo ve en su dashboard

#### D. Otras Páginas Admin
- [ ] **/admin/applications** - Solicitudes antiguas
- [ ] **/admin/businesses** - Negocios publicados
- [ ] **/admin/pending-businesses** - En revisión
- [ ] **/admin/payments** - Gestión de pagos
- [ ] **/admin/reports** - Reportes de usuarios
- [ ] **/admin/analytics** - Métricas del sistema
- [ ] **/admin/reviews** - Moderación de reseñas
- [ ] **/admin/stats** - Estadísticas generales

---

### 4️⃣ RESPONSIVE DESIGN

#### Desktop (≥1024px)
- [ ] Sidebar no existe (eliminado)
- [ ] AdminQuickNav en esquina inferior derecha
- [ ] Tabs horizontales sin scroll
- [ ] Stats cards grid 4 columnas
- [ ] Formularios 2 columnas

#### Tablet (768px - 1023px)
- [ ] AdminQuickNav visible
- [ ] Tabs scrollean horizontalmente si necesario
- [ ] Stats cards grid 3 columnas
- [ ] Formularios 2 columnas

#### Mobile (≤767px)
- [ ] AdminQuickNav accesible con pulgar
- [ ] Tabs scrollean horizontalmente
- [ ] Stats cards grid 2 columnas
- [ ] Formularios 1 columna
- [ ] Headers adaptativos (text-2xl → text-xl)
- [ ] Padding reducido (px-4 py-3)
- [ ] Touch targets ≥44px

---

### 5️⃣ EDGE CASES & SEGURIDAD

- [ ] Usuario intenta acceder a dashboard de otro negocio → Error 403
- [ ] Admin intenta editar sin permisos → Redirige
- [ ] Negocio inexistente (`/dashboard/fake-id`) → Error amigable
- [ ] Session expirada → Redirige a login
- [ ] Timestamps serializados correctamente (no error Firestore)
- [ ] businessState undefined manejado con guards
- [ ] Validación duplicados funciona (no permite 2 negocios)

---

### 6️⃣ MIGRACIÓN DE DATOS

- [ ] 16 negocios migrados tienen nuevos campos:
  - [ ] `businessStatus` existe
  - [ ] `applicationStatus` existe
  - [ ] `completionPercent` calculado
  - [ ] `isPublishReady` boolean
  - [ ] `missingFields` array
- [ ] Applications collection sincronizada
- [ ] No negocios huérfanos (sin ownerId)

---

## 🐛 Bugs Conocidos (Verificar corregidos)

- [x] ~~Error "Cannot read businessStatus of undefined"~~ → Corregido con guards
- [x] ~~Modal rechazo permitía <10 caracteres~~ → Validación agregada
- [x] ~~Parsing error en analytics/reports~~ → Divs duplicados eliminados
- [x] ~~Usuario podía crear múltiples negocios~~ → Validación de duplicados agregada
- [x] ~~AdminNavigation ocupaba mucho espacio en móvil~~ → Reemplazado por AdminQuickNav

---

## 📊 Métricas a Verificar

- [ ] **Performance:**
  - [ ] Firestore queries optimizadas (usan índices)
  - [ ] Imágenes comprimidas antes de subir
  - [ ] No lecturas innecesarias
  
- [ ] **UX:**
  - [ ] Loading states en todas las acciones
  - [ ] Mensajes de error claros
  - [ ] Confirmaciones para acciones destructivas
  - [ ] Feedback inmediato (toasts, badges)

---

## ✅ Criterios de Aceptación

**Sistema pasa testing si:**
1. ✅ Todos los flujos críticos funcionan sin errores
2. ✅ Responsive funciona en 3 tamaños de pantalla
3. ✅ No hay errores en consola del navegador
4. ✅ No hay errores de TypeScript
5. ✅ Validaciones de duplicados funcionan
6. ✅ Admin puede aprobar/rechazar negocios
7. ✅ Usuario ve estados correctos en dashboard
8. ✅ Migración de 16 negocios exitosa

---

## 🎯 Siguiente Fase (Después del Testing)

1. Corregir bugs encontrados
2. Optimizaciones de performance
3. Agregar tests automatizados (Vitest/Playwright)
4. Deploy a producción
