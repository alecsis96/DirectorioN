import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { hasAdminOverride } from '../../../lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';

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
  totalBusinesses: number;
  businessesByStatus: { pending: number; published: number; rejected: number };
  businessesByPlan: { free: number; premium: number };
  totalApplications: number;
  pendingApplications: number;
  totalReviews: number;
  avgRating: number;
  topCategories: Array<{ category: string; count: number }>;
  recentBusinesses: number;
  recentApplications: number;
}

async function getAdminStats(): Promise<AdminStats> {
  const db = getAdminFirestore();

  const [publishedCount, pendingCount, rejectedCount] = await Promise.all([
    db.collection('businesses').where('businessStatus', '==', 'published').count().get(),
    db.collection('businesses').where('businessStatus', '==', 'in_review').count().get(),
    db.collection('businesses').where('applicationStatus', '==', 'rejected').count().get(),
  ]);

  const [freeCount, featuredCount, sponsorCount] = await Promise.all([
    db.collection('businesses').where('plan', '==', 'free').count().get(),
    db.collection('businesses').where('plan', '==', 'featured').count().get(),
    db.collection('businesses').where('plan', '==', 'sponsor').count().get(),
  ]);

  const [totalAppsCount, pendingAppsCount] = await Promise.all([
    db.collection('applications').count().get(),
    db.collection('applications').where('status', 'in', ['pending', 'solicitud']).count().get(),
  ]);

  const reviewsSnapshot = await db.collectionGroup('reviews').limit(1000).get();
  const reviews = reviewsSnapshot.docs.map((doc) => doc.data());
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews : 0;

  const businessesSnapshot = await db.collection('businesses').where('businessStatus', '==', 'published').get();
  const categoryCount: Record<string, number> = {};
  businessesSnapshot.docs.forEach((doc) => {
    const category = doc.data().category || 'Sin categoria';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentBusinessesSnapshot = await db.collection('businesses').where('createdAt', '>', thirtyDaysAgo).count().get();
  const recentApplicationsSnapshot = await db.collection('applications').where('createdAt', '>', thirtyDaysAgo).count().get();

  return {
    totalBusinesses: publishedCount.data().count + pendingCount.data().count,
    businessesByStatus: {
      pending: pendingCount.data().count,
      published: publishedCount.data().count,
      rejected: rejectedCount.data().count,
    },
    businessesByPlan: {
      free: freeCount.data().count,
      premium: featuredCount.data().count + sponsorCount.data().count,
    },
    totalApplications: totalAppsCount.data().count,
    pendingApplications: pendingAppsCount.data().count,
    totalReviews,
    avgRating,
    topCategories,
    recentBusinesses: recentBusinessesSnapshot.data().count,
    recentApplications: recentApplicationsSnapshot.data().count,
  };
}

export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Secundario</p>
          <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Stats</h1>
          <p className="text-sm text-gray-600">Resumen corto del sistema para seguimiento general, no para operacion diaria.</p>
        </div>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <StatCard title="Negocios" value={stats.totalBusinesses} />
          <StatCard title="Premium" value={stats.businessesByPlan.premium} />
          <StatCard title="Solicitudes" value={stats.pendingApplications} />
          <StatCard title="Resenas" value={stats.totalReviews} />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Panel title="Estado del sistema">
            <div className="space-y-3 text-sm text-gray-700">
              <MetricRow label="Publicados" value={stats.businessesByStatus.published} />
              <MetricRow label="En revision" value={stats.businessesByStatus.pending} />
              <MetricRow label="Rechazados" value={stats.businessesByStatus.rejected} />
              <MetricRow label="Rating promedio" value={stats.avgRating.toFixed(1)} />
            </div>
          </Panel>

          <Panel title="Distribucion de planes">
            <div className="space-y-3 text-sm text-gray-700">
              <MetricRow label="Perfil base" value={stats.businessesByPlan.free} />
              <MetricRow label="Premium" value={stats.businessesByPlan.premium} />
            </div>
          </Panel>

          <Panel title="Actividad reciente">
            <div className="space-y-3 text-sm text-gray-700">
              <MetricRow label="Negocios nuevos 30d" value={stats.recentBusinesses} />
              <MetricRow label="Solicitudes nuevas 30d" value={stats.recentApplications} />
              <MetricRow label="Solicitudes totales" value={stats.totalApplications} />
            </div>
          </Panel>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Categorias con mas presencia</h2>
          {stats.topCategories.length === 0 ? (
            <p className="text-sm text-gray-500">Sin categorias para mostrar.</p>
          ) : (
            <div className="space-y-2">
              {stats.topCategories.map((category) => (
                <div key={category.category} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                  <span className="text-sm text-gray-700">{category.category}</span>
                  <span className="text-sm font-semibold text-gray-900">{category.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
