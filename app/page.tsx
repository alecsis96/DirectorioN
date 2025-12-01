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

  const premiumBusinesses: BusinessPreview[] = allBusinesses
    .filter(
      (biz: Business) =>
        biz.plan === 'featured' || biz.plan === 'sponsor' || biz.featured === true || biz.featured === 'true',
    )
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

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Búsqueda fácil</h3>
              <p className="text-gray-600">Encuentra negocios por categoría, ubicación o nombre de forma rápida.</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-4xl mb-3">📍</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Cerca de ti</h3>
              <p className="text-gray-600">Descubre comercios locales en tu colonia y alrededor de Yajalón.</p>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-4xl mb-3">⭐</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Reseñas reales</h3>
              <p className="text-gray-600">Lee opiniones de otros usuarios y toma decisiones informadas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Businesses Section */}
      {premiumBusinesses.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Negocios Destacados</h2>
                <p className="text-gray-600">Comercios locales verificados y recomendados</p>
              </div>
              <Link
                href="/negocios"
                className="hidden md:inline-flex px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2f5a1a] transition-colors"
              >
                Ver todos
              </Link>
            </div>

            <HomeClient businesses={premiumBusinesses} />

            <div className="mt-8 text-center md:hidden">
              <Link
                href="/negocios"
                className="inline-flex px-8 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2f5a1a] transition-colors"
              >
                Ver todos los negocios
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">¿Tienes un negocio en Yajalón?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Únete al directorio y aumenta tu visibilidad ante miles de clientes potenciales.
          </p>
          <Link
            href="/para-negocios"
            className="inline-flex px-10 py-4 bg-[#38761D] text-white font-bold text-lg rounded-full hover:bg-[#2f5a1a] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Registrar mi negocio gratis
          </Link>
        </div>
      </section>
    </div>
  );
}
