# Copilot Instructions for Directorio de Negocios

## Project Overview
- This is a modern business directory built with Next.js, React, and Tailwind CSS.
- Data for businesses is stored and loaded from Firebase Firestore.
- Features include advanced search/filter, favorites (localStorage), reviews (Firebase), map integration, responsive UI, and business registration with approval workflow.

## Architecture & Data Flow
- Main entry: `app/page.tsx` renders the homepage with premium/featured businesses.
- Business listing: `app/negocios/page.tsx` with filtering and search.
- Individual business preview cards: `components/BusinessCard.tsx`.
- Business detail modal: `components/BusinessModalWrapper.tsx` and `components/BusinessDetailView.tsx`.
- Map component: `components/BusinessMapComponent.tsx` (Google Maps integration).
- Favorites logic: `components/FavoritosClient.tsx` (uses localStorage and context).
- Review system: Integrated in `BusinessDetailView.tsx` (Firebase Firestore).
- Registration form: `components/BusinessWizard.tsx` (multi-step wizard).
- Business dashboard: `components/DashboardEditor.tsx` (owner editing interface).
- Firebase config: `firebaseConfig.ts` and `lib/server/firebaseAdmin.ts`.

## Key Patterns & Conventions
- Data is fetched from Firestore using `fetchBusinesses()` in `lib/server/businessData.ts`.
- Only businesses with `status: 'published'` appear publicly in home and /negocios.
- Business approval workflow: pending → draft → review → published.
- Business images: If no image is present, use a generic placeholder.
- Favorites are stored in localStorage and synced via FavoritesContext.
- Filtering and sorting are memoized for performance (`React.useMemo`).
- Reviews: Only authenticated users can post/edit/delete; one review per user per business.
- All icons use `react-icons` (import at top, avoid dynamic require).
- Use Tailwind for all styling; prefer utility classes over custom CSS.

## Developer Workflows
- Install dependencies: `npm install`
- Run locally: `npm run dev`
- Build for production: `npm run build`
- Push changes to GitHub: `git add . ; git commit -m "msg" ; git push`
- If branch has no upstream: `git push --set-upstream origin master`
- Firebase setup: Configure environment variables in `.env.local` and ensure Firestore rules are deployed.

## Examples
- To add a new business field, update the Business type in `types/business.ts` and adjust normalization in `businessData.ts`.
- To change the review logic, edit the review section in `BusinessDetailView.tsx`.
- To customize business modals, edit `BusinessModalWrapper.tsx` or `BusinessDetailView.tsx`.

## Integration Points
- Firebase Firestore: Business data, reviews, applications stored in `businesses`, `reviews`, `applications` collections.
- Firebase Auth: User authentication for reviews and business ownership.
- LocalStorage: Favorites in `FavoritesContext.tsx`.
- Google Maps: Map integration in `BusinessMapComponent.tsx`.

## Project-Specific Advice
- Always memoize filtered/sorted lists for performance.
- Use generic images for missing business photos.
- Keep all UI logic in components; avoid global state unless necessary.
- Follow the file structure for new features/components.
- Respect the status-based workflow for business approvals.

## Project-Specific Advice
- Always memoize filtered/sorted lists for performance.
- Use generic images for missing business photos.
- Keep all UI logic in components; avoid global state unless necessary.
- Follow the file structure for new features/components.

---
If any section is unclear or missing, please provide feedback to improve these instructions.
