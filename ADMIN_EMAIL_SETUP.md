# Configuración de Email de Administrador

## Variables de entorno necesarias

Para recibir notificaciones cuando los dueños de negocios envíen sus establecimientos a revisión, necesitas configurar la siguiente variable de entorno:

### En Firebase Functions

```bash
firebase functions:config:set admin.email="tu_email_admin@gmail.com"
```

### En archivo .env local (functions/.env)

```env
ADMIN_EMAIL=tu_email_admin@gmail.com
EMAIL_USER=tu_email_gmail@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
```

## ¿Qué hace esta configuración?

Cuando un dueño de negocio completa los datos de su establecimiento desde el dashboard y presiona "Enviar a revisión", el sistema:

1. Cambia el status del negocio a `'pending'`
2. Envía un email automático al ADMIN_EMAIL con:
   - Nombre del negocio
   - Categoría
   - Datos del dueño (nombre, email, teléfono)
   - Link directo al panel de revisión: `/admin/pending-businesses`

## Flujo de notificaciones

```
[Dueño completa datos] 
    ↓
[Presiona "Enviar a revisión"]
    ↓
[Status → 'pending']
    ↓
[Cloud Function detecta cambio]
    ↓
[Email automático al admin]
    ↓
[Admin revisa en /admin/pending-businesses]
    ↓
[Admin aprueba o rechaza]
    ↓
[Email de confirmación al dueño]
```

## Cómo configurar

1. Edita el archivo `functions/.env` y agrega tu email de admin
2. Redespliega las functions:
   ```bash
   firebase deploy --only functions
   ```
3. O configura directamente en Firebase Console:
   - Ve a Project Settings → Functions
   - Agrega la variable: `ADMIN_EMAIL`

## Emails que se envían

| Evento | Destinatario | Asunto |
|--------|--------------|--------|
| Solicitud inicial | Dueño | ✅ Solicitud recibida |
| Solicitud aprobada | Dueño | 🎉 ¡Solicitud Aprobada! Completa los datos |
| Negocio enviado a revisión | **Admin** | 🔔 Nuevo negocio para revisar |
| Negocio publicado | Dueño | 🎉 ¡Tu negocio está publicado! |
| Negocio rechazado | Dueño | ⚠️ Solicitud requiere cambios |
| Nueva reseña | Dueño | ⭐ Nueva reseña para tu negocio |
| Pago fallido | Dueño | ⚠️ Problema con tu suscripción |

## Verificación

Para verificar que funciona correctamente:

1. Crea un negocio de prueba desde el dashboard
2. Completa los datos requeridos
3. Presiona "Enviar a revisión"
4. Verifica que llegue el email al admin configurado

## Troubleshooting

Si no llegan los emails:

1. Verifica que `ADMIN_EMAIL` esté configurado
2. Revisa los logs de Firebase Functions:
   ```bash
   firebase functions:log
   ```
3. Verifica que el email de Gmail tenga una "App Password" configurada
4. Revisa que `EMAIL_USER` y `EMAIL_PASS` estén correctos

