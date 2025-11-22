// lib/firestore/reviews.ts
import { z } from "zod";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  orderBy,
  limit,
  query,
} from "firebase/firestore";

export const ReviewSchema = z.object({
  name: z.string().min(2).max(60),
  text: z.string().min(10).max(300),
  rating: z.number().min(1).max(5),
});

export type ReviewInput = z.infer<typeof ReviewSchema>;

export async function upsertReview(
  db: any,
  businessId: string,
  uid: string,
  payload: ReviewInput
) {
  const data = ReviewSchema.parse(payload);
  // Un doc por usuario: evita duplicados y facilita reglas
  const ref = doc(db, "businesses", businessId, "reviews", uid);
  await setDoc(
    ref,
    {
      ...data,
      userId: uid,
      businessId,
      approved: true, // Por defecto aprobada (admin puede cambiar)
      // created será set la primera vez; updated siempre
      created: serverTimestamp(),
      updated: serverTimestamp(),
    },
    { merge: true }
  );
}

export function reviewsQuery(db: any, businessId: string) {
  // Solo reseñas aprobadas (las reglas ya filtran esto)
  return query(
    collection(db, "businesses", businessId, "reviews"),
    orderBy("created", "desc"),
    limit(50)
  );
}
