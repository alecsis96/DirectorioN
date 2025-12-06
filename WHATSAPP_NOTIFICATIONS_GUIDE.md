# Guía de Configuración: Notificaciones de WhatsApp

## 📱 Resumen

El sistema ahora envía notificaciones automáticas a tu WhatsApp cuando:

1. **Alguien se registra** - Un nuevo negocio es creado desde el panel admin
2. **Envío a revisión** - Un negocio es enviado para aprobación
3. **Nueva reseña** - Un usuario deja una reseña en cualquier negocio

---

## 🔧 Configuración (CallMeBot - Método Gratuito)

### Paso 1: Obtener tu API Key

1. Guarda este número en tus contactos: **+34 644 34 78 89**
   - Nombre del contacto: "CallMeBot"

2. Envía un mensaje de WhatsApp a ese número con el texto:
   ```
   I allow callmebot to send me messages
   ```

3. Recibirás una respuesta con tu **API Key personal** (algo como: `123456`)

### Paso 2: Configurar Variables de Entorno

Agrega estas líneas a tu archivo `.env.local`:

```env
# Notificaciones WhatsApp
ADMIN_WHATSAPP_NUMBER=5216671234567
CALLMEBOT_API_KEY=123456
```

**Importante:**
- `ADMIN_WHATSAPP_NUMBER`: Tu número de WhatsApp con código de país (sin +, sin espacios ni guiones)
  - Ejemplo México: `5216671234567` (521 + tu número de 10 dígitos)
  - Ejemplo España: `34612345678`
- `CALLMEBOT_API_KEY`: El código que recibiste en el paso 1

### Paso 3: Configurar Firebase Functions

Para las notificaciones de reseñas (que se ejecutan en Cloud Functions):

**Método Recomendado: Archivo .env**

1. Edita el archivo `functions/.env` (ya existe) y asegúrate que tenga:
   ```env
   # WhatsApp Notifications
   ADMIN_WHATSAPP_NUMBER=529191565865
   CALLMEBOT_API_KEY=1523609
   ```

2. Despliega las funciones (el archivo .env se carga automáticamente):
   ```bash
   firebase deploy --only functions
   ```

**¡Importante!** 
- ✅ Firebase ahora carga automáticamente variables del archivo `functions/.env`
- ✅ El mismo archivo funciona para desarrollo local y producción
- ❌ `firebase functions:config:set` está deprecado (se eliminará en marzo 2026)

**Para pruebas locales:**
```bash
firebase emulators:start --only functions
```
El emulador usará el mismo archivo `.env`

---

## 📋 Eventos que Generan Notificaciones

### 1. Nuevo Registro (Desde Admin)

**Trigger:** Cuando creas un negocio desde `/admin/businesses/nuevo`

**Mensaje de WhatsApp:**
```
🆕 NUEVO REGISTRO

Negocio: Mi Negocio
Propietario: Juan Pérez
Email: juan@example.com

✅ El negocio ha sido creado automáticamente.
📋 Revisa los detalles en el panel admin.
```

**Archivo:** `app/api/admin/create-business/route.ts`

### 2. Envío a Revisión

**Trigger:** Cuando un dueño envía su negocio draft a revisión desde el dashboard

**Mensaje de WhatsApp:**
```
📝 SOLICITUD DE REVISIÓN

Negocio: Mi Negocio
Propietario: Juan Pérez
Email: juan@example.com

⏳ Pendiente de aprobación
👉 Ir a: https://localhost:3000/admin/pending-businesses
```

**Archivo:** `pages/api/notify-business-review.ts`

### 3. Nueva Reseña

**Trigger:** Cuando un usuario autenticado deja una reseña

**Mensaje de WhatsApp:**
```
⭐ NUEVA RESEÑA

Negocio: Mi Negocio
Usuario: María García
Calificación: ⭐⭐⭐⭐⭐

📋 Revisa la reseña en el panel de moderación.
```

**Archivo:** `functions/src/index.ts` (Cloud Function `onReviewCreated`)

---

## 🧪 Pruebas

### Probar sin configurar WhatsApp

Si no configuras las variables de entorno, el sistema:
- ✅ Funciona normalmente
- 📝 Solo registra en consola que la notificación se enviaría
- ❌ No envía mensajes reales

### Probar con configuración completa

1. **Crear negocio desde admin:**
   - Ve a `/admin/businesses/nuevo`
   - Completa el formulario
   - Verifica que recibes notificación en WhatsApp

