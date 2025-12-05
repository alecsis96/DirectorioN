'use client';

import { FavoritesProvider } from '../context/FavoritesContext';
import BusinessCardVertical from './BusinessCardVertical';
import type { BusinessPreview } from '../types/business';

type Props = {
  businesses: BusinessPreview[];
};

export default function HomeClient({ businesses }: Props) {
  return (
    <FavoritesProvider>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <BusinessCardVertical
            key={business.id}
            business={business}
          />
        ))}
      </div>
    </FavoritesProvider>
  );
}
