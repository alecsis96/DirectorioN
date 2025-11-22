# Sistema de Gestión de Pagos y Suspensiones

Este documento explica cómo funciona el sistema completo de gestión de pagos, recordatorios automáticos y suspensión de negocios por falta de pago.

## 📋 Resumen de Funcionalidades

### Para Administradores

1. **Panel de Gestión de Pagos** (`/admin/payments`)
   - Ver todos los negocios con problemas de pago
   - Deshabilitar/habilitar negocios manualmente
   - Eliminar negocios y sus dueños permanentemente
   - Enviar recordatorios de pago manuales
   - Ver historial de pagos de cada negocio

2. **Recordatorios Automáticos**
   - Cloud Function programada que se ejecuta diariamente a las 9:00 AM
   - Envía emails automáticos cuando:
     - Faltan 7 días para el vencimiento
     - Faltan 3 días para el vencimiento
     - El pago venció hace 1 día

### Para Dueños de Negocios

1. **Panel de Información de Pagos** (en Dashboard)
   - Estado actual del pago
   - Fecha del próximo pago con contador de días
   - Último pago realizado
   - Historial completo de pagos
   - Alertas visuales según urgencia

## 🗂️ Estructura de Archivos

### Componentes

- **`components/PaymentManager.tsx`**
  - Componente principal del panel admin de pagos
  - Maneja filtros, acciones (deshabilitar/habilitar/eliminar)
  - Modal de historial de pagos

- **`components/PaymentInfo.tsx`**
  - Panel de información de pagos para dueños
  - Muestra próximo pago, último pago, historial
  - Alertas según urgencia del pago

### Páginas

- **`app/admin/payments/page.tsx`**
  - Página del panel de gestión de pagos
  - Obtiene negocios con problemas de pago
  - Estadísticas rápidas (deshabilitados, próximos a vencer, vencidos)

### APIs

- **`pages/api/admin/disable-business.ts`**
  - POST: Deshabilita un negocio por razón específica
  - Envía notificación por email al dueño

- **`pages/api/admin/enable-business.ts`**
  - POST: Habilita un negocio deshabilitado
  - Envía notificación por email al dueño

- **`pages/api/admin/delete-business.ts`**
  - POST: Elimina permanentemente un negocio, sus reseñas y el usuario dueño
  - **ACCIÓN IRREVERSIBLE** - requiere confirmación escribiendo "ELIMINAR"

- **`pages/api/admin/send-payment-reminder.ts`**
  - POST: Envía recordatorio de pago manual a un negocio específico

- **`pages/api/payment-history.ts`**
  - GET: Obtiene el historial de pagos de un negocio
  - Solo accesible por el dueño del negocio o admin

### Cloud Functions

- **`functions/src/emailNotifications.ts`**
  - **`sendPaymentReminders`**: Cloud Function programada (cron)
    - Se ejecuta diariamente a las 9:00 AM (America/Mexico_City)
    - Busca negocios con pagos próximos a vencer
    - Envía emails en los días -7, -3 y +1 (después de vencer)
  
  - **`sendPaymentReminderEmail`**: Helper para enviar emails
    - Templates HTML responsivos con diferentes niveles de urgencia
    - Colores y mensajes según días restantes

### Webhooks

- **`pages/api/stripe/webhook.ts`**
  - Actualizado para registrar pagos en `paymentHistory`
  - Calcula automáticamente `nextPaymentDate` (30 días después)
  - Actualiza `isActive`, `paymentStatus`, `lastPaymentDate`

### Tipos

- **`types/business.ts`**
  - **Campos nuevos en `Business`:**
    - `isActive?: boolean` - Si el negocio está activo
    - `paymentStatus?: 'active' | 'pending' | 'overdue' | 'canceled'`
    - `nextPaymentDate?: string` - Fecha del próximo pago
    - `lastPaymentDate?: string` - Fecha del último pago
    - `disabledReason?: string` - Razón de deshabilitación
    - `paymentHistory?: PaymentRecord[]` - Historial de pagos

  - **Nuevo tipo `PaymentRecord`:**
    ```typescript
    {
      id: string;
      amount: number;
      date: string;
      plan: string;
      status: 'success' | 'failed' | 'refunded';
      stripeInvoiceId?: string;
      stripePaymentIntentId?: string;
    }
    ```

### Reglas de Firestore

- **`firestore.rules`**
  - Validaciones para campos de pago
  - Solo admin puede modificar: `isActive`, `paymentStatus`, `nextPaymentDate`, `lastPaymentDate`, `disabledReason`, `paymentHistory`

## 🔄 Flujo de Trabajo

### 1. Pago Exitoso (Stripe Webhook)

```
Usuario completa pago
  ↓
Stripe envía webhook checkout.session.completed
  ↓
Sistema actualiza:
  - plan → 'featured' o 'sponsor'
  - isActive → true
  - paymentStatus → 'active'
  - lastPaymentDate → hoy
  - nextPaymentDate → hoy + 30 días
  - paymentHistory → agrega nuevo registro
```

### 2. Recordatorios Automáticos (Cloud Function)

```
Cloud Function se ejecuta diariamente 9:00 AM
  ↓
Busca negocios con:
  - plan != 'free'
  - isActive != false
  - nextPaymentDate existe
  ↓
Para cada negocio calcula días hasta pago:
  - 7 días → envía recordatorio informativo
  - 3 días → envía recordatorio urgente
  - -1 día (vencido ayer) → envía alerta crítica
```

### 3. Gestión Manual por Admin

