'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../firebaseConfig';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import Link from 'next/link';
import AdminNavigation from '../../../components/AdminNavigation';

type AnalyticsData = {
  totalEvents: number;
  uniqueUsers: number;
  authenticatedUsers?: number;
  anonymousRate?: string;
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
  comparison?: {
    totalEventsChange?: string;
    pageViewsChange?: string;
    sessionsChange?: string;
  };
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [sortBy, setSortBy] = useState<'views' | 'name'>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      setError(null);
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: Failed to load analytics`);
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido al cargar analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          
          <div className="space-y-6 animate-pulse">
            {/* KPIs skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 h-24"></div>
              ))}
            </div>
            
            {/* Period stats skeleton */}
            <div className="bg-white rounded-lg shadow p-6 h-48"></div>
            
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6 h-64"></div>
              <div className="bg-white rounded-lg shadow p-6 h-64"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin || !data) {
    return null;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6 pl-14 lg:pl-0">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Panel de control</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#38761D]">📊 Analytics</h1>
        <p className="text-sm text-gray-600">Análisis de uso y métricas del directorio</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <AdminNavigation variant="sidebar" />
        <div className="lg:col-start-2">
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
            trend={data.comparison?.totalEventsChange}
            icon="📈"
            color="blue"
          />
          <StatCard
            title="Sesiones Únicas"
            value={data.uniqueUsers.toLocaleString()}
            subtitle={data.authenticatedUsers ? `${data.authenticatedUsers} con cuenta • ${data.anonymousRate}% anónimos` : undefined}
            trend={data.comparison?.sessionsChange}
            icon="👥"
            color="green"
          />
          <StatCard
            title="Page Views"
            value={data.pageViews.toLocaleString()}
            trend={data.comparison?.pageViewsChange}
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
            {data.topEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">📊</p>
                <p className="text-sm">No hay eventos registrados en este período</p>
              </div>
            ) : (
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
            )}
          </div>

          {/* Top CTAs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📞 CTAs Más Usados</h2>
            {data.topCTAs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-2">📞</p>
                <p className="text-sm">No hay clicks en CTAs en este período</p>
                <p className="text-xs text-gray-400 mt-2">
                  Los usuarios deben hacer click en WhatsApp, Llamar, Cómo llegar, etc.
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Top Businesses */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">🏆 Negocios Más Vistos</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (sortBy === 'views') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('views');
                    setSortOrder('desc');
                  }
                }}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  sortBy === 'views'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Vistas {sortBy === 'views' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'name') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('name');
                    setSortOrder('asc');
                  }
                }}
                className={`px-3 py-1 text-xs rounded-lg transition ${
                  sortBy === 'name'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Nombre {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
          {data.topBusinesses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-2">🏪</p>
              <p className="text-sm">No hay negocios con vistas en este período</p>
            </div>
          ) : (
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
                  {[...data.topBusinesses]
                    .sort((a, b) => {
                      if (sortBy === 'views') {
                        return sortOrder === 'desc' ? b.views - a.views : a.views - b.views;
                      } else {
                        const nameA = (a.businessName || a.businessId).toLowerCase();
                        const nameB = (b.businessName || b.businessId).toLowerCase();
                        return sortOrder === 'asc' 
                          ? nameA.localeCompare(nameB)
                          : nameB.localeCompare(nameA);
                      }
                    })
                    .slice(0, 15)
                    .map((business, idx) => (
                    <tr key={business.businessId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <Link 
                          href={`/negocios?id=${business.businessId}`}
                          className="text-green-600 hover:text-green-700 hover:underline"
                        >
                          {business.businessName || business.businessId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {business.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </main>
  );
}

function StatCard({ title, value, icon, color, subtitle, trend }: { 
  title: string; 
  value: string; 
  icon: string; 
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
  trend?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  const trendData = formatTrend(trend);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`text-sm font-semibold ${trendData.color}`}>
                {trendData.icon} {trendData.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
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

function formatTrend(change: string | undefined): { text: string; color: string; icon: string } {
  if (!change || change === '0') {
    return { text: '0%', color: 'text-gray-500', icon: '=' };
  }
  const num = parseFloat(change);
  if (num > 0) {
    return { text: `+${change}%`, color: 'text-green-600', icon: '↑' };
  } else {
    return { text: `${change}%`, color: 'text-red-600', icon: '↓' };
  }
}
