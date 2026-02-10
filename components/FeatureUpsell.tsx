/**
 * 🎯 Componente de Upsell Elegante
 * Sistema modular para mostrar features bloqueados sin frustrar al usuario
 */

'use client';

import React from 'react';
import Link from 'next/link';
import type { BusinessPlan } from '../lib/planPermissions';
import { 
  getUpsellMessage, 
  getUpgradeValueProp,
  getRecommendedUpgrade,
  PLAN_PRICING 
} from '../lib/planPermissions';

/**
 * 🎨 VARIANTES DE DISEÑO
 */
type UpsellVariant = 
  | 'inline'      // Pequeño, dentro de formularios
  | 'card'        // Tarjeta mediana, standalone
  | 'banner'      // Banner horizontal, arriba de secciones
  | 'modal'       // Fullscreen/modal (para bloqueos críticos)
  | 'tooltip';    // Pequeño tooltip en hover

/**
 * Props del componente
 */
interface FeatureUpsellProps {
  feature: string;
  currentPlan: BusinessPlan;
  variant?: UpsellVariant;
  customMessage?: string;
  showPricing?: boolean;
  onUpgradeClick?: () => void;
  className?: string;
}

/**
 * 📦 COMPONENTE PRINCIPAL
 */
export default function FeatureUpsell({
  feature,
  currentPlan,
  variant = 'card',
  customMessage,
  showPricing = true,
  onUpgradeClick,
  className = '',
}: FeatureUpsellProps) {
  const valueProp = getUpgradeValueProp(currentPlan, feature);
  const recommendedPlan = getRecommendedUpgrade(currentPlan);
  const message = customMessage || getUpsellMessage(currentPlan, feature);
  
  if (!valueProp && !message) {
    return null; // No hay nada que mostrar
  }
  
  const pricing = recommendedPlan ? PLAN_PRICING[recommendedPlan] : null;
  
  // 🎨 Renderizado por variante
  switch (variant) {
    case 'inline':
      return <InlineUpsell message={message} valueProp={valueProp} onUpgradeClick={onUpgradeClick} className={className} />;
    
    case 'banner':
      return <BannerUpsell message={message} valueProp={valueProp} pricing={pricing} showPricing={showPricing} onUpgradeClick={onUpgradeClick} className={className} />;
    
    case 'modal':
      return <ModalUpsell message={message} valueProp={valueProp} pricing={pricing} showPricing={showPricing} onUpgradeClick={onUpgradeClick} className={className} />;
    
    case 'tooltip':
      return <TooltipUpsell message={message} className={className} />;
    
    case 'card':
    default:
      return <CardUpsell message={message} valueProp={valueProp} pricing={pricing} showPricing={showPricing} onUpgradeClick={onUpgradeClick} className={className} />;
  }
}

/**
 * 💎 VARIANTE INLINE
 * Uso: Dentro de formularios, al lado de inputs bloqueados
 */
function InlineUpsell({ message, valueProp, onUpgradeClick, className }: any) {
  return (
    <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span className="text-gray-600">{message || 'Disponible en planes premium'}</span>
      {valueProp && (
        <Link
          href="/para-negocios#planes"
          onClick={onUpgradeClick}
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          {valueProp.cta}
        </Link>
      )}
    </div>
  );
}

/**
 * 🎴 VARIANTE CARD
 * Uso: Secciones bloqueadas, galería, métricas
 */
