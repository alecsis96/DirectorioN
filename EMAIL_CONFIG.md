# Configuración de Emails Automáticos

## 📧 Sistema de Notificaciones

El proyecto ahora incluye un sistema completo de notificaciones por email que se activa automáticamente en eventos clave del registro de negocios.

## ✅ Funciones implementadas

### 1. `onApplicationCreated`
- **Trigger:** Cuando se crea una nueva application
- **Email:** Confirmación de solicitud recibida
- **Contenido:**
  - Saludo personalizado al dueño
  - Confirmación de recepción
  - Pasos siguientes del proceso
  - Link para verificar estado

### 2. `onApplicationStatusChange`
- **Trigger:** Cuando una application cambia de status
- **Condición:** `status` pasa a `'approved'`
- **Email:** Solicitud aprobada - Completar datos
- **Contenido:**
  - Felicitación por aprobación
  - Link directo al dashboard (`/dashboard/{businessId}`)
  - Instrucciones de login
  - Lista de información necesaria
  
### 3. `onBusinessStatusChange`
- **Trigger:** Cuando un business cambia de status
- **Condiciones:**
  - `status` pasa a `'approved'` → Email de negocio publicado
  - `status` pasa a `'rejected'` → Email de solicitud rechazada
- **Emails:**
  - **Publicado:** Celebración, link al negocio en vivo, tips de promoción
  - **Rechazado:** Motivo del rechazo, link para editar y reenviar

## 🔧 Configuración requerida

### Paso 1: Configurar credenciales de Gmail

Necesitas crear una **App Password** de Gmail (no tu contraseña normal):

1. Ve a tu cuenta de Gmail
2. Configuración → Seguridad → Verificación en dos pasos (actívala si no está activa)
3. Configuración → Seguridad → Contraseñas de aplicaciones
4. Genera una contraseña para "Mail" en "Otros dispositivos"
5. Copia la contraseña de 16 dígitos

### Paso 2: Configurar variables de entorno en Firebase

```bash
# Desde la raíz del proyecto
firebase functions:config:set email.user="tu-email@gmail.com"
firebase functions:config:set email.pass="tu-app-password-de-16-digitos"
```

Para verificar:
```bash
firebase functions:config:get
```

Deberías ver:
```json
{
  "email": {
    "user": "tu-email@gmail.com",
    "pass": "xxxx xxxx xxxx xxxx"
  }
}
```

### Paso 3: Desplegar las Cloud Functions

```bash
# Desplegar SOLO las funciones
firebase deploy --only functions

# O desplegar todo (hosting + functions + rules)
firebase deploy
```

## 📦 Dependencias instaladas

```json
{
  "nodemailer": "^6.x.x",
  "@types/nodemailer": "^6.x.x"
}
```

Ya están instaladas en `functions/package.json`.

## 🎨 Templates de Email

Todos los emails incluyen:
- ✅ Diseño HTML responsive
- ✅ Colores del brand (#38761D verde)
- ✅ Iconos emojis para mejor UX
- ✅ Botones CTA destacados
- ✅ Links funcionales
- ✅ Footer con disclaimer

### Ejemplo de plantilla

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .header { background: linear-gradient(135deg, #38761D 0%, #2f5a1a 100%); }
    .button { background: #38761D; color: white; padding: 12px 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 ¡Solicitud Aprobada!</h1>
  </div>
  <div class="content">
    <p>Hola <strong>{{ownerName}}</strong>,</p>
    <p>Tu solicitud ha sido aprobada...</p>
    <a href="https://tu-dominio.com/dashboard/{{businessId}}" class="button">
      Completar Datos
    </a>
  </div>
</body>
</html>
```

## 🔍 Testing

### Local (Emuladores)

```bash
firebase emulators:start
```

Esto iniciará emuladores de Firestore y Functions. Los emails NO se enviarán realmente, pero verás los logs en la consola.

### Producción

1. **Desplegar funciones:**
   ```bash
   firebase deploy --only functions
   ```

2. **Probar con solicitud real:**
   - Completa el wizard de registro
   - Revisa tu email (verifica spam también)
   - Admin aprueba la solicitud
   - Revisa tu email nuevamente

3. **Ver logs:**
   ```bash
   firebase functions:log --only onApplicationCreated
   firebase functions:log --only onApplicationStatusChange
   firebase functions:log --only onBusinessStatusChange
   ```

## 🛠️ Troubleshooting

### "Email credentials not configured"
```
Error: Email credentials not configured
```
**Solución:** Ejecutar:
```bash
firebase functions:config:set email.user="tu-email@gmail.com" email.pass="tu-app-password"
firebase deploy --only functions
```

### "Invalid login: 535-5.7.8 Username and Password not accepted"
**Problema:** App Password incorrecta o no generada.
**Solución:**
1. Verifica que la verificación en dos pasos esté activa
2. Genera una nueva App Password
3. Actualiza la configuración:
   ```bash
   firebase functions:config:set email.pass="nueva-password"
   firebase deploy --only functions
   ```

### "Error sending email: Error: connect ETIMEDOUT"
**Problema:** Firewall o conexión bloqueando Gmail SMTP.
**Solución:**
- Verifica tu conexión a internet
- Si estás en un servidor, asegúrate de que el puerto 587 esté abierto
- Considera usar SendGrid en lugar de Gmail (más confiable para producción)

### Los emails no llegan
1. **Verifica spam/correo no deseado**
2. **Revisa los logs:**
   ```bash
   firebase functions:log
   ```
3. **Verifica la configuración:**
   ```bash
   firebase functions:config:get
   ```
4. **Asegúrate de que las funciones estén desplegadas:**
   ```bash
   firebase functions:list
   ```

## 📊 Monitoreo

### Ver ejecuciones en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Proyecto → Functions
3. Verás las 3 funciones listadas:
   - `onApplicationCreated`
   - `onApplicationStatusChange`
   - `onBusinessStatusChange`
4. Click en cada una para ver logs, métricas, errores

### Logs en tiempo real

```bash
# Todos los logs
firebase functions:log

# Solo errores
firebase functions:log --only-error

# Última hora
firebase functions:log --limit 100
```

## 💰 Costos

### Gmail gratuito
- **Límite:** ~500 emails/día
- **Costo:** $0
- **Ideal para:** Desarrollo, proyectos pequeños

### Alternativa: SendGrid
- **Límite:** 100 emails/día gratis
- **Costo:** $0 (plan gratuito), ~$15/mes (40,000 emails)
- **Ventajas:**
  - Más confiable para producción
  - Mejor deliverability
  - Analytics incluido
  - No requiere App Passwords

### Cloud Functions pricing
- **Free tier:** 2M invocaciones/mes
- Este proyecto generará ~3-5 invocaciones por negocio registrado
- **Estimado para 100 negocios/mes:** ~500 invocaciones = $0 (dentro del free tier)

## 🚀 Siguientes pasos

1. ✅ Configurar credenciales de Gmail
2. ✅ Desplegar funciones
3. ✅ Probar con un registro real
4. ⏳ Opcional: Migrar a SendGrid para producción
5. ⏳ Opcional: Agregar analytics de apertura de emails
6. ⏳ Opcional: Personalizar templates con más detalles

## 📚 Archivos relacionados

- `functions/src/emailNotifications.ts` - Lógica de las funciones y templates
- `functions/src/index.ts` - Export de las funciones
- `functions/package.json` - Dependencias (nodemailer)
- Este archivo - Documentación de configuración

## 🔗 Links útiles

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Firebase Functions Config](https://firebase.google.com/docs/functions/config-env)
- [SendGrid](https://sendgrid.com/) (alternativa recomendada para producción)
