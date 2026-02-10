/**
 * 💰 PRICING HERO SECTION - Production-Ready
 * Diseñado para maximizar conversiones del plan DESTACADO (60-70%)
 * 
 * Estrategias implementadas:
 * - Anchoring (precio tachado alto)
 * - Scarcity (espacios limitados)
 * - Social proof (testimonial implícito)
 * - Loss aversion (FREE visualmente inferior)
 * - Decoy effect (PATROCINADO empuja a DESTACADO)
 * - Price framing ($3/día vs $99/mes)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { FiCheck, FiX, FiStar, FiAward, FiTrendingUp, FiZap, FiEye, FiMessageCircle } from 'react-icons/fi';

type PlanTier = 'free' | 'destacado' | 'patrocinado';

interface PricingHeroProps {
  categoryId?: string;
  onSelectPlan?: (plan: PlanTier) => void;
  showAltaAsistida?: boolean;
}

export default function PricingHero({ 
  categoryId = 'restaurantes', 
  onSelectPlan,
  showAltaAsistida = true 
}: PricingHeroProps) {
  const [scarcityData, setScarcityData] = useState<{
    destacado: { available: boolean; slotsLeft: number };
    patrocinado: { available: boolean; slotsLeft: number };
  }>({
    destacado: { available: true, slotsLeft: 10 },
    patrocinado: { available: true, slotsLeft: 3 },
  });

  useEffect(() => {
    async function checkAvailability() {
      try {
        const [destacadoRes, patrocinadorRes] = await Promise.all([
          fetch(`/api/scarcity?categoryId=${categoryId}&plan=featured`),
          fetch(`/api/scarcity?categoryId=${categoryId}&plan=sponsor`)
        ]);
        
        const destacadoAvail = await destacadoRes.json();
        const patrocinadorAvail = await patrocinadorRes.json();
        
        setScarcityData({
          destacado: { 
            available: destacadoAvail.canUpgrade, 
            slotsLeft: destacadoAvail.slotsLeft 
          },
          patrocinado: { 
            available: patrocinadorAvail.canUpgrade, 
            slotsLeft: patrocinadorAvail.slotsLeft 
          },
        });
      } catch (error) {
        console.error('Error checking availability:', error);
      }
    }
    
    checkAvailability();
  }, [categoryId]);

  const handleSelectPlan = (plan: PlanTier) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Más visibilidad = Más clientes
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Elige el plan que hará crecer tu negocio. Cancela cuando quieras.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16 items-stretch">
          
          {/* FREE PLAN - Visualmente Inferior */}
          <div className="relative bg-white rounded-xl border-2 border-gray-200 p-6 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FiTrendingUp className="text-gray-400 text-xl" />
                <h3 className="text-xl font-bold text-gray-700">Básico</h3>
              </div>
              <p className="text-sm text-gray-500">Para comenzar, visibilidad limitada</p>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold text-gray-900">$0</div>
              <p className="text-sm text-gray-500 mt-1">Gratis para siempre</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">Perfil básico con datos</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600">1 foto de portada</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiX className="text-gray-300 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Aparece en destacados</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiX className="text-gray-300 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Estadísticas de visitas</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiX className="text-gray-300 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400 line-through">Galería de fotos</span>
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan('free')}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Comenzar gratis
            </button>

            <p className="text-xs text-center text-gray-400 mt-3">
              ⚠️ Visibilidad muy baja
            </p>
          </div>

          {/* DESTACADO - THE HERO */}
          <div className="relative bg-white rounded-2xl border-4 border-blue-500 shadow-2xl p-8 flex flex-col transform md:scale-105 md:-mt-4 md:mb-4">
            {/* Badge MÁS POPULAR */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                <FiStar className="text-yellow-300" />
                MÁS POPULAR
              </div>
            </div>

            <div className="mb-6 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <FiZap className="text-blue-600 text-2xl" />
                <h3 className="text-2xl font-bold text-gray-900">Destacado</h3>
              </div>
              <p className="text-sm text-gray-600">Aumenta tu visibilidad y atrae más clientes</p>
            </div>

            {/* Pricing con Anchoring */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl text-gray-400 line-through font-medium">$249</span>
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">-60% OFF</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-5xl font-bold text-gray-900">$99</div>
                <div className="text-gray-500">/mes</div>
              </div>
              <p className="text-sm text-blue-600 font-semibold mt-2">
                ☕ Menos de $3 pesos al día
              </p>
              <p className="text-xs text-gray-500 mt-1">
                🎁 Precio de lanzamiento • Solo primeros registros
              </p>
            </div>

            {/* Beneficios orientados a DINERO */}
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Aparece antes que otros negocios</span>
                  <p className="text-xs text-gray-500">Tu perfil siempre visible arriba</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Hasta 3X más vistas</span>
                  <p className="text-xs text-gray-500">Los clientes te ven primero</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Más mensajes de WhatsApp</span>
                  <p className="text-xs text-gray-500">Contactos directos aumentan</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Galería de fotos ilimitada</span>
                  <p className="text-xs text-gray-500">Muestra todos tus productos</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Badge "Negocio Destacado"</span>
                  <p className="text-xs text-gray-500">Genera más confianza</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1">
                  <FiCheck className="text-blue-600 text-sm" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold text-sm">Métricas y estadísticas</span>
                  <p className="text-xs text-gray-500">Ve cuántos te buscaron</p>
                </div>
              </li>
            </ul>

            {/* Scarcity Indicator */}
            {scarcityData.destacado.slotsLeft <= 5 && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800 font-semibold flex items-center gap-2">
                  <FiZap className="text-orange-500" />
                  Solo quedan {scarcityData.destacado.slotsLeft} espacios en tu zona
                </p>
              </div>
            )}

            <button
              onClick={() => handleSelectPlan('destacado')}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-lg"
            >
              🚀 QUIERO MÁS CLIENTES
            </button>

            <p className="text-xs text-center text-gray-500 mt-3">
              ✅ Los negocios destacados reciben 3x más contactos
            </p>
          </div>

          {/* PATROCINADO - Ancla Premium */}
          <div className="relative bg-gradient-to-br from-purple-50 to-white rounded-xl border-2 border-purple-300 p-6 flex flex-col">
            <div className="absolute -top-3 right-4">
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                <FiAward className="text-yellow-300" />
                MÁXIMA VISIBILIDAD
              </div>
            </div>

            <div className="mb-6 pt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👑</span>
                <h3 className="text-xl font-bold text-gray-900">Patrocinado</h3>
              </div>
              <p className="text-sm text-gray-600">Domina tu zona, exclusividad garantizada</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl text-gray-400 line-through font-medium">$499</span>
                <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded">-60% OFF</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-gray-900">$199</div>
                <div className="text-gray-500">/mes</div>
              </div>
              <p className="text-sm text-purple-600 font-semibold mt-2">
                📍 Solo 3 negocios por zona
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Precio fundadores • Exclusividad real
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Todo de Destacado +</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Posición #1 garantizada</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Exclusividad por zona</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Diseño premium diferenciado</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Mayor confianza del cliente</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <FiCheck className="text-purple-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 font-medium">Reportes avanzados semanales</span>
              </li>
            </ul>

            {scarcityData.patrocinado.slotsLeft <= 2 && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-bold flex items-center gap-2">
                  🔥 Solo {scarcityData.patrocinado.slotsLeft} lugar(es) disponible(s)
                </p>
              </div>
            )}

            <button
              onClick={() => handleSelectPlan('patrocinado')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              👑 QUIERO DOMINAR MI ZONA
            </button>

            <p className="text-xs text-center text-gray-500 mt-3">
              ⚡ Máximo impacto local
            </p>
          </div>

        </div>

        {/* Comparativa Visual de Visibilidad */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-12 shadow-sm">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Tener visibilidad hoy es más importante que nunca
          </h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Básico */}
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl mb-2">😔</div>
                <p className="font-bold text-gray-700">Básico (Gratis)</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye className="text-gray-400" />
                  <span className="text-sm text-gray-600">Visibilidad</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gray-400 h-3 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Casi invisible</p>
              </div>
              <p className="text-xs text-gray-500">✗ Pocas vistas<br/>✗ Pocos mensajes</p>
            </div>

            {/* Destacado */}
            <div className="text-center border-2 border-blue-500 rounded-xl p-4 bg-blue-50">
              <div className="mb-4">
                <div className="text-4xl mb-2">😊</div>
                <p className="font-bold text-blue-900">Destacado</p>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">RECOMENDADO</span>
              </div>
              <div className="bg-white rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye className="text-blue-600" />
                  <span className="text-sm text-gray-900 font-semibold">Visibilidad</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-xs text-blue-700 font-semibold mt-2">Alta exposición</p>
              </div>
              <p className="text-xs text-blue-900 font-medium">✓ 3x más vistas<br/>✓ Más contactos directo</p>
            </div>

            {/* Patrocinado */}
            <div className="text-center">
              <div className="mb-4">
                <div className="text-4xl mb-2">🤩</div>
                <p className="font-bold text-purple-900">Patrocinado</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye className="text-purple-600" />
                  <span className="text-sm text-gray-900 font-semibold">Visibilidad</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-3 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-purple-700 font-bold mt-2">Dominio local</p>
              </div>
              <p className="text-xs text-purple-900 font-medium">✓ Posición #1<br/>✓ Exclusividad total</p>
            </div>
          </div>
        </div>

        {/* Alta Asistida Section */}
        {showAltaAsistida && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 text-white shadow-xl">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold mb-4">
                🔥 SERVICIO MÁS CONTRATADO
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                ¿No tienes tiempo? Nosotros lo hacemos por ti
              </h3>
              
              <p className="text-xl text-orange-50 mb-6 max-w-2xl mx-auto">
                Vamos a tu negocio, tomamos fotos profesionales y dejamos todo listo para que empieces a vender.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="font-semibold">Sesión fotográfica</p>
                  <p className="text-sm text-orange-100">Fotos profesionales de tu local</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="font-semibold">Listo en 24h</p>
                  <p className="text-sm text-orange-100">Tu perfil publicado rápido</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="font-semibold">Sin complicaciones</p>
                  <p className="text-sm text-orange-100">Tú no haces nada</p>
                </div>
              </div>

              <button
                onClick={() => {
                  const mensaje = encodeURIComponent(
                    'Hola! Quiero contratar el servicio de Alta Asistida para mi negocio.'
                  );
                  window.open(`https://wa.me/5219191565865?text=${mensaje}`, '_blank');
                }}
                className="bg-white text-orange-600 font-bold py-4 px-8 rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl text-lg inline-flex items-center gap-2"
              >
                <FiMessageCircle />
                QUIERO QUE ME VISITEN
              </button>

              <p className="text-sm text-orange-100 mt-4">
                📞 Respuesta en menos de 1 hora
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
