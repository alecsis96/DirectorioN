'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { getIdToken } from 'firebase/auth';
import Link from 'next/link';
import { LayoutDashboard, Plus, Search, Store, Calendar, DollarSign, Eye, BarChart2 } from 'lucide-react';

type Business = {
  id: string;
  name: string;
  category: string;
  plan: 'free' | 'featured' | 'sponsor';
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'review' | 'published';
  logoUrl?: string;
  image1?: string;
  createdAt: any;
  views?: number;
  rating?: number;
};

export default function MisNegociosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/');
      return;
    }

    loadBusinesses();
  }, [user, authLoading, router]);

  const loadBusinesses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const idToken = await getIdToken(user, true);
      const res = await fetch('/api/my-businesses', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }
      const payload = await res.json();

      const bizMap = new Map<string, Business>();
      (payload.businesses as any[] | undefined)?.forEach((biz) => {
        bizMap.set(biz.id, {
          id: biz.id,
          name: biz.name || 'Sin nombre',
          category: biz.category || '',
          plan: biz.plan || 'free',
          status: (biz.status || 'draft') as Business['status'],
          logoUrl: biz.logoUrl,
          image1: biz.image1 || biz.images?.[0]?.url,
          createdAt: biz.createdAt,
          views: biz.views || 0,
          rating: biz.rating || 0,
        });
      });

      const approvedBusinesses = Array.from(bizMap.values()).sort((a, b) => {
        const aDate = (a.createdAt?.toMillis?.() ?? a.createdAt?.seconds ?? 0) as number;
        const bDate = (b.createdAt?.toMillis?.() ?? b.createdAt?.seconds ?? 0) as number;
        return bDate - aDate;
      });

      const apps = (payload.applications as any[] | undefined) ?? [];
      const pendingApplication = apps.map((doc) => ({
        id: doc.id,
        name: doc.businessName || 'Sin nombre',
        category: doc.category || '',
        plan: doc.plan || 'free',
        status: (doc.status || 'pending') as 'pending' | 'approved' | 'rejected',
        logoUrl: doc.logoUrl,
        image1: doc.coverPhoto,
        createdAt: doc.createdAt,
        views: 0,
        rating: 0,
      }));

      const allBusinesses = [...approvedBusinesses, ...pendingApplication];
      setBusinesses(allBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(business =>
    business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanBadge = (plan: string) => {
    const badges = {
      sponsor: { text: '💎 PATROCINADO', color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' },
      featured: { text: '✨ DESTACADO', color: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' },
      free: { text: 'GRATIS', color: 'bg-gray-500 text-white' }
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      published: { text: '✓ Publicado', color: 'bg-green-100 text-green-800' },
      review: { text: '🔍 En Revisión', color: 'bg-purple-100 text-purple-800' },
      draft: { text: '📝 Pendiente de Completar', color: 'bg-blue-100 text-blue-800' },
      approved: { text: '✓ Aprobado', color: 'bg-green-100 text-green-800' },
      pending: { text: '⏳ En Revisión Inicial', color: 'bg-yellow-100 text-yellow-800' },
      rejected: { text: '✗ Rechazado', color: 'bg-red-100 text-red-800' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38761D] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tus negocios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-8 h-8 text-[#38761D]" />
                Mis Negocios
              </h1>
              <p className="text-gray-600 mt-1">Gestiona y edita tus negocios registrados</p>
            </div>
            <Link
              href="/registro-negocio"
              className="flex items-center gap-2 px-4 py-2 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2f5a1a] transition shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nuevo Negocio
            </Link>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de Negocios */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No se encontraron negocios' : 'No tienes negocios registrados'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza registrando tu primer negocio'}
            </p>
            {!searchTerm && (
              <Link
                href="/registro-negocio"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2f5a1a] transition"
              >
                <Plus className="w-5 h-5" />
                Registrar Primer Negocio
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => {
              const planBadge = getPlanBadge(business.plan);
              const statusBadge = getStatusBadge(business.status);
              const logoUrl = business.logoUrl || business.image1 || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f0f0f0" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23999"%3ELogo%3C/text%3E%3C/svg%3E';

              return (
                <div key={business.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100">
                  {/* Header con Logo */}
                  <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                      <img
                        src={logoUrl}
                        alt={business.name}
                        className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-lg"
                      />
                    </div>
                    {/* Badges */}
                    <div className="absolute top-3 left-3">
                      <span className={`${planBadge.color} px-2 py-1 rounded-full text-[10px] font-bold`}>
                        {planBadge.text}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`${statusBadge.color} px-2 py-1 rounded-full text-[10px] font-bold`}>
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="pt-12 px-4 pb-4">
                    <h3 className="text-lg font-bold text-gray-900 text-center mb-1 line-clamp-1">
                      {business.name}
                    </h3>
                    <p className="text-sm text-gray-500 text-center mb-4">{business.category}</p>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <Eye className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Vistas</p>
                        <p className="text-sm font-bold text-gray-900">{business.views || 0}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <BarChart2 className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Rating</p>
                        <p className="text-sm font-bold text-gray-900">{business.rating?.toFixed(1) || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="space-y-2">
                      {business.status === 'approved' || business.status === 'published' ? (
                        <>
                          <Link
                            href={`/dashboard/${business.id}`}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2f5a1a] transition"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Editar Negocio
                          </Link>
                          <Link
                            href={`/negocios/${business.id}`}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Publicación
                          </Link>
                        </>
                      ) : (
                        <Link
                          href="/mis-solicitudes"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition"
                        >
                          <Calendar className="w-4 h-4" />
                          Ver Estado
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
