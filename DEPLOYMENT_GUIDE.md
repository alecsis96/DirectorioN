# 🚀 Guía de Despliegue del Sistema de Estados

## Estado Actual

✅ **Completado:**
- Sistema de estados dual (businessStatus + applicationStatus)
- Cálculo automático de completitud
- Wizard con redirección inmediata
- BusinessStatusBanner integrado en DashboardEditor
- Panel de admin con 3 vistas (nuevas/pendientes/listas)
- Server actions para usuario y admin
- Script de migración de datos
- Firestore rules actualizadas
- Documentación completa (ARCHITECTURE.md)
- Sistema de notificaciones WhatsApp robusto

## 📋 Checklist de Deployment

### 1. Verificar Variables de Entorno

Asegúrate de que `.env.local` contenga:

```bash
# WhatsApp Notifications
WHATSAPP_PROVIDER=callmebot  # o twilio
CALLMEBOT_API_KEY=tu_api_key
ADMIN_WHATSAPP_NUMBER=5219191565865  # sin +
ADMIN_WHATSAPP_TO=+5219191565865     # con +

# O para Twilio:
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
# TWILIO_AUTH_TOKEN=tu_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # cambiar en producción

# Firebase (ya configurado)
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
# ...resto de variables Firebase
```

### 2. Deploy de Firestore Rules (CRÍTICO)

```bash
# Verificar que tienes Firebase CLI instalado
firebase --version

# Login si es necesario
firebase login

# Desplegar solo las reglas
firebase deploy --only firestore:rules

# Verificar que se aplicaron
firebase firestore:rules:get
```

**⚠️ IMPORTANTE:** Las reglas de seguridad son críticas. Sin ellas, los usuarios podrían manipular estados directamente.

### 3. Verificar Firestore Indexes

El sistema usa queries complejas que requieren índices:

```bash
# Desplegar índices definidos en firestore.indexes.json
firebase deploy --only firestore:indexes
```

Si ves errores de "missing index", Firebase te dará un link para crearlos automáticamente.

### 4. Testing Local

#### Test 1: Notificaciones WhatsApp
```bash
npm run test:whatsapp
```

Deberías recibir un mensaje de prueba en WhatsApp.

#### Test 2: Flujo Completo de Usuario

1. Abre http://localhost:3000/registro-negocio
2. Completa el wizard con datos de prueba
3. Verifica:
   - ✅ Redirección a /dashboard/{id} inmediatamente
   - ✅ Banner de estado visible con completitud %
   - ✅ Campos faltantes listados
   - ✅ Botón "Publicar" deshabilitado si < 50%
   - ✅ WhatsApp recibido en el número de admin

4. Edita el negocio:
   - ✅ Agrega más campos (descripción, logo, etc.)
   - ✅ Guarda cambios
   - ✅ Verifica que completionPercent se actualiza

5. Solicita publicación:
   - ✅ Completa campos hasta alcanzar 50%+
   - ✅ Haz clic en "🚀 Publicar mi negocio"
   - ✅ Verifica mensaje de confirmación

#### Test 3: Panel de Admin

1. Abre http://localhost:3000/admin/solicitudes
2. Verifica las 3 vistas:
   - **Nuevas**: Debe mostrar el negocio recién creado
   - **Pendientes**: Vacío inicialmente
   - **Listas**: Debe aparecer si completionPercent ≥ 50%

3. Desde la tarjeta del negocio:
   - ✅ Haz clic en "Ver Dashboard" → abre dashboard en nueva pestaña
   - ✅ Haz clic en "Solicitar Info" → muestra modal, envía notas
   - ✅ Verifica que cambia a tab "Pendientes"
   - ✅ Haz clic en "Aprobar" → confirma, verifica que se publica
   - ✅ Ve a /negocios → el negocio debe ser visible

### 5. Migración de Datos (ÚLTIMO PASO)

**⚠️ CRÍTICO: Hacer backup antes de ejecutar**

