import { getAdminFirestore } from "./firebaseAdmin";
import type { Business } from "../../types/business";

const SHEET_URL =
  process.env.NEXT_PUBLIC_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6GXWtda697t29fnUQtwT8u7f4ypU1VH0wmiH9J2GS280NrSKd8L_PWUVVgEPgq8Is1lYgD26bxAoT/pub?output=csv";

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

  // Incluir horarios estructurados si existen
  if (data.horarios && typeof data.horarios === 'object') {
    business.horarios = data.horarios;
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

  if (lat !== null && lat !== undefined) {
    business.lat = lat;
    business.latitude = lat;
  }
  if (lng !== null && lng !== undefined) {
    business.lng = lng;
    business.longitude = lng;
  }
  if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
    business.location = { lat, lng };
  }

  return business;
}

export async function fetchBusinesses(): Promise<Business[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("businesses").where("status", "==", "approved").get();
    if (!snap.empty) {
      return snap.docs.map((doc) => normalizeBusiness(doc.data(), doc.id));
    }
  } catch (error) {
    console.warn("[businessData] Firestore fallback", error);
  }

  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error(`Sheet request failed with ${response.status}`);
    const csv = await response.text();
    const [headerLine, ...rows] = csv.split("\n").filter((line) => line.trim().length);
    if (!headerLine) return [];
    const headers = headerLine.split(",").map((h) => h.trim());
    return rows.map((line, index) => {
      const values = line.split(",");
      const data: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        data[header] = values[i]?.trim();
      });
      return normalizeBusiness(data, data.id ? String(data.id) : `sheet-${index}`);
    });
  } catch (error) {
    console.error("[businessData] CSV fallback failed", error);
    return [];
  }
}
