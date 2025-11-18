# 🔒 SECURITY CHECKLIST - ACCIÓN INMEDIATA REQUERIDA

## ⚠️ CRÍTICO: Protección de Credenciales

### 1. Verificar archivos sensibles (HACER AHORA)

```bash
# Verificar si existen archivos sensibles en el repositorio
git ls-files | grep -E "(serviceAccountKey|\.pem|\.key)\.json"
```

Si encuentras archivos, **DETÉN TODO** y ejecuta:

```bash
# Remover del historial de Git (usar con cuidado)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch serviceAccountKey.json" \
  --prune-empty --tag-name-filter cat -- --all

# Forzar push (ADVERTENCIA: reescribe historia)
git push origin --force --all
```

### 2. Rotar TODAS las credenciales (URGENTE)

#### Firebase:
1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Project Settings > Service Accounts
3. **Generate New Private Key** (esto invalida la anterior)
4. Guardar el nuevo JSON SOLO en tu máquina local
5. Agregar la ruta al `.env.local`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/ruta/local/serviceAccountKey.json
   ```

#### Stripe:
1. Ir a [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. **Roll** (rotar) tanto la Secret Key como la Webhook Secret
3. Actualizar en `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_NUEVA_CLAVE
   STRIPE_WEBHOOK_SECRET=whsec_NUEVA_CLAVE
   ```

#### Cloudinary:
1. Ir a [Cloudinary Console](https://cloudinary.com/console)
2. Settings > Security > **Reset API Secret**
3. Actualizar en `.env.local`:
   ```env
   CLOUDINARY_API_SECRET=NUEVA_CLAVE
   ```

### 3. Configurar variables de entorno en Vercel

```bash
# En el dashboard de Vercel, agregar:
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account"...}  # JSON completo
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_API_SECRET=...
```

### 4. Actualizar .gitignore (YA HECHO ✅)

El `.gitignore` ya fue actualizado con:
```
serviceAccountKey.json
*.pem
*.key
.env.*.local
```

### 5. Verificar Firestore Rules (YA HECHO ✅)

Las reglas fueron restringidas para prevenir:
- ❌ Scraping de emails de negocios
- ❌ Queries públicas ilimitadas
- ✅ Solo admin puede hacer queries completas
- ✅ Usuarios solo ven sus propios datos

---

## 🛡️ Medidas de Seguridad Implementadas

### ✅ Rate Limiting
- Endpoints protegidos: `/api/admin/review-business`, `/api/stripe/create-checkout-session`
- Límites: 20 req/min (admin), 5 req/min (stripe)
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### ✅ CSRF Protection
- Valida que requests vengan del mismo origin
- Activo en producción, relajado en desarrollo
- Protege todos los endpoints POST

### ✅ Input Validation
- Campos de texto limitados (max 1000 chars para notes)
- Validación de tipos en todos los endpoints
- Prevención de inyección de código

### ✅ Secure Cookies
- Flag `Secure` en HTTPS
- `SameSite=Lax` para prevenir CSRF
- Max-age configurado (24 horas por defecto)

### ✅ TypeScript Safety
- Tipos corregidos en webhook handler
- Buffer tipado correctamente

---

## 📋 Checklist de Verificación

Antes de hacer commit y deploy, verificar:

- [ ] No hay `serviceAccountKey.json` en el repo
- [ ] `.env.local` está en `.gitignore`
- [ ] Todas las claves fueron rotadas
- [ ] Variables de entorno configuradas en Vercel
- [ ] Firestore rules desplegadas: `firebase deploy --only firestore:rules`
- [ ] Tests de seguridad ejecutados
- [ ] Documentación actualizada

---

## 🚨 En caso de compromiso de credenciales

Si las credenciales fueron expuestas:

1. **Inmediato**: Deshabilitar las claves en las consolas respectivas
2. **5 minutos**: Rotar todas las credenciales
3. **15 minutos**: Revisar logs de acceso en Firebase/Stripe/Cloudinary
4. **30 minutos**: Notificar a usuarios si hubo acceso no autorizado (GDPR)
5. **1 hora**: Implementar monitoreo adicional
6. **24 horas**: Realizar auditoría completa de seguridad

---

## 📞 Contactos de Emergencia

- Firebase Support: https://firebase.google.com/support/contact/troubleshooting
- Stripe Security: security@stripe.com
- Cloudinary Support: https://support.cloudinary.com

---

**Última actualización**: Noviembre 18, 2025
**Estado**: 🟡 Medidas implementadas - Pendiente rotación de credenciales