```bash
# 1. Backup de Firestore (Google Cloud Console)
# Ve a: Firebase Console → Firestore Database → Import/Export
# O usa gcloud CLI:
gcloud firestore export gs://[TU-BUCKET]/backups/$(date +%Y%m%d_%H%M%S)

# 2. Ejecutar migración local (prueba)
# Configura FIREBASE_PROJECT_ID en .env.local
npm run migrate:business-states

# 3. Revisar logs de la migración
# El script mostrará:
# - Negocios procesados
# - Applications migradas
# - Negocios creados desde applications huérfanas
# - Errores (si los hay)

# 4. Verificar resultados en Firebase Console
# Ve a Firestore → businesses → verifica campos:
# - businessStatus
# - applicationStatus
# - completionPercent
# - isPublishReady
# - missingFields
```

**Qué hace el script:**
- Lee todos los negocios existentes
- Calcula `completionPercent` según campos presentes
- Mapea `status` antiguo → nuevos `businessStatus`/`applicationStatus`
- Identifica `missingFields` para cada negocio
- Crea negocios para applications sin businessId
- Procesa en lotes de 500 para evitar límites de Firestore

### 6. Deploy a Vercel/Producción

#### Configurar Variables de Entorno en Vercel

1. Ve a Vercel Dashboard → tu proyecto → Settings → Environment Variables
2. Agrega todas las variables de `.env.local`:
   ```
   WHATSAPP_PROVIDER=callmebot
   CALLMEBOT_API_KEY=...
   ADMIN_WHATSAPP_NUMBER=...
   ADMIN_WHATSAPP_TO=...
   NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
   
   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   FIREBASE_PROJECT_ID=...
   # ... todas las variables Firebase
   ```

3. Asegúrate de marcar las variables como disponibles en:
   - ✅ Production
   - ✅ Preview (opcional)
   - ✅ Development (opcional)

#### Deploy

```bash
# Option 1: Push a main/master (auto-deploy)
git add .
git commit -m "Sistema de estados dual completo"
git push origin main

# Option 2: Deploy manual con Vercel CLI
vercel --prod
```

#### Verificar en Producción

1. Abre https://tu-dominio.com/registro-negocio
2. Completa el wizard → verifica redirección
3. Edita negocio → verifica actualización de completitud
4. Solicita publicación → verifica notificación WhatsApp
5. Accede como admin a /admin/solicitudes
6. Aprueba/rechaza negocios → verifica cambios de estado

### 7. Monitoreo Post-Deploy

#### Logs de Vercel

```bash
# Ver logs en tiempo real
vercel logs

# O ve a: Vercel Dashboard → tu proyecto → Deployments → [último deploy] → Logs
```

Busca errores relacionados con:
- `WhatsApp notification failed`
- `Firestore permission denied`
- `Missing index` (crea el índice con el link proporcionado)

#### Firebase Console

1. **Firestore → businesses**
   - Verifica que negocios nuevos tienen todos los campos de estado
   - Revisa manualmente 2-3 negocios para confirmar datos

2. **Firestore → notifications**
   - Verifica logs de notificaciones enviadas
   - Revisa timestamps y resultados (success/failure)

3. **Authentication → Users**
   - Confirma que usuarios pueden autenticarse
   - Verifica que custom claims (admin) funcionan

### 8. Rollback Plan (Si algo falla)

#### Opción 1: Revertir Deploy en Vercel

1. Ve a Vercel Dashboard → Deployments
2. Encuentra el deploy anterior estable
3. Click en "..." → "Promote to Production"

#### Opción 2: Revertir Firestore Rules

