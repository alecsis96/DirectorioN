# PWA - Progressive Web App

## ✅ Implementación Completa

### 📋 Características Implementadas

1. **Manifest PWA** (`/public/manifest.json`)
   - ✅ Configuración de nombre, colores, iconos
   - ✅ Display standalone (pantalla completa)
   - ✅ Shortcuts (accesos rápidos)
   - ✅ Share target (recibir compartidos)
   - ✅ Categorías: business, local, directory

2. **Service Worker** (`/public/sw.js`)
   - ✅ Estrategia Network First para HTML
   - ✅ Estrategia Cache First para assets (imágenes, fuentes, CSS, JS)
   - ✅ Caché de páginas visitadas
   - ✅ Página offline personalizada
   - ✅ Actualización automática cada hora
   - ✅ Soporte para push notifications
   - ✅ Background sync

3. **Instalador PWA** (`/components/PWAInstaller.tsx`)
   - ✅ Detección automática de plataforma (iOS/Android)
   - ✅ Banner de instalación contextual
   - ✅ Instrucciones específicas para iOS
   - ✅ Botón de instalación para Android/Desktop
   - ✅ Recordatorio después de 30 segundos
   - ✅ Opción de "Ahora no" con localStorage
   - ✅ Detección de instalación exitosa

4. **Página Offline** (`/public/offline.html`)
   - ✅ Diseño atractivo y moderno
   - ✅ Verificación automática de conexión
   - ✅ Consejos útiles para el usuario
   - ✅ Botón para reintentar conexión
   - ✅ Auto-recarga cuando vuelve la conexión

5. **Metadatos** (`/app/layout.tsx`)
   - ✅ Link a manifest.json
   - ✅ Theme color
   - ✅ Apple touch icon
   - ✅ Apple mobile web app capable
   - ✅ Apple status bar style

### 🚀 Cómo Usar

#### 1. Desarrollo Local

```bash
npm run dev
```

Visita `https://localhost:3000` (HTTPS requerido para PWA)

#### 2. Probar Service Worker

1. Abre DevTools → Application → Service Workers
2. Verifica que el SW esté registrado y activo
3. Prueba el modo offline: Application → Service Workers → Offline

#### 3. Probar Instalación

**Android/Desktop (Chrome/Edge):**
- Después de 30 segundos aparecerá un banner
- O usa el menú del navegador: "Instalar app"

**iOS (Safari):**
- Toca el botón "Compartir" (cuadro con flecha)
- Selecciona "Añadir a pantalla de inicio"
- Toca "Añadir"

### 📱 Requisitos PWA

| Requisito | Estado | Descripción |
|-----------|--------|-------------|
| HTTPS | ✅ | Vercel provee HTTPS automático |
| Manifest | ✅ | `/public/manifest.json` |
| Service Worker | ✅ | `/public/sw.js` con fetch handler |
| Iconos | ⚠️ | Necesita 192x192 y 512x512 PNG |
| Offline | ✅ | Página offline + cache |
| Responsive | ✅ | Móvil first con Tailwind |

### 🎨 Generar Iconos

Necesitas crear 2 versiones del logo:

```
/public/images/icon-192.png   (192x192px)
/public/images/icon-512.png   (512x512px)
```

**Herramientas recomendadas:**
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- Photoshop/Figma/Canva

**Actualizar manifest.json:**
```json
"icons": [
  {
    "src": "/images/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/images/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

### 🧪 Testing PWA

#### 1. Lighthouse Audit

```bash
# Chrome DevTools
1. F12 → Lighthouse → Progressive Web App
2. Generate report
3. Verificar score 100%
```

**Criterios evaluados:**
- ✅ Manifest válido
- ✅ Service Worker registrado
- ✅ HTTPS
- ✅ Responsive
- ✅ Accesibilidad
- ✅ Splash screen
- ✅ Tema color

#### 2. Manual Testing

**Desktop:**
1. Instalar desde Chrome → ⋮ → Instalar app
2. Verificar que abre en ventana standalone
3. Probar offline mode (DevTools)

**Mobile:**
1. Android: Instalar desde menú de Chrome
2. iOS: Añadir a pantalla de inicio
3. Abrir desde home screen
4. Verificar splash screen
5. Probar sin conexión

### 📊 Métricas PWA

Puedes monitorear el uso de PWA:

```typescript
// En cualquier componente
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('App instalada como PWA');
  // Enviar a analytics
}
```

### 🔄 Actualizar Service Worker

Cuando hagas cambios en el SW:

1. Incrementa la versión en `sw.js`:
```javascript
const CACHE_NAME = 'directorio-yajalon-v2'; // v1 → v2
```

2. El SW se actualizará automáticamente en la próxima visita

3. O fuerza la actualización:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update();
});
```

### 🐛 Troubleshooting

**Service Worker no se registra:**
- Verifica HTTPS (localhost excluido)
- Revisa consola de errores
- Limpia caché: DevTools → Application → Clear storage

**Banner de instalación no aparece:**
- Espera 30 segundos
- Verifica que no esté instalada ya
- Revisa localStorage: `pwa-install-dismissed`
- Chrome: Debe cumplir criterios de instalabilidad

**Offline no funciona:**
- Verifica que SW esté activo
- Revisa estrategia de caché en `sw.js`
- Prueba con páginas ya visitadas

**iOS no muestra banner:**
- iOS no soporta `beforeinstallprompt`
- Banner muestra instrucciones manuales
- Usuario debe añadir manualmente

### 📚 Recursos

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox) (alternativa avanzada)

### 🎯 Próximos Pasos

1. **Generar iconos** de 192x192 y 512x512
2. **Deploy a producción** (Vercel)
3. **Lighthouse audit** en producción
4. **Analytics** para rastrear instalaciones
5. **Push notifications** (opcional)
6. **Background sync** para envíos offline (opcional)

---

**Estado:** ✅ PWA completamente implementada
**Falta:** Generar iconos PNG del logo
