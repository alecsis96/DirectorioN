import type { Metadata } from 'next';
import Link from 'next/link';
import type { Business, BusinessPreview } from '../types/business';
import { pickBusinessPreview } from '../types/business';
import { fetchBusinesses, toNumber } from '../lib/server/businessData';
import HomeClient from '../components/HomeClient';

export const metadata: Metadata = {
  title: 'Directorio de Negocios Yajalón - Tu Guía Local de Comercios',
  description: 'Descubre los mejores negocios, restaurantes, tiendas y servicios en Yajalón. Encuentra comercios locales cerca de ti con reseñas, ubicaciones y contactos.',
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
  // Obtener todos los negocios
  const allBusinesses = await fetchBusinesses();
  
  // Filtrar solo negocios premium/patrocinados
  const premiumBusinesses: BusinessPreview[] = allBusinesses
    .filter((biz: Business) => biz.plan === 'featured' || biz.plan === 'sponsor' || biz.featured === true || biz.featured === 'true')
    .slice(0, 6) // Mostrar máximo 6 negocios premium
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
        <section className="relative bg-gradient-to-r from-[#38761D] to-[#2f5a1a] py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Descubre Yajalón
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white max-w-3xl mx-auto">
              Tu directorio completo de negocios locales. Encuentra restaurantes, tiendas, servicios profesionales y más cerca de ti.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/negocios"
                className="px-8 py-4 bg-white text-[#38761D] font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Ver Todos los Negocios
              </Link>
              <Link
                href="/para-negocios"
                className="px-8 py-4 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-[#38761D] transition-all"
              >
                Registra tu Negocio
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Búsqueda Fácil</h3>
                <p className="text-gray-600">
                  Encuentra negocios por categoría, ubicación o nombre de forma rápida y sencilla.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">📍</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Cerca de Ti</h3>
                <p className="text-gray-600">
                  Descubre comercios locales en tu colonia y alrededor de Yajalón.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Reseñas Reales</h3>
                <p className="text-gray-600">
                  Lee opiniones de otros usuarios y toma decisiones informadas.
                </p>
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
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Negocios Destacados
                  </h2>
                  <p className="text-gray-600">
                    Comercios locales verificados y recomendados
                  </p>
                </div>
                <Link
                  href="/negocios"
                  className="hidden md:inline-flex px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2f5a1a] transition-colors"
                >
                  Ver Todos →
                </Link>
              </div>
              
              <HomeClient businesses={premiumBusinesses} />

              <div className="mt-8 text-center md:hidden">
                <Link
                  href="/negocios"
                  className="inline-flex px-8 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2f5a1a] transition-colors"
                >
                  Ver Todos los Negocios →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Tienes un Negocio en Yajalón?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Únete a nuestro directorio y aumenta tu visibilidad ante miles de clientes potenciales.
            </p>
            <Link
              href="/para-negocios"
              className="inline-flex px-10 py-4 bg-[#38761D] text-white font-bold text-lg rounded-full hover:bg-[#2f5a1a] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Registrar mi Negocio Gratis
            </Link>
          </div>
        </section>
      </div>
  );
}
