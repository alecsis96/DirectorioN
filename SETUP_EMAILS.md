# 🚀 Guía Rápida: Configurar Emails en 5 Minutos

## Paso 1: Generar App Password de Gmail (2 minutos)

### Opción A: Ir directamente
Abre este link en tu navegador:
👉 **https://myaccount.google.com/apppasswords**

### Opción B: Paso a paso
1. Ve a https://myaccount.google.com/security
2. En "Cómo inicias sesión en Google", busca **"Contraseñas de aplicaciones"**
3. Si no la ves, primero activa **"Verificación en 2 pasos"**
4. Click en "Contraseñas de aplicaciones"
5. En "Aplicación" selecciona **"Correo"**
6. En "Dispositivo" selecciona **"Otro (nombre personalizado)"** y escribe "Directorio Yajalon"
7. Click **"Generar"**
8. **¡COPIA LA CONTRASEÑA DE 16 DÍGITOS!** (ejemplo: `abcd efgh ijkl mnop`)

⚠️ **IMPORTANTE:** Esta contraseña solo se muestra UNA VEZ. Guárdala.

---

## Paso 2: Configurar el archivo .env (30 segundos)

1. Abre el archivo: `functions/.env`
2. Reemplaza estas líneas:

```env
EMAIL_USER=tu-email-real@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

**Ejemplo real:**
```env
EMAIL_USER=directorio.yajalon@gmail.com
EMAIL_PASS=xmkb yzpq wert yuio
```

⚠️ **Quita los espacios de la password:** `xmkb yzpq wert yuio` → `xmkbyzpqwertyuio`

3. Guarda el archivo (Ctrl+S)

---

## Paso 3: Desplegar a Firebase (2 minutos)

Ejecuta este comando en la terminal:

```bash
firebase deploy --only functions
```

Esto subirá las 3 funciones:
- ✅ `onApplicationCreated`
- ✅ `onApplicationStatusChange`
- ✅ `onBusinessStatusChange`

Verás algo como:
```
✔  functions[onApplicationCreated(us-central1)] Successful create operation.
✔  functions[onApplicationStatusChange(us-central1)] Successful create operation.
✔  functions[onBusinessStatusChange(us-central1)] Successful create operation.
```

---

## Paso 4: ¡Probar! (1 minuto)

1. Ve a tu sitio: https://directorion-48816.web.app/para-negocios
2. Completa el wizard con TU email personal
3. Revisa tu bandeja de entrada
4. ¡Deberías recibir el email "✅ Solicitud recibida"!

**Si no llega:**
- Revisa la carpeta de SPAM
- Espera 1-2 minutos (a veces tarda)
- Revisa los logs: `firebase functions:log`

---

## 🔍 Verificar que todo funciona

### Ver las funciones desplegadas
```bash
firebase functions:list
```

Deberías ver:
```
onApplicationCreated(us-central1)
onApplicationStatusChange(us-central1)
onBusinessStatusChange(us-central1)
```

### Ver logs en tiempo real
```bash
firebase functions:log --only onApplicationCreated
```

---

## ❌ Solución de problemas

### "Email credentials not configured"
- Verifica que `functions/.env` tenga EMAIL_USER y EMAIL_PASS
- Asegúrate de que no tenga espacios al inicio/final
- Redeploy: `firebase deploy --only functions`

### "Invalid login: 535-5.7.8 Username and Password not accepted"
- App Password incorrecta
- Genera una nueva en https://myaccount.google.com/apppasswords
- Actualiza `functions/.env`
- Redeploy

### "Cannot find module 'dotenv'"
```bash
cd functions
npm install dotenv
npm run build
firebase deploy --only functions
```

### Los emails no llegan
1. **Revisa SPAM/correo no deseado**
2. **Espera 2-3 minutos**
3. **Verifica logs:**
   ```bash
   firebase functions:log
   ```
4. Busca líneas como:
   ```
   Email sent to usuario@gmail.com: ✅ Solicitud recibida
   ```

---

## 📧 Emails que se enviarán automáticamente

### 1. Cuando alguien completa el wizard
**Email:** "✅ Solicitud recibida - Directorio Yajalón"
- Link para verificar estado
- Pasos siguientes

### 2. Cuando apruebes una solicitud
**Email:** "🎉 ¡Solicitud Aprobada! - Completar datos"
- Link directo al dashboard
- Lista de datos a completar

### 3. Cuando publiques un negocio
**Email:** "🎉 ¡Tu negocio está publicado!"
- Link al negocio en vivo
- Tips de promoción

### 4. Si rechazas algo
**Email:** "⚠️ Solicitud requiere cambios"
- Motivo del rechazo
- Link para editar

---

## 🎯 ¿Listo?

**Checklist:**
- [ ] Generar App Password de Gmail
- [ ] Editar `functions/.env` con EMAIL_USER y EMAIL_PASS
- [ ] Ejecutar `firebase deploy --only functions`
- [ ] Probar con un registro real

**Tiempo total:** ~5 minutos

**¿Necesitas ayuda?** Pregunta en cualquier momento.