function CardUpsell({ message, valueProp, pricing, showPricing, onUpgradeClick, className }: any) {
  return (
    <div className={`relative rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-8 text-center overflow-hidden ${className}`}>
      {/* Decoración de fondo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 left-4 w-20 h-20 bg-blue-400 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-4 right-4 w-32 h-32 bg-purple-400 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10">
        {/* Icono de candado premium */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        {/* Título y beneficio */}
        {valueProp && (
          <>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {valueProp.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              {valueProp.benefit}
            </p>
          </>
        )}
        
        {/* Mensaje fallback */}
        {!valueProp && message && (
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            {message}
          </p>
        )}
        
        {/* Pricing badge */}
        {showPricing && pricing && (
          <div className="inline-block mb-4 px-4 py-2 bg-white rounded-full shadow">
            <span className="text-sm text-gray-600">Desde </span>
            <span className="text-2xl font-bold text-gray-900">${pricing.price}</span>
            <span className="text-sm text-gray-600"> {pricing.currency}/{pricing.period.split(' ')[1]}</span>
          </div>
        )}
        
        {/* CTA Button */}
        <Link
          href="/para-negocios#planes"
          onClick={onUpgradeClick}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {valueProp?.cta || 'Ver Planes'}
        </Link>
        
        {/* Garantía o beneficio adicional */}
        <p className="text-xs text-gray-500 mt-4">
          ✨ Actualiza en cualquier momento · Sin permanencia
        </p>
      </div>
    </div>
  );
}

/**
 * 📢 VARIANTE BANNER
 * Uso: Arriba de secciones, alertas informativas
 */
function BannerUpsell({ message, valueProp, pricing, showPricing, onUpgradeClick, className }: any) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          {valueProp && (
            <p className="text-sm font-semibold text-gray-900">{valueProp.title}</p>
          )}
          <p className="text-sm text-gray-700">
            {valueProp?.benefit || message}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        {showPricing && pricing && (
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-600">Desde</p>
            <p className="text-lg font-bold text-gray-900">${pricing.price}/{pricing.period.split(' ')[1]}</p>
          </div>
        )}
        
        <Link
          href="/para-negocios#planes"
          onClick={onUpgradeClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow hover:shadow-lg transition-all text-sm whitespace-nowrap"
        >
          {valueProp?.cta || 'Actualizar'}
        </Link>
      </div>
    </div>
  );
}

/**
 * 🎭 VARIANTE MODAL
 * Uso: Bloqueos importantes, intercepciones
 */
function ModalUpsell({ message, valueProp, pricing, showPricing, onUpgradeClick, className }: any) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${className}`}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-full mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {valueProp?.title || 'Feature Premium'}
          </h2>
        </div>
        
        {/* Contenido */}
        <div className="p-6 text-center">
          <p className="text-gray-700 mb-6">
            {valueProp?.benefit || message}
          </p>
          
          {showPricing && pricing && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Plan {pricing.label}</p>
              <p className="text-3xl font-bold text-gray-900">
                ${pricing.price}
                <span className="text-base font-normal text-gray-600">/{pricing.period.split(' ')[1]}</span>
              </p>
              {pricing.badge && (
                <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {pricing.badge}
                </span>
              )}
            </div>
          )}
          
          <Link
            href="/para-negocios#planes"
            onClick={onUpgradeClick}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all mb-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {valueProp?.cta || 'Ver Planes y Precios'}
          </Link>
          
          <button
            onClick={onUpgradeClick}
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Continuar con plan actual
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 💬 VARIANTE TOOLTIP
 * Uso: Pequeños hints, iconos bloqueados
 */
function TooltipUpsell({ message, className }: any) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg ${className}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>{message || 'Premium'}</span>
    </div>
  );
}

/**
 * 🎁 COMPONENTE DE COMPARACIÓN DE PLANES
 * Para mostrar tabla completa
 */
interface PlanComparisonProps {
  currentPlan: BusinessPlan;
  highlightRecommended?: boolean;
}

export function PlanComparison({ currentPlan, highlightRecommended = true }: PlanComparisonProps) {
  const recommendedPlan = getRecommendedUpgrade(currentPlan);
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Compara características por plan
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Característica</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">
                Gratis
                {currentPlan === 'free' && (
                  <span className="block text-xs text-blue-600 font-normal mt-1">Tu plan actual</span>
                )}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">
                Destacado
                {currentPlan === 'featured' && (
                  <span className="block text-xs text-blue-600 font-normal mt-1">Tu plan actual</span>
                )}
                {highlightRecommended && recommendedPlan === 'featured' && (
                  <span className="block text-xs text-amber-600 font-semibold mt-1">⭐ Recomendado</span>
                )}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">
                Patrocinado
                {currentPlan === 'sponsor' && (
                  <span className="block text-xs text-blue-600 font-normal mt-1">Tu plan actual</span>
                )}
                {highlightRecommended && recommendedPlan === 'sponsor' && (
                  <span className="block text-xs text-purple-600 font-semibold mt-1">👑 Recomendado</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Total de fotos</td>
              <td className="py-3 px-4 text-center text-gray-600">2</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">7</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">12</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Portada hero</td>
              <td className="py-3 px-4 text-center">❌</td>
              <td className="py-3 px-4 text-center">✅</td>
              <td className="py-3 px-4 text-center">✅</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Galería</td>
              <td className="py-3 px-4 text-center">❌</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">5 fotos</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">10 fotos</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Métricas</td>
              <td className="py-3 px-4 text-center">❌</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">Básicas</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">Avanzadas</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Badge distintivo</td>
              <td className="py-3 px-4 text-center">❌</td>
              <td className="py-3 px-4 text-center">⭐</td>
              <td className="py-3 px-4 text-center">👑</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">Posición en búsquedas</td>
              <td className="py-3 px-4 text-center text-gray-600">Estándar</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">Prioritaria</td>
              <td className="py-3 px-4 text-center text-gray-900 font-semibold">Hero</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 text-center">
        <Link
          href="/para-negocios#planes"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Ver todos los detalles y precios
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
