import { getAdminFirestore } from "./firebaseAdmin";
import type { Business } from "../../types/business";

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

  const business: Business = {
    id,
    name: asString(data.name ?? data.Nombre, "Negocio sin nombre"),
    category: asString(data.category ?? data.categoria),
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

  // Incluir plan si existe (free, featured, sponsor)
  const planValue = data.plan;
  if (planValue === 'featured' || planValue === 'sponsor') {
    business.plan = planValue;
  } else {
    business.plan = 'free';
  }

  // Incluir priceRange si existe
  const priceRangeValue = asString(data.priceRange);
  if (priceRangeValue) {
    business.priceRange = priceRangeValue;
  }

  // Incluir horarios estructurados si existen
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

  // Incluir logoUrl si existe
  const logoUrl = asString(data.logoUrl);
  if (logoUrl) business.logoUrl = logoUrl;

  // Incluir coverUrl si existe
  const coverUrl = asString(data.coverUrl);
  if (coverUrl) business.coverUrl = coverUrl;

  // Incluir hasDelivery si existe
  if (data.hasDelivery === true) {
    business.hasDelivery = true;
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

export async function fetchBusinesses(
  limit: number = 1000,
  lastId?: string
): Promise<PaginatedBusinesses> {
  try {
    const db = getAdminFirestore();
    
    // Obtener todos los negocios publicados sin orderBy para evitar índice compuesto
    // El ordenamiento se hace en memoria después
    const snap = await db
      .collection("businesses")
      .where("status", "==", "published")
      .get();
    
    let allDocs = snap.docs;
    
    // Ordenar en memoria por nombre
    allDocs.sort((a, b) => {
      const nameA = String(a.data().name || '').toLowerCase();
      const nameB = String(b.data().name || '').toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });
    
    // Aplicar paginación por cursor si se proporciona lastId
    if (lastId) {
      const lastIndex = allDocs.findIndex(doc => doc.id === lastId);
      if (lastIndex !== -1) {
        allDocs = allDocs.slice(lastIndex + 1);
      }
    }
    
    // Aplicar límite
    const pagedDocs = allDocs.slice(0, limit);
    const businesses = pagedDocs.map((doc) => normalizeBusiness(doc.data(), doc.id));
    
    // Determinar si hay más resultados
    const nextId = pagedDocs.length > 0 ? pagedDocs[pagedDocs.length - 1].id : null;
    const hasMore = allDocs.length > limit;
    
    return {
      businesses,
      nextId,
      hasMore
    };
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
 * Reorganiza los negocios para poner hasta 3 patrocinados al inicio (con rotación aleatoria)
 * seguidos del resto de negocios ordenados por rating.
 */
export function sortBusinessesWithSponsors(businesses: Business[]): Business[] {
  // Separar patrocinados y el resto
  const sponsored = businesses.filter(b => b.plan === 'sponsor');
  const others = businesses.filter(b => b.plan !== 'sponsor');
  
  // Si hay más de 3 patrocinados, seleccionar 3 al azar
  let selectedSponsored: Business[] = [];
  if (sponsored.length > 3) {
    // Rotación aleatoria: shuffle y tomar los primeros 3
    const shuffled = [...sponsored].sort(() => Math.random() - 0.5);
    selectedSponsored = shuffled.slice(0, 3);
  } else {
    selectedSponsored = sponsored;
  }
  
  // Ordenar el resto por rating (destacados primero, luego por rating)
  const sortedOthers = others.sort((a, b) => {
    // Priorizar destacados
    if (a.plan === 'featured' && b.plan !== 'featured') return -1;
    if (a.plan !== 'featured' && b.plan === 'featured') return 1;
    // Luego por rating
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  
  // Retornar patrocinados primero, luego el resto
  return [...selectedSponsored, ...sortedOthers];
}
