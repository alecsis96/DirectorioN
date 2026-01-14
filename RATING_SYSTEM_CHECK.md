# 🔍 Verificación y Corrección del Sistema de Rating

## ✅ Estado Actual del Sistema

El sistema de rating está **correctamente implementado** con los siguientes componentes:

### 1. **Cloud Functions (Firebase)** ✅
- `onReviewCreated` - Se ejecuta cuando se crea una reseña
- `onReviewUpdated` - Se ejecuta cuando se actualiza una reseña  
- `onReviewDeleted` - Se ejecuta cuando se elimina una reseña
- `updateBusinessRating()` - Función auxiliar que calcula el promedio

**Ubicación:** `functions/src/index.ts`

### 2. **Frontend (React)** ✅
- Formulario de reseñas en `BusinessDetailView.tsx`
- Visualización de rating en `BusinessCard.tsx`
- Sistema de estrellas interactivo
- Validación con Zod

### 3. **Firestore Rules** ✅
- Usuarios autenticados pueden crear/editar su propia reseña
- Un usuario = una reseña por negocio (doc id = userId)
- Los dueños no pueden reseñar su propio negocio

## 🔧 Pasos de Verificación

### Paso 1: Verificar que las Cloud Functions estén desplegadas

```bash
# Ver funciones activas
firebase functions:list

# Deberías ver:
# - onReviewCreated
# - onReviewUpdated  
# - onReviewDeleted
```

### Paso 2: Desplegar/Actualizar funciones si es necesario

```bash
# Desde la raíz del proyecto
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Paso 3: Verificar en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. **Functions** → Verifica que aparezcan las 3 funciones de reviews
4. **Firestore** → Revisa la estructura:
   ```
   businesses/
     {businessId}/
       rating: number
       reviewCount: number
       reviews/
         {userId}/
           name: string
           text: string
           rating: number (1-5)
           userId: string
           created: timestamp
   ```

### Paso 4: Probar el sistema

#### A) Crear una reseña:
1. Inicia sesión en la app
2. Abre un negocio (que no sea tuyo)
3. Deja una reseña con calificación
4. **Espera ~10-30 segundos**
5. Verifica que el rating del negocio se actualice

#### B) Verificar en Firestore:
1. Ve a Firestore Database
2. Busca el negocio en `businesses/{id}`
3. Verifica que `rating` y `reviewCount` se hayan actualizado

#### C) Ver logs de la función:
```bash
# Ver logs en tiempo real
firebase functions:log --only onReviewCreated

