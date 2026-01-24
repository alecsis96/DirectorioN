'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BusinessCarousel from './BusinessCarousel';
import BusinessModalWrapper from './BusinessModalWrapper';
import type { BusinessPreview } from '../types/business';

type Props = {
  sponsorBusinesses: BusinessPreview[];
  featuredBusinesses: BusinessPreview[];
};

function HomeClientContent({ sponsorBusinesses, featuredBusinesses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPreview | null>(null);

  // Combinar todos los negocios para búsqueda en modal
  const allBusinesses = useMemo(() => 
    [...sponsorBusinesses, ...featuredBusinesses],
    [sponsorBusinesses, featuredBusinesses]
  );

  // Manejar modal desde query params
  useEffect(() => {
    if (!searchParams) return;
    
    const businessId = searchParams.get('negocio');
    if (businessId) {
      const business = allBusinesses.find(b => b.id === businessId);
      if (business) {
        setSelectedBusiness(business);
      }
    } else {
      setSelectedBusiness(null);
    }
  }, [searchParams, allBusinesses]);

  const handleOpenModal = (business: BusinessPreview) => {
    setSelectedBusiness(business);
    router.push(`/?negocio=${business.id}`, { scroll: false });
  };

  const handleCloseModal = () => {
    setSelectedBusiness(null);
    router.push('/', { scroll: false });
  };

  return (
    <>
      {/* Carrusel de Negocios Patrocinados */}
      <BusinessCarousel
        title="⭐ Negocios Patrocinados"
        subtitle="Los mejores negocios destacados de Yajalón"
        items={sponsorBusinesses}
        href="/negocios"
        viewMoreLabel="Ver más patrocinados"
        onViewDetails={handleOpenModal}
      />

      {/* Carrusel de Negocios Destacados */}
      <BusinessCarousel
        title="🌟 Negocios Destacados del Mes"
        subtitle="Descubre estos negocios recomendados"
        items={featuredBusinesses}
        href="/negocios"
        viewMoreLabel="Ver más destacados"
        onViewDetails={handleOpenModal}
      />

      {/* Modal de detalle */}
      {selectedBusiness && (
        <BusinessModalWrapper
          businessPreview={selectedBusiness}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default function HomeClient({ sponsorBusinesses, featuredBusinesses }: Props) {
  return (
    <Suspense fallback={
      <div className="space-y-12 py-12">
        {[1, 2].map((section) => (
          <div key={section} className="px-4">
            <div className="max-w-7xl mx-auto">
              <div className="h-8 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[85%] sm:w-[45%] md:w-[32%] lg:w-[23%]">
                    <div className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-lg mb-4" />
                      <div className="h-6 bg-gray-200 rounded mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    }>
      <HomeClientContent 
        sponsorBusinesses={sponsorBusinesses}
        featuredBusinesses={featuredBusinesses}
      />
    </Suspense>
  );
}
