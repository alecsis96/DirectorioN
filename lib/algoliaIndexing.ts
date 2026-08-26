import type { Business } from '../types/business';
import { isVisible } from './businessHelpers';
import {
  asPlanInput,
  getEffectivePublicVariant,
  isEffectivePublicPremium,
} from './businessPlanVisibility';

export type AlgoliaBusinessRecord = ReturnType<typeof transformBusinessForAlgolia>;

export function transformBusinessForAlgolia(business: Business & { id: string }) {
  const publicVariant = getEffectivePublicVariant(asPlanInput(business));

  return {
    objectID: business.id,
    name: business.name || '',
    description: business.description || '',
    category: business.category || '',
    colonia: business.colonia || business.neighborhood || '',
    address: business.address || '',
    phone: business.phone || '',
    whatsapp: business.WhatsApp || '',
    facebook: business.Facebook || '',
    images: business.images?.map((image) => image.url).filter(Boolean) || [],
    logo: business.logoUrl || '',
    coverUrl: business.coverUrl || '',
    rating: business.rating || 0,
    reviewCount: typeof business.reviewCount === 'number' ? business.reviewCount : 0,
    isPremium: isEffectivePublicPremium(asPlanInput(business)),
    isFeatured: publicVariant === 'featured',
    status: 'published',
    hours: business.hours || '',
    horarios: business.horarios || {},
    plan: business.plan || 'free',
    _geoloc: business.location?.lat && business.location?.lng
      ? { lat: business.location.lat, lng: business.location.lng }
      : business.lat && business.lng
        ? { lat: business.lat, lng: business.lng }
        : undefined,
  };
}

export function selectVisibleBusinessesForAlgolia(
  businesses: Array<Business & { id: string }>,
): Array<Business & { id: string }> {
  return businesses.filter((business) => isVisible(business));
}

type AlgoliaIndexAdminClient = {
  setSettings(options: {
    indexName: string;
    indexSettings: Record<string, unknown>;
  }): Promise<{ taskID: number }>;
  waitForTask(options: {
    indexName: string;
    taskID: number;
  }): Promise<unknown>;
  replaceAllObjects(options: {
    indexName: string;
    objects: AlgoliaBusinessRecord[];
  }): Promise<unknown>;
};

export async function applyAlgoliaIndexSnapshot(
  client: AlgoliaIndexAdminClient,
  indexName: string,
  records: AlgoliaBusinessRecord[],
  indexSettings: Record<string, unknown>,
): Promise<void> {
  const settingsTask = await client.setSettings({ indexName, indexSettings });
  await client.waitForTask({ indexName, taskID: settingsTask.taskID });
  await client.replaceAllObjects({ indexName, objects: records });
}
