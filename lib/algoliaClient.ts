/**
 * Algolia Search Client
 * Motor de búsqueda dedicado para el directorio de negocios
 */

import { algoliasearch } from 'algoliasearch';
import type { SearchClient } from 'algoliasearch';

// Validar variables de entorno
if (!process.env.NEXT_PUBLIC_ALGOLIA_APP_ID) {
  console.warn('⚠️ NEXT_PUBLIC_ALGOLIA_APP_ID no configurado');
}

if (!process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_ALGOLIA_SEARCH_KEY no configurado');
}

// Cliente público para búsquedas (solo lectura)
export const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'dummy',
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || 'dummy'
);

// Cliente admin para indexación (solo servidor)
export const getAdminClient = () => {
  if (!process.env.ALGOLIA_ADMIN_KEY) {
    throw new Error('ALGOLIA_ADMIN_KEY no configurado');
  }

  return algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY
  );
};

// Nombre del índice principal
export const ALGOLIA_INDEX_NAME = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'businesses';

// Configuración de índice
export const INDEX_SETTINGS = {
  searchableAttributes: [
    'name',
    'category',
    'description',
    'colonia',
    'address',
  ],
  attributesForFaceting: [
    'filterOnly(status)',
    'searchable(category)',
    'searchable(colonia)',
    'searchable(plan)',
    'filterOnly(isPremium)',
    'filterOnly(isFeatured)',
  ],
  customRanking: [
    'desc(isPremium)',
    'desc(isFeatured)',
    'desc(rating)',
    'desc(reviewCount)',
  ],
  ranking: [
    'typo',
    'geo',
    'words',
    'filters',
    'proximity',
    'attribute',
    'exact',
    'custom',
  ],
  attributesToRetrieve: [
    'objectID',
    'name',
    'description',
    'category',
    'colonia',
    'address',
    'phone',
    'whatsapp',
    'facebook',
    'images',
    'logo',
    'coverUrl',
    'rating',
    'isPremium',
    'isFeatured',
    'hours',
    'horarios',
    'plan',
  ],
  attributesToHighlight: ['name', 'description', 'category'],
  hitsPerPage: 20,
  maxValuesPerFacet: 100,
  removeWordsIfNoResults: 'lastWords',
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,
  allowTyposOnNumericTokens: false,
  ignorePlurals: true,
  queryLanguages: ['es'],
};
