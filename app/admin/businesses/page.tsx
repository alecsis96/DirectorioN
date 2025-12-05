import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import AdminBusinessList from '../../../components/AdminBusinessList';
import AdminNavigation from '../../../components/AdminNavigation';

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
      console.error('[admin/businesses] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

interface BusinessData {
  id: string;
  businessName: string;
  ownerName?: string;
  ownerEmail?: string;
  category?: string;
  status: string;
  plan: string;
  planExpiresAt?: string | null;
  createdAt?: string;
  approvedAt?: string;
  viewCount?: number;
  reviewCount?: number;
  avgRating?: number;
  stripeSubscriptionStatus?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  isActive?: boolean;
}

async function fetchAllBusinesses(): Promise<BusinessData[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('status', '==', 'published')
    .get();

  if (snapshot.empty) return [];

  const businesses = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      businessName: data.businessName || data.name || 'Sin nombre',
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      category: data.category,
      status: data.status,
      plan: data.plan || 'free',
      planExpiresAt: data.planExpiresAt?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
      viewCount: data.viewCount || 0,
      reviewCount: data.reviewCount || 0,
      avgRating: data.avgRating || 0,
      stripeSubscriptionStatus: data.stripeSubscriptionStatus,
      nextPaymentDate: data.nextPaymentDate,
      lastPaymentDate: data.lastPaymentDate,
      isActive: data.isActive,
    };
  });

  return businesses.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function getBusinessStats() {
  const db = getAdminFirestore();
  
  const [totalSnapshot, freeSnapshot, featuredSnapshot, sponsorSnapshot] = await Promise.all([
    db.collection('businesses').where('status', '==', 'published').count().get(),
    db.collection('businesses').where('status', '==', 'published').where('plan', '==', 'free').count().get(),
    db.collection('businesses').where('status', '==', 'published').where('plan', '==', 'featured').count().get(),
    db.collection('businesses').where('status', '==', 'published').where('plan', '==', 'sponsor').count().get(),
  ]);

  return {
    total: totalSnapshot.data().count,
    free: freeSnapshot.data().count,
    featured: featuredSnapshot.data().count,
    sponsor: sponsorSnapshot.data().count,
  };
}

export default async function AdminBusinessesPage() {
  await requireAdmin();
  const [businesses, stats] = await Promise.all([
    fetchAllBusinesses(),
    getBusinessStats(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6 pl-14 lg:pl-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Panel de control</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#38761D]">Negocios Publicados</h1>
          <p className="text-sm text-gray-600">Gestiona todos los negocios activos en el directorio.</p>
        </div>
        <Link
          href="/admin/businesses/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5a16] transition-colors shadow-md"
        >
          <span className="text-xl">+</span>
          <span>Crear Negocio</span>
        </Link>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <AdminNavigation variant="sidebar" />
        
        <div className="lg:col-start-2 space-y-6">
          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Negocios</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 rounded-lg border border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Plan Gratuito</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.free}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Plan Destacado</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats.featured}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg border border-purple-200">
              <p className="text-xs sm:text-sm text-purple-600 font-medium">Plan Patrocinado</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-900 mt-1">{stats.sponsor}</p>
            </div>
          </div>

          {/* Lista de negocios */}
          {businesses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No hay negocios publicados aún.</p>
            </div>
          ) : (
            <AdminBusinessList businesses={businesses} />
          )}

          {/* Contador */}
          <div className="text-sm text-gray-500 text-center">
            Mostrando {businesses.length} negocios publicados
          </div>
        </div>
      </div>
    </main>
  );
}
