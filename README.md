# Directorio de Negocios

Este proyecto es un directorio moderno de negocios con las siguientes caractersticas:

- Buscador y filtros avanzados
- Vista previa de cada negocio con datos bsicos (telfono, ubicacin, horario, precios)
- Mapa interactivo con ubicaciones
- Favoritos (localStorage)
- Reseas y calificaciones
- Responsive y accesible
- Paginacin/scroll infinito
- SEO bsico
- Los negocios se cargan desde un Google Sheet
- Formulario para que los usuarios soliciten registrar su negocio

## Google Sheet
Los negocios se obtienen desde:
https://docs.google.com/spreadsheets/d/e/2PACX-1vR6GXWtda697t29fnUQtwT8u7f4ypU1VH0wmiH9J2GS280NrSKd8L_PWUVVgEPgq8Is1lYgD26bxAoT/pub?output=csv

## Tecnologas
- Next.js
- React
- Tailwind CSS
- Google Maps/Leaflet
- LocalStorage
- Google Sheets API

## Estructura sugerida
- `/pages/index.tsx` (principal)
- `/components/BusinessList.tsx` (listado y filtros)
- `/components/BusinessCard.tsx` (vista previa)
- `/components/BusinessMap.tsx` (mapa)
- `/components/Favorites.tsx` (favoritos)
- `/components/ReviewSection.tsx` (reseas)
- `/components/RegisterForm.tsx` (formulario de registro)

## Instalacin
1. Instala dependencias:
   ```sh
   npm install
   ```
2. Ejecuta el proyecto:
   ```sh
   npm run dev
   ```

## Personaliza
- Cambia el Google Sheet por el tuyo si lo necesitas.
- Ajusta los estilos y componentes segn tu marca.

---

Listo para comenzar?

## Notificaciones del asistente
- Las solicitudes del asistente y el formulario usan la ruta `/api/businesses/submit` en Next.js.
- Configura `SLACK_WEBHOOK_URL` (o `NOTIFY_WEBHOOK_URL`) en `.env.local` para recibir alertas.
- Ediciones del dashboard se envan a `/api/businesses/update`, que valida el token y el ownership antes de guardar.
- Para aprobar/rechazar solicitudes usa `/api/admin/applications/update` con un ID token administrativo (`admin: true`). Ejemplo cURL:
  ```sh
  curl -X POST https://tu-dominio/api/admin/applications/update \
    -H "Authorization: Bearer TOKEN_ADMIN" \
    -H "Content-Type: application/json" \
    -d '{"uid":"UID_DEL_USUARIO","status":"approved"}'
  ```
- Ejecuta `FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)" node scripts/setAdmin.js <uid-o-email>` para otorgar el claim `admin`.

## Siguientes pasos sugeridos
- **Lint automatizado**: con `npm run lint` puedes validar la base antes del build; integra este comando en tu pipeline CI/CD.
- **Pruebas de horarios y paginacion**: agrega tests (Jest/Vitest) para `components/BusinessHours` y la logica de paginacion en `pages/negocios/index.tsx` (filtros + save-data) para prevenir regresiones.
- **Telemetria opcional**: los eventos `home_render` y `detail_render` hoy se envian a la consola; si necesitas metricas historicas, envia estos datos a un endpoint seguro o permite desactivarlos via variable de entorno.
