'use client';

import { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { FaEye, FaPhone, FaWhatsapp, FaMapMarkerAlt, FaHeart, FaStar, FaShare, FaChartLine, FaMobileAlt, FaDesktop } from 'react-icons/fa';

type AnalyticsData = {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  overview: {
    totalEvents: number;
    businessViews: number;
    uniqueViewers: number;
    totalCTAClicks: number;
    conversionRate: number;
    engagementRate: number;
  };
  ctas: {
    call: number;
    whatsapp: number;
    maps: number;
    facebook: number;
    instagram: number;
    website: number;
    email: number;
    total: number;
    topCTAs: Array<{ type: string; count: number }>;
  };
  engagement: {
    favoritesAdded: number;
    favoritesRemoved: number;
    netFavorites: number;
    reviewsSubmitted: number;
    reviewsEdited: number;
    reviewsDeleted: number;
    imageViews: number;
    hoursChecked: number;
    shares: number;
  };
  trends: {
    last7Days: Array<{ date: string; views: number; ctas: number; favorites: number }>;
  };
  audience: {
    devices: {
      mobile: number;
      desktop: number;
      unknown: number;
    };
    topHours: Array<{ hour: number; count: number }>;
  };
};

type Props = {
  businessId: string;
};

export default function BusinessAnalytics({ businessId }: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30); // días

  useEffect(() => {
    async function fetchAnalytics() {
      if (!businessId) {
        setError('ID de negocio no disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const user = auth.currentUser;
        if (!user) {
          setError('Debes iniciar sesión para ver las estadísticas');
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();
        const response = await fetch(`/api/business/${businessId}/analytics?days=${period}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al cargar estadísticas');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [businessId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38761D] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  const { overview, ctas, engagement, trends, audience } = analytics;

  // Nombres en español para CTAs
  const ctaLabels: Record<string, string> = {
    call: 'Llamadas',
    whatsapp: 'WhatsApp',
    maps: 'Google Maps',
    facebook: 'Facebook',
    instagram: 'Instagram',
    website: 'Sitio Web',
    email: 'Email',
  };

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Estadísticas del Negocio</h2>
        <div className="flex gap-2">
          {[7, 15, 30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === days
                  ? 'bg-[#38761D] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<FaEye className="text-blue-500" />}
          label="Vistas"
          value={overview.businessViews}
          subtitle={`${overview.uniqueViewers} visitantes únicos`}
        />
        <StatCard
          icon={<FaChartLine className="text-green-500" />}
          label="Tasa de Conversión"
          value={`${overview.conversionRate}%`}
          subtitle={`${overview.totalCTAClicks} clics en CTAs`}
        />
        <StatCard
          icon={<FaHeart className="text-red-500" />}
          label="Engagement"
          value={`${overview.engagementRate}%`}
          subtitle="Interacciones / Vistas"
        />
      </div>

      {/* Gráfico de tendencias (últimos 7 días) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia (últimos 7 días)</h3>
        <div className="space-y-3">
          {trends.last7Days.map((day, index) => {
            const maxValue = Math.max(...trends.last7Days.map(d => Math.max(d.views, d.ctas, d.favorites)));
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">{new Date(day.date).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="text-gray-500">{day.views} vistas</span>
                </div>
                <div className="flex gap-1 h-8">
                  <div
                    className="bg-blue-500 rounded"
                    style={{ width: `${maxValue > 0 ? (day.views / maxValue) * 100 : 0}%` }}
                    title={`${day.views} vistas`}
                  />
                  <div
                    className="bg-green-500 rounded"
                    style={{ width: `${maxValue > 0 ? (day.ctas / maxValue) * 100 : 0}%` }}
                    title={`${day.ctas} CTAs`}
                  />
                  <div
                    className="bg-red-500 rounded"
                    style={{ width: `${maxValue > 0 ? (day.favorites / maxValue) * 100 : 0}%` }}
                    title={`${day.favorites} favoritos`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-gray-600">Vistas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-600">CTAs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-600">Favoritos</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clics en Acciones (CTAs)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ctas.topCTAs.slice(0, 4).map((cta, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">
                {cta.type === 'call' && <FaPhone className="text-blue-500 mx-auto" />}
                {cta.type === 'whatsapp' && <FaWhatsapp className="text-green-500 mx-auto" />}
                {cta.type === 'maps' && <FaMapMarkerAlt className="text-red-500 mx-auto" />}
              </div>
              <p className="text-2xl font-bold text-gray-900">{cta.count}</p>
              <p className="text-sm text-gray-600">{ctaLabels[cta.type] || cta.type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interacciones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EngagementStat icon={<FaHeart />} label="Favoritos" value={`+${engagement.netFavorites}`} />
          <EngagementStat icon={<FaStar />} label="Reseñas" value={engagement.reviewsSubmitted} />
          <EngagementStat icon={<FaShare />} label="Compartidos" value={engagement.shares} />
          <EngagementStat icon={<FaEye />} label="Imágenes vistas" value={engagement.imageViews} />
        </div>
      </div>

      {/* Audiencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dispositivos */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispositivos</h3>
          <div className="space-y-3">
            <DeviceBar icon={<FaMobileAlt />} label="Móvil" value={audience.devices.mobile} total={overview.businessViews} />
            <DeviceBar icon={<FaDesktop />} label="Escritorio" value={audience.devices.desktop} total={overview.businessViews} />
          </div>
        </div>

        {/* Horarios populares */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Horarios Populares</h3>
          <div className="space-y-2">
            {audience.topHours.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatHour(item.hour)}</span>
                <span className="font-medium text-gray-900">{item.count} visitas</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string | number; subtitle: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">{icon}</div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function EngagementStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <div className="text-2xl text-gray-700 mb-2 flex justify-center">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function DeviceBar({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-600">{value} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-[#38761D] h-2 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}
