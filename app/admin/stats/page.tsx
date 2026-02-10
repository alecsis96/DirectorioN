import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import AdminQuickNav from '../../../components/AdminQuickNav';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    redirect('/para-negocios?auth=required');
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin/stats] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

interface AdminStats {
  // Negocios
  totalBusinesses: number;
  businessesByStatus: { pending: number; published: number; rejected: number };
  businessesByPlan: { free: number; featured: number; sponsor: number };
  
  // Solicitudes
  totalApplications: number;
  pendingApplications: number;
  
  // Reviews
  totalReviews: number;
  avgRating: number;
  
  // Categorías
  topCategories: Array<{ category: string; count: number }>;
  
  // Ingresos (estimado)
  monthlyRevenue: number;
  
  // Actividad reciente
  recentBusinesses: number;
  recentApplications: number;
}

async function getAdminStats(): Promise<AdminStats> {
  const db = getAdminFirestore();

  // Negocios por status
  const [publishedCount, pendingCount, rejectedCount] = await Promise.all([
    db.collection('businesses').where('status', '==', 'published').count().get(),
    db.collection('businesses').where('status', '==', 'pending').count().get(),
    db.collection('businesses').where('status', '==', 'rejected').count().get(),
  ]);

  const totalBusinesses = publishedCount.data().count + pendingCount.data().count;

  // Negocios por plan
  const [freeCount, featuredCount, sponsorCount] = await Promise.all([
    db.collection('businesses').where('plan', '==', 'free').count().get(),
    db.collection('businesses').where('plan', '==', 'featured').count().get(),
    db.collection('businesses').where('plan', '==', 'sponsor').count().get(),
  ]);

  // Solicitudes
  const [totalAppsCount, pendingAppsCount] = await Promise.all([
    db.collection('applications').count().get(),
    db.collection('applications').where('status', 'in', ['pending', 'solicitud']).count().get(),
  ]);

  // Obtener reviews (muestra de los primeros 1000 para calcular promedio)
  const reviewsSnapshot = await db.collectionGroup('reviews').limit(1000).get();
  const reviews = reviewsSnapshot.docs.map(doc => doc.data());
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
    : 0;

  // Categorías más populares
  const businessesSnapshot = await db.collection('businesses').where('status', '==', 'published').get();
  const categoryCount: Record<string, number> = {};
  businessesSnapshot.docs.forEach(doc => {
    const category = doc.data().category || 'Sin categoría';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Ingresos mensuales estimados
  const monthlyRevenue = 
    (featuredCount.data().count * 99) + 
    (sponsorCount.data().count * 199);

  // Actividad reciente (últimos 30 días)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentBusinessesSnapshot = await db
    .collection('businesses')
    .where('createdAt', '>', thirtyDaysAgo)
    .count()
    .get();

  const recentApplicationsSnapshot = await db
    .collection('applications')
    .where('createdAt', '>', thirtyDaysAgo)
    .count()
    .get();

  return {
    totalBusinesses,
    businessesByStatus: {
      pending: pendingCount.data().count,
      published: publishedCount.data().count,
      rejected: rejectedCount.data().count,
    },
    businessesByPlan: {
      free: freeCount.data().count,
      featured: featuredCount.data().count,
      sponsor: sponsorCount.data().count,
    },
    totalApplications: totalAppsCount.data().count,
    pendingApplications: pendingAppsCount.data().count,
    totalReviews,
    avgRating,
    topCategories,
    monthlyRevenue,
    recentBusinesses: recentBusinessesSnapshot.data().count,
    recentApplications: recentApplicationsSnapshot.data().count,
  };
}

export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Panel de control</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">📈 Estadísticas del Directorio</h1>
          <p className="text-sm sm:text-base text-gray-600">Vista general del rendimiento y actividad</p>
        </div>

        {/* Métricas Principales */}
        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📌a Métricas Principales</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Negocios</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.totalBusinesses}</p>
              </div>
              <div className="text-4xl">🏪</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Negocios Activos</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.businessesByStatus.published}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Total Reseñas</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.totalReviews}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Calificación Prom.</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats.avgRating.toFixed(1)}</p>
              </div>
              <div className="text-4xl">🌟</div>
            </div>
          </div>
        </div>
      </section>

      {/* Distribución de Planes */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Distribución de Planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Plan Gratuito</p>
              <span className="text-2xl">🆓</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.businessesByPlan.free}</p>
            <p className="text-sm text-gray-500 mt-1">
              {((stats.businessesByPlan.free / stats.totalBusinesses) * 100).toFixed(1)}% del total
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-600">Plan Destacado</p>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">{stats.businessesByPlan.featured}</p>
            <p className="text-sm text-blue-600 mt-1">$99 MXN/mes cada uno</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-600">Plan Patrocinado</p>
              <span className="text-2xl">👑</span>
            </div>
            <p className="text-3xl font-bold text-purple-900">{stats.businessesByPlan.sponsor}</p>
            <p className="text-sm text-purple-600 mt-1">$199 MXN/mes cada uno</p>
          </div>
        </div>

        {/* Ingresos Mensuales */}
        <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Ingresos Mensuales Estimados</p>
              <p className="text-4xl font-bold text-green-900 mt-2">${stats.monthlyRevenue.toLocaleString()} MXN</p>
              <p className="text-sm text-green-600 mt-1">
                {stats.businessesByPlan.featured} destacados + {stats.businessesByPlan.sponsor} patrocinados
              </p>
            </div>
            <div className="text-6xl">💵</div>
          </div>
        </div>
      </section>

      {/* Actividad Reciente */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📈 Actividad Reciente (30 días)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Nuevos Negocios</p>
            <p className="text-3xl font-bold text-gray-900">{stats.recentBusinesses}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Nuevas Solicitudes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.recentApplications}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-orange-200">
            <p className="text-sm font-medium text-orange-600 mb-2">Pendientes de Revisar</p>
            <p className="text-3xl font-bold text-orange-900">{stats.pendingApplications}</p>
          </div>
        </div>
      </section>

      {/* Categorías Más Populares */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🏷️ Categorías Más Populares</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.topCategories.map((cat, index) => (
                <tr key={cat.category}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📌'}</span>
                      <span className="text-sm font-medium text-gray-900">{cat.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {cat.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {((cat.count / stats.businessesByStatus.published) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Estado General */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Estado General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Solicitudes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalApplications}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-yellow-200">
            <p className="text-sm font-medium text-yellow-600 mb-2">En Revisión</p>
            <p className="text-3xl font-bold text-yellow-900">{stats.businessesByStatus.pending}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-600 mb-2">Rechazadas</p>
            <p className="text-3xl font-bold text-red-900">{stats.businessesByStatus.rejected}</p>
          </div>
        </div>
      </section>
        </div>
      
      <AdminQuickNav />
    </main>
  );
}
