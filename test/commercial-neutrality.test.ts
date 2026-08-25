import { describe, expect, it, vi } from 'vitest';

import {
  getEffectivePublicPriority,
  getEffectivePublicVariant,
  isEffectivePublicPremium,
} from '../lib/businessPlanVisibility';
import { buildHomePageData } from '../lib/homePage';
import { resolveBusinessHeroCampaign } from '../lib/campaigns';
import { sortBusinessesWithSponsors } from '../lib/server/businessData';
import {
  buildNeutralPublicBusinessPage,
  sortBusinessesByPublicCriterion,
} from '../lib/negociosFilters';
import { getEffectiveAlgoliaIndexSettings } from '../lib/algoliaClient';
import {
  applyAlgoliaIndexSnapshot,
  selectVisibleBusinessesForAlgolia,
  transformBusinessForAlgolia,
} from '../lib/algoliaIndexing';
import { isAlgoliaPublicRouteEnabled } from '../lib/algoliaRoute';
import type { Business, BusinessPreview } from '../types/business';

function makeBusiness(id: string, plan: string, rating: number): Business {
  return {
    id,
    name: id,
    category: 'Comida',
    colonia: 'Centro',
    address: 'Centro',
    isOpen: 'si',
    plan,
    rating,
    promocionesActivas: `Promo ${id}`,
    businessStatus: 'published',
  };
}

function makePreview(id: string, plan: string, rating: number): BusinessPreview {
  return {
    id,
    name: id,
    category: 'Comida',
    colonia: 'Centro',
    address: 'Centro',
    isOpen: 'si',
    plan,
    rating,
  };
}

describe('neutralidad comercial pública', () => {
  it.each(['free', 'featured', 'sponsor', 'premium', 'destacado', 'patrocinado'])(
    'neutraliza el alias %s cuando monetización está apagada',
    (plan) => {
      expect(getEffectivePublicVariant(plan)).toBe('free');
      expect(getEffectivePublicPriority(plan)).toBe(0);
      expect(isEffectivePublicPremium(plan)).toBe(false);
    },
  );

  it('conserva el comportamiento legacy cuando monetización se reactiva', () => {
    expect(getEffectivePublicVariant('featured', true)).toBe('featured');
    expect(getEffectivePublicVariant('sponsor', true)).toBe('sponsor');
    expect(getEffectivePublicPriority('featured', true)).toBe(1);
    expect(getEffectivePublicPriority('sponsor', true)).toBe(2);
    expect(isEffectivePublicPremium('premium', true)).toBe(true);
  });

  it('Home ordena por señales orgánicas y no construye vitrinas premium', () => {
    const data = buildHomePageData([
      makeBusiness('sponsor-bajo', 'sponsor', 1),
      makeBusiness('free-alto', 'free', 5),
      makeBusiness('featured-medio', 'featured', 3),
    ]);

    expect(data.promotions.map((item) => item.business.id)).toEqual([
      'free-alto',
      'featured-medio',
      'sponsor-bajo',
    ]);
    expect(data.premiumShowcase).toEqual([]);
    expect(data.sponsorShowcase).toEqual([]);
    expect(data.featuredShowcase).toEqual([]);
    expect(data.organicShowcase.map((business) => business.id)).toEqual([
      'free-alto',
      'featured-medio',
      'sponsor-bajo',
    ]);
  });

  it('/negocios conserva todos los planes y usa un solo orden y paginación', () => {
    const businesses = Array.from({ length: 15 }, (_, index) =>
      makePreview(
        `negocio-${String(index).padStart(2, '0')}`,
        index % 3 === 0 ? 'sponsor' : index % 3 === 1 ? 'featured' : 'free',
        index,
      ),
    );

    const sorted = sortBusinessesByPublicCriterion(businesses, 'rating');
    const page = buildNeutralPublicBusinessPage(businesses, 'rating', 2);

    expect(sorted.map((business) => business.rating)).toEqual(
      [...businesses].map((business) => business.rating).sort((a, b) => (b ?? 0) - (a ?? 0)),
    );
    expect(page.total).toBe(15);
    expect(page.items).toHaveLength(15);
    expect(new Set(page.items.map((business) => business.id)).size).toBe(15);
    expect(new Set(page.items.map((business) => business.plan))).toEqual(
      new Set(['free', 'featured', 'sponsor']),
    );
  });

  it('el orden server de /negocios es estable cuando la prioridad efectiva vale cero', () => {
    const businesses = [
      makeBusiness('free', 'free', 1),
      makeBusiness('sponsor', 'sponsor', 1),
      makeBusiness('featured', 'featured', 1),
    ];

    expect(sortBusinessesWithSponsors(businesses).map((business) => business.id)).toEqual([
      'free',
      'sponsor',
      'featured',
    ]);
  });

  it('campañas fallback no derivan prioridad ni tono del plan', () => {
    const free = resolveBusinessHeroCampaign({ ...makeBusiness('free', 'free', 4), WhatsApp: '123' });
    const sponsor = resolveBusinessHeroCampaign({ ...makeBusiness('sponsor', 'sponsor', 4), WhatsApp: '123' });

    expect(free?.priority).toBe(sponsor?.priority);
    expect(free?.tone).toBe('neutral');
    expect(sponsor?.tone).toBe('neutral');
  });
});

