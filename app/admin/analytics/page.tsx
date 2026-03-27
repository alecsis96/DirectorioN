'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

import { auth } from '../../../firebaseConfig';
import { hasAdminOverride } from '../../../lib/adminOverrides';

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

function formatEventName(event: string): string {
  const names: Record<string, string> = {
    page_view: 'Vista de pagina',
    search: 'Busqueda',
    business_viewed: 'Negocio visto',
    business_card_clicked: 'Card tocada',
    cta_call: 'Llamada',
    cta_whatsapp: 'WhatsApp',
    cta_maps: 'Maps',
    cta_facebook: 'Facebook',
    favorite_added: 'Favorito',
    review_submitted: 'Resena enviada',
    register_completed: 'Registro completado',
  };
  return names[event] || event;
}

function formatCTAName(type: string): string {
  const names: Record<string, string> = {
    cta_call: 'Llamada',
    cta_whatsapp: 'WhatsApp',
    cta_maps: 'Maps',
    cta_facebook: 'Facebook',
    cta_instagram: 'Instagram',
    cta_website: 'Sitio web',
    cta_email: 'Email',
  };
  return names[type] || type;
}

function formatTrend(change?: string) {
  if (!change || change === '0') return null;
  const value = parseFloat(change);
  if (Number.isNaN(value)) return null;
  return {
    text: `${value > 0 ? '+' : ''}${change}%`,
    className: value > 0 ? 'text-emerald-700' : 'text-red-700',
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [ctaFilter, setCtaFilter] = useState('');

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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetcher = async (url: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated');

    const token = await user.getIdToken();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    return response.json();
  };

  const { data, error: swrError } = useSWR<AnalyticsData>(
    isAdmin ? `/api/admin/analytics?timeRange=${timeRange}` : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  useEffect(() => {
    if (swrError) setError(swrError.message);
    else setError(null);
  }, [swrError]);

  const exportToCSV = () => {
    if (!data) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const csvData: string[] = [];
    csvData.push('Analytics YajaGon');
    csvData.push(`Generado,${new Date().toLocaleString()}`);
    csvData.push(`Periodo,${timeRange}`);
    csvData.push('');
    csvData.push('Resumen');
    csvData.push(`Eventos,${data.totalEvents}`);
    csvData.push(`Usuarios unicos,${data.uniqueUsers}`);
    csvData.push(`Page views,${data.pageViews}`);
    csvData.push(`Busquedas,${data.userEngagement.searches}`);
    csvData.push('');
    csvData.push('Top eventos');
    csvData.push('Evento,Cantidad');
    data.topEvents.forEach((item) => csvData.push(`${formatEventName(item.event)},${item.count}`));
    csvData.push('');
    csvData.push('Top CTAs');
    csvData.push('CTA,Cantidad');
    data.topCTAs.forEach((item) => csvData.push(`${formatCTAName(item.type)},${item.count}`));
    csvData.push('');
    csvData.push('Top negocios');
    csvData.push('Negocio,Vistas');
    data.topBusinesses.forEach((item) =>
      csvData.push(`"${(item.businessName || item.businessId).replace(/"/g, '""')}",${item.views}`)
    );

    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${timeRange}-${timestamp}.csv`;
    link.click();
  };

  const filteredTopBusinesses = useMemo(() => {
    if (!data) return [];
    const term = searchTerm.trim().toLowerCase();
    return data.topBusinesses
      .filter((business) =>
        !term ? true : (business.businessName || business.businessId).toLowerCase().includes(term)
      )
      .slice(0, 12);
  }, [data, searchTerm]);

  const filteredTopEvents = useMemo(() => {
    if (!data) return [];
    const term = eventFilter.trim().toLowerCase();
    return data.topEvents
      .filter((item) => !term || formatEventName(item.event).toLowerCase().includes(term) || item.event.toLowerCase().includes(term))
      .slice(0, 10);
  }, [data, eventFilter]);

  const filteredTopCTAs = useMemo(() => {
    if (!data) return [];
    const term = ctaFilter.trim().toLowerCase();
    return data.topCTAs
      .filter((item) => !term || formatCTAName(item.type).toLowerCase().includes(term) || item.type.toLowerCase().includes(term))
      .slice(0, 10);
  }, [data, ctaFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !data) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Secundario</p>
            <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Analytics</h1>
            <p className="text-sm text-gray-600">Vista compacta de comportamiento, sin ruido de dashboard pesado.</p>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center rounded-xl bg-[#38761D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2d5a16]"
          >
            Exportar CSV
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(['today', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  timeRange === range ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range === 'today' ? 'Hoy' : range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : 'Todo'}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <SummaryCard title="Eventos" value={data.totalEvents.toLocaleString()} trend={formatTrend(data.comparison?.totalEventsChange)} />
          <SummaryCard title="Usuarios unicos" value={data.uniqueUsers.toLocaleString()} trend={formatTrend(data.comparison?.sessionsChange)} />
          <SummaryCard title="Page views" value={data.pageViews.toLocaleString()} trend={formatTrend(data.comparison?.pageViewsChange)} />
          <SummaryCard title="Busquedas" value={data.userEngagement.searches.toLocaleString()} />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-3">
          <Panel title="Actividad rapida">
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Hoy" value={data.timeRangeStats.today} />
              <MiniMetric label="Ayer" value={data.timeRangeStats.yesterday} />
              <MiniMetric label="Ultimos 7 dias" value={data.timeRangeStats.last7Days} />
              <MiniMetric label="Ultimos 30 dias" value={data.timeRangeStats.last30Days} />
            </div>
          </Panel>

          <Panel title="Engagement">
            <div className="space-y-3 text-sm text-gray-700">
              <MetricRow label="Favoritos" value={data.userEngagement.favorites} />
              <MetricRow label="Resenas" value={data.userEngagement.reviews} />
              <MetricRow label="Registros" value={data.userEngagement.registrations} />
              <MetricRow label="Anonimos" value={`${data.anonymousRate || '0'}%`} />
            </div>
          </Panel>

          <Panel title="Errores recientes">
            {data.recentErrors.length === 0 ? (
              <p className="text-sm text-gray-500">Sin errores recientes.</p>
            ) : (
              <div className="space-y-3">
                {data.recentErrors.slice(0, 5).map((item, index) => (
                  <div key={`${item.message}-${index}`} className="rounded-xl border border-red-100 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-900">{item.message}</p>
                    <p className="mt-1 text-xs text-red-700">
                      {item.count} veces / {new Date(item.lastOccurred).toLocaleString('es-MX')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Panel title="Top eventos">
            <input
              type="text"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              placeholder="Filtrar evento"
              className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            <ListRows
              items={filteredTopEvents.map((item) => ({
                label: formatEventName(item.event),
                value: item.count.toLocaleString(),
              }))}
              empty="Sin eventos para este filtro."
            />
          </Panel>

          <Panel title="Top CTAs">
            <input
              type="text"
              value={ctaFilter}
              onChange={(event) => setCtaFilter(event.target.value)}
              placeholder="Filtrar CTA"
              className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            <ListRows
              items={filteredTopCTAs.map((item) => ({
                label: formatCTAName(item.type),
                value: item.count.toLocaleString(),
              }))}
              empty="Sin CTAs para este filtro."
            />
          </Panel>

          <Panel title="Top negocios">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filtrar negocio"
              className="mb-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
            />
            {filteredTopBusinesses.length === 0 ? (
              <p className="text-sm text-gray-500">Sin negocios para este filtro.</p>
            ) : (
              <div className="space-y-3">
                {filteredTopBusinesses.map((business) => (
                  <div key={business.businessId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <Link
                      href={`/negocios?id=${business.businessId}`}
                      className="min-w-0 truncate text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                    >
                      {business.businessName || business.businessId}
                    </Link>
                    <span className="text-sm font-semibold text-gray-900">{business.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend?: { text: string; className: string } | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend ? <span className={`text-sm font-semibold ${trend.className}`}>{trend.text}</span> : null}
      </div>
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

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

function ListRows({
  items,
  empty,
}: {
  items: Array<{ label: string; value: string }>;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{item.label}</span>
          <span className="text-sm font-semibold text-gray-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
