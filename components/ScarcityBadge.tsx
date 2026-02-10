/**
 * 🔥 Componente de Escasez Visual
 * Muestra disponibilidad de planes con urgencia psicológica
 */

'use client';

import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiClock, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { canUpgradeToPlan, getUrgencyColor, getScarcityMetrics } from '@/lib/scarcitySystem';
import type { BusinessPlan } from '@/lib/planPermissions';
import type { Zone } from '@/lib/scarcitySystem';

interface ScarcityBadgeProps {
  categoryId: string;
  currentPlan: BusinessPlan;
  targetPlan: BusinessPlan;
  zone?: Zone;
  specialty?: string;
  variant?: 'inline' | 'card' | 'banner';
  showMetrics?: boolean;
}

export default function ScarcityBadge({
  categoryId,
  currentPlan,
  targetPlan,
  zone,
  specialty,
  variant = 'inline',
  showMetrics = false,
}: ScarcityBadgeProps) {
  const [availability, setAvailability] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailability();
    if (showMetrics) {
      loadMetrics();
    }
  }, [categoryId, targetPlan, zone, specialty]);

  async function loadAvailability() {
    try {
      setLoading(true);
      const result = await canUpgradeToPlan(categoryId, targetPlan, zone, specialty);
      setAvailability(result);
    } catch (error) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    try {
      const metricsData = await getScarcityMetrics(categoryId);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
    );
  }

  if (!availability || availability.urgencyLevel === 'none') {
    return null; // No mostrar si no hay escasez
  }

  const colors = getUrgencyColor(availability.urgencyLevel);

  // ============================================
  // VARIANT: INLINE (pequeño, para formularios)
  // ============================================
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
        <span>{colors.icon}</span>
        <span>
          {availability.allowed 
            ? `${availability.slotsLeft} ${availability.slotsLeft === 1 ? 'lugar' : 'lugares'} disponibles`
            : 'Cupo lleno'
          }
        </span>
      </div>
    );
  }

  // ============================================
  // VARIANT: CARD (grande, para secciones)
  // ============================================
  if (variant === 'card') {
    return (
      <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-6 shadow-lg`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`text-4xl ${colors.icon}`}>
              {availability.urgencyLevel === 'critical' ? '🚨' : 
               availability.urgencyLevel === 'high' ? '🔥' : 
               availability.urgencyLevel === 'medium' ? '⚠️' : 'ℹ️'}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${colors.text}`}>
                {availability.allowed ? 'Disponibilidad Limitada' : 'Cupo Lleno'}
              </h3>
              <p className={`text-sm ${colors.text} opacity-80`}>
                Plan {targetPlan === 'featured' ? 'Destacado' : 'Patrocinado'}
              </p>
            </div>
          </div>
          
          {/* Contador visual */}
          {availability.allowed && (
            <div className="text-center">
              <div className={`text-3xl font-black ${colors.text}`}>
                {availability.slotsLeft}
              </div>
              <div className={`text-xs ${colors.text} opacity-70`}>
                de {availability.totalSlots}
              </div>
            </div>
          )}
        </div>

        {/* Mensaje principal */}
        <p className={`text-base font-medium ${colors.text} mb-4`}>
          {availability.message}
        </p>

        {/* Barra de progreso */}
        {availability.allowed && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  availability.urgencyLevel === 'critical' ? 'bg-red-600' :
                  availability.urgencyLevel === 'high' ? 'bg-orange-500' :
                  availability.urgencyLevel === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ 
                  width: `${((availability.totalSlots - availability.slotsLeft) / availability.totalSlots) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1 text-right">
              {Math.round(((availability.totalSlots - availability.slotsLeft) / availability.totalSlots) * 100)}% ocupado
            </p>
          </div>
        )}

        {/* Stats adicionales */}
        {showMetrics && metrics && (
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-300">
            <div className="text-center">
              <FiUsers className="inline text-gray-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">
                {metrics.totalBusinesses}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            
            <div className="text-center">
              <FiTrendingUp className="inline text-amber-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">
                {metrics.byPlan[targetPlan]}
              </div>
              <div className="text-xs text-gray-600">
                {targetPlan === 'featured' ? 'Destacados' : 'Patrocinados'}
              </div>
            </div>
            
            <div className="text-center">
              <FiClock className="inline text-red-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">
                {Math.round(metrics.saturation[targetPlan])}%
              </div>
              <div className="text-xs text-gray-600">Saturación</div>
            </div>
          </div>
        )}

        {/* Lista de espera */}
        {!availability.allowed && availability.waitlistPosition && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className={`text-sm font-medium ${colors.text} mb-2`}>
              📝 Lista de Espera - Posición #{availability.waitlistPosition}
            </p>
            <p className="text-xs text-gray-700">
              Serás notificado cuando haya un lugar disponible. 
              Tendrás 48 horas para confirmar.
            </p>
            <button className="mt-3 w-full py-2 px-4 bg-white border-2 border-gray-800 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Unirme a Lista de Espera
            </button>
          </div>
        )}

        {/* CTA si hay disponibilidad */}
        {availability.allowed && availability.urgencyLevel !== 'none' && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <button className={`w-full py-3 px-6 font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg ${
              availability.urgencyLevel === 'critical' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : availability.urgencyLevel === 'high'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
            }`}>
              {availability.slotsLeft === 1 
                ? '🔥 ¡Asegurar Último Lugar!' 
                : '⚡ Reservar Ahora'
              }
            </button>
            {availability.urgencyLevel === 'critical' && (
              <p className="text-xs text-center text-gray-600 mt-2">
                ⏰ Este lugar puede desaparecer en minutos
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // VARIANT: BANNER (horizontal, para headers)
  // ============================================
  if (variant === 'banner') {
    return (
      <div className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg}`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{colors.icon}</div>
          <div>
            <p className={`font-bold ${colors.text}`}>
              {availability.message}
            </p>
            {availability.allowed && (
              <p className={`text-sm ${colors.text} opacity-80`}>
                {availability.slotsLeft === 1 
                  ? 'Último lugar disponible en este plan'
                  : `Solo ${availability.slotsLeft} lugares restantes`
                }
              </p>
            )}
          </div>
        </div>

        {availability.allowed && (
          <button className={`px-6 py-2 font-bold rounded-lg transition-colors ${
            availability.urgencyLevel === 'critical'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}>
            Reservar
          </button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * 🏆 Componente de Competencia en Categoría
 * Muestra quién más está en la categoría para crear FOMO
 */
interface CategoryCompetitionProps {
  categoryId: string;
  currentBusinessId: string;
  showCompetitors?: boolean;
}

export function CategoryCompetition({
  categoryId,
  currentBusinessId,
  showCompetitors = false,
}: CategoryCompetitionProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [categoryId]);

  async function loadMetrics() {
    try {
      const data = await getScarcityMetrics(categoryId);
      setMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  }

  if (loading || !metrics) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiUsers className="text-purple-600" />
        Competencia en tu Categoría
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 text-center shadow-sm">
          <div className="text-2xl font-black text-gray-900">
            {metrics.totalBusinesses}
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">
            Total Negocios
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-3 text-center shadow-sm border border-amber-200">
          <div className="text-2xl font-black text-amber-700">
            {metrics.byPlan.featured}
          </div>
          <div className="text-xs text-amber-800 uppercase tracking-wide">
            Destacados
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-3 text-center shadow-sm border border-purple-200">
          <div className="text-2xl font-black text-purple-700">
            {metrics.byPlan.sponsor}
          </div>
          <div className="text-xs text-purple-800 uppercase tracking-wide">
            Líderes
          </div>
        </div>
      </div>

      {/* Nivel de competencia */}
      <div className={`p-4 rounded-lg ${
        metrics.competitionLevel === 'saturated' ? 'bg-red-100 border border-red-300' :
        metrics.competitionLevel === 'high' ? 'bg-orange-100 border border-orange-300' :
        metrics.competitionLevel === 'medium' ? 'bg-yellow-100 border border-yellow-300' :
        'bg-green-100 border border-green-300'
      }`}>
        <p className={`font-semibold text-sm ${
          metrics.competitionLevel === 'saturated' ? 'text-red-900' :
          metrics.competitionLevel === 'high' ? 'text-orange-900' :
          metrics.competitionLevel === 'medium' ? 'text-yellow-900' :
          'text-green-900'
        }`}>
          {metrics.competitionLevel === 'saturated' && '🔴 Categoría Saturada'}
          {metrics.competitionLevel === 'high' && '🟠 Competencia Alta'}
          {metrics.competitionLevel === 'medium' && '🟡 Competencia Media'}
          {metrics.competitionLevel === 'low' && '🟢 Baja Competencia'}
        </p>
        <p className="text-xs text-gray-700 mt-1">
          {metrics.competitionLevel === 'saturated' && 
            'Planes patrocinados llenos. Únete a la lista de espera.'}
          {metrics.competitionLevel === 'high' && 
            'Los espacios se están llenando rápido. Actúa ahora.'}
          {metrics.competitionLevel === 'medium' && 
            'Aún hay espacios disponibles para destacar.'}
          {metrics.competitionLevel === 'low' && 
            '¡Excelente oportunidad! Sé de los primeros en destacar.'}
        </p>
      </div>

      {/* Mensaje motivacional */}
      {metrics.byPlan.free > metrics.byPlan.featured + metrics.byPlan.sponsor && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700">
            💡 <span className="font-semibold">Tip:</span> {metrics.byPlan.free} negocios están en plan gratuito.
            Destaca sobre ellos con un plan premium.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ⏰ Timer de Urgencia (cuenta regresiva)
 */
interface UrgencyTimerProps {
  expiresAt: Date;
  offerName: string;
}

export function UrgencyTimer({ expiresAt, offerName }: UrgencyTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = expiresAt.getTime() - now;

      if (distance < 0) {
        setTimeLeft('Expirado');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (timeLeft === 'Expirado') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-3 rounded-lg shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiClock className="text-2xl" />
          <div>
            <p className="text-sm font-medium opacity-90">{offerName}</p>
            <p className="text-xs opacity-75">Termina en:</p>
          </div>
        </div>
        <div className="text-2xl font-mono font-black">
          {timeLeft}
        </div>
      </div>
    </div>
  );
}
