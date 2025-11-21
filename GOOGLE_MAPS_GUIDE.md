# Google Maps Integration

## ✅ Integración Completa

### 📦 Instalación

```bash
npm install @react-google-maps/api
```

### 🔑 Configuración de API Key

1. **Obtener API Key de Google Maps:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea o selecciona un proyecto
   - Habilita las APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
   - Ve a "Credenciales" → "Crear credenciales" → "Clave de API"
   - Copia la API Key

2. **Configurar en el proyecto:**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_GOOGLE_MAPS_KEY=TU_API_KEY_AQUI
```

3. **Restricciones recomendadas (producción):**
   - Restricción de aplicación: Sitios web HTTP
   - Agregar: `https://directorio-1.vercel.app/*`
   - Restricción de API: Maps JavaScript API, Places API, Geocoding API

### 🗺️ Componente Creado

**`components/BusinessMapComponent.tsx`**

Características:
- ✅ Mapa interactivo con zoom y controles
- ✅ Marcador personalizado con logo del negocio
- ✅ InfoWindow con información del negocio
- ✅ Botón "Cómo llegar" con direcciones
- ✅ Fallback a iframe si no hay API key
- ✅ Estilos personalizados (oculta POIs innecesarios)
- ✅ Animación DROP para el marcador
- ✅ Responsive y optimizado para móvil

### 📍 Uso en Componentes

#### BusinessDetailView.tsx

```tsx
import BusinessMapComponent from "./BusinessMapComponent";

// En el render:
<BusinessMapComponent 
  business={business} 
  height="400px" 
  zoom={16} 
/>
```

El componente detecta automáticamente:
- Si hay `business.location.lat` y `business.location.lng`
- Si hay API key configurada
- Si está en modo ahorro de datos

### 🎨 Características del Mapa

#### Controles Habilitados
- ✅ Zoom (+/-)
- ✅ Street View (pegman)
- ✅ Pantalla completa
- ❌ Tipo de mapa (deshabilitado)

#### Estilos
- POIs (puntos de interés) ocultos para evitar distracciones
- Marcador personalizado con logo del negocio (40x40px)
- InfoWindow con card del negocio

#### Interacción
1. Click en marcador → Abre InfoWindow
2. InfoWindow muestra:
   - Logo del negocio
   - Nombre y categoría
   - Dirección
   - Botón "Cómo llegar"

### 📊 Modos de Funcionamiento

#### 1. Con API Key + Coordenadas
Mapa interactivo completo con todos los features

#### 2. Sin API Key + Coordenadas
Fallback a Google Maps iframe embed (sin API)

#### 3. Sin Coordenadas
Muestra mensaje y botón para abrir en Google Maps

#### 4. Modo Ahorro de Datos
No carga mapa, solo muestra botón de enlace externo

### 🔧 Configuración Avanzada

#### Personalizar Zoom
```tsx
<BusinessMapComponent business={business} zoom={18} />
```

#### Personalizar Altura
```tsx
<BusinessMapComponent business={business} height="600px" />
```

#### Personalizar Estilos del Mapa
Edita `BusinessMapComponent.tsx`:

```tsx
options={{
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    // Más estilos: https://mapstyle.withgoogle.com/
  ],
}}
```

### 🌍 Geocodificación

Si un negocio no tiene coordenadas, puedes agregarlas:

#### Opción 1: En el dashboard de admin
1. Editar negocio
2. Usar `AddressPicker.tsx` (ya integrado)
3. Buscar dirección y clickear en el mapa

#### Opción 2: Script de migración
```javascript
// scripts/geocodeBusinesses.js
const { db } = require('../firebaseConfig');
const axios = require('axios');

async function geocodeAddress(address) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Yajalón, Chiapas')}&key=${apiKey}`;
  
  const response = await axios.get(url);
  if (response.data.results[0]) {
    const location = response.data.results[0].geometry.location;
    return { lat: location.lat, lng: location.lng };
  }
  return null;
}

// Implementar lógica para actualizar negocios en Firestore
```

### 📱 Optimización Móvil

El componente está optimizado para móvil:
- Touch gestures para pan/zoom
- Controles grandes para dedos
- InfoWindow responsive
- Carga lazy del script de Google Maps

### 🎯 Testing

#### 1. Con API Key
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...

npm run dev
```

Visita un negocio con coordenadas → Deberías ver mapa interactivo

#### 2. Sin API Key
```bash
# Comenta la variable en .env.local
npm run dev
```

Deberías ver iframe fallback

#### 3. Sin Coordenadas
Edita un negocio en Firebase para quitar `location.lat/lng`
→ Deberías ver mensaje y botón de Google Maps

### 💰 Costos de Google Maps

**Gratis hasta:**
- 28,000 cargas de mapa al mes
- $200 USD de crédito mensual gratuito

**Después:**
- ~$7 USD por cada 1,000 cargas adicionales

**Recomendaciones:**
- Habilitar "Daily quota" en Google Cloud Console
- Configurar alertas de facturación
- Restringir API key a tu dominio

### 🔒 Seguridad

✅ API Key es pública (NEXT_PUBLIC_*) pero restringida:
- Solo funciona desde tu dominio
- Solo permite APIs específicas
- Tiene límites de uso

⚠️ **NO** incluyas API keys privadas en el código del cliente

### 🐛 Troubleshooting

**Mapa no carga:**
- Verifica que `NEXT_PUBLIC_GOOGLE_MAPS_KEY` esté en `.env.local`
- Reinicia el servidor de desarrollo
- Verifica en consola del navegador errores de Google Maps
- Verifica que las APIs estén habilitadas en Google Cloud Console

**"This page can't load Google Maps correctly":**
- API key inválida o sin permisos
- APIs no habilitadas en Google Cloud Console
- Restricciones de dominio muy estrictas

**Marcador no aparece:**
- Verifica que `business.location.lat` y `business.location.lng` existan
- Verifica que los valores sean números válidos
- Abre consola para ver errores

**InfoWindow no muestra logo:**
- Verifica que `business.logo` tenga una URL válida
- Verifica que la imagen sea accesible (CORS)

### 📚 Recursos

- [Google Maps JS API Docs](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Docs](https://react-google-maps-api-docs.netlify.app/)
- [Map Styling Wizard](https://mapstyle.withgoogle.com/)
- [Marker Customization](https://developers.google.com/maps/documentation/javascript/markers)

### 🎯 Próximos Pasos

- [ ] Geocodificar negocios existentes sin coordenadas
- [ ] Agregar cluster de marcadores (vista de múltiples negocios)
- [ ] Agregar rutas (directions API)
- [ ] Agregar búsqueda de negocios cercanos con Places API
- [ ] Optimizar para reducir llamadas a la API (cache)

---

**Estado:** ✅ Google Maps completamente integrado
**Falta:** Configurar API Key en producción