```bash
# Si las rules causan problemas, revertir
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

#### Opción 3: Restaurar Backup de Firestore

```bash
# Restaurar desde backup (si la migración falló)
gcloud firestore import gs://[TU-BUCKET]/backups/[timestamp]
```

## 🔍 Verificación de Funcionalidad

### Checklist Post-Deploy

- [ ] Firestore rules desplegadas sin errores
- [ ] Indexes de Firestore funcionando
- [ ] Variables de entorno configuradas en Vercel
- [ ] WhatsApp notifications funcionando (test manual)
- [ ] Wizard redirige a /dashboard/{id} después de completar
- [ ] BusinessStatusBanner visible en dashboard
- [ ] Completitud se calcula automáticamente al editar
- [ ] Botón "Publicar" habilitado solo cuando isPublishReady=true
- [ ] Panel admin accesible en /admin/solicitudes
- [ ] Admin puede aprobar/rechazar/solicitar info
- [ ] Estados cambian correctamente en Firestore
- [ ] Negocios aprobados aparecen en /negocios
- [ ] Migración ejecutada exitosamente (si aplica)
- [ ] No hay errores en logs de Vercel
- [ ] No hay errores en Firebase Console

### Métricas a Monitorear (Primeros 7 días)

1. **Tasa de Completitud del Wizard**
   - % de usuarios que terminan el wizard
   - Objetivo: > 70% (vs ~40% anterior)

2. **Tiempo Promedio hasta Primera Edición**
   - Tiempo desde wizard hasta primera edición en dashboard
   - Objetivo: < 5 minutos

3. **Completitud Promedio al Solicitar Publicación**
   - % promedio de completitud al hacer clic en "Publicar"
   - Objetivo: > 60%

4. **Tiempo de Aprobación del Admin**
   - Tiempo desde solicitud hasta aprobación/rechazo
   - Objetivo: < 24 horas

5. **Errores de Notificación WhatsApp**
   - % de notificaciones fallidas
   - Objetivo: < 5%

## 📚 Recursos Adicionales

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura completa del sistema
- [WHATSAPP_WIZARD_NOTIFICATIONS.md](./WHATSAPP_WIZARD_NOTIFICATIONS.md) - Docs de notificaciones
- [WHATSAPP_QUICKSTART.md](./WHATSAPP_QUICKSTART.md) - Setup rápido de WhatsApp

## 🆘 Soporte y Troubleshooting

### Problema: "No recibo notificaciones WhatsApp"

**Solución:**
1. Verifica variables de entorno en Vercel
2. Ejecuta `npm run test:whatsapp` localmente
3. Revisa logs: Vercel Dashboard → Logs → filtrar "WhatsApp"
4. Verifica Firestore → notifications/ para ver intentos

### Problema: "Permission denied en Firestore"

**Solución:**
1. Verifica que rules están desplegadas: `firebase firestore:rules:get`
2. Revisa que el usuario está autenticado
3. Para admin: verifica custom claims en Firebase Auth

### Problema: "Missing index" error

**Solución:**
1. El error incluirá un link
2. Haz clic en el link → se creará el índice automáticamente
3. Espera 2-5 minutos a que se cree
4. O ejecuta: `firebase deploy --only firestore:indexes`

### Problema: "Completitud no se actualiza"

**Solución:**
1. Verifica que `updateBusinessWithState` se está llamando en save()
2. Revisa que los campos tienen los nombres correctos (businessName vs name)
3. Comprueba logs del servidor para errores de cálculo

### Problema: "Botón Publicar siempre deshabilitado"

**Solución:**
1. Verifica que `isPublishReady` se está calculando correctamente
2. Revisa requisitos mínimos en `lib/businessStates.ts`
3. Asegúrate de que al menos tienes:
   - name ✅
   - category ✅
   - address + lat/lng ✅
   - phone o WhatsApp ✅
   - description ≥ 50 chars ✅
   - horarios de 1+ día ✅

---

## ✨ Mejoras Futuras

Después del deploy inicial, considera:

1. **Analytics Dashboard**: Visualizar métricas de conversión
2. **Email Notifications**: Agregar notificaciones por email además de WhatsApp
3. **Auto-Recordatorios**: Notificar usuarios con perfiles incompletos después de 7 días
4. **A/B Testing**: Probar diferentes umbrales de completitud mínima
5. **Gamificación**: Badges/rewards por completitud 100%
6. **Preview Mode**: Permitir preview sin publicar para recibir feedback

---

**Última actualización:** Febrero 2026
**Versión del Sistema:** 2.0 (Estados Dual)
