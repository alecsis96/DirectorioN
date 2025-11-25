'use client';

import { FavoritesProvider } from '../context/FavoritesContext';
import BusinessCard from './BusinessCard';
import type { BusinessPreview } from '../types/business';

type Props = {
  businesses: BusinessPreview[];
};

export default function HomeClient({ businesses }: Props) {
  return (
    <FavoritesProvider>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <BusinessCard
            key={business.id}
            business={business}
          />
        ))}
      </div>
    </FavoritesProvider>
  );
}
