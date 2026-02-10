/**
 * 💼 Componente de Comparación de Paquetes
 * Tabla visual para alta asistida con pricing dinámico
 */

'use client';

import React, { useState } from 'react';
import { FiCheck, FiX, FiStar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { comparePackages, calculatePackagePrice, getSalesPitch } from '@/lib/packagesSystem';
import type { PackageTier, BusinessCategory } from '@/lib/packagesSystem';

interface PackageComparisonProps {
  category?: BusinessCategory;
  highlightPackage?: PackageTier;
  showDiscounts?: boolean;
  onSelectPackage?: (packageId: PackageTier) => void;
}

export default function PackageComparison({
  category = 'ticket-medio',
  highlightPackage = 'destacado',
  showDiscounts = true,
  onSelectPackage,
}: PackageComparisonProps) {
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory>(category);
  const [showAnnualPricing, setShowAnnualPricing] = useState(false);
  
  const packages = comparePackages(selectedCategory);

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-gray-900 mb-3">
          Elige tu Paquete de Alta Asistida
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Nos encargamos de todo. Tú solo disfruta los resultados.
        </p>
        
        {/* Category selector */}
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedCategory('bajo-ticket')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'bajo-ticket'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pequeño Comercio
          </button>
          <button
            onClick={() => setSelectedCategory('ticket-medio')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'ticket-medio'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Negocio Estándar
          </button>
          <button
            onClick={() => setSelectedCategory('alto-ticket')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === 'alto-ticket'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Servicios Profesionales
          </button>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {packages.map((pkg, index) => {
          const isHighlighted = pkg.id === highlightPackage;
          const Icon = pkg.id === 'esencial' ? FiTrendingUp : pkg.id === 'destacado' ? FiStar : FiAward;
          
          return (
            <div
              key={pkg.id}
              className={`relative rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                isHighlighted 
                  ? 'border-4 border-amber-400 shadow-2xl shadow-amber-200' 
                  : 'border-2 border-gray-200'
              }`}
            >
              {/* Badge */}
              {pkg.badge && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {pkg.badge}
                </div>
              )}
              
              {/* Header */}
              <div className={`p-6 ${
                pkg.id === 'esencial' ? 'bg-gradient-to-br from-gray-50 to-gray-100' :
                pkg.id === 'destacado' ? 'bg-gradient-to-br from-amber-50 to-orange-50' :
                'bg-gradient-to-br from-purple-50 to-blue-50'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`text-3xl ${
                    pkg.id === 'esencial' ? 'text-gray-600' :
                    pkg.id === 'destacado' ? 'text-amber-600' :
                    'text-purple-600'
                  }`} />
                  <h3 className="text-2xl font-black text-gray-900">
                    {pkg.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {pkg.tagline}
                </p>
                
                {/* Pricing */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900">
                      ${pkg.setupFee}
                    </span>
                    <span className="text-sm text-gray-600">
                      Setup
                    </span>
                  </div>
                  
                  {pkg.monthlyFee > 0 && (
                    <div className="mt-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          ${pkg.monthlyFee}
                        </span>
                        <span className="text-sm text-gray-600">
                          /mes después
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        ({pkg.includedMonths} meses incluidos)
                      </p>
                    </div>
                  )}
                  
                  {pkg.monthlyFee === 0 && (
                    <p className="text-sm font-semibold text-green-700 mt-2">
                      ✅ Sin mensualidad
                    </p>
                  )}
                </div>
                
                {/* Daily cost */}
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-3xl font-black text-gray-900">
                    ${pkg.dailyCost}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">
                    Por día
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                  Incluye:
                </h4>
                <ul className="space-y-2 mb-6">
                  {pkg.included.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <FiCheck className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{feature.replace('✅ ', '')}</span>
                    </li>
                  ))}
                </ul>
                
                {pkg.notIncluded.length > 0 && (
                  <>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                      No incluye:
                    </h4>
                    <ul className="space-y-2 mb-6">
                      {pkg.notIncluded.slice(0, 3).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                          <FiX className="text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>{feature.replace('❌ ', '')}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                
                {/* Ideal for */}
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Ideal para:
                  </p>
                  <ul className="space-y-1">
                    {pkg.ideal.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* CTA */}
                <button
                  onClick={() => onSelectPackage?.(pkg.id as PackageTier)}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
                    pkg.id === 'esencial' 
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : pkg.id === 'destacado'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {pkg.id === 'esencial' ? 'Empezar Gratis' : 'Elegir Este Plan'}
                </button>
                
                {/* Total year 1 */}
                <p className="text-center text-xs text-gray-500 mt-3">
                  Total año 1: ${pkg.firstYearTotal.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wide">
                  Característica
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wide">
                  Esencial
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wide bg-amber-600">
                  Destacado
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wide">
                  Líder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Sesión presencial */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Sesión presencial
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  30 min
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700 bg-amber-50">
                  60 min
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  90 min
                </td>
              </tr>
              
              {/* Fotos */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Fotos incluidas
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  2 (logo + local)
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700 bg-amber-50">
                  5 profesionales
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  10 profesionales
                </td>
              </tr>
              
              {/* Portada */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Portada diseñada
                </td>
                <td className="px-6 py-4 text-center">
                  <FiX className="inline text-red-500" />
                </td>
                <td className="px-6 py-4 text-center bg-amber-50">
                  <FiCheck className="inline text-green-600" />
                </td>
                <td className="px-6 py-4 text-center">
                  <FiCheck className="inline text-green-600" />
                </td>
              </tr>
              
              {/* Métricas */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Métricas de negocio
                </td>
                <td className="px-6 py-4 text-center">
                  <FiX className="inline text-red-500" />
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700 bg-amber-50">
                  Básicas (3)
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  Avanzadas (7+)
                </td>
              </tr>
              
              {/* Badge */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Badge distintivo
                </td>
                <td className="px-6 py-4 text-center">
                  <FiX className="inline text-red-500" />
                </td>
                <td className="px-6 py-4 text-center text-sm text-amber-700 bg-amber-50">
                  ⭐ Destacado
                </td>
                <td className="px-6 py-4 text-center text-sm text-purple-700">
                  👑 Líder
                </td>
              </tr>
              
              {/* Posición */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Posicionamiento
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  Estándar
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700 bg-amber-50">
                  Prioritario
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  Hero (#1)
                </td>
              </tr>
              
              {/* Soporte */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  Soporte técnico
                </td>
                <td className="px-6 py-4 text-center">
                  <FiX className="inline text-red-500" />
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700 bg-amber-50">
                  30 días
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-700">
                  60 días + prioritario
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200">
        <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">
          Preguntas Frecuentes
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">
              ¿Qué incluye la alta asistida?
            </h4>
            <p className="text-sm text-gray-700">
              Visita presencial, toma de fotos, diseño de perfil completo, 
              capacitación y alta en plataforma. Todo listo en una sesión.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-2">
              ¿Puedo cambiar de plan después?
            </h4>
            <p className="text-sm text-gray-700">
              Sí, puedes hacer upgrade en cualquier momento. 
              Downgrade requiere cumplir el periodo mínimo.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-2">
              ¿Qué pasa si cancelo?
            </h4>
            <p className="text-sm text-gray-700">
              Plan Esencial no tiene compromiso. Destacado requiere 3 meses mínimo. 
              Líder 6 meses con penalización 50% si cancelas antes.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-2">
              ¿Cómo funciona el pago?
            </h4>
            <p className="text-sm text-gray-700">
              Setup fee una sola vez. Mensualidad inicia después del periodo incluido. 
              Aceptamos efectivo, transferencia y tarjeta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
