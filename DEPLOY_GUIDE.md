# 🚀 Guía Completa de Despliegue a Producción

## Estado Actual del Proyecto

✅ **Completado:**
- Sistema de autenticación con Firebase Auth
- Gestión de negocios con Firestore
- Sistema de reviews y calificaciones
- Integración con Stripe para suscripciones
- Notificaciones por email (incluyendo pagos fallidos)
- Sistema de solicitudes y aprobaciones
- Dashboard de administración
- SEO y sitemap dinámico

## 📋 Pre-requisitos

Antes de desplegar, asegúrate de tener:

1. ✅ Cuenta de GitHub con el repositorio actualizado
2. ✅ Proyecto de Firebase configurado
3. ✅ Cuenta de Stripe (producción)
4. ✅ Cuenta de Cloudinary (opcional, para imágenes)
5. ✅ Cuenta de Gmail con contraseña de aplicación (para emails)

---

## 🎯 Despliegue en Vercel (Recomendado)

Vercel es la plataforma oficial para Next.js y es **100% gratuita** para proyectos personales.

### Paso 1: Crear cuenta en Vercel

1. Ve a https://vercel.com/signup
2. Conecta con tu cuenta de GitHub
3. Autoriza el acceso a tus repositorios

### Paso 2: Importar el Proyecto

1. En Vercel Dashboard, click **"Add New Project"**
2. Busca tu repositorio **"DirectorioN"**
3. Click **"Import"**

### Paso 3: Configurar Variables de Entorno

**IMPORTANTE:** Antes de desplegar, configura TODAS estas variables:

#### 🔥 Firebase (Cliente)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=directorion-48816.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=directorion-48816
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=directorion-48816.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

📝 **Dónde encontrarlas:** Firebase Console → Project Settings → General

#### 🔥 Firebase (Server/Admin)
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"directorion-48816",...}
```

📝 **Cómo obtenerla:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copia TODO el contenido del archivo JSON
4. Pégalo como una sola línea (sin saltos de línea) en Vercel

#### 💳 Stripe
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

⚠️ **IMPORTANTE:** Usa las credenciales de **PRODUCCIÓN** (live), no las de test.

📝 **Webhook Secret:**
1. Ve a Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://tu-dominio.vercel.app/api/stripe/webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copia el webhook secret generado

#### ☁️ Cloudinary (Opcional)
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tu_preset
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

#### 🌐 URLs
```env
NEXT_PUBLIC_BASE_URL=https://tu-proyecto.vercel.app
NEXT_PUBLIC_GOOGLE_SHEET_CSV_URL=tu_csv_url
FIREBASE_FUNCTIONS_URL=https://us-central1-directorion-48816.cloudfunctions.net
```

#### 📧 Email (Opcional - si quieres notificaciones)
```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
```

📝 **App Password de Gmail:**
1. Google Account → Security → 2-Step Verification → App passwords
2. Genera una contraseña para "Mail"

### Paso 4: Desplegar

1. Verifica que todas las variables estén configuradas
2. Click **"Deploy"**
3. Espera 2-5 minutos
4. ¡Tu sitio estará en `https://tu-proyecto.vercel.app`!

### Paso 5: Configurar Dominio Personalizado (Opcional)

1. En Vercel, ve a tu proyecto → Settings → Domains
2. Agrega tu dominio (ej: `directorio-yajalon.com`)
3. Sigue las instrucciones para configurar DNS
4. Vercel automáticamente configurará HTTPS

---

## 🔧 Actualizar URLs en Firebase Functions

Después del despliegue, actualiza las URLs en los emails:

1. Abre `functions/src/emailNotifications.ts`
2. Reemplaza todas las URLs:
   ```typescript
   // Busca: https://directorio-1.vercel.app
   // Reemplaza por: https://tu-dominio.vercel.app
   ```

3. Redespliega las funciones:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions
   ```

---

## 🧪 Verificar el Despliegue

### Checklist Post-Despliegue

- [ ] La página principal carga correctamente
- [ ] Login con Google funciona
- [ ] Se pueden ver los negocios
- [ ] Las imágenes cargan (Cloudinary)
- [ ] El sistema de reviews funciona
- [ ] Los favoritos se guardan
- [ ] El registro de negocios funciona
- [ ] Los emails se envían correctamente
- [ ] Stripe checkout funciona
- [ ] El webhook de Stripe responde (revisar logs)

### Probar Stripe Webhook

Usa el CLI de Stripe para probar:
```bash
stripe listen --forward-to https://tu-dominio.vercel.app/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## 🔄 Actualizaciones Futuras

