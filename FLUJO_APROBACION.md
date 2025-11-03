# 🔄 Flujo Completo de Registro de Negocios

## 📊 Diagrama del flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                        FASE 1: SOLICITUD                        │
└─────────────────────────────────────────────────────────────────┘

1. Usuario completa wizard → application (status: pending)
   📧 Email: "✅ Solicitud recibida"
   
2. Admin revisa en pestaña "Solicitudes" → Click "Aprobar"
   
3. Sistema crea business (status: draft)
   📧 Email: "🎉 ¡Solicitud Aprobada! Completa los datos"
   Link: /dashboard/{businessId}

┌─────────────────────────────────────────────────────────────────┐
│                      FASE 2: COMPLETAR DATOS                    │
└─────────────────────────────────────────────────────────────────┘

4. Dueño accede al dashboard con su email
   
5. Completa: fotos, horarios, ubicación, redes, etc.
   
6. Click "Enviar a Revisión Final"
   
7. business cambia a (status: pending)

┌─────────────────────────────────────────────────────────────────┐
│                    FASE 3: REVISIÓN FINAL                       │
└─────────────────────────────────────────────────────────────────┘

8. Admin revisa en pestaña "Negocios" (filtra por status: pending)
   
9. Admin edita/corrige si es necesario
   
10. Admin cambia status a "approved" y guarda
    
11. business ahora (status: approved)
    📧 Email: "🎉 ¡Tu negocio está publicado!"
    
12. Negocio visible en el directorio público ✅
```

## 🔧 Cómo aprobar un negocio en revisión final

### Paso 1: Ir al Admin Panel
https://directorion-48816.web.app/admin/applications

### Paso 2: Click en la pestaña "Negocios"

### Paso 3: Filtrar por estado
- Status: **Pendiente** (pending)
- Esto te mostrará solo los negocios que enviaron para revisión final

### Paso 4: Revisar el negocio
- Click en el ícono ✏️ (editar)
- Se abre el drawer lateral
- Revisa:
  - ✅ Nombre correcto
  - ✅ Descripción adecuada
  - ✅ Imágenes apropiadas
  - ✅ Horarios completos
  - ✅ Ubicación correcta
  - ✅ Contacto verificado

### Paso 5: Aprobar o Rechazar

#### Para APROBAR:
1. En el drawer, busca el campo **"Estado"**
2. Cambia de "Pendiente" a **"Aprobado"**
3. Click **"Guardar"**
4. 🎉 El negocio se publica automáticamente
5. 📧 El dueño recibe email de publicación

#### Para RECHAZAR:
1. Cambia el estado a **"Rechazado"**
2. Opcionalmente, edita el campo "Notas" con el motivo
3. Click **"Guardar"**
4. 📧 El dueño recibe email con el motivo
5. El dueño puede editar y reenviar

## 📋 Estados de un negocio

| Estado | Descripción | Visible en directorio | Puede editar |
|--------|-------------|----------------------|--------------|
| **draft** | Borrador inicial | ❌ No | ✅ Dueño |
| **pending** | En revisión final | ❌ No | ❌ Solo admin |
| **approved** | Publicado | ✅ SÍ | ✅ Dueño + Admin |
| **rejected** | Requiere cambios | ❌ No | ✅ Dueño |

## 🔍 Verificar estado actual

### Para el dueño:
1. Va a: https://directorion-48816.web.app/mis-solicitudes
2. Ingresa su email
3. Ve el estado de su negocio

### Para el admin:
1. Va a: https://directorion-48816.web.app/admin/applications
2. Pestaña "Negocios"
3. Ve todos los negocios con sus estados

## 📧 Emails que se envían automáticamente

| Evento | Email | Contenido |
|--------|-------|-----------|
| Usuario completa wizard | "✅ Solicitud recibida" | Confirmación + Link verificación |
| Admin aprueba application | "🎉 ¡Solicitud Aprobada!" | Link al dashboard |
| Admin aprueba business | "🎉 ¡Tu negocio está publicado!" | Link al negocio en vivo |
| Admin rechaza business | "⚠️ Solicitud requiere cambios" | Motivo + Link para editar |

## ⚠️ Problemas comunes

### "No veo negocios en pending"
- El dueño aún no completó los datos
- Verifica en el dashboard del dueño que haya hecho click en "Enviar a Revisión"

### "El negocio no aparece en el directorio"
- Verifica que el status sea **"approved"**
- Solo los negocios aprobados son visibles públicamente

### "El dueño no puede editar su negocio"
- Si está en "pending", solo el admin puede editar
- Cambia a "approved" para que el dueño pueda editar
- O cambia a "rejected" para que corrija y reenvíe

## 🎯 Resumen rápido

1. **Solicitud** → Admin aprueba → Negocio en draft
2. **Dueño completa** → Envía a revisión → Negocio en pending
3. **Admin revisa** → Aprueba → Negocio en approved
4. **¡Publicado!** → Visible en el directorio

**Tiempo estimado:** 2-5 minutos por negocio
