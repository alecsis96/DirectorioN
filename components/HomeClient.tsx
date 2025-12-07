'use client';

import { useMemo } from 'react';
import BusinessCardVertical from './BusinessCardVertical';
import type { BusinessPreview } from '../types/business';

type Props = {
  businesses: BusinessPreview[];
};

export default function HomeClient({ businesses }: Props) {
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
            />
          ))}
        </div>
      )}
    </>
  );
}
