import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import BusinessCard from '../components/BusinessCard';
import HomePromotionCard from '../components/home/HomePromotionCard';
import { FavoritesProvider } from '../context/FavoritesContext';
import type { BusinessPreview } from '../types/business';

afterEach(() => cleanup());

function makePreview(plan: string): BusinessPreview {
  return {
    id: 'same-business',
    name: 'Mismo negocio',
    category: 'Comida',
    colonia: 'Centro',
    address: 'Centro',
    isOpen: 'si',
    plan,
    rating: 4.8,
    WhatsApp: '5219191234567',
  };
}

function renderBusinessCard(plan: string) {
  return render(
    <FavoritesProvider>
      <BusinessCard business={makePreview(plan)} />
    </FavoritesProvider>,
  );
}

describe('presentación pública neutral', () => {
  it('BusinessCard produce la misma variante y ningún badge para free y sponsor', () => {
    const free = renderBusinessCard('free');
    const freeArticleClass = free.container.querySelector('article')?.className;
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
    cleanup();

    const sponsor = renderBusinessCard('sponsor');
    expect(sponsor.container.querySelector('article')?.className).toBe(freeArticleClass);
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('HomePromotionCard conserva el mismo borde para free y sponsor', () => {
    const promotion = {
      business: makePreview('free'),
      message: 'Promoción local',
      urgencyLabel: 'Consulta vigencia',
    };
    const free = render(<HomePromotionCard promotion={promotion} />);
    const freeArticleClass = free.container.querySelector('article')?.className;
    cleanup();

    const sponsor = render(
      <HomePromotionCard
        promotion={{ ...promotion, business: makePreview('sponsor') }}
      />,
    );
    expect(sponsor.container.querySelector('article')?.className).toBe(freeArticleClass);
  });
});