```
Admin accede a /admin/payments
  ↓
Ve lista filtrada de negocios con problemas:
  - Deshabilitados
  - Pagos vencidos
  - Próximos a vencer (7 días)
  ↓
Admin puede:
  1. Enviar recordatorio manual
  2. Deshabilitar negocio (con razón)
  3. Habilitar negocio deshabilitado
  4. Eliminar negocio y dueño (irreversible)
```

### 4. Visualización para Dueños

```
Dueño accede a su dashboard
  ↓
Ve componente PaymentInfo con:
  - Estado actual (activo/pendiente/vencido)
  - Fecha próximo pago y días restantes
  - Último pago realizado
  - Historial completo de pagos (desplegable)
  - Alertas según urgencia
```

## 🎨 Diseño Visual

### Panel Admin (`/admin/payments`)

- **Tarjetas de estadísticas:**
  - 🔴 Negocios Deshabilitados
  - 🟡 Próximos a vencer (7 días)
  - 🟠 Pagos Vencidos

- **Filtros:**
  - Todos
  - Deshabilitados
  - Vencidos
  - Próximos (7d)

- **Cada negocio muestra:**
  - Nombre y badges de estado
  - Plan actual
  - Email y nombre del dueño
  - Próximo pago con contador
  - Último pago
  - Razón de deshabilitación (si aplica)
  - Botón de historial
  - Botones de acción (Recordar/Deshabilitar/Habilitar/Eliminar)

### Dashboard Dueño

- **Plan Gratuito:** Fondo azul con mensaje para mejorar plan

- **Plan Activo:**
  - Fondo verde si pago al día (>7 días)
  - Fondo amarillo si próximo a vencer (≤7 días)
  - Fondo rojo si vencido

- **Negocio Deshabilitado:**
  - Fondo rojo con razón de deshabilitación
  - Mensaje de contacto con admin

- **Historial desplegable:**
  - Lista de todos los pagos
  - Monto, fecha, plan, estado

## 📧 Emails de Recordatorio

Los emails tienen diferentes diseños según urgencia:

### 7 días antes (Informativo)
- 🔵 Azul
- Título: "⏰ Recordatorio: Tu pago vence en 7 días"
- Mensaje informativo tranquilo

### 3 días antes (Urgente)
- 🟡 Amarillo/Naranja
- Título: "⚠️ Importante: Tu pago vence en 3 días"
- Mensaje más urgente

### 1 día después de vencer (Crítico)
- 🔴 Rojo
- Título: "🚨 URGENTE: Tu pago venció ayer"
- Mensaje crítico con advertencia de deshabilitación

Todos los emails incluyen:
- Información del negocio y plan
- Fecha de pago y días restantes/vencidos
- Botón "Ver Mi Dashboard"
- Footer con información de contacto

## 🔐 Seguridad y Permisos

### Firestore Rules

Solo administradores pueden:
- Modificar `isActive`, `paymentStatus`, `nextPaymentDate`, `lastPaymentDate`
- Modificar `disabledReason`, `paymentHistory`
- Eliminar negocios

### API Endpoints

Todos los endpoints admin requieren:
- Token de autenticación válido
- Usuario con `admin: true` en custom claims o en lista de overrides

### Confirmación de Eliminación

Para eliminar un negocio permanentemente, el admin debe:
1. Click en botón "Eliminar"
2. Escribir exactamente "ELIMINAR" en prompt
3. Sistema elimina: negocio + reseñas + usuario dueño

## 🚀 Despliegue

### Cloud Functions

Para desplegar la función de recordatorios:

```bash
cd functions
npm run build
firebase deploy --only functions:sendPaymentReminders
```

### Variables de Entorno

Asegúrate de tener configuradas:

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
EMAIL_FROM=noreply@directorioyajalon.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-app

# Base URL
NEXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

### Firestore Rules

Despliega las reglas actualizadas:

```bash
firebase deploy --only firestore:rules
```

## 📊 Monitoreo

### Cloud Function Logs

Ver logs de recordatorios:

```bash
firebase functions:log --only sendPaymentReminders
```

### Métricas a Vigilar

1. **Tasa de envío de recordatorios:**
   - Cuántos recordatorios se envían diariamente
   - Errores en envío de emails

2. **Negocios deshabilitados:**
   - Cuántos negocios se deshabilitan por mes
   - Razones más comunes

3. **Tasa de renovación:**
   - Cuántos negocios renuevan después de recordatorios
   - Efectividad de recordatorios (7d vs 3d vs post-vencimiento)

## 🐛 Troubleshooting

### Los recordatorios no se envían

1. Verificar que la Cloud Function está desplegada:
   ```bash
   firebase functions:list
   ```

2. Ver logs:
   ```bash
   firebase functions:log --only sendPaymentReminders
   ```

3. Verificar configuración de email en Firebase Console

### No se actualiza nextPaymentDate

1. Verificar que el webhook de Stripe está configurado correctamente
2. Ver logs del webhook en Stripe Dashboard
3. Confirmar que `STRIPE_WEBHOOK_SECRET` es correcto

### Historial de pagos no aparece

1. Verificar que el negocio tiene `paymentHistory` en Firestore
2. Confirmar que el usuario está autenticado
3. Ver logs de API en `/api/payment-history`

## 📝 Próximas Mejoras

- [ ] Dashboard con gráficas de pagos y renovaciones
- [ ] Sistema de notificaciones in-app para dueños
- [ ] Opción de cambiar frecuencia de recordatorios
- [ ] Recordatorios por WhatsApp (además de email)
- [ ] Sistema de gracia (X días después de vencer antes de deshabilitar)
- [ ] Histórico de suspensiones y reactivaciones

## 📞 Soporte

Para cualquier duda o problema, contactar al equipo de desarrollo.
