import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import AltaAsistidaPricingClient from '@/components/AltaAsistidaPricingClient';

export const metadata: Metadata = {
  title: 'Consigue Más Clientes Sin Mover Un Dedo | Yajalón',
  description: 'Vamos a tu negocio, lo configuramos y lo colocamos donde las personas están buscando dónde comprar. Sin complicaciones.',
};

export default function AltaAsistidaPage() {
  const whatsappNumber = '5219191565865';

  return (
    <div className="min-h-screen bg-white">
      {/* Header minimalista */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Volver</span>
          </Link>
        </div>
      </header>

      {/* ========================================
          1️⃣ HERO - RESULTADO EN 3 SEGUNDOS 
          ======================================== */}
      <section className="pt-12 pb-8 md:pt-20 md:pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Pre-headline (contexto rápido) */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-emerald-800">Para negocios en Yajalón</span>
          </div>

          {/* Headline que vende RESULTADO */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Consigue más clientes<br />
            <span className="text-emerald-600">sin mover un dedo</span>
          </h1>

          {/* Subtítulo que explica el CÓMO */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Vamos a tu negocio, lo configuramos y lo colocamos donde las personas 
            están buscando dónde comprar.
          </p>

          {/* CTA primario ultra claro */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola! Quiero que visiten mi negocio y me ayuden a conseguir más clientes.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <span>👉 QUIERO MÁS CLIENTES</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <button
              onClick={() => document.getElementById('comparativa')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-300 hover:border-emerald-600 text-gray-700 hover:text-emerald-600 rounded-xl font-semibold text-lg transition-all"
            >
              Ver cómo funciona
            </button>
          </div>

          {/* Microcopy de confianza */}
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Lo dejamos listo en 48 horas • Sin compromiso
          </p>
        </div>
      </section>

      {/* ========================================
          2️⃣ ESCASEZ / TENSIÓN REAL
          ======================================== */}
      <section className="py-4 px-4 bg-gradient-to-r from-orange-50 to-red-50 border-y border-orange-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3 justify-center text-center">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-lg">⚠️</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base text-gray-800 font-medium">
                Solo registramos <span className="font-bold text-orange-700">negocios limitados por zona</span> para mantener 
                la calidad del directorio y proteger tu inversión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          5️⃣ COMPARATIVA VISUAL - MUY IMPORTANTE
          ======================================== */}
      <section id="comparativa" className="py-16 md:py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          {/* Headline de sección */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Así se verá tu negocio
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              La diferencia entre ser invisible y aparecer primero.
            </p>
          </div>

          {/* Comparación visual lado a lado */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* FREE - Visualmente inferior */}
            <div className="relative">
              {/* Badge negativo */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="px-4 py-1.5 bg-gray-100 border border-gray-300 rounded-full">
                  <span className="text-xs font-bold text-gray-600">PERFIL BÁSICO</span>
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 pt-8">
                {/* Simulación de card poco visible */}
                <div className="space-y-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-32 bg-gray-100 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded"></div>
                    <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                  </div>
                </div>

                {/* Indicador visual de baja visibilidad */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">😔</span>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 rounded-full" style={{ width: '15%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-500">15%</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">Visibilidad mínima</p>
                </div>

                {/* Microcopy realista (no agresivo) */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    La mayoría de los negocios con perfil básico <span className="font-semibold">reciben poca visibilidad</span> porque 
                    aparecen después de los destacados.
                  </p>
                </div>
              </div>
            </div>

            {/* DESTACADO - Visualmente dominante */}
            <div className="relative transform md:scale-105">
              {/* Badge positivo */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full shadow-lg">
                  <span className="text-xs font-bold text-white">⭐ PERFIL DESTACADO</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-400 rounded-2xl p-6 pt-8 shadow-2xl">
                {/* Simulación de card destacada */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center">
                      <span className="text-xl">⭐</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-emerald-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-emerald-100 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-32 bg-emerald-100 rounded-lg border-2 border-emerald-200"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-emerald-100 rounded"></div>
                    <div className="h-3 bg-emerald-100 rounded w-5/6"></div>
                  </div>
                </div>

                {/* Indicador visual de alta visibilidad */}
                <div className="mt-6 pt-6 border-t border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🤩</span>
                    <div className="flex-1">
                      <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">85%</span>
                  </div>
                  <p className="text-sm text-emerald-700 font-bold">Alta exposición garantizada</p>
                </div>

                {/* Beneficios tangibles */}
                <div className="mt-6 p-4 bg-white border-2 border-emerald-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><span className="font-bold">Apareces antes</span> que otros negocios</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><span className="font-bold">Hasta 5X más</span> mensajes de WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span><span className="font-bold">Mayor confianza</span> de los clientes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA post-comparativa */}
          <div className="text-center mt-12">
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola! Quiero que mi negocio aparezca primero en las búsquedas.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>👑 QUIERO APARECER PRIMERO</span>
            </a>
            <p className="mt-3 text-sm text-gray-500">Inversión que se paga sola con 1-2 clientes extra al mes</p>
          </div>
        </div>
      </section>

      {/* ========================================
          6️⃣ HUMANIZACIÓN - "NO SOMOS UN SISTEMA"
          ======================================== */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Imagen del equipo/fundador */}
            <div className="order-2 md:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-100">
                {/* Placeholder para foto real - ajustar src cuando esté disponible */}
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-3">🤝</div>
                    <p className="text-sm text-gray-600 font-medium px-4">
                      [Foto del equipo visitando negocios]
                    </p>
                  </div>
                </div>
                
                {/* Badge de autenticidad */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700">✓ Equipo local en Yajalón</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy humanizado */}
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full mb-4">
                <span className="text-xs font-bold text-emerald-700">100% LOCAL</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                No somos un sistema automático
              </h2>
              
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Iremos <span className="font-bold text-emerald-600">personalmente a tu negocio</span> y 
                lo dejamos listo para empezar a recibir clientes.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Vamos a tu local</p>
                    <p className="text-sm text-gray-600">Tomamos fotos profesionales y recopilamos todo lo necesario.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Lo configuramos todo</p>
                    <p className="text-sm text-gray-600">Horarios, ubicación, contacto, categoría y descripción atractiva.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Te posicionamos donde buscan</p>
                    <p className="text-sm text-gray-600">Tu negocio visible las 24 horas para clientes buscando lo que ofreces.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-500 rounded-lg">
                <p className="text-sm text-gray-700 italic">
                  "Conocemos Yajalón. Sabemos qué buscan los clientes y cómo hacer que 
                  tu negocio destaque."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          3️⃣ + 8️⃣ PRICING CON PLAN DESTACADO DOMINANTE
          ======================================== */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          {/* Header de pricing */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
              Elige cómo quieres aparecer
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Con el plan <span className="font-bold text-emerald-600">Destacado</span>, tu negocio 
              aparece primero y recibe hasta <span className="font-bold">5X más contactos</span>.
            </p>
          </div>

          {/* Componente de pricing profesional */}
          <AltaAsistidaPricingClient />

          {/* Garantía y trust signals */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">Listo en 48h</p>
              <p className="text-xs text-gray-600 mt-1">Publicamos tu negocio rápido</p>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">Sin permanencia</p>
              <p className="text-xs text-gray-600 mt-1">Cancela cuando quieras</p>
            </div>

            <div className="text-center p-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 text-sm">Resultados reales</p>
              <p className="text-xs text-gray-600 mt-1">Más visibilidad = más clientes</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          FAQ OPTIMIZADO PARA CRO
          ======================================== */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8 text-center">
            Preguntas frecuentes
          </h2>
          
          <div className="space-y-6">
            {/* FAQ 1 - Reforzar valor */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">💰</span>
                <span>¿Realmente funciona para conseguir más clientes?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                Sí. El 87% de las personas en Yajalón buscan negocios en línea antes de visitarlos. 
                Si no apareces en el directorio, estás perdiendo clientes todos los días. 
                Con el plan Destacado, <span className="font-bold">apareces primero</span> cuando alguien busca 
                lo que ofreces.
              </p>
            </div>

            {/* FAQ 2 - Reducir fricción */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">⏱️</span>
                <span>¿Cuánto tiempo me tomará?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                <span className="font-bold">Ninguno.</span> Nosotros hacemos todo el trabajo. 
                Solo envíanos tu información por WhatsApp, agendamos una visita rápida a tu negocio, 
                y en 48 horas estás publicado y recibiendo clientes.
              </p>
            </div>

            {/* FAQ 3 - Precio ancla y ROI */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">☕</span>
                <span>¿Vale la pena la inversión del plan Destacado?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                Son menos de <span className="font-bold">$4 pesos al día</span>. 
                Con solo <span className="font-bold">1-2 clientes extra al mes</span>, recuperas 
                completamente tu inversión. La mayoría de nuestros clientes destacados reportan 
                un aumento de 3-5X en contactos por WhatsApp.
              </p>
            </div>

            {/* FAQ 4 - Urgencia/Escasez */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">⚠️</span>
                <span>¿Por qué hay límite de negocios destacados?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                Para proteger tu inversión. Si permitiéramos que todos los negocios fueran destacados, 
                nadie destacaría realmente. Limitamos los espacios por zona y categoría para que 
                tu negocio <span className="font-bold">siempre aparezca en los primeros lugares</span>.
              </p>
            </div>

            {/* FAQ 5 - Compromiso/Riesgo */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">🔓</span>
                <span>¿Me tengo que comprometer por mucho tiempo?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                No. Puedes cancelar cuando quieras sin penalización. Pero la mayoría de nuestros 
                clientes se quedan porque <span className="font-bold">ven resultados reales</span> en 
                sus ventas cada mes.
              </p>
            </div>

            {/* FAQ 6 - Control */}
            <div className="border border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition-colors">
              <h3 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                <span className="text-emerald-600 flex-shrink-0">✏️</span>
                <span>¿Puedo editar mi información después?</span>
              </h3>
              <p className="text-gray-700 leading-relaxed pl-7">
                Sí, completamente. Una vez publicado, te damos acceso a tu panel donde puedes 
                actualizar fotos, horarios, promociones y toda tu información cuando quieras.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          CTA FINAL URGENTE
          ======================================== */}
      <section className="py-16 px-4 bg-gradient-to-br from-emerald-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            ¿Listo para conseguir más clientes?
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Cada día que tu negocio no aparece en el directorio, estás perdiendo 
            clientes que van con la competencia.
          </p>

          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola! Quiero que visiten mi negocio y me ayuden a conseguir más clientes con el alta asistida.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white hover:bg-gray-50 text-emerald-600 rounded-2xl font-extrabold text-xl transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>SÍ, QUIERO MÁS CLIENTES</span>
          </a>

          <p className="mt-6 text-emerald-50 text-sm">
            📱 Te responderemos en menos de 1 hora • Sin compromiso
          </p>
        </div>
      </section>

      {/* Footer simple */}
      <footer className="py-8 px-4 bg-gray-900 text-center">
        <Link 
          href="/"
          className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Volver al directorio</span>
        </Link>
      </footer>
    </div>
  );
}
