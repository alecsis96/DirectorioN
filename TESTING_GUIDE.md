# 🧪 Guía de Testing - Flujo de Registro de Negocios

## ✅ Lista de Verificación Completa

### 📋 **Fase 1: Solicitud Inicial**

1. **Acceder al formulario de registro**
   - [ ] Ir a `/registro-negocio` o `/business/register`
   - [ ] Verificar que se muestra el formulario de 2 pasos

2. **Completar Paso 1: Información Básica**
   - [ ] Ingresar nombre del dueño
   - [ ] Ingresar email del dueño
   - [ ] Ingresar teléfono del dueño
   - [ ] Ingresar nombre del negocio
   - [ ] Seleccionar categoría (opcional)
   - [ ] Ingresar teléfono del negocio
   - [ ] Ingresar WhatsApp del negocio
   - [ ] Clic en "Siguiente"

3. **Paso 2: Confirmación**
   - [ ] Verificar que se muestran todos los datos ingresados
   - [ ] Leer el mensaje "¿Qué sigue?"
   - [ ] Clic en "Enviar solicitud"

4. **Verificación en Firestore**
   - [ ] Abrir Firestore Console
   - [ ] Navegar a `applications/{uid}`
   - [ ] Verificar campos:
     ```json
     {
       "uid": "...",
       "ownerName": "...",
       "ownerEmail": "...",
       "ownerPhone": "...",
       "businessName": "...",
       "category": "...",
       "phone": "...",
       "whatsapp": "...",
       "status": "pending",
       "createdAt": "...",
       "updatedAt": "..."
     }
     ```

---

### 👨‍💼 **Fase 2: Aprobación por Admin**

5. **Acceder al panel de administración**
   - [ ] Login como admin (usuario con claim `admin: true`)
   - [ ] Ir a `/admin/applications`
   - [ ] Tab "Solicitudes"

6. **Revisar solicitud pendiente**
   - [ ] Verificar que aparece la solicitud con status "Pendiente"
   - [ ] Revisar los datos del solicitante
   - [ ] Clic en botón "Aprobar" (verde)

7. **Verificación post-aprobación**
   - [ ] Verificar mensaje: "Solicitud aprobada. Se creó el negocio en borrador"
   - [ ] En Firestore: `applications/{uid}` ahora tiene `status: "approved"`
   - [ ] En Firestore: nuevo documento en `businesses/{id}` con:
     ```json
     {
       "id": "auto-generado",
       "status": "draft",
       "ownerId": "uid del dueño",
       "ownerEmail": "email normalizado",
       "ownerName": "...",
       "businessName": "...",
       "category": "...",
       "phone": "...",
       "whatsapp": "...",
       "processedBy": "uid del admin",
       "createdAt": "...",
       "updatedAt": "..."
     }
     ```

---

### 🏢 **Fase 3: Completar Información (Dashboard del Dueño)**

8. **Acceder al dashboard**
   - [ ] Login como dueño (mismo email de la solicitud)
   - [ ] Ir a `/dashboard` o `/dashboard/{id}`
   - [ ] Verificar que se muestra el banner amarillo: "Tu negocio está en borrador"

9. **Completar información del negocio**
   - [ ] **Datos básicos:**
     - [ ] Verificar nombre y categoría (ya llenos)
     - [ ] Agregar/editar descripción (obligatorio)
     - [ ] Confirmar teléfono (obligatorio)
   
   - [ ] **Ubicación:**
     - [ ] Agregar dirección completa
     - [ ] (Opcional) Usar el selector de ubicación con mapa
     - [ ] (Opcional) Agregar coordenadas lat/lng
   
   - [ ] **Horarios:**
     - [ ] Configurar hora de apertura
     - [ ] Configurar hora de cierre
   
   - [ ] **Redes sociales:**
     - [ ] Agregar Facebook (opcional)
     - [ ] Agregar WhatsApp (opcional)
     - [ ] Agregar Instagram (opcional)
   
   - [ ] **Imágenes:**
     - [ ] Subir logo
     - [ ] Subir imágenes de galería

10. **Guardar cambios**
    - [ ] Clic en "Guardar"
    - [ ] Verificar mensaje: "✅ Guardado correctamente"
    - [ ] Verificar que los datos se actualizaron en Firestore

11. **Enviar a revisión**
    - [ ] Verificar que los campos obligatorios estén completos
    - [ ] Clic en "📤 Enviar a revisión"
    - [ ] Verificar mensaje: "✅ ¡Negocio enviado a revisión!"
    - [ ] Verificar que el banner cambia a azul: "Tu negocio está en revisión"
    - [ ] En Firestore: `status` cambió de "draft" a "pending"

---

### ✅ **Fase 4: Aprobación Final (Admin)**