Para desplegar cambios:

1. Haz commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push
   ```

2. Vercel detectará el push y desplegará automáticamente
3. En 1-2 minutos, los cambios estarán en producción

---

## 🐛 Solución de Problemas

### Error: "Firebase not initialized"
- Verifica que todas las variables `NEXT_PUBLIC_FIREBASE_*` estén configuradas
- Revisa que no haya espacios extra en las variables

### Error: "Stripe webhook signature invalid"
- Asegúrate de usar el webhook secret de producción
- Verifica que la URL del webhook en Stripe sea correcta

### Emails no se envían
- Verifica que las Cloud Functions estén desplegadas: `firebase deploy --only functions`
- Revisa los logs en Firebase Console → Functions

### Imágenes no cargan
- Verifica las credenciales de Cloudinary
- Asegúrate de que el upload preset esté configurado como "unsigned"

---

## 📊 Monitoreo

### Logs de Vercel
1. Ve a tu proyecto en Vercel
2. Click en "Deployments"
3. Selecciona un deployment
4. Click en "Functions" o "Runtime Logs"

### Logs de Firebase Functions
```bash
firebase functions:log
```

### Métricas de Stripe
Stripe Dashboard → Developers → Webhooks → Ver logs de tu endpoint

---

## 🔐 Seguridad Post-Despliegue

- [ ] Activar 2FA en Vercel
- [ ] Activar 2FA en Firebase Console
- [ ] Configurar reglas de Firestore para producción
- [ ] Revisar y ajustar límites de rate limiting
- [ ] Configurar alertas de gastos en Stripe
- [ ] Habilitar alertas de errores en Vercel

---

## 💰 Costos Estimados

- **Vercel:** Gratis (hasta 100GB bandwidth)
- **Firebase:** Gratis hasta cierto límite (Spark plan) o ~$25/mes (Blaze plan)
- **Stripe:** 3.6% + $3 MXN por transacción
- **Cloudinary:** Gratis hasta 25GB storage

**Total estimado para 1000 usuarios/mes:** ~$0-30 USD

---

## 🎉 ¡Listo!

Tu Directorio de Negocios está ahora en producción. Los próximos pasos recomendados:

1. **Testing exhaustivo** - Prueba todas las funcionalidades
2. **SEO** - Envía el sitemap a Google Search Console
3. **Analytics** - Configura Google Analytics o similar
4. **Monitoreo** - Configura alertas para errores
5. **Backup** - Programa backups automáticos de Firestore

---

## 📚 Recursos Útiles

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**¿Necesitas ayuda?** Revisa los logs en Vercel y Firebase Console para diagnosticar problemas.

---

## 🔄 Alternativa: Firebase Hosting + Cloud Functions

Si prefieres usar Firebase Hosting, necesitas:

1. **Instalar Firebase CLI para hosting:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Inicializar Firebase Hosting con Next.js:**
   ```bash
   firebase init hosting
   ```
   - Framework: Next.js
   - Build command: `npm run build`
   - Export directory: `.next`

3. **Desplegar:**
   ```bash
   firebase deploy
   ```

**Nota:** Esto requiere plan Blaze (pago por uso) de Firebase porque Next.js con SSR usa Cloud Functions.

---

## 💡 Recomendación

**Usa Vercel** porque:
- ✅ Es gratuito
- ✅ Está optimizado para Next.js
- ✅ Deploy automático con cada push a GitHub
- ✅ SSL gratis
- ✅ CDN global
- ✅ No requiere configuración compleja

Firebase Functions solo para backend (ya funcionando ✅).

---

## 🎯 Resumen rápido

1. Sube tu código a GitHub (si no lo has hecho)
2. Conecta GitHub con Vercel
3. Despliega con 1 click
4. Actualiza URLs en emailNotifications.ts
5. ¡Listo!

**Tiempo total:** 10 minutos