describe('neutralidad local de Algolia', () => {
  it('elimina boosts y facets comerciales de los settings efectivos', () => {
    const disabled = getEffectiveAlgoliaIndexSettings(false);
    const enabled = getEffectiveAlgoliaIndexSettings(true);

    expect(disabled.customRanking).not.toContain('desc(isPremium)');
    expect(disabled.customRanking).not.toContain('desc(isFeatured)');
    expect(disabled.attributesForFaceting).not.toContain('searchable(plan)');
    expect(enabled.customRanking).toEqual(
      expect.arrayContaining(['desc(isPremium)', 'desc(isFeatured)']),
    );
  });

  it('conserva plan histórico y neutraliza flags públicos del objeto', () => {
    const record = transformBusinessForAlgolia(makeBusiness('sponsor', 'sponsor', 5) as Business & { id: string });

    expect(record.plan).toBe('sponsor');
    expect(record.isPremium).toBe(false);
    expect(record.isFeatured).toBe(false);
    expect(record.status).toBe('published');
  });

  it('selecciona únicamente negocios canónicamente visibles', () => {
    const visible = makeBusiness('visible', 'sponsor', 5) as Business & { id: string };
    const hidden = { ...makeBusiness('hidden', 'free', 5), visibility: 'hidden' } as Business & { id: string };
    const archived = { ...makeBusiness('archived', 'featured', 5), adminStatus: 'archived' } as Business & { id: string };
    const inactive = { ...makeBusiness('inactive', 'free', 5), isActive: false } as Business & { id: string };

    expect(selectVisibleBusinessesForAlgolia([visible, hidden, archived, inactive]).map((business) => business.id)).toEqual(['visible']);
  });

  it('aplica settings antes de reemplazar el snapshot completo', async () => {
    const calls: string[] = [];
    const client = {
      setSettings: vi.fn(async () => {
        calls.push('settings');
        return { taskID: 42 };
      }),
      waitForTask: vi.fn(async () => { calls.push('wait'); }),
      replaceAllObjects: vi.fn(async () => { calls.push('replace'); }),
    };

    await applyAlgoliaIndexSnapshot(client, 'businesses', [], { customRanking: [] });

    expect(calls).toEqual(['settings', 'wait', 'replace']);
    expect(client.waitForTask).toHaveBeenCalledWith({
      indexName: 'businesses',
      taskID: 42,
    });
    expect(client.replaceAllObjects).toHaveBeenCalledWith({
      indexName: 'businesses',
      objects: [],
    });
  });

  it('mantiene protegida la ruta pública hasta verificar el índice remoto', () => {
    expect(isAlgoliaPublicRouteEnabled()).toBe(false);
    expect(isAlgoliaPublicRouteEnabled(true)).toBe(true);
  });
});
