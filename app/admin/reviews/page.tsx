import { Suspense } from 'react';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import ReviewsModerationClient from '../../../components/ReviewsModerationClient';

export const metadata = {
  title: 'Moderación de Reseñas | Admin',
  description: 'Panel de administración para moderar reseñas de negocios',
};

type ReviewData = {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  name: string;
  text: string;
  rating: number;
  created: string; // ISO string
  updated?: string; // ISO string
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
          name: reviewData.name || 'Anónimo',
          text: reviewData.text || '',
          rating: reviewData.rating || 0,
          created: reviewData.created?.toDate?.().toISOString() || new Date().toISOString(),
          updated: reviewData.updated?.toDate?.().toISOString(),
          approved: reviewData.approved !== false, // Por defecto aprobado si no existe el campo
        });
      });
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    allReviews.sort((a, b) => {
      const dateA = new Date(a.created);
      const dateB = new Date(b.created);
      return dateB.getTime() - dateA.getTime();
    });
    
    return allReviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

async function getReviewStats() {
  try {
    const db = getAdminFirestore();
    const businessesSnapshot = await db.collection('businesses').get();
    
    let totalReviews = 0;
    let approvedReviews = 0;
    let pendingReviews = 0;
    let totalRating = 0;
    
    for (const businessDoc of businessesSnapshot.docs) {
      const reviewsSnapshot = await db
        .collection('businesses')
        .doc(businessDoc.id)
        .collection('reviews')
        .get();
      
      reviewsSnapshot.forEach((reviewDoc) => {
        const reviewData = reviewDoc.data();
        totalReviews++;
        totalRating += reviewData.rating || 0;
        
        if (reviewData.approved !== false) {
          approvedReviews++;
        } else {
          pendingReviews++;
        }
      });
    }
    
    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
    
    return {
      total: totalReviews,
      approved: approvedReviews,
      pending: pendingReviews,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  } catch (error) {
    console.error('Error getting review stats:', error);
    return { total: 0, approved: 0, pending: 0, averageRating: 0 };
  }
}

export default async function ReviewsModerationPage() {
  const [reviews, stats] = await Promise.all([
    fetchAllReviews(),
    getReviewStats(),
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Panel de control</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">⭐ Moderación de Reseñas</h1>
          <p className="text-sm sm:text-base text-gray-600">Revisa y modera las reseñas de negocios</p>
        </div>

        {/* Estadísticas */}
        <div className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Total Reseñas</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Aprobadas</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.approved}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Pendientes</div>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Rating Promedio</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.averageRating.toFixed(1)} ⭐</div>
          </div>
        </div>

        {/* Lista de reseñas */}
        <Suspense fallback={<div className="text-center py-8">Cargando reseñas...</div>}>
          <ReviewsModerationClient initialReviews={reviews} />
        </Suspense>
      </div>
    </main>
  );
}
