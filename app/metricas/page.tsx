import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import Link from 'next/link';
import { ArrowLeft, Crown } from 'lucide-react';
import MetricasClient from '../../components/MetricasClient';

export const dynamic = 'force-dynamic';

async function getAuthUser() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    return null;
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      return decoded;
    } catch (error) {
      console.error('[metricas] auth error', error);
      return null;
    }
  }
}

async function getUserBusinessMetrics(userId: string, userEmail?: string) {
  const db = getAdminFirestore();
  
  console.log('[metricas] Fetching businesses for userId:', userId, 'email:', userEmail);
  
  // Obtener TODOS los negocios del usuario por ownerId
  const businessesSnapshot = await db
    .collection('businesses')
    .where('ownerId', '==', userId)
    .get();

  console.log('[metricas] Found businesses by ownerId:', businessesSnapshot.docs.length);

  let businesses = businessesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...(data as any)
    };
  });

  // Si no se encontraron negocios por ownerId y tenemos email, buscar por ownerEmail
  if (businesses.length === 0 && userEmail) {
    console.log('[metricas] No businesses found by ownerId, trying with ownerEmail:', userEmail);
    const businessesByEmailSnapshot = await db
      .collection('businesses')
      .where('ownerEmail', '==', userEmail)
      .get();

    console.log('[metricas] Found businesses by ownerEmail:', businessesByEmailSnapshot.docs.length);

    businesses = businessesByEmailSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(data as any)
      };
    });

    // Migración suave: actualizar ownerId si falta
    if (businesses.length > 0) {
      console.log('[metricas] Updating ownerId for businesses found by email');
      const updatePromises = businesses.map(async (business: any) => {
        if (!business.ownerId) {
          try {
            await db.collection('businesses').doc(business.id).update({
              ownerId: userId,
              updatedAt: new Date()
            });
            console.log(`[metricas] Updated ownerId for business ${business.id}`);
          } catch (error) {
            console.error(`[metricas] Error updating ownerId for ${business.id}:`, error);
          }
        }
      });
      await Promise.all(updatePromises);
    }
  }

  // Log detallado de cada negocio encontrado
  businesses.forEach((business: any) => {
    console.log('[metricas] Business:', {
      id: business.id,
      name: business.name || business.businessName,
      ownerId: business.ownerId,
      ownerEmail: business.ownerEmail,
      status: business.status,
      plan: business.plan || 'free'
    });
  });

  // Mostrar TODOS los negocios, no solo premium
  const allUserBusinesses = businesses;

  console.log('[metricas] Total businesses to show:', allUserBusinesses.length);

  if (allUserBusinesses.length === 0) {
    console.log('[metricas] No businesses found for user');
    return { businesses: [], metrics: [], hasPremium: false };
  }

  console.log('[metricas] Total businesses to show:', allUserBusinesses.length);

  if (allUserBusinesses.length === 0) {
    console.log('[metricas] No businesses found for user');
    return { businesses: [], metrics: [], hasPremium: false };
  }

  // Obtener métricas de los últimos 30 días
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const businessIds = allUserBusinesses.map((b: any) => b.id);
  
  console.log('[metricas] Fetching metrics for businessIds:', businessIds);
  
  // Obtener eventos de telemetría para cada negocio
  const metricsPromises = businessIds.map(async (businessId: string) => {
    try {
      const eventsSnapshot = await db
        .collection('telemetry_events')
        .where('businessId', '==', businessId)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get();

      console.log(`[metricas] Events for ${businessId}:`, eventsSnapshot.docs.length);

      // Filtrar por fecha en memoria (para evitar índice compuesto)
      const events = eventsSnapshot.docs
        .map(doc => doc.data())
        .filter((e: any) => {
          const eventDate = e.createdAt?.toDate?.() || new Date(e.createdAt);
          return eventDate >= thirtyDaysAgo;
        });
      
      const views = events.filter((e: any) => 
        e.event === 'business_viewed' || e.event === 'business_card_clicked'
      ).length;
      const phoneClicks = events.filter((e: any) => e.event === 'cta_call').length;
      const whatsappClicks = events.filter((e: any) => e.event === 'cta_whatsapp').length;
      const mapClicks = events.filter((e: any) => e.event === 'cta_maps').length;
      const favoriteAdds = events.filter((e: any) => e.event === 'favorite_added').length;

      // Obtener reseñas
      const reviewsSnapshot = await db
        .collection('reviews')
        .where('businessId', '==', businessId)
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => doc.data());
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

      const business: any = allUserBusinesses.find((b: any) => b.id === businessId);

      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
        status: business?.status || 'unknown',
        views,
        phoneClicks,
        whatsappClicks,
        mapClicks,
        favoriteAdds,
        totalReviews: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
      };
    } catch (error) {
      console.error(`[metricas] Error fetching metrics for ${businessId}:`, error);
      const business: any = allUserBusinesses.find((b: any) => b.id === businessId);
      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
        status: business?.status || 'unknown',
        views: 0,
        phoneClicks: 0,
        whatsappClicks: 0,
        mapClicks: 0,
        favoriteAdds: 0,
        totalReviews: 0,
        avgRating: 0,
      };
    }
  });

  const metrics = await Promise.all(metricsPromises);

  console.log('[metricas] Final metrics count:', metrics.length);

  // Verificar si tiene al menos un negocio premium para mostrar mensaje especial
  const hasPremium = allUserBusinesses.some((b: any) => 
    b.plan === 'featured' || b.plan === 'sponsor'
  );

  return {
    businesses: allUserBusinesses,
    metrics,
    hasPremium,
  };
}

export default async function MetricasPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/para-negocios?auth=required');
  }

  const { metrics } = await getUserBusinessMetrics(user.uid, user.email);

  // Si no tiene ningún negocio, mostrar mensaje para registrar
  if (metrics.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/mis-negocios"
            className="inline-flex items-center gap-2 text-[#38761D] hover:text-[#2d5418] mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Mis Negocios
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No tienes negocios registrados
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Para ver las métricas de tus negocios, primero necesitas registrar al menos uno.
            </p>

            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-3">📊 ¿Qué métricas puedo ver?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ Vistas de tu negocio</li>
                <li>✓ Clics en teléfono, WhatsApp y direcciones</li>
                <li>✓ Favoritos agregados por usuarios</li>
                <li>✓ Reseñas y calificaciones</li>
                <li>✓ Análisis de período (7 o 30 días)</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/registro-negocio"
                className="px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5418] transition shadow-lg hover:shadow-xl"
              >
                Registrar mi negocio
              </Link>
              <Link
                href="/mis-negocios"
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Ver Mis Negocios
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Usar componente client para métricas interactivas
  return <MetricasClient metrics={metrics} />;
}
