# Tareas Pendientes de Deployment

## ⚠️ Cloud Function: sendPaymentReminders NO SE DESPLEGÓ

### Problema
La función `sendPaymentReminders` que envía recordatorios automáticos de pago **no se está desplegando** a Firebase.

### Causa Probable
Las funciones programadas (Cloud Scheduler) de Firebase requieren:

1. **Billing habilitado** en el proyecto de Firebase
   - Cloud Scheduler es un servicio pago
   - Necesitas actualizar el proyecto a plan Blaze (pago por uso)

2. **API de Cloud Scheduler habilitada**
   - Ve a: https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=directorion-48816
   - Habilita "Cloud Scheduler API"

3. **Ubicación de App Engine configurada**
   - Cloud Scheduler requiere que el proyecto tenga una región de App Engine
   - Ve a: https://console.cloud.google.com/appengine?project=directorion-48816
   - Selecciona una región (ej: us-central)

### Solución

#### Opción 1: Habilitar Cloud Scheduler (RECOMENDADO)

1. Ve a Firebase Console: https://console.firebase.google.com/project/directorion-48816/overview

2. Actualiza a plan Blaze:
   - Click en "Upgrade" en la parte superior
   - Selecciona plan "Blaze" (pago por uso)
   - Configura límites de gasto si lo deseas

3. Habilita Cloud Scheduler:
   ```bash
   # En Google Cloud Console, busca "Cloud Scheduler API" y habilítala
   ```

4. Vuelve a desplegar:
   ```bash
   firebase deploy --only functions:sendPaymentReminders
   ```

#### Opción 2: Usar HTTPS Function con cron externo

Si no quieres habilitar billing, puedes:

1. Cambiar `sendPaymentReminders` a una función HTTP
2. Usar un servicio externo como:
   - **cron-job.org** (gratis)
   - **UptimeRobot** (gratis)
   - **GitHub Actions** con schedule

Ver archivo: `ALTERNATIVE_CRON.md` para implementación alternativa.

### Estado Actual

✅ **Funciones desplegadas correctamente:**
- `onApplicationCreated` - Notifica cuando se crea solicitud
- `onApplicationStatusChange` - Notifica cambios en solicitud
- `onBusinessStatusChange` - Notifica cambios en negocio

❌ **Funciones que NO se desplegaron:**
- `sendPaymentReminders` - Recordatorios automáticos de pago
- `onNewReviewCreated` - Notificaciones de reseñas (si existe)
- `sendPaymentFailedNotification` - Notificación de pago fallido (si existe)

### Funcionalidad Actual

**LO QUE SÍ FUNCIONA:**
- ✅ Panel de admin en `/admin/payments`
- ✅ Deshabilitar/habilitar negocios manualmente
- ✅ Eliminar negocios y dueños
- ✅ Enviar recordatorios **MANUALES** desde el panel
- ✅ Ver historial de pagos
- ✅ Información de pago en dashboard del negocio
- ✅ Webhook de Stripe registra pagos correctamente
- ✅ Columna de próximo pago en lista de negocios

**LO QUE NO FUNCIONA (requiere Cloud Scheduler):**
- ❌ Recordatorios **AUTOMÁTICOS** diarios a las 9 AM
- ❌ Emails automáticos a -7 días, -3 días, +1 día del vencimiento

### Alternativa Temporal

Mientras tanto, puedes:

1. **Recordatorios Manuales:**
   - Ve a `/admin/payments`
   - Filtra por "Próximos (7d)" o "Vencidos"
   - Click en "Recordar" en cada negocio manualmente

2. **Programar recordatorio en tu sistema:**
   - Configura un recordatorio diario en tu calendario
   - Revisa `/admin/payments` cada día
   - Envía recordatorios manualmente

### Testing

Para probar que la función funciona (sin desplegar):

```bash
cd functions
npm run serve
# Esto inicia Firebase Emulator

# En otra terminal, ejecuta:
curl http://localhost:5001/directorion-48816/us-central1/sendPaymentReminders
```

### Referencias

- [Cloud Scheduler Pricing](https://cloud.google.com/scheduler/pricing)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Scheduled Functions Guide](https://firebase.google.com/docs/functions/schedule-functions)

### Próximos Pasos

1. [ ] Actualizar proyecto a plan Blaze
2. [ ] Habilitar Cloud Scheduler API
3. [ ] Configurar región de App Engine
4. [ ] Redesplegar función: `firebase deploy --only functions:sendPaymentReminders`
5. [ ] Verificar en Cloud Console que el job está programado
6. [ ] Esperar hasta mañana 9 AM o ejecutar manualmente para probar

---

**Nota:** El resto del sistema de pagos está completamente funcional. Solo falta la automatización de recordatorios diarios.
