# Configuración de Notificaciones por Email

Este documento explica cómo configurar el sistema de notificaciones por email del Directorio de Yajalón.

## 🎯 Tipos de Emails Implementados

El sistema envía automáticamente los siguientes emails:

### 1. **Email de Bienvenida** 👋
- **Cuándo**: Al completar el registro inicial del negocio
- **Destinatario**: Dueño del negocio
- **Contenido**: 
  - Bienvenida y confirmación de registro
  - Próximos pasos
  - Enlace al dashboard
  - Tips para destacar

### 2. **Email de Aprobación** 🎉
- **Cuándo**: Cuando el admin aprueba un negocio
- **Destinatario**: Dueño del negocio
- **Contenido**:
  - Felicitación por la aprobación
  - Confirmación de que está publicado
  - Enlace al dashboard
  - Enlace para ver su negocio en el directorio
  - Consejos de uso

### 3. **Email de Rechazo** ⚠️
- **Cuándo**: Cuando el admin rechaza un negocio
- **Destinatario**: Dueño del negocio
- **Contenido**:
  - Explicación de que se necesitan ajustes
  - Comentarios del revisor
  - Pasos para corregir
  - Enlace al dashboard

### 4. **Recordatorios de Pago** 💳 (En Cloud Functions)
- **Cuándo**: 7 días, 3 días y 1 día antes del vencimiento, y después de vencido
- **Destinatario**: Dueño del negocio
- **Contenido**:
  - Fecha de próximo pago
  - Días restantes
  - Enlace al dashboard para actualizar pago
  - Advertencias progresivas según urgencia

## 📧 Configuración de Gmail

### Opción 1: Usar Contraseña de Aplicación de Gmail (Recomendado)

1. **Habilita la verificación en dos pasos**
   - Ve a: https://myaccount.google.com/security
   - Activa "Verificación en dos pasos"

2. **Genera una Contraseña de Aplicación**
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Windows Computer" (o cualquier combinación)
   - Copia la contraseña de 16 caracteres que se genera

3. **Configura las variables de entorno**
   
   En tu archivo `.env.local`:
   ```env
   # Email Configuration
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  # La contraseña de aplicación de 16 caracteres
   ```

### Opción 2: Usar OAuth2 (Más Seguro pero Más Complejo)

Si prefieres usar OAuth2, necesitas:
1. Crear un proyecto en Google Cloud Console
2. Habilitar Gmail API
3. Crear credenciales OAuth2
4. Configurar el flujo de autorización

Para simplicidad, recomendamos la **Opción 1** para comenzar.

## 🔧 Configuración en Producción (Vercel)

1. **Ve a tu proyecto en Vercel**
   - Dashboard → Tu proyecto → Settings → Environment Variables

2. **Agrega las variables**
   ```
   EMAIL_USER = tu-email@gmail.com
   EMAIL_PASS = xxxx xxxx xxxx xxxx
   ```

3. **Redeploya tu aplicación**
   ```bash
   vercel --prod
   ```

## 📝 Personalización de Templates

Los templates de email están en:
- **Archivo**: `pages/api/send-email-notification.ts`
- **Funciones**: 
  - `getApprovedTemplate()` - Email de aprobación
  - `getRejectedTemplate()` - Email de rechazo
  - `getWelcomeTemplate()` - Email de bienvenida

Puedes personalizar:
- Colores (actualmente verde #38761D)
- Textos y mensajes
- Estructura HTML
- Logos e imágenes (agrega un logo hosted)

## 🧪 Pruebas

### Probar Email de Bienvenida
1. Registra un nuevo negocio
2. Completa el wizard
3. Revisa tu email

### Probar Email de Aprobación
1. Como admin, ve a `/admin/pending-businesses`
2. Aprueba un negocio pendiente
3. El dueño recibirá el email

### Probar Email de Rechazo
1. Como admin, ve a `/admin/pending-businesses`
2. Rechaza un negocio con notas
3. El dueño recibirá el email con los comentarios

## 🔍 Troubleshooting

### "Error sending email: Invalid login"
- Verifica que EMAIL_USER y EMAIL_PASS estén correctos
- Asegúrate de usar una Contraseña de Aplicación, no tu contraseña normal
- Verifica que la verificación en dos pasos esté activada

### "Email not sent"
- Revisa los logs del servidor: `npm run dev`
- Verifica que las variables de entorno estén configuradas
- Checa que el email del destinatario sea válido

### Los emails no llegan
- Revisa la carpeta de Spam
- Verifica que el email del remitente (EMAIL_USER) esté verificado
- Aumenta el límite diario de Gmail si envías muchos emails

## 📊 Límites de Gmail

- **Límite diario**: 500 emails por día (cuentas gratuitas)
- **Límite por minuto**: ~100 emails
- **Límite de destinatarios**: 500 por email

Para volúmenes mayores, considera:
- **SendGrid**: 100 emails/día gratis
- **Mailgun**: 5,000 emails/mes gratis
- **AWS SES**: Muy económico para alto volumen

## 🔐 Seguridad

### Mejores Prácticas

1. **Nunca** comitees EMAIL_PASS al repositorio
2. Usa variables de entorno en todos los ambientes
3. Regenera la contraseña si se compromete
4. Considera usar un email dedicado (ej: notificaciones@tudominio.com)
5. Monitorea el uso para detectar abusos

### Rotación de Credenciales

Recomendamos cambiar las credenciales cada 3-6 meses:
1. Genera nueva contraseña de aplicación
2. Actualiza EMAIL_PASS en .env.local y Vercel
3. Redeploya
4. Revoca la contraseña antigua

## 📈 Monitoreo

Para monitorear el envío de emails:

```typescript
// En cualquier endpoint que envíe emails
console.log('✅ Email sent to:', recipientEmail);
console.error('❌ Email failed:', error);
```

Los logs se verán en:
- **Local**: Terminal de npm run dev
- **Producción**: Vercel Dashboard → Functions → Logs

## 🎨 Mejoras Futuras

- [ ] Templates más personalizables (CMS)
- [ ] Tracking de apertura de emails
- [ ] Preferencias de notificación por usuario
- [ ] Emails transaccionales (facturas, recibos)
- [ ] Newsletters periódicas
- [ ] A/B testing de templates

## 🆘 Soporte

Si tienes problemas con la configuración de emails:

1. Revisa este documento
2. Verifica los logs en la consola
3. Prueba con un email de prueba primero
4. Revisa la documentación de Gmail: https://support.google.com/mail/answer/185833

---

**Última actualización**: Noviembre 2025
