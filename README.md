# Directorio de Negocios en Yajalón

Directorio moderno de negocios con las siguientes características:

- 🔍 **Búsqueda instantánea con debounce** - Resultados automáticos mientras escribes
- 🎯 **Filtros avanzados** - Por categoría, colonia, calificación, delivery, estado (abierto/cerrado)
- 📍 **Geolocalización** - Encuentra negocios cercanos a tu ubicación
- ⭐ **Sistema de favoritos** - Guarda tus negocios preferidos (localStorage)
- 💳 **Sistema de pagos con Stripe** - Planes gratuitos, destacados y patrocinados
- 👤 **Dashboard para dueños** - Edita información, horarios e imágenes de tu negocio
- 👑 **Panel de administración** - Gestión de negocios, pagos y solicitudes
- 📧 **Notificaciones automáticas** - Emails para recordatorios de pago
- 📱 **Completamente responsive** - Diseño adaptado a móvil, tablet y desktop
- 🎨 **Íconos profesionales** - React Icons para mejor identidad visual
- 🚀 **SEO optimizado** - Metadata, sitemap y OpenGraph configurados

## Tecnologías

- **Framework**: Next.js 16.0.3 (App Router + Server Components)
- **UI**: React 19, Tailwind CSS, react-icons
- **Backend**: Firebase (Firestore, Auth, Cloud Functions, Storage)
- **Pagos**: Stripe (Checkout, Webhooks, Subscripciones)
- **Almacenamiento de imágenes**: Cloudinary
- **Mapas**: Google Maps API
- **Estado**: Context API (FavoritesContext)
- **TypeScript**: Tipado estricto en todo el proyecto

## Estructura del Proyecto

```
app/                          # Next.js App Router
├── negocios/                 # Listado de negocios
├── dashboard/                # Panel del dueño del negocio
├── admin/                    # Panel administrativo
│   ├── payments/            # Gestión de pagos
│   ├── businesses/          # Negocios publicados
│   └── applications/        # Solicitudes pendientes
├── registro-negocio/        # Formulario de registro
└── api/                     # API Routes

components/                   # Componentes React
├── Navigation.tsx           # Navbar con búsqueda instantánea
├── NegociosListClient.tsx   # Lista de negocios con filtros
├── BusinessCard.tsx         # Tarjeta de negocio
├── BusinessDetailView.tsx   # Vista detallada con modal
├── DashboardEditor.tsx      # Editor del dashboard
├── BusinessWizard.tsx       # Wizard de registro
├── PaymentManager.tsx       # Gestión de pagos (admin)
└── ...

lib/                         # Utilidades y helpers
├── server/                  # Server-side utilities
├── firestore/              # Operaciones de Firestore
└── helpers/                # Funciones auxiliares

types/                       # TypeScript types
└── business.ts             # Tipos de Business y BusinessPreview
```

## Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/alecsis96/DirectorioN.git
   cd DirectorioBussines
   ```

2. **Instala dependencias**
   ```bash
   npm install
   ```

3. **Configura variables de entorno**
   
   Crea un archivo `.env.local` con:
   ```env
   # Firebase Client
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   
   # Firebase Admin (Server-side)
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   
   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   
   # Cloudinary
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   
   # Google Maps
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
   
   # Notificaciones (opcional)
   SLACK_WEBHOOK_URL=
   ```

4. **Ejecuta en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abre en el navegador**
   ```
   http://localhost:3000
   ```

## Características Principales

### 🔍 Búsqueda Instantánea
- Búsqueda con debounce de 500ms
- Busca en nombre, categoría, dirección, descripción, teléfono, WhatsApp y colonia
- Actualización automática de resultados sin recargar la página
- Sugerencias con autocompletado

### 💳 Sistema de Pagos
- **Plan Gratuito**: Listado básico
- **Plan Destacado** ($299/mes): Badge destacado, mejor posicionamiento
- **Plan Patrocinado** ($499/mes): Máxima visibilidad, aparece primero

### 👑 Panel de Administración
- Gestión de negocios (deshabilitar, habilitar, eliminar)
- Control de pagos y suscripciones
- Recordatorios automáticos de pago
- Revisión de solicitudes pendientes

### 📱 Responsive Design
- Navegación adaptada a móvil y desktop
- Tarjetas optimizadas para diferentes tamaños de pantalla
- Modales y formularios mobile-friendly

## Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm start            # Servidor de producción
npm run lint         # Linter ESLint
npm run verify-env   # Verificar variables de entorno
```

## Despliegue

Consulta `DEPLOY_GUIDE.md` para instrucciones completas de despliegue en Vercel.

### Configuración de Admin

Para otorgar permisos de administrador:

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" node scripts/setAdmin.js usuario@email.com
```

## Documentación Adicional

- `DEPLOY_GUIDE.md` - Guía completa de despliegue
- `SETUP_EMAILS.md` - Configuración de notificaciones por email
- `FLUJO_REGISTRO.md` - Flujo de registro de negocios
- `FLUJO_APROBACION.md` - Proceso de aprobación
- `SECURITY.md` - Consideraciones de seguridad
- `TESTING_GUIDE.md` - Guía de pruebas

## 🚀 Estado del Proyecto

✅ **Listo para Producción**

- Sistema de pagos implementado
- Búsqueda instantánea funcional
- Panel de administración completo
- Sistema de notificaciones activo
- SEO optimizado
- Responsive y accesible

## Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y está destinado exclusivamente para el Directorio de Negocios en Yajalón.

---

**Desarrollado con ❤️ para la comunidad de Yajalón, Chiapas**
