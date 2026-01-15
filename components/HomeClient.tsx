'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BusinessCardVertical from './BusinessCardVertical';
import BusinessModalWrapper from './BusinessModalWrapper';
import type { BusinessPreview } from '../types/business';

type Props = {
  businesses: BusinessPreview[];
};

export default function HomeClient({ businesses }: Props) {
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
          businessId={selectedBusiness.id}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