2. **Enviar negocio a revisión:**
   - Como dueño, edita un negocio en estado `draft`
   - Haz clic en "Enviar a Revisión"
   - Verifica la notificación

3. **Crear reseña:**
   - Visita `/negocios/[id]` de cualquier negocio
   - Deja una reseña como usuario autenticado
   - Verifica la notificación

---

## 🔒 Seguridad

- Las notificaciones solo se envían al número del admin configurado
- El API Key es personal y no se comparte
- Las variables de entorno no se exponen en el cliente
- CallMeBot es gratuito pero tiene límites de uso (no especificados públicamente)

---

## ⚠️ Limitaciones de CallMeBot

- **Gratuito** pero con posibles límites de mensajes por día
- **Sin confirmación de entrega** - solo envía el mensaje
- **No soporta multimedia** - solo texto
- **Depende de que WhatsApp Web esté activo**

---

## 🚀 Alternativa: Twilio (Pago)

Si necesitas un servicio más robusto y profesional:

### Configuración Twilio

1. Regístrate en [Twilio](https://www.twilio.com/try-twilio)
2. Obtén tu Account SID, Auth Token y número de WhatsApp
3. Variables de entorno:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ADMIN_WHATSAPP_NUMBER=whatsapp:+5216671234567
   ```

4. Instala el SDK:
   ```bash
   npm install twilio
   ```

5. Modifica `lib/whatsappNotifier.ts` para usar Twilio en lugar de CallMeBot

**Ventajas de Twilio:**
- ✅ Confirmación de entrega
- ✅ Soporte multimedia (imágenes, documentos)
- ✅ Más confiable y escalable
- ✅ Analytics y reportes
- ❌ Costo por mensaje (~$0.005 USD)

---

## 📊 Monitoreo

### Logs en Desarrollo

Revisa la consola del servidor para ver el status de las notificaciones:
```
✅ [WhatsApp] Notification sent successfully
❌ [WhatsApp] Failed to send notification: 500
📱 [WhatsApp] Not configured. Notification would be sent: {...}
```

### Logs en Firebase Functions

Para las notificaciones de reseñas:
```bash
firebase functions:log --only onReviewCreated
```

---

## 🐛 Troubleshooting

### No recibo notificaciones

1. **Verifica las variables de entorno:**
   ```bash
   # En desarrollo
   cat .env.local | grep WHATSAPP
   
   # En Firebase Functions
   firebase functions:config:get
   ```

2. **Verifica el formato del número:**
   - ✅ Correcto: `5216671234567`
   - ❌ Incorrecto: `+52 667 123 4567` o `521-667-123-4567`

3. **Revisa los logs:**
   - Desarrollo: Consola del terminal donde corre `npm run dev`
   - Producción: Firebase Console → Functions → Logs

4. **Prueba el API directamente:**
   ```bash
   curl "https://api.callmebot.com/whatsapp.php?phone=5216671234567&text=Test&apikey=123456"
   ```

### Error "API Key inválido"

- Repite el proceso de autorización con CallMeBot
- Asegúrate de guardar bien el API Key

### Error "Número no válido"

- Usa el formato internacional sin +, espacios ni guiones
- Incluye el código de país (52 para México)

---

## 📚 Archivos Relacionados

- `lib/whatsappNotifier.ts` - Funciones de notificación (Next.js)
- `functions/src/index.ts` - Notificaciones de reseñas (Cloud Functions)
- `app/api/admin/create-business/route.ts` - Notif. nuevo registro
- `pages/api/notify-business-review.ts` - Notif. envío a revisión

---

## ✅ Checklist de Implementación

- [ ] Guardar número de CallMeBot en contactos
- [ ] Enviar mensaje de autorización
- [ ] Recibir API Key
- [ ] Agregar variables en `.env.local`
- [ ] Configurar variables en Firebase Functions
- [ ] Desplegar funciones: `firebase deploy --only functions`
- [ ] Probar creación de negocio desde admin
- [ ] Probar envío a revisión
- [ ] Probar creación de reseña
- [ ] Verificar recepción de notificaciones en WhatsApp

---

## 🎉 ¡Listo!

Ahora recibirás notificaciones automáticas en tu WhatsApp cada vez que:
- Crees un negocio desde el panel admin
- Un usuario envíe su negocio a revisión
- Alguien deje una reseña en cualquier negocio

**¿Problemas?** Revisa los logs en la consola o contacta al desarrollador.
