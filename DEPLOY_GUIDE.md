# 🚀 Desplegar a Producción

## Problema Actual

Tu app usa `getServerSideProps` (server-side rendering) que requiere un servidor Node.js. Firebase Hosting solo sirve archivos estáticos, por lo que los links en los emails dan error "Site Not Found".

## ✅ Solución Recomendada: Vercel (Gratis y Simple)

Vercel es la plataforma oficial para Next.js y es **100% gratuita** para proyectos personales.

### Paso 1: Crear cuenta en Vercel

1. Ve a https://vercel.com/signup
2. Conecta con tu cuenta de GitHub
3. ¡Listo!

### Paso 2: Conectar tu repositorio

1. En Vercel, click **"Add New Project"**
2. Busca tu repo **"DirectorioN"**
3. Click **"Import"**

### Paso 3: Configurar variables de entorno

Antes de desplegar, agrega estas variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=directorion-48816.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=directorion-48816
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=directorion-48816.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

(Cópialas de tu `firebaseConfig.ts`)

### Paso 4: Desplegar

1. Click **"Deploy"**
2. Espera 2-3 minutos
3. ¡Listo! Tu sitio estará en `https://tu-proyecto.vercel.app`

### Paso 5: Actualizar links en los emails

Una vez desplegado, actualiza la URL en las funciones:

1. Edita `functions/src/emailNotifications.ts`
2. Cambia `https://directorion-48816.web.app` por `https://tu-proyecto.vercel.app`
3. Redespliega functions: `firebase deploy --only functions`

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
