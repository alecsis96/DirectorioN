import { getAdminFirestore } from "../server/firebaseAdmin";
import type { Business } from "../../types/business";

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export async function findBusinessesNear(lat: number, lng: number, radiusInKm: number): Promise<Business[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || radiusInKm <= 0) {
    return [];
  }

  const db = getAdminFirestore();
  const snapshot = await db
    .collection("businesses")
    .where("location", "!=", null)
    .get();

  const results: Business[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const location = data.location as { lat?: number; lng?: number } | undefined;
    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") return;

    const distance = distanceInKm(lat, lng, location.lat, location.lng);
    if (distance <= radiusInKm) {
      results.push({ id: doc.id, ...(data as Business) });
    }
  });

  return results;
}
