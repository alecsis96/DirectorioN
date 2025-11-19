import type { Metadata } from 'next';

import NegociosListClient from '../../components/NegociosListClient';
import { FavoritesProvider } from '../../context/FavoritesContext';
import type { Business, BusinessPreview } from '../../types/business';
import { pickBusinessPreview } from '../../types/business';
import { fetchBusinesses, toNumber } from '../../lib/server/businessData';
import { findBusinessesNear } from '../../lib/firestore/search';
import { COLONIAS_MAP, inferColoniaFromAddress, normalizeColonia } from '../../lib/helpers/colonias';
import { DEFAULT_FILTER_STATE, DEFAULT_ORDER, type Filters, type SortMode } from '../../lib/negociosFilters';

export const metadata: Metadata = {
  title: 'Directorio de Negocios en Yajalón - Tu Guía Completa de Comercios Locales',
  description: 'Descubre, compara y conecta con los mejores negocios de Yajalón. Encuentra restaurantes, tiendas, servicios profesionales y más cerca de ti. Directorio completo con reseñas, ubicaciones y contactos.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Directorio de Negocios en Yajalón',
    description: 'Tu guía completa de comercios locales en Yajalón. Encuentra lo que buscas cerca de ti.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

type SearchParams = {
  c?: string;
  co?: string;
  o?: string;
  p?: string;
  q?: string;
  lat?: string;
  lng?: string;
  radius?: string;
};

async function buildBusinessesResult(params: SearchParams) {
  const category = typeof params.c === 'string' ? params.c : '';
  const coloniaRaw = typeof params.co === 'string' ? params.co : '';
  const colonia = normalizeColonia(coloniaRaw);
  const orderParam = typeof params.o === 'string' ? (params.o as SortMode) : DEFAULT_ORDER;
  const order: SortMode = ['destacado', 'rating', 'az'].includes(orderParam) ? orderParam : DEFAULT_ORDER;
  const pageParam = Number.parseInt(typeof params.p === 'string' ? params.p : '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const query = typeof params.q === 'string' ? params.q.slice(0, 80) : '';
  const lat = typeof params.lat === 'string' ? Number.parseFloat(params.lat) : undefined;
  const lng = typeof params.lng === 'string' ? Number.parseFloat(params.lng) : undefined;
  const radiusParam = typeof params.radius === 'string' ? Number.parseFloat(params.radius) : undefined;
  const radius = Number.isFinite(radiusParam) && radiusParam! > 0 ? radiusParam! : 5;

  let allBusinesses: Business[] = [];
  let error: string | null = null;

  const hasGeoParams = Number.isFinite(lat) && Number.isFinite(lng);
  if (hasGeoParams) {
    try {
      allBusinesses = await findBusinessesNear(lat!, lng!, radius);
    } catch (geoError) {
      console.error('[home] geosearch failed', geoError);
      error = 'No pudimos filtrar por ubicación, mostrando todos los negocios.';
      allBusinesses = await fetchBusinesses();
    }
  } else {
    allBusinesses = await fetchBusinesses();
  }

  const labelByNorm = new Map<string, string>();
  for (const { label, normalized } of COLONIAS_MAP) {
    if (normalized && !labelByNorm.has(normalized)) {
      labelByNorm.set(normalized, label);
    }
  }
  for (const biz of allBusinesses) {
    const raw = biz.colonia || (biz as any).neighborhood || '';
    const norm = normalizeColonia(raw);
    if (norm && !labelByNorm.has(norm)) {
      labelByNorm.set(norm, raw);
    }
  }

  const colonias = Array.from(labelByNorm.values()).sort((a, b) => a.localeCompare(b, 'es'));
  const categorySet = new Set<string>();
  for (const biz of allBusinesses) {
    if (typeof biz.category === 'string' && biz.category.trim()) {
      categorySet.add(biz.category.trim());
    }
  }
  const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'es'));

  const businesses: BusinessPreview[] = allBusinesses.map((biz) => {
    const preview = pickBusinessPreview(biz as Business);
    let resolvedColonia = normalizeColonia(preview.colonia);
    if (!resolvedColonia) {
      resolvedColonia = inferColoniaFromAddress(preview.address);
    }
    const displayColonia = resolvedColonia ? labelByNorm.get(resolvedColonia) || preview.colonia : preview.colonia;

    return {
      ...preview,
      colonia: displayColonia,
      rating: toNumber(preview.rating) ?? null,
    };
  });

  const filters: Filters = {
    category,
    colonia,
    order,
    page,
    query,
  };

  const geoQuery = hasGeoParams
    ? {
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
      }
    : null;

  return {
    businesses,
    categories,
    colonias,
    filters,
    error,
    geoQuery,
  };
}

export default async function NegociosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedParams = (await searchParams) ?? {};
  const { businesses, categories, colonias, filters, error, geoQuery } = await buildBusinessesResult(resolvedParams);

  return (
    <FavoritesProvider>
      <NegociosListClient
        businesses={businesses}
        categories={categories}
        colonias={colonias}
        initialFilters={filters ?? DEFAULT_FILTER_STATE}
        initialError={error}
        geoQuery={geoQuery}
      />
    </FavoritesProvider>
  );
}
