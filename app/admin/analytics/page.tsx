'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebaseConfig';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import Link from 'next/link';

type AnalyticsData = {
  totalEvents: number;
  uniqueUsers: number;
  pageViews: number;
  topEvents: Array<{ event: string; count: number }>;
  topBusinesses: Array<{ businessId: string; businessName: string; views: number }>;
  topCTAs: Array<{ type: string; count: number }>;
  recentErrors: Array<{
    message: string;
    count: number;
    lastOccurred: string;
  }>;
  userEngagement: {
    searches: number;
    favorites: number;
    reviews: number;
    registrations: number;
  };
  timeRangeStats: {
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/');
        return;
      }

      const admin = await hasAdminOverride(user.email);
      if (!admin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      loadAnalytics();
    });

    return () => unsubscribe();
  }, [router, timeRange]);

  const loadAnalytics = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to load analytics');
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">📊 Analytics</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mt-1">
              Panel de control
            </p>
          </div>
          
          {/* Navegación */}
          <div className="flex flex-wrap gap-2">
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
              className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
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
              href="/admin/reports"
              className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
            >
              🚨 Reportes
            </Link>
            <Link
              href="/admin/analytics"
              className="px-4 py-2 bg-[#38761D] text-white font-semibold rounded hover:bg-[#2d5418]"
            >
              📊 Analytics
            </Link>
            <Link
              href="/admin/stats"
              className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
            >
              📈 Estadísticas
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Range Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Período:</span>
            <div className="flex gap-2">
              {(['today', '7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    timeRange === range
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'today' && 'Hoy'}
                  {range === '7d' && 'Últimos 7 días'}
                  {range === '30d' && 'Últimos 30 días'}
                  {range === 'all' && 'Todo el tiempo'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Eventos"
            value={data.totalEvents.toLocaleString()}
            icon="📈"
            color="blue"
          />
          <StatCard
            title="Usuarios Únicos"
            value={data.uniqueUsers.toLocaleString()}
            icon="👥"
            color="green"
          />
          <StatCard
            title="Page Views"
            value={data.pageViews.toLocaleString()}
            icon="👁️"
            color="purple"
          />
          <StatCard
            title="Búsquedas"
            value={data.userEngagement.searches.toLocaleString()}
            icon="🔍"
            color="orange"
          />
        </div>

        {/* Time Range Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Actividad por Período</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {data.timeRangeStats.today.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Hoy</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {data.timeRangeStats.yesterday.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Ayer</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {data.timeRangeStats.last7Days.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Últimos 7 días</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {data.timeRangeStats.last30Days.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Últimos 30 días</div>
            </div>
          </div>
        </div>

        {/* User Engagement */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💡 Engagement de Usuarios</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <EngagementMetric
              label="Búsquedas"
              value={data.userEngagement.searches}
              icon="🔍"
            />
            <EngagementMetric
              label="Favoritos"
              value={data.userEngagement.favorites}
              icon="⭐"
            />
            <EngagementMetric
              label="Reviews"
              value={data.userEngagement.reviews}
              icon="✍️"
            />
            <EngagementMetric
              label="Registros"
              value={data.userEngagement.registrations}
              icon="📝"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔥 Eventos Principales</h2>
            <div className="space-y-3">
              {data.topEvents.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{formatEventName(item.event)}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top CTAs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📞 CTAs Más Usados</h2>
            <div className="space-y-3">
              {data.topCTAs.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{formatCTAName(item.type)}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Businesses */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 Negocios Más Vistos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Negocio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Vistas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topBusinesses.slice(0, 15).map((business, idx) => (
                  <tr key={business.businessId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {business.businessName || business.businessId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {business.views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Errors */}
        {data.recentErrors.length > 0 && (
          <div className="bg-red-50 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">⚠️ Errores Recientes</h2>
            <div className="space-y-3">
              {data.recentErrors.slice(0, 10).map((error, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 bg-white rounded border border-red-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{error.message}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Última ocurrencia: {new Date(error.lastOccurred).toLocaleString()}
                    </p>
                  </div>
                  <span className="ml-4 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    {error.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { 
  title: string; 
  value: string; 
  icon: string; 
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`text-3xl p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EngagementMetric({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function formatEventName(event: string): string {
  const names: Record<string, string> = {
    page_view: 'Vista de Página',
    search: 'Búsqueda',
    business_viewed: 'Negocio Visto',
    business_card_clicked: 'Tarjeta Clickeada',
    cta_call: 'Llamada',
    cta_whatsapp: 'WhatsApp',
    cta_maps: 'Google Maps',
    cta_facebook: 'Facebook',
    favorite_added: 'Favorito Agregado',
    review_submitted: 'Review Enviada',
    register_completed: 'Registro Completado',
  };
  return names[event] || event;
}

function formatCTAName(type: string): string {
  const names: Record<string, string> = {
    cta_call: '📞 Llamada',
    cta_whatsapp: '💬 WhatsApp',
    cta_maps: '🗺️ Google Maps',
    cta_facebook: '📘 Facebook',
    cta_instagram: '📷 Instagram',
    cta_website: '🌐 Sitio Web',
    cta_email: '📧 Email',
  };
  return names[type] || type;
}
