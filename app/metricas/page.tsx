import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import Link from 'next/link';
import { BarChart2, TrendingUp, Eye, Phone, MessageCircle, Star, ArrowLeft, Crown } from 'lucide-react';

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
    ...doc.data()
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
      
      const views = events.filter((e: any) => e.event === 'business_view').length;
      const phoneClicks = events.filter((e: any) => e.event === 'phone_click').length;
      const whatsappClicks = events.filter((e: any) => e.event === 'whatsapp_click').length;

      // Obtener reseñas
      const reviewsSnapshot = await db
        .collection('reviews')
        .where('businessId', '==', businessId)
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => doc.data());
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

      const business = premiumBusinesses.find((b: any) => b.id === businessId);

      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
        views,
        phoneClicks,
        whatsappClicks,
        totalReviews: reviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
      };
    } catch (error) {
      console.error(`Error fetching metrics for ${businessId}:`, error);
      const business = premiumBusinesses.find((b: any) => b.id === businessId);
      return {
        businessId,
        businessName: business?.name || business?.businessName || 'Sin nombre',
        plan: business?.plan || 'free',
        views: 0,
        phoneClicks: 0,
        whatsappClicks: 0,
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
                    <Star className="w-6 h-6 text-white" />
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

  // Calcular totales
  const totals = metrics.reduce(
    (acc, m) => ({
      views: acc.views + m.views,
      phoneClicks: acc.phoneClicks + m.phoneClicks,
      whatsappClicks: acc.whatsappClicks + m.whatsappClicks,
      totalReviews: acc.totalReviews + m.totalReviews,
    }),
    { views: 0, phoneClicks: 0, whatsappClicks: 0, totalReviews: 0 }
  );

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/mis-negocios"
          className="inline-flex items-center gap-2 text-[#38761D] hover:text-[#2d5418] mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mis Negocios
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#38761D] rounded-lg flex items-center justify-center">
              <BarChart2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Métricas de Rendimiento
              </h1>
              <p className="text-sm text-gray-600">
                Últimos 30 días
              </p>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vistas Totales</p>
                <p className="text-2xl font-bold text-gray-900">{totals.views}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clics Teléfono</p>
                <p className="text-2xl font-bold text-gray-900">{totals.phoneClicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clics WhatsApp</p>
                <p className="text-2xl font-bold text-gray-900">{totals.whatsappClicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Star className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Reseñas Totales</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalReviews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas por Negocio */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#38761D]" />
            Detalle por Negocio
          </h2>

          <div className="space-y-6">
            {metrics.map((metric) => (
              <div key={metric.businessId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{metric.businessName}</h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                        metric.plan === 'sponsor'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {metric.plan === 'sponsor' ? '👑 Sponsor' : '⭐ Featured'}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/${metric.businessId}`}
                    className="text-sm text-[#38761D] hover:text-[#2d5418] font-medium"
                  >
                    Ver Dashboard →
                  </Link>
                </div>

                <div className="grid md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Vistas</p>
                    <p className="text-2xl font-bold text-blue-600">{metric.views}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Tel.</p>
                    <p className="text-2xl font-bold text-green-600">{metric.phoneClicks}</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">WhatsApp</p>
                    <p className="text-2xl font-bold text-emerald-600">{metric.whatsappClicks}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Reseñas</p>
                    <p className="text-2xl font-bold text-amber-600">{metric.totalReviews}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Rating</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metric.avgRating > 0 ? `${metric.avgRating}★` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
