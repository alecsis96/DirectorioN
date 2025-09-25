# Copilot Instructions for Directorio de Negocios

## Project Overview
- This is a modern business directory built with Next.js, React, and Tailwind CSS.
- Data for businesses is loaded from a public Google Sheet (CSV).
- Features include advanced search/filter, favorites (localStorage), reviews (Firebase), map integration, responsive UI, and business registration.

## Architecture & Data Flow
- Main entry: `pages/index.tsx` renders the homepage and dynamic ad banner.
- Business listing, filtering, and modal logic: `components/BusinessList.tsx`.
- Individual business preview cards: `components/BusinessCard.tsx`.
- Modal with details, image carousel, reviews, and actions: `components/BusinessModal.tsx`.
- Map placeholder/component: `components/BusinessMap.tsx` (can be replaced with Google Maps/Leaflet).
- Favorites logic: `components/Favorites.tsx` (uses localStorage, keyed by business name/id).
- Review system: `components/ReviewSection.tsx` (local state or Firebase, depending on context).
- Registration form: `components/RegisterForm.tsx`.
- Firebase config: `firebaseConfig.ts` (Firestore/Auth for reviews).

## Key Patterns & Conventions
- Data is fetched from Google Sheets as CSV, parsed in `BusinessList.tsx`.
- Business images: If no image is present, use a generic placeholder (`https://via.placeholder.com/400x300?text=Sin+imagen`).
- Favorites are stored in localStorage and synced on load.
- Filtering and sorting are memoized for performance (`React.useMemo`).
- Modal uses scroll and responsive layout for mobile/desktop.
- Reviews: Only authenticated users can post/edit/delete; one review per user per business.
- All icons use `react-icons` (import at top, avoid dynamic require).
- Use Tailwind for all styling; prefer utility classes over custom CSS.
- Map is a placeholder; integration with Google Maps/Leaflet is optional.

## Developer Workflows
- Install dependencies: `npm install`
- Run locally: `npm run dev`
- Build for production: `npm run build`
- Push changes to GitHub: `git add . ; git commit -m "msg" ; git push`
- If branch has no upstream: `git push --set-upstream origin master`
- Firebase setup: Add your config to `firebaseConfig.ts` and ensure Firestore rules allow reviews.

## Examples
- To add a new business field, update the Google Sheet and ensure parsing in `BusinessList.tsx`.
- To change the review logic, edit `BusinessModal.tsx` (for modal reviews) or `ReviewSection.tsx` (for page reviews).
- To customize the modal, edit layout/styles in `BusinessModal.tsx`.

## Integration Points
- Google Sheets: CSV fetch in `BusinessList.tsx`.
- Firebase: Firestore/Auth in `firebaseConfig.ts` and review logic in `BusinessModal.tsx`.
- LocalStorage: Favorites in `BusinessList.tsx` and `Favorites.tsx`.

## Project-Specific Advice
- Always memoize filtered/sorted lists for performance.
- Use generic images for missing business photos.
- Keep all UI logic in components; avoid global state unless necessary.
- Follow the file structure for new features/components.

---
If any section is unclear or missing, please provide feedback to improve these instructions.
