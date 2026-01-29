'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2, TrendingUp, Eye, Phone, MessageCircle, Star, Lock, Crown } from 'lucide-react';
import { 
  normalizePlan, 
  isMetricAllowed, 
  hasMetricsAccess, 
  getUpgradeMessage,
  type BusinessPlan,
  type MetricType,
  ALL_METRICS
} from '../lib/metricsConfig';

type BusinessMetric = {
  businessId: string;
  businessName: string;
  plan: string;
  status?: string;
  views: number;
  phoneClicks: number;
  whatsappClicks: number;
  mapClicks: number;
  favoriteAdds: number;
  totalReviews: number;
  avgRating: number;
};

type Props = {
  metrics: BusinessMetric[];
};

export default function MetricasClient({ metrics }: Props) {
  const [period, setPeriod] = useState<7 | 30>(30);

  // Filtrar métricas por período (simulado - en producción vendría del server)
  const filteredMetrics = useMemo(() => {
    // Por ahora devolvemos todos, pero la idea es que el server
    // filtre según el período seleccionado
    // En futuro: hacer fetch a API con el período
    return metrics;
  }, [metrics, period]);

  // Detectar si hay al menos un negocio con plan featured o sponsor
  const hasAnyPremiumBusiness = useMemo(() => {
    return filteredMetrics.some(m => {
      const plan = normalizePlan(m.plan);
      return plan === 'featured' || plan === 'sponsor';
    });
  }, [filteredMetrics]);

  // Calcular totales SOLO de métricas permitidas según los planes
  const totals = useMemo(() => {
    return filteredMetrics.reduce(
      (acc, m) => {
        const plan = normalizePlan(m.plan);
        
        // Solo sumar métricas si el negocio tiene acceso a ellas
        if (isMetricAllowed('views', plan)) acc.views += m.views;
        if (isMetricAllowed('phoneClicks', plan)) acc.phoneClicks += m.phoneClicks;
        if (isMetricAllowed('whatsappClicks', plan)) acc.whatsappClicks += m.whatsappClicks;
        if (isMetricAllowed('mapClicks', plan)) acc.mapClicks += m.mapClicks;
        if (isMetricAllowed('favoriteAdds', plan)) acc.favoriteAdds += m.favoriteAdds;
        if (isMetricAllowed('totalReviews', plan)) acc.totalReviews += m.totalReviews;
        
        return acc;
      },
      { views: 0, phoneClicks: 0, whatsappClicks: 0, mapClicks: 0, favoriteAdds: 0, totalReviews: 0 }
    );
  }, [filteredMetrics]);

  // Verificar si alguna métrica del resumen está desbloqueada
  const hasSomeUnlockedMetrics = useMemo(() => {
    return filteredMetrics.some(m => hasMetricsAccess(normalizePlan(m.plan)));
  }, [filteredMetrics]);

  // Componente para métrica bloqueada
  const LockedMetric = ({ label }: { label: string }) => (
    <div className="bg-gray-50 rounded-xl shadow-sm p-5 relative opacity-60">
      <div className="flex flex-col gap-2">
        <div className="p-2.5 bg-gray-200 rounded-lg w-fit">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-400">🔒</p>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
        <span className="text-xs text-gray-600 font-medium px-2 py-1 bg-gray-100 rounded-md">
          Plan Patrocinado
        </span>
      </div>
    </div>
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

        {/* Header con selector de período */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#38761D] rounded-lg flex items-center justify-center">
                <BarChart2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Métricas de Rendimiento
                </h1>
                <p className="text-sm text-gray-600">
                  Últimos {period} días
                </p>
              </div>
            </div>

            {/* Selector de Período */}
            <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setPeriod(7)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                  period === 7
                    ? 'bg-[#38761D] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setPeriod(30)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                  period === 30
                    ? 'bg-[#38761D] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                30 días
              </button>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Vistas - Disponible en Featured+ */}
          {hasSomeUnlockedMetrics && isMetricAllowed('views', 'featured') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-blue-100 rounded-lg w-fit">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Vistas</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.views}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="Vistas" />
          )}

          {/* Llamadas - Disponible en Featured+ */}
          {hasSomeUnlockedMetrics && isMetricAllowed('phoneClicks', 'featured') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-green-100 rounded-lg w-fit">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Llamadas</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.phoneClicks}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="Llamadas" />
          )}

          {/* WhatsApp - Disponible en Featured+ */}
          {hasSomeUnlockedMetrics && isMetricAllowed('whatsappClicks', 'featured') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-emerald-100 rounded-lg w-fit">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">WhatsApp</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.whatsappClicks}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="WhatsApp" />
          )}

          {/* Cómo llegar - Solo Sponsor */}
          {hasSomeUnlockedMetrics && isMetricAllowed('mapClicks', 'sponsor') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-blue-100 rounded-lg w-fit">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Cómo llegar</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.mapClicks}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="Cómo llegar" />
          )}

          {/* Favoritos - Solo Sponsor */}
          {hasSomeUnlockedMetrics && isMetricAllowed('favoriteAdds', 'sponsor') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-red-100 rounded-lg w-fit">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Favoritos</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.favoriteAdds}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="Favoritos" />
          )}

          {/* Reseñas - Solo Sponsor */}
          {hasSomeUnlockedMetrics && isMetricAllowed('totalReviews', 'sponsor') ? (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-amber-100 rounded-lg w-fit">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Reseñas</p>
                  <p className="text-2xl font-bold text-gray-900">{totals.totalReviews}</p>
                </div>
              </div>
            </div>
          ) : (
            <LockedMetric label="Reseñas" />
          )}
        </div>

        {/* Métricas por Negocio */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#38761D]" />
            Detalle por Negocio
          </h2>

          <div className="space-y-6">
            {filteredMetrics.map((metric) => {
              const plan = normalizePlan(metric.plan);
              const hasAccess = hasMetricsAccess(plan);

              // Si el plan es FREE, mostrar estado especial
              if (!hasAccess) {
                return (
                  <div key={metric.businessId} className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{metric.businessName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            🆓 Free
                          </span>
                          {metric.status && (
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                metric.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : metric.status === 'review'
                                  ? 'bg-blue-100 text-blue-700'
                                  : metric.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {metric.status === 'published'
                                ? '✓ Publicado'
                                : metric.status === 'review'
                                ? '🔍 En revisión'
                                : metric.status === 'draft'
                                ? '📝 Borrador'
                                : metric.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-center py-8">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-4">
                        {getUpgradeMessage(plan)}
                      </p>
                      <Link
                        href="/para-negocios#planes"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#38761D] text-white rounded-lg hover:bg-[#2d5418] transition"
                      >
                        <Crown className="w-4 h-4" />
                        Actualizar Plan
                      </Link>
                    </div>
                  </div>
                );
              }

              // Para planes Featured y Sponsor, mostrar métricas según permisos
              return (
                <div key={metric.businessId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{metric.businessName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            metric.plan === 'sponsor'
                              ? 'bg-purple-100 text-purple-700'
                              : metric.plan === 'featured'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {metric.plan === 'sponsor' 
                            ? '👑 Sponsor' 
                            : metric.plan === 'featured' 
                            ? '⭐ Featured' 
                            : '🆓 Free'}
                        </span>
                        {metric.status && (
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              metric.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : metric.status === 'review'
                                ? 'bg-blue-100 text-blue-700'
                                : metric.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {metric.status === 'published'
                              ? '✓ Publicado'
                              : metric.status === 'review'
                              ? '🔍 En revisión'
                              : metric.status === 'draft'
                              ? '📝 Borrador'
                              : metric.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/${metric.businessId}`}
                      className="text-sm text-[#38761D] hover:text-[#2d5418] font-medium"
                    >
                      Ver Dashboard →
                    </Link>
                  </div>

                  {/* Banner de upgrade para Featured */}
                  {plan === 'featured' && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                      <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800 mb-1">
                          <strong>Métricas parciales:</strong> Tu plan Destacado incluye Vistas, WhatsApp y Llamadas.
                        </p>
                        <Link 
                          href="/para-negocios#planes" 
                          className="text-xs text-amber-700 hover:text-amber-900 underline font-medium"
                        >
                          Actualiza a Patrocinado para ver todas las métricas
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                    {/* Vistas - Featured+ */}
                    {isMetricAllowed('views', plan) ? (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Vistas</p>
                        <p className="text-xl font-bold text-blue-600">{metric.views}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">Vistas</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">Bloqueado</p>
                      </div>
                    )}

                    {/* Teléfono - Featured+ */}
                    {isMetricAllowed('phoneClicks', plan) ? (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Tel.</p>
                        <p className="text-xl font-bold text-green-600">{metric.phoneClicks}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">Tel.</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">Bloqueado</p>
                      </div>
                    )}

                    {/* WhatsApp - Featured+ */}
                    {isMetricAllowed('whatsappClicks', plan) ? (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">WhatsApp</p>
                        <p className="text-xl font-bold text-emerald-600">{metric.whatsappClicks}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">WhatsApp</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">Bloqueado</p>
                      </div>
                    )}

                    {/* Maps - Solo Sponsor */}
                    {isMetricAllowed('mapClicks', plan) ? (
                      <div className="text-center p-3 bg-sky-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Maps</p>
                        <p className="text-xl font-bold text-sky-600">{metric.mapClicks}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">Maps</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">
                          {plan === 'featured' ? 'Solo Sponsor' : 'Bloqueado'}
                        </p>
                      </div>
                    )}

                    {/* Favoritos - Solo Sponsor */}
                    {isMetricAllowed('favoriteAdds', plan) ? (
                      <div className="text-center p-3 bg-rose-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">❤️</p>
                        <p className="text-xl font-bold text-rose-600">{metric.favoriteAdds}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">❤️</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">
                          {plan === 'featured' ? 'Solo Sponsor' : 'Bloqueado'}
                        </p>
                      </div>
                    )}

                    {/* Reseñas - Solo Sponsor */}
                    {isMetricAllowed('totalReviews', plan) ? (
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Reseñas</p>
                        <p className="text-xl font-bold text-amber-600">{metric.totalReviews}</p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">Reseñas</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">
                          {plan === 'featured' ? 'Solo Sponsor' : 'Bloqueado'}
                        </p>
                      </div>
                    )}

                    {/* Rating - Solo Sponsor */}
                    {isMetricAllowed('avgRating', plan) ? (
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Rating</p>
                        <p className="text-xl font-bold text-purple-600">
                          {metric.avgRating > 0 ? `${metric.avgRating}★` : '-'}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-100 rounded-lg relative opacity-60">
                        <p className="text-xs text-gray-500 mb-1">Rating</p>
                        <Lock className="w-5 h-5 text-gray-400 mx-auto" />
                        <p className="text-[10px] text-gray-500 mt-1">
                          {plan === 'featured' ? 'Solo Sponsor' : 'Bloqueado'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
