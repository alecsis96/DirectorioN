# Configuración de Notificaciones con Slack

## 🎯 Ventajas de usar Slack sobre Email

- ✅ No necesitas configurar App Passwords de Gmail
- ✅ Notificaciones instantáneas en tu canal de Slack
- ✅ Formato más limpio y profesional
- ✅ Botones directos para revisar negocios
- ✅ Toda la info en un solo mensaje

## 📋 Pasos para configurar

### 1. Crear un Incoming Webhook en Slack

1. Ve a https://api.slack.com/apps
2. Haz clic en **"Create New App"**
3. Selecciona **"From scratch"**
4. Ponle un nombre: `Directorio Yajalón Bot`
5. Selecciona tu workspace
6. En el menú lateral, busca **"Incoming Webhooks"**
7. Activa el toggle: **"Activate Incoming Webhooks"**
8. Haz clic en **"Add New Webhook to Workspace"**
9. Selecciona el canal donde quieres recibir notificaciones (ej: `#negocios-admin`)
10. Copia la **Webhook URL** (empieza con `https://hooks.slack.com/services/`)

### 2. Configurar la variable de entorno

**Opción A: Archivo .env local (para desarrollo)**

Crea el archivo `functions/.env`:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/TU/WEBHOOK/URL
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
```

**Opción B: Firebase Environment (para producción)**

```bash
# Ir al directorio del proyecto
cd E:\Users\Yajashop\Documents\PROGRAMACION\DirectorioBussines

# Configurar la variable en Firebase
firebase functions:secrets:set SLACK_WEBHOOK_URL
# Pega tu webhook URL cuando te lo pida

# O usando .env para producción
firebase functions:config:set slack.webhook="https://hooks.slack.com/services/..."
```

**Opción C: Firebase Console (más fácil)**

1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a **Functions → Configuration**
4. Agrega una nueva variable:
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Tu webhook URL

### 3. Desplegar las funciones

```bash
# Desde el directorio raíz
firebase deploy --only functions
```

## 🎨 Formato del mensaje de Slack

Cuando un negocio se envíe a revisión, recibirás un mensaje como este:

```
🔔 Nuevo negocio para revisar

Negocio: Restaurante La Esquina
Categoría: Restaurantes

Dueño: María González
Email: maria@example.com

Teléfono: 9191234567
ID: abc123xyz

[👀 Revisar Negocio] [📊 Ver Dashboard]
```

## ✅ Testing

1. Ve al dashboard de un negocio borrador
2. Completa todos los datos
3. Presiona "Enviar a revisión"
4. Verifica que llegue la notificación a tu canal de Slack

## 🔧 Troubleshooting

**No llega la notificación:**
- Verifica que `SLACK_WEBHOOK_URL` esté configurado correctamente
- Revisa los logs de Firebase: `firebase functions:log`
- Asegúrate de que el webhook esté activo en Slack
- Verifica que el bot tenga permisos en el canal

**Error 404 en Slack:**
- El webhook URL es incorrecto o fue revocado
- Genera uno nuevo desde https://api.slack.com/apps

**Variables de entorno no se cargan:**
- Si usas `.env`, asegúrate de que esté en `functions/.env`
- Si usas Firebase config, usa: `firebase functions:config:get` para verificar
- Redespliega después de cambiar variables

## 📧 Emails a los dueños

Los dueños de negocios **SÍ** seguirán recibiendo emails cuando:
- Su solicitud inicial es recibida
- Su solicitud es aprobada
- Su negocio es publicado
- Su negocio es rechazado
- Reciben una nueva reseña

Solo las **notificaciones al admin** usan Slack ahora. Los emails a dueños siguen usando Gmail.

