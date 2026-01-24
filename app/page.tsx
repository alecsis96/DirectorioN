import type { Metadata } from 'next';
import Link from 'next/link';
import type { Business, BusinessPreview } from '../types/business';
import { pickBusinessPreview } from '../types/business';
import { fetchBusinesses, toNumber } from '../lib/server/businessData';
import HomeClient from '../components/HomeClient';

export const metadata: Metadata = {
  title: 'Directorio de Negocios Yajalón - Tu Guía Local de Comercios',
  description:
    'Descubre los mejores negocios, restaurantes, tiendas y servicios en Yajalón. Encuentra comercios locales cerca de ti con reseñas, ubicaciones y contactos.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Directorio de Negocios Yajalón',
    description: 'Tu guía completa de comercios locales en Yajalón.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { businesses: allBusinesses } = await fetchBusinesses();

  // Separar negocios patrocinados y destacados
  const sponsorBusinesses: BusinessPreview[] = allBusinesses
    .filter((biz: Business) => biz.plan === 'sponsor')
    .slice(0, 6)
    .map((biz: Business) => {
      const preview = pickBusinessPreview(biz);
      return {
        ...preview,
        rating: toNumber(preview.rating) ?? null,
      };
    });

  const featuredBusinesses: BusinessPreview[] = allBusinesses
    .filter((biz: Business) => biz.plan === 'featured' || biz.featured === true || biz.featured === 'true')
    .slice(0, 6)
    .map((biz: Business) => {
      const preview = pickBusinessPreview(biz);
      return {
        ...preview,
        rating: toNumber(preview.rating) ?? null,
      };
    });

  // Negocios nuevos (últimos 6, ordenados por fecha de creación o id)
  const recentBusinesses: BusinessPreview[] = allBusinesses
    .slice(0, 6)
    .map((biz: Business) => {
      const preview = pickBusinessPreview(biz);
      return {
        ...preview,
        rating: toNumber(preview.rating) ?? null,
      };
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-16 px-4 text-white"
        style={{
          backgroundImage:
            'linear-gradient(135deg, #10b981 0%, #059669 30%, #0ea5e9 100%), radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 35%), radial-gradient(circle at 80% 0%, rgba(199,249,204,0.35), transparent 25%)',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="max-w-6xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold shadow-sm">
            Yajalón · Negocios locales
          </span>
          <h1 className="text-4xl md:text-6xl font-bold mt-4 mb-4 text-white drop-shadow-sm">
            Directorio de Negocios en Yajalón
          </h1>
          <p className="text-lg md:text-xl text-emerald-50 max-w-3xl mx-auto mb-4">
            Tu guía completa de comercios locales
          </p>
          <p className="text-base md:text-lg text-emerald-50 max-w-3xl mx-auto mb-8">
            Descubre, compara y conecta con restaurantes, tiendas, servicios profesionales y más. Todo en un solo
            lugar, cerca de ti.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/negocios"
              className="px-8 py-4 bg-white text-emerald-700 font-bold rounded-full hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Ver Todos los Negocios
            </Link>
            <Link
              href="/para-negocios"
              className="px-8 py-4 bg-white/10 border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-emerald-700 transition-all"
            >
              Registra tu negocio
            </Link>
          </div>
          <div className="mt-6 text-sm text-emerald-50">
            ¿Ya te registraste?{' '}
            <Link href="/mis-solicitudes" className="underline font-semibold hover:text-white">
              Verificar solicitud
            </Link>
          </div>
        </div>
      </section>

      {/* Action Cards - Tarjetas clicables */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Búsqueda fácil */}
            <Link
              href="/negocios"
              className="group text-center p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔍</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-emerald-600">Búsqueda fácil</h3>
              <p className="text-gray-600 mb-3">Encuentra negocios por categoría, ubicación o nombre de forma rápida.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                Buscar ahora
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>

            {/* Cerca de ti */}
            <Link
              href="/negocios?view=map"
              className="group text-center p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📍</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-600">Cerca de ti</h3>
              <p className="text-gray-600 mb-3">Descubre comercios locales en tu colonia y alrededor de Yajalón.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                Ver en mapa
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>

            {/* Reseñas reales */}
            <Link
              href="/negocios?o=rating"
              className="group text-center p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:border-yellow-500 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⭐</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-yellow-600">Reseñas reales</h3>
              <p className="text-gray-600 mb-3">Lee opiniones de otros usuarios y toma decisiones informadas.</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-600">
                Mejor calificados
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Explora por Categorías */}
      <section className="py-8 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Explora por categorías</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
            {[
              { name: 'Restaurante', icon: '🍽️' },
              { name: 'Cafetería', icon: '☕' },
              { name: 'Panadería', icon: '🍞' },
              { name: 'Comida Rápida', icon: '🍔' },
              { name: 'Servicios', icon: '🛠️' },
              { name: 'Comercio', icon: '🛒' },
              { name: 'Tecnología', icon: '💻' },
              { name: 'Salud y Belleza', icon: '💆' },
              { name: 'Educación', icon: '📚' },
              { name: 'Entretenimiento', icon: '🎭' },
              { name: 'Deportes', icon: '⚽' },
              { name: 'Automotriz', icon: '🚗' },
              { name: 'Construcción', icon: '🏗️' },
              { name: 'Profesional', icon: '💼' },
              { name: 'Otro', icon: '📋' },
            ].map((cat) => {
              const slug = cat.name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
              
              return (
                <Link
                  key={cat.name}
                  href={`/negocios?c=${slug}`}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white rounded-full border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer whitespace-nowrap font-medium text-gray-700 hover:text-blue-600"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nuevos esta semana */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Nuevos esta semana</h2>
            <Link 
              href="/negocios" 
              className="text-sm md:text-base font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
            {recentBusinesses.map((business) => {
              // Verificar si tiene horarios configurados
              const hasHours = business.horarios && Object.keys(business.horarios).length > 0;
              
              return (
                <Link
                  key={business.id}
                  href={`/?negocio=${business.id}`}
                  className="flex-shrink-0 w-[280px] bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all p-4 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {business.logo ? (
                        <img 
                          src={business.logo} 
                          alt={business.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🏪
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate mb-1">{business.name}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{business.category}</p>
                      {hasHours && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Abierto
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Registro de Negocio */}
      <section className="py-12 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">¿Tienes un negocio?</h2>
          <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
            Regístralo y aparece en nuestro directorio. Miles de personas buscan servicios como el tuyo cada día.
          </p>
          <Link
            href="/para-negocios"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-blue-50 hover:shadow-xl transition-all transform hover:scale-105"
          >
            Publicar mi negocio
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <div className="mt-4">
            <Link 
              href="/alta-asistida"
              className="text-sm text-blue-100 hover:text-white underline transition-colors"
            >
              ¿Prefieres que lo registremos por ti? Solicitar alta
            </Link>
          </div>
        </div>
      </section>

      {/* Carruseles de Negocios Premium */}
      <div className="bg-gradient-to-b from-white to-gray-50">
        <HomeClient 
          sponsorBusinesses={sponsorBusinesses}
          featuredBusinesses={featuredBusinesses}
        />
      </div>
    </div>
  );
}
