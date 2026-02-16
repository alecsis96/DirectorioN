import { getAdminFirestore } from "./firebaseAdmin";
import type { Business } from "../../types/business";
import { resolveCategory } from "../categoriesCatalog";

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asString(value: any, fallback: string = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length ? str : fallback;
}

export function normalizeBusiness(data: any, id: string): Business {
  const lat = toNumber(data.lat ?? data.latitude ?? data.location?.lat);
  const lng = toNumber(data.lng ?? data.longitude ?? data.location?.lng);
  const featuredRaw = data.featured;
  const isOpenRaw = data.isOpen;
  const resolvedCategory = resolveCategory(
    asString(data.categoryId || data.categoryName || data.category || data.categoria)
  );

  const business: Business = {
    id,
    name: asString(data.name ?? data.Nombre, "Negocio sin nombre"),
    category: resolvedCategory.categoryName,
    categoryId: asString(data.categoryId) || resolvedCategory.categoryId,
    categoryName: data.categoryName || resolvedCategory.categoryName,
    categoryGroupId: data.categoryGroupId || resolvedCategory.groupId,
    description: asString(data.description ?? data.descripcion),
    address: asString(data.address ?? data.direccion),
    phone: asString(data.phone ?? data.telefono),
    WhatsApp: asString(data.WhatsApp ?? data.whatsapp),
    Facebook: asString(data.Facebook ?? data.facebook),
    price: asString(data.price ?? data.precio),
    rating: toNumber(data.rating) ?? 0,
    isOpen: String(isOpenRaw ?? "si").toLowerCase() === "no" ? "no" : "si",
    featured:
      String(featuredRaw ?? "").toLowerCase() === "si" || featuredRaw === true ? "si" : "no",
    hours: asString(data.hours ?? data.horario),
    images: [],
  };

  const planValue = data.plan;
  if (planValue === 'featured' || planValue === 'sponsor') {
    business.plan = planValue;
  } else {
    business.plan = 'free';
  }

  const priceRangeValue = asString(data.priceRange);
  if (priceRangeValue) {
    business.priceRange = priceRangeValue;
  }

  if (data.horarios && typeof data.horarios === "object") {
    try {
      business.horarios = JSON.parse(JSON.stringify(data.horarios));
    } catch {
      business.horarios = undefined;
    }
  }

  const coloniaValue = asString(data.colonia ?? data.neighborhood ?? data.coloniaNombre);
  if (coloniaValue) business.colonia = coloniaValue;

  const neighborhoodValue = asString(data.neighborhood ?? data.colonia);
  if (neighborhoodValue) business.neighborhood = neighborhoodValue;

  const image1 = asString(data.image1 ?? data.imagen1);
  if (image1) business.image1 = image1;
  const image2 = asString(data.image2 ?? data.imagen2);
  if (image2) business.image2 = image2;
  const image3 = asString(data.image3 ?? data.imagen3);
  if (image3) business.image3 = image3;

  const logoUrl = asString(data.logoUrl);
  if (logoUrl) business.logoUrl = logoUrl;

  const coverUrl = asString(data.coverUrl);
  if (coverUrl) business.coverUrl = coverUrl;

  if (data.hasEnvio === true) {
    business.hasEnvio = true;
  }

  if (Array.isArray(data.images) && data.images.length) {
    business.images = data.images
      .filter((img: any) => img && img.url)
      .map((img: any) => ({
        url: String(img.url),
        ...(img.publicId ? { publicId: String(img.publicId) } : {}),
      }));
  }

  const ownerCandidate = asString(data.ownerId);
  if (ownerCandidate) business.ownerId = ownerCandidate;

  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    business.location = { lat, lng };
  } else {
    business.location = null;
  }

  return business;
}

export interface PaginatedBusinesses {
  businesses: Business[];
  nextId: string | null;
  hasMore: boolean;
}

type CacheEntry = {
  data: PaginatedBusinesses;
  expiresAt: number;
};

const BUSINESS_CACHE = new Map<string, CacheEntry>();
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const CACHE_TTL_MS = 60_000;

export async function fetchBusinesses(
  limit: number = DEFAULT_LIMIT,
  lastId?: string
): Promise<PaginatedBusinesses> {
  try {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const cacheKey = `${safeLimit}:${lastId ?? 'first'}`;
    const cached = BUSINESS_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const db = getAdminFirestore();
    const snap = await db
      .collection("businesses")
      .where("businessStatus", "==", "published")
      .get();

    // Filtrar solo negocios activos y visibles
    let allDocs = snap.docs.filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      const visibility = data.visibility || 'published';
      
      // Solo incluir: adminStatus='active' y visibility='published'
      return adminStatus === 'active' && visibility === 'published';
    });
    
    allDocs.sort((a, b) => {
      const nameA = String(a.data().name || '').toLowerCase();
      const nameB = String(b.data().name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });

    if (lastId) {
      const lastIndex = allDocs.findIndex(doc => doc.id === lastId);
      if (lastIndex !== -1) {
        allDocs = allDocs.slice(lastIndex + 1);
      }
    }

    const pagedDocs = allDocs.slice(0, safeLimit);
    const businesses = pagedDocs.map((doc) => normalizeBusiness(doc.data(), doc.id));

    const nextId = pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1].id : null;
    const hasMore = allDocs.length > safeLimit;

    const response = {
      businesses,
      nextId,
      hasMore
    };

    BUSINESS_CACHE.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  } catch (error) {
    console.error("[businessData] Error fetching from Firestore:", error);
    return {
      businesses: [],
      nextId: null,
      hasMore: false
    };
  }
}

/**
 * Reorganiza los negocios para poner patrocinados primero, luego destacados, luego el resto.
 */
export function sortBusinessesWithSponsors(businesses: Business[]): Business[] {
  const sponsors = businesses.filter((biz) => biz.plan === 'sponsor');
  const featured = businesses.filter((biz) => biz.plan === 'featured' || biz.featured === true || biz.featured === 'true');
  const others = businesses.filter((biz) => !sponsors.includes(biz) && !featured.includes(biz));
  return [...sponsors, ...featured, ...others];
}
