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

async function getUserBusinessMetrics(userId: string) {
  const db = getAdminFirestore();
  
  // Obtener negocios del usuario
  const businessesSnapshot = await db
    .collection('businesses')
    .where('ownerId', '==', userId)
    .get();

  const businesses = businessesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as any)
  }));

  // Filtrar solo negocios premium (Featured o Sponsor) y publicados
  const premiumBusinesses = businesses.filter(
    (b: any) => 
      (b.plan === 'featured' || b.plan === 'sponsor') && 
      b.status === 'published'
  );

  if (premiumBusinesses.length === 0) {
    return { businesses: [], metrics: [], hasPremium: false };
  }

  // Obtener métricas de los últimos 30 días
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const businessIds = premiumBusinesses.map((b: any) => b.id);
  
  // Obtener eventos de telemetría para cada negocio
  const metricsPromises = businessIds.map(async (businessId: string) => {
    try {
      const eventsSnapshot = await db
        .collection('telemetry_events')
        .where('businessId', '==', businessId)
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get();

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

      const business: any = premiumBusinesses.find((b: any) => b.id === businessId);

      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
        views,
        phoneClicks,
        whatsappClicks,
        mapClicks,
        favoriteAdds,
        totalReviews: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
      };
    } catch (error) {
      console.error(`Error fetching metrics for ${businessId}:`, error);
      const business: any = premiumBusinesses.find((b: any) => b.id === businessId);
      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
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

  return {
    businesses: premiumBusinesses,
    metrics,
    hasPremium: true,
  };
}

export default async function MetricasPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect('/para-negocios?auth=required');
  }

  const { metrics, hasPremium } = await getUserBusinessMetrics(user.uid);

  // Si no tiene negocios premium, mostrar mensaje de upgrade
  if (!hasPremium) {
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-6">
              <Crown className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Métricas Premium
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Las métricas detalladas están disponibles solo para negocios con plan <span className="font-semibold text-amber-600">Featured</span> o <span className="font-semibold text-purple-600">Sponsor</span>.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8 text-left max-w-2xl mx-auto">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Plan Featured</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Analytics detallados</li>
                  <li>✓ Métricas de visitas</li>
                  <li>✓ Clics en teléfono y WhatsApp</li>
                  <li>✓ Reportes mensuales</li>
                </ul>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Plan Sponsor</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Todo lo de Featured</li>
                  <li>✓ Prioridad máxima</li>
                  <li>✓ Estadísticas avanzadas</li>
                  <li>✓ Soporte premium</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/para-negocios"
                className="px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5418] transition shadow-lg hover:shadow-xl"
              >
                Ver Planes Premium
              </Link>
              <Link
                href="/mis-negocios"
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Ir a Mis Negocios
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
