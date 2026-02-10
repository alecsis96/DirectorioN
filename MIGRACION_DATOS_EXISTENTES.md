# ⚠️ IMPORTANTE: Migración de Datos Existentes

## ¿Cuándo necesitas ejecutar la migración?

Si ya tienes negocios en tu base de datos Firestore ANTES de implementar el nuevo sistema de estados, **es obligatorio** ejecutar la script de migración para que esos negocios aparezcan correctamente en el panel de administración.

## Síntomas de que necesitas migrar:

- ✅ La pestaña "Nuevas Solicitudes" muestra algunos negocios
- ❌ Las pestañas "Pendientes", "Listos para publicar" y "Publicados" están vacías
- ❌ Al abrir el dashboard de un negocio existente, aparece error de `businessStatus undefined`
- ❌ Los negocios no tienen campos `businessStatus`, `applicationStatus`, `completionPercent`

## Cómo ejecutar la migración:

### Paso 1: Verificar configuración de Firebase
Asegúrate de tener configurado `FIREBASE_SERVICE_ACCOUNT` en tu `.env.local`:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

### Paso 2: Ejecutar el script de migración

```bash
npm run migrate:business-states
```

### Paso 3: Verificar resultados

El script mostrará:
- ✅ Número de negocios migrados
- ✅ Estadísticas por estado (draft, in_review, published)
- ✅ Applications sincronizadas
- ✅ Businesses huérfanos creados (si había applications sin business)

### Ejemplo de salida esperada:

```console
╔═══════════════════════════════════════════════╗
║  MIGRACIÓN DE ESTADOS DE NEGOCIOS COMPLETA  ║
╚═══════════════════════════════════════════════╝

📊 ESTADÍSTICAS FINALES:
- Total negocios: 45
- Draft: 12
- In Review: 8
- Published: 25

✅ Migración completada exitosamente
```

## ¿Qué hace la migración?

1. **Mapea estados antiguos → nuevos**:
   - `status: 'draft'` → `businessStatus: 'draft'` + `applicationStatus: 'submitted'`
   - `status: 'review'` → `businessStatus: 'in_review'` + `applicationStatus: 'ready_for_review'`
   - `status: 'published'` → `businessStatus: 'published'` + `applicationStatus: 'approved'`
   - `status: 'rejected'` → `businessStatus: 'draft'` + `applicationStatus: 'rejected'`

2. **Calcula completitud**:
   - Analiza cada negocio y calcula su `completionPercent` (0-100%)
   - Determina si cumple requisitos mínimos (`isPublishReady`)
   - Identifica campos faltantes (`missingFields[]`)

3. **Sincroniza applications**:
   - Actualiza `applications/` collection con nuevos estados
   - Vincula `businessId` si faltaba

4. **Crea businesses huérfanos**:
   - Si hay `applications` sin `business` correspondiente, los crea en draft

## Después de la migración:

Recarga el panel admin (`/admin/solicitudes`) y deberías ver:
- 📥 **Nuevas**: Negocios recién creados (submitted)
- ⏳ **Pendientes**: Negocios con needs_info o incompletos
- ✅ **Listas**: Negocios listos para aprobar (≥50% completo)
- 🏪 **Publicados**: Negocios ya aprobados y visibles
- ❌ **Rechazados**: Negocios rechazados por admin
- 📊 **Todos**: Vista completa

## Troubleshooting:

### Error: "Missing FIREBASE_SERVICE_ACCOUNT"
```bash
# Verifica que .env.local tenga la variable correcta
cat .env.local | grep FIREBASE_SERVICE_ACCOUNT
```

### Error: "Cannot connect to Firestore"
- Verifica que las credenciales de Firebase Admin sean correctas
- Confirma que el service account tenga permisos de lectura/escritura en Firestore

### Los negocios siguen sin aparecer
1. Verifica en Firebase Console > Firestore que los campos se actualizaron
2. Revisa que `businessStatus` y `applicationStatus` existan en los documentos
3. Ejecuta: `npm run migrate:business-states` nuevamente (es idempotente, no duplica)

### Dashboard sigue dando error
Si un negocio específico da error al abrir el dashboard:
1. Ve a Firebase Console > Firestore
2. Busca el documento `businesses/{businessId}`
3. Agrega manualmente los campos faltantes:
   ```json
   {
     "businessStatus": "draft",
     "applicationStatus": "submitted",
     "completionPercent": 0,
     "isPublishReady": false,
     "missingFields": []
   }
   ```
4. O ejecuta la migración para ese negocio específico

## Notas Importantes:

- ⚠️ **La migración es idempotente**: Puedes ejecutarla múltiples veces sin problemas
- ⚠️ **No elimina datos**: Solo agrega/actualiza campos, nunca borra
- ⚠️ **Procesa en batches**: Maneja grandes volúmenes (500 negocios/batch)
- ✅ **Safe para producción**: Usa transacciones y manejo de errores robusto

## Para Negocios Nuevos (post-migración):

Los negocios creados DESPUÉS de implementar el nuevo sistema:
- ✅ Ya tienen los campos correctos automáticamente
- ✅ No necesitan migración
- ✅ Aparecen correctamente en todas las pestañas

---

**Si tienes dudas o la migración falla, revisa los logs en la consola o contacta al equipo de desarrollo.**
