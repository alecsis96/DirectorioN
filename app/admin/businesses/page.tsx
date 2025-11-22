import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

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
  createdAt?: string;
  approvedAt?: string;
  viewCount?: number;
  reviewCount?: number;
  avgRating?: number;
  stripeSubscriptionStatus?: string;
}

async function fetchAllBusinesses(): Promise<BusinessData[]> {
  const db = getAdminFirestore();
  
  // Opción 1: Obtener todos los negocios aprobados sin ordenar (más rápido, no requiere índice)
  const snapshot = await db
    .collection('businesses')
    .where('status', '==', 'approved')
    .get();

  if (snapshot.empty) return [];

  // Ordenar en memoria después de obtener los datos
  const businesses = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      businessName: data.businessName || 'Sin nombre',
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      category: data.category,
      status: data.status,
      plan: data.plan || 'free',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
      viewCount: data.viewCount || 0,
      reviewCount: data.reviewCount || 0,
      avgRating: data.avgRating || 0,
      stripeSubscriptionStatus: data.stripeSubscriptionStatus,
    };
  });

  // Ordenar por fecha de creación (más recientes primero)
  return businesses.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function getBusinessStats() {
  const db = getAdminFirestore();
  
  const [totalSnapshot, freeSnapshot, featuredSnapshot, sponsorSnapshot] = await Promise.all([
    db.collection('businesses').where('status', '==', 'approved').count().get(),
    db.collection('businesses').where('status', '==', 'approved').where('plan', '==', 'free').count().get(),
    db.collection('businesses').where('status', '==', 'approved').where('plan', '==', 'featured').count().get(),
    db.collection('businesses').where('status', '==', 'approved').where('plan', '==', 'sponsor').count().get(),
  ]);

  return {
    total: totalSnapshot.data().count,
    free: freeSnapshot.data().count,
    featured: featuredSnapshot.data().count,
    sponsor: sponsorSnapshot.data().count,
  };
}

function getPlanBadge(plan: string, subscriptionStatus?: string) {
  if (plan === 'sponsor') {
    return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">👑 Patrocinado</span>;
  }
  if (plan === 'featured') {
    return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">⭐ Destacado</span>;
  }
  return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">🆓 Gratuito</span>;
}

function getSubscriptionStatusBadge(status?: string) {
  if (!status) return null;
  
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: '✓ Activa', color: 'bg-green-100 text-green-800' },
    payment_failed: { label: '⚠️ Pago fallido', color: 'bg-red-100 text-red-800' },
    canceled: { label: '✕ Cancelada', color: 'bg-gray-100 text-gray-600' },
    past_due: { label: '⏰ Vencida', color: 'bg-yellow-100 text-yellow-800' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  
  return (
    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${config.color}`}>
      {config.label}
    </span>
  );
}

export default async function AdminBusinessesPage() {
  await requireAdmin();
  const [businesses, stats] = await Promise.all([
    fetchAllBusinesses(),
    getBusinessStats(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Panel de control</p>
        <h1 className="mt-2 text-3xl font-bold text-[#38761D]">Negocios Publicados</h1>
        <p className="text-sm text-gray-600">Gestiona todos los negocios activos en el directorio.</p>
        
        {/* Navegación */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/applications"
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
          >
            📋 Solicitudes iniciales
          </Link>
          <Link
            href="/admin/pending-businesses"
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
          >
            🔍 Negocios en revisión
          </Link>
          <Link
            href="/admin/businesses"
            className="px-4 py-2 bg-[#38761D] text-white font-semibold rounded hover:bg-[#2d5418]"
          >
            🏪 Negocios publicados
          </Link>
          <Link
            href="/admin/payments"
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
          >
            💳 Pagos y suspensiones
          </Link>
          <Link
            href="/admin/stats"
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
          >
            📊 Estadísticas
          </Link>
        </div>

        {/* Estadísticas rápidas */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Total Negocios</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Plan Gratuito</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.free}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium">Plan Destacado</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{stats.featured}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-600 font-medium">Plan Patrocinado</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">{stats.sponsor}</p>
          </div>
        </div>
      </header>

      {/* Lista de negocios */}
      {businesses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay negocios publicados aún.</p>
        </div>
      ) : (
        <>
          {/* Vista de tabla para desktop (oculta en móvil) */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Negocio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propietario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estadísticas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {businesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {business.businessName}
                            </div>
                            {business.category && (
                              <div className="text-sm text-gray-500">{business.category}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{business.ownerName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{business.ownerEmail || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getPlanBadge(business.plan, business.stripeSubscriptionStatus)}
                          {business.plan !== 'free' && getSubscriptionStatusBadge(business.stripeSubscriptionStatus)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <div>👁️ {business.viewCount || 0} vistas</div>
                          <div>⭐ {business.reviewCount || 0} reseñas ({business.avgRating?.toFixed(1) || '0.0'})</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {business.approvedAt
                          ? new Date(business.approvedAt).toLocaleDateString('es-MX')
                          : business.createdAt
                          ? new Date(business.createdAt).toLocaleDateString('es-MX')
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/negocios/${business.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            target="_blank"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/dashboard/${business.id}`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista de tarjetas para móvil (oculta en desktop) */}
          <div className="lg:hidden space-y-4">
            {businesses.map((business) => (
              <div key={business.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                {/* Header con nombre y plan */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {business.businessName}
                    </h3>
                    {business.category && (
                      <p className="text-sm text-gray-500">{business.category}</p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {getPlanBadge(business.plan, business.stripeSubscriptionStatus)}
                  </div>
                </div>

                {/* Suscripción status */}
                {business.plan !== 'free' && business.stripeSubscriptionStatus && (
                  <div className="mb-3">
                    {getSubscriptionStatusBadge(business.stripeSubscriptionStatus)}
                  </div>
                )}

                {/* Propietario */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Propietario</p>
                  <p className="text-sm text-gray-900">{business.ownerName || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{business.ownerEmail || 'N/A'}</p>
                </div>

                {/* Estadísticas */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Estadísticas</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <span>👁️</span>
                      <span>{business.viewCount || 0} vistas</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <span>⭐</span>
                      <span>{business.reviewCount || 0} reseñas</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Calificación: {business.avgRating?.toFixed(1) || '0.0'} / 5.0
                  </div>
                </div>

                {/* Fecha */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Fecha de publicación</p>
                  <p className="text-sm text-gray-900">
                    {business.approvedAt
                      ? new Date(business.approvedAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : business.createdAt
                      ? new Date(business.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Link
                    href={`/negocios/${business.id}`}
                    className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    target="_blank"
                  >
                    👁️ Ver
                  </Link>
                  <Link
                    href={`/dashboard/${business.id}`}
                    className="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    ✏️ Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Filtros y búsqueda (placeholder para futura implementación) */}
      <div className="mt-6 text-sm text-gray-500 text-center">
        Mostrando {businesses.length} negocios publicados
      </div>
    </main>
  );
}
