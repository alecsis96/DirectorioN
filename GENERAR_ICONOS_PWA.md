# Guía para Generar Iconos PWA

## Iconos Requeridos

La PWA necesita iconos en los siguientes tamaños:

### Iconos Principales (Android/Chrome)
- `icon-72.png` - 72x72px
- `icon-96.png` - 96x96px
- `icon-128.png` - 128x128px
- `icon-144.png` - 144x144px (también para Windows)
- `icon-152.png` - 152x152px
- `icon-192.png` - 192x192px (mínimo requerido)
- `icon-384.png` - 384x384px
- `icon-512.png` - 512x512px (recomendado)

### Iconos iOS (Apple Touch Icons)
- `icon-152.png` - 152x152px (iPad)
- `icon-167.png` - 167x167px (iPad Pro)
- `icon-180.png` - 180x180px (iPhone)

### Badge Icon (para notificaciones)
- `badge-72.png` - 72x72px (monocromático)

### Splash Screens iOS
- `splash-2048x2732.png` - iPad Pro 12.9"
- `splash-1668x2388.png` - iPad Pro 11"
- `splash-1536x2048.png` - iPad
- `splash-1242x2688.png` - iPhone XS Max
- `splash-1125x2436.png` - iPhone X/XS
- `splash-828x1792.png` - iPhone XR
- `splash-750x1334.png` - iPhone 8

## Opción 1: Usar Herramienta Online

### PWA Asset Generator (Recomendado)
```bash
npm install -g pwa-asset-generator

# Genera todos los iconos y splash screens
pwa-asset-generator [tu-logo-original.png] ./public/images \
  --icon-only \
  --favicon \
  --type png \
  --padding "10%"

# Para splash screens
pwa-asset-generator [tu-logo-original.png] ./public/images \
  --splash-only \
  --type png \
  --background "#38761D"
```

### Sitios Web
1. **realfavicongenerator.net** - Genera todos los iconos necesarios
2. **favicon.io** - Generador simple
3. **simicart.com/manifest-generator.html** - PWA Manifest Generator

## Opción 2: Usar ImageMagick (Manual)

Si tienes un logo en alta resolución (preferiblemente SVG o PNG 1024x1024):

```bash
# Instalar ImageMagick
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# Convertir a diferentes tamaños
magick convert logo.png -resize 72x72 icon-72.png
magick convert logo.png -resize 96x96 icon-96.png
magick convert logo.png -resize 128x128 icon-128.png
magick convert logo.png -resize 144x144 icon-144.png
magick convert logo.png -resize 152x152 icon-152.png
magick convert logo.png -resize 167x167 icon-167.png
magick convert logo.png -resize 180x180 icon-180.png
magick convert logo.png -resize 192x192 icon-192.png
magick convert logo.png -resize 384x384 icon-384.png
magick convert logo.png -resize 512x512 icon-512.png

# Badge monocromático
magick convert logo.png -resize 72x72 -colorspace Gray badge-72.png
```

## Opción 3: Usar Photoshop/GIMP

1. Abre tu logo en Photoshop o GIMP
2. Crea un lienzo cuadrado (1024x1024px recomendado)
3. Exporta en cada tamaño necesario:
   - Archivo → Exportar → Exportar Como...
   - Selecciona PNG
   - Ajusta el tamaño
   - Guarda con el nombre correspondiente

## Opción 4: Script de Node.js con Sharp

Crea este archivo `generate-icons.js`:

\`\`\`javascript
const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const inputFile = './logo-original.png'; // Tu logo original

sizes.forEach(size => {
  sharp(inputFile)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toFile(`./public/images/icon-${size}.png`)
    .then(() => console.log(`Generated icon-${size}.png`))
    .catch(err => console.error(`Error generating icon-${size}.png:`, err));
});

// Badge monocromático
sharp(inputFile)
  .resize(72, 72)
  .greyscale()
  .toFile('./public/images/badge-72.png')
  .then(() => console.log('Generated badge-72.png'))
  .catch(err => console.error('Error generating badge:', err));
\`\`\`

Ejecuta:
```bash
npm install sharp
node generate-icons.js
```

## Splash Screens

Para los splash screens de iOS, necesitas:
1. Fondo de color sólido (#38761D)
2. Logo centrado
3. Tamaños específicos para cada dispositivo

Puedes usar: https://www.appicon.co/#app-icon para generarlos automáticamente.

## Verificación

Después de generar los iconos, verifica que:

1. ✅ Todos los archivos están en `public/images/`
2. ✅ Los tamaños son correctos
3. ✅ Los nombres coinciden con `manifest.json`
4. ✅ Formato PNG con transparencia (excepto badge)
5. ✅ Peso optimizado (usar tinypng.com si es necesario)

## Testing

1. **Chrome DevTools**:
   - Abre DevTools → Application → Manifest
   - Verifica que todos los iconos se muestren correctamente

2. **Lighthouse**:
   - Ejecuta un audit PWA
   - Verifica que pase las pruebas de iconos

3. **Dispositivos reales**:
   - Instala la PWA en Android
   - Instala la PWA en iOS
   - Verifica que los iconos se vean bien

## Recursos

- PWA Asset Generator: https://github.com/onderceylan/pwa-asset-generator
- Real Favicon Generator: https://realfavicongenerator.net/
- App Icon Generator: https://www.appicon.co/
- TinyPNG (optimización): https://tinypng.com/
- Google PWA Guidelines: https://web.dev/add-manifest/

## Nota Importante

⚠️ **Los archivos de iconos NO están incluidos en el repositorio Git**. Debes generar los iconos usando tu logo y colocarlos en `public/images/` antes de desplegar la aplicación.

Si no tienes un logo, puedes:
1. Crear uno con Canva
2. Usar un placeholder temporal
3. Contratar un diseñador

El color principal del directorio es: **#38761D** (verde)
