'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BusinessCardVertical from './BusinessCardVertical';
import BusinessModalWrapper from './BusinessModalWrapper';
import type { BusinessPreview } from '../types/business';

type Props = {
  businesses: BusinessPreview[];
};

function HomeClientContent({ businesses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPreview | null>(null);

  // Memoizar validación de businesses para evitar recálculos en cada render
  const validBusinesses = useMemo(() => 
    Array.isArray(businesses) ? businesses.filter(
      (business): business is BusinessPreview => 
        business != null && 
        typeof business === 'object' && 
        'id' in business && 
        typeof business.id === 'string' &&
        business.id.length > 0
    ) : [],
    [businesses]
  );

  // Manejar modal desde query params
  useEffect(() => {
    if (!searchParams) return;
    
    const businessId = searchParams.get('negocio');
    if (businessId) {
      const business = validBusinesses.find(b => b.id === businessId);
      if (business) {
        setSelectedBusiness(business);
      }
    } else {
      setSelectedBusiness(null);
    }
  }, [searchParams, validBusinesses]);

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
      {validBusinesses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay negocios disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validBusinesses.map((business) => (
            <BusinessCardVertical
              key={business.id}
              business={business}
              onViewDetails={handleOpenModal}
            />
          ))}
        </div>
      )}

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

export default function HomeClient({ businesses }: Props) {
  return (
    <Suspense fallback={
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4" />
            <div className="h-6 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    }>
      <HomeClientContent businesses={businesses} />
    </Suspense>
  );
}
