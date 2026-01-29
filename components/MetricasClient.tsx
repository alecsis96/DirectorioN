'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart2, TrendingUp, Eye, Phone, MessageCircle, Star } from 'lucide-react';

type BusinessMetric = {
  businessId: string;
  businessName: string;
  plan: string;
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

  // Calcular totales
  const totals = useMemo(() => {
    return filteredMetrics.reduce(
      (acc, m) => ({
        views: acc.views + m.views,
        phoneClicks: acc.phoneClicks + m.phoneClicks,
        whatsappClicks: acc.whatsappClicks + m.whatsappClicks,
        mapClicks: acc.mapClicks + m.mapClicks,
        favoriteAdds: acc.favoriteAdds + m.favoriteAdds,
        totalReviews: acc.totalReviews + m.totalReviews,
      }),
      { views: 0, phoneClicks: 0, whatsappClicks: 0, mapClicks: 0, favoriteAdds: 0, totalReviews: 0 }
    );
  }, [filteredMetrics]);

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
        </div>

        {/* Métricas por Negocio */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#38761D]" />
            Detalle por Negocio
          </h2>

          <div className="space-y-6">
            {filteredMetrics.map((metric) => (
              <div key={metric.businessId} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{metric.businessName}</h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                        metric.plan === 'sponsor'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {metric.plan === 'sponsor' ? '👑 Sponsor' : '⭐ Featured'}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/${metric.businessId}`}
                    className="text-sm text-[#38761D] hover:text-[#2d5418] font-medium"
                  >
                    Ver Dashboard →
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Vistas</p>
                    <p className="text-xl font-bold text-blue-600">{metric.views}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Tel.</p>
                    <p className="text-xl font-bold text-green-600">{metric.phoneClicks}</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">WhatsApp</p>
                    <p className="text-xl font-bold text-emerald-600">{metric.whatsappClicks}</p>
                  </div>
                  <div className="text-center p-3 bg-sky-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Maps</p>
                    <p className="text-xl font-bold text-sky-600">{metric.mapClicks}</p>
                  </div>
                  <div className="text-center p-3 bg-rose-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">❤️</p>
                    <p className="text-xl font-bold text-rose-600">{metric.favoriteAdds}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Reseñas</p>
                    <p className="text-xl font-bold text-amber-600">{metric.totalReviews}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Rating</p>
                    <p className="text-xl font-bold text-purple-600">
                      {metric.avgRating > 0 ? `${metric.avgRating}★` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