# Ver logs recientes
firebase functions:log --only onReviewCreated --lines 50
```

## 🐛 Solución de Problemas

### Problema 1: Rating no se actualiza

**Causa:** Cloud Functions no desplegadas o deshabilitadas

**Solución:**
```bash
# Redesplegar funciones
firebase deploy --only functions:onReviewCreated,functions:onReviewUpdated,functions:onReviewDeleted
```

### Problema 2: Error "Permission denied"

**Causa:** Reglas de Firestore incorrectas

**Solución:** Verifica que `firestore.rules` incluya:
```javascript
match /businesses/{businessId}/reviews/{userId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null 
    && request.auth.uid == userId
    && request.auth.uid != resource.data.ownerId;
  allow delete: if request.auth != null 
    && request.auth.uid == userId;
}
```

Despliega las reglas:
```bash
firebase deploy --only firestore:rules
```

### Problema 3: Cloud Function falla silenciosamente

**Causa:** Error en el código de la función

**Solución:**
1. Revisa los logs:
   ```bash
   firebase functions:log
   ```

2. Busca errores en la consola de Firebase

3. Prueba localmente con el emulador:
   ```bash
   firebase emulators:start
   ```

### Problema 4: Rating aparece como 0 cuando hay reseñas

**Causas posibles:**
- Las reseñas no tienen el campo `rating` correcto
- La función no se ejecutó
- Error en el cálculo del promedio

**Solución:**
1. Ejecuta manualmente la función para recalcular:
   ```javascript
   // En Firebase Console > Firestore
   // Selecciona una reseña y "Edit Document"
   // Cambia cualquier campo y guarda (esto triggerea onReviewUpdated)
   ```

2. O crea un script one-time para recalcular todos:
   ```bash
   # Crear functions/recalculate-ratings.js
   node functions/recalculate-ratings.js
   ```

## 📊 Script de Recalculación Manual

Si necesitas recalcular todos los ratings, crea este archivo:

**`functions/recalculate-ratings.js`**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function recalculateAllRatings() {
  const businessesSnapshot = await db.collection('businesses').get();
  
  for (const businessDoc of businessesSnapshot.docs) {
    const businessId = businessDoc.id;
    const reviewsSnapshot = await db
      .collection('businesses')
      .doc(businessId)
      .collection('reviews')
      .get();
    
    if (reviewsSnapshot.empty) {
      await businessDoc.ref.update({
        rating: 0,
        reviewCount: 0
      });
      console.log(`${businessId}: 0 reseñas`);
      continue;
    }
    
    let total = 0;
    let count = 0;
    
    reviewsSnapshot.forEach(review => {
      const data = review.data();
      if (typeof data.rating === 'number') {
        total += data.rating;
        count++;
      }
    });
    
    const average = count > 0 ? total / count : 0;
    const rounded = Math.round(average * 10) / 10;
    
    await businessDoc.ref.update({
      rating: rounded,
      reviewCount: count
    });
    
    console.log(`${businessId}: ${rounded} (${count} reseñas)`);
  }
  
  console.log('✅ Recalculación completada');
  process.exit(0);
}

recalculateAllRatings().catch(console.error);
```

**Ejecutar:**
```bash
cd functions
node recalculate-ratings.js
```

## ✅ Checklist de Verificación Final

- [ ] Cloud Functions desplegadas en Firebase
- [ ] Función `onReviewCreated` visible en Firebase Console
- [ ] Función `onReviewUpdated` visible en Firebase Console
- [ ] Función `onReviewDeleted` visible en Firebase Console
- [ ] Reglas de Firestore desplegadas
- [ ] Crear reseña funciona desde la app
- [ ] Rating se actualiza automáticamente (esperar ~30 seg)
- [ ] Editar reseña actualiza el rating
- [ ] Eliminar reseña actualiza el rating
- [ ] reviewCount refleja el número correcto de reseñas
- [ ] Logs de funciones no muestran errores

## 📝 Notas Importantes

### Tiempo de Actualización
- Las Cloud Functions no son instantáneas
- Puede tardar 10-30 segundos en actualizarse el rating
- Si estás viendo el negocio, refresca la página para ver el cambio

### Estructura de Datos
```typescript
// Negocio
{
  id: string,
  name: string,
  rating: number,        // Promedio calculado automáticamente
  reviewCount: number,   // Total de reseñas
  // ... otros campos
}

// Reseña (sub-colección)
businesses/{businessId}/reviews/{userId}
{
  name: string,
  text: string,
  rating: number,        // 1-5
  userId: string,
  businessId: string,
  approved: boolean,
  created: timestamp,
  updated: timestamp
}
```

### Costos de Firebase
- Cloud Functions: Primera 2M invocaciones/mes gratis
- Firestore reads/writes: Primeros 50K/día gratis
- El sistema de rating es muy eficiente (solo 1 write por reseña)

## 🚀 Mejoras Futuras (Opcional)

1. **Cache de ratings**: Guardar en localStorage para cargas más rápidas
2. **Ratings por categoría**: Calidad, servicio, precio, etc.
3. **Moderación de reseñas**: Panel admin para aprobar/rechazar
4. **Respuestas del dueño**: Permitir que los dueños respondan reseñas
5. **Fotos en reseñas**: Subir imágenes junto con el texto
6. **Verificación de compra**: Solo reseñas de clientes verificados

## 🆘 Soporte

Si el problema persiste:
1. Revisa logs: `firebase functions:log`
2. Verifica Firestore Console manualmente
3. Ejecuta el script de recalculación manual
4. Contacta soporte de Firebase si es error de la plataforma