12. **Revisar negocio en panel admin**
    - [ ] Login como admin
    - [ ] Ir a `/admin/applications`
    - [ ] Tab "Negocios"
    - [ ] Buscar el negocio con status "pending"

13. **Aprobar negocio**
    - [ ] Cambiar status a "approved" usando el selector
    - [ ] Verificar que se actualizó correctamente
    - [ ] En Firestore: `status` cambió a "approved"

---

### 🌐 **Fase 5: Verificación Pública**

14. **Ver negocio en directorio público**
    - [ ] Cerrar sesión (o usar navegador incógnito)
    - [ ] Ir a `/negocios`
    - [ ] Verificar que el negocio aparece en la lista
    - [ ] Clic en el negocio para ver detalles
    - [ ] Verificar que toda la información se muestra correctamente

15. **Verificar botón "Gestionar negocio"**
    - [ ] Login como dueño
    - [ ] Ir a la página del negocio
    - [ ] Verificar que aparece el botón "Gestionar negocio"
    - [ ] Clic en el botón
    - [ ] Verificar que redirige al dashboard

16. **Editar negocio publicado**
    - [ ] En dashboard, verificar banner verde: "Tu negocio está publicado"
    - [ ] Hacer cambios en cualquier campo
    - [ ] Clic en "Guardar"
    - [ ] Verificar que se actualizó correctamente
    - [ ] Verificar que sigue visible en `/negocios`

---

## 🔄 **Pruebas de Flujos Alternativos**

### **Flujo de Rechazo**

17. **Rechazar negocio**
    - [ ] Admin cambia status de "pending" a "rejected"
    - [ ] Dueño accede al dashboard
    - [ ] Verificar banner rojo: "Tu negocio fue rechazado"
    - [ ] Botón: "🔄 Reenviar a revisión"

18. **Reenviar después de rechazo**
    - [ ] Corregir información según feedback
    - [ ] Clic en "🔄 Reenviar a revisión"
    - [ ] Verificar que status cambió a "pending"
    - [ ] Admin puede aprobar nuevamente

---

## 🔒 **Pruebas de Seguridad (Firestore Rules)**

19. **Intentar ver negocios no aprobados**
    - [ ] Sin login, intentar acceder a negocio con status "draft"
    - [ ] Verificar que NO es accesible (error de permisos)
    - [ ] Intentar acceder a negocio con status "pending"
    - [ ] Verificar que NO es accesible

20. **Intentar editar negocio ajeno**
    - [ ] Login con usuario diferente al owner
    - [ ] Intentar acceder a `/dashboard/{id}` de otro negocio
    - [ ] Verificar mensaje: "No tienes permisos para editar este negocio"

21. **Intentar cambios no permitidos**
    - [ ] Dueño intenta cambiar `featured: true` directamente en Firestore
    - [ ] Verificar que la regla lo rechaza
    - [ ] Dueño intenta cambiar de "pending" a "approved"
    - [ ] Verificar que la regla lo rechaza

---

## 📊 **Checklist de Estados**

| Estado | Usuario ve | Admin ve | Público ve |
|--------|-----------|----------|-----------|
| `pending` (application) | ✅ "En revisión" | ✅ Puede aprobar | ❌ No visible |
| `approved` (application) | ℹ️ N/A (ya es business) | ℹ️ N/A | ❌ No visible |
| `draft` (business) | 🟡 "En borrador" + Botón enviar | ✅ Puede editar | ❌ No visible |
| `pending` (business) | 🔵 "En revisión" | ✅ Puede aprobar/rechazar | ❌ No visible |
| `approved` (business) | 🟢 "Publicado" | ✅ Puede editar | ✅ **VISIBLE** |
| `rejected` (business) | 🔴 "Rechazado" + Botón reenviar | ✅ Puede editar | ❌ No visible |

---

## ⚠️ **Problemas Comunes y Soluciones**

### Error: "applicationId es obligatorio"
- **Causa:** Problema en el endpoint approve.ts
- **Solución:** Ya corregido, soporta ambos `id` y `applicationId`

### Error: "No tienes permisos"
- **Causa:** Usuario no es owner ni admin
- **Solución:** Verificar que `ownerEmail` o `ownerId` coincidan

### Negocio no aparece en público
- **Causa:** Status no es "approved"
- **Solución:** Admin debe cambiar status a "approved"

### No puedo enviar a revisión
- **Causa:** Faltan campos obligatorios
- **Solución:** Completar nombre, descripción y teléfono

---

## 🎯 **Resultado Esperado Final**

✅ **Solicitud completa en ~2 minutos**
✅ **Admin aprueba en ~30 segundos**
✅ **Dueño completa info en ~5-10 minutos**
✅ **Admin aprueba final en ~30 segundos**
✅ **Negocio visible públicamente**
✅ **Dueño puede editar cuando quiera**

---

**Última actualización:** Noviembre 2, 2025
