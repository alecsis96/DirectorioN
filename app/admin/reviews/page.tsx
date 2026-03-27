import { Suspense } from 'react';

import ReviewsModerationClient from '../../../components/ReviewsModerationClient';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';

export const metadata = {
  title: 'Moderacion de resenas | Admin',
  description: 'Panel admin para moderar resenas de negocios',
};

type ReviewData = {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  name: string;
  text: string;
  rating: number;
  created: string;
  updated?: string;
  approved?: boolean;
};

async function fetchAllReviews(): Promise<ReviewData[]> {
  try {
    const db = getAdminFirestore();
    const businessesSnapshot = await db.collection('businesses').get();
    const allReviews: ReviewData[] = [];

    for (const businessDoc of businessesSnapshot.docs) {
      const businessData = businessDoc.data();
      const reviewsSnapshot = await db
        .collection('businesses')
        .doc(businessDoc.id)
        .collection('reviews')
        .orderBy('created', 'desc')
        .get();

      reviewsSnapshot.forEach((reviewDoc) => {
        const reviewData = reviewDoc.data();
        allReviews.push({
          id: reviewDoc.id,
          businessId: businessDoc.id,
          businessName: businessData.name || 'Sin nombre',
          userId: reviewData.userId || '',
          name: reviewData.name || 'Anonimo',
          text: reviewData.text || '',
          rating: reviewData.rating || 0,
          created: reviewData.created?.toDate?.().toISOString() || new Date().toISOString(),
          updated: reviewData.updated?.toDate?.().toISOString(),
          approved: reviewData.approved !== false,
        });
      });
    }

    allReviews.sort((left, right) => new Date(right.created).getTime() - new Date(left.created).getTime());
    return allReviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

export default async function ReviewsModerationPage() {
  const reviews = await fetchAllReviews();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
          <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Resenas</h1>
          <p className="text-sm text-gray-600">Bandeja de moderacion para aprobar, rechazar o limpiar resenas rapido.</p>
        </div>

        <Suspense fallback={<div className="py-8 text-center text-gray-500">Cargando resenas...</div>}>
          <ReviewsModerationClient initialReviews={reviews} />
        </Suspense>
      </div>
    </main>
  );
}
