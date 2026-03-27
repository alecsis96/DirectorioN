import type { Business } from '../types/business';
import {
  resolveLegacyPlan,
  resolveVisibleTier,
  type LegacyBusinessPlan as BusinessPlan,
} from './businessPlanVisibility';

export function getEffectivePlan(business: Partial<Business>): BusinessPlan {
  return resolveLegacyPlan({
    plan: business?.plan,
    featured: business?.featured,
  });
}

export function getPlanDisplayName(plan: BusinessPlan): string {
  return resolveVisibleTier(plan) === 'premium' ? 'Premium' : 'Perfil base';
}

export function getPlanBadgeClasses(plan: BusinessPlan): string {
  return resolveVisibleTier(plan) === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
}

export function isDeleted(business: Partial<Business>): boolean {
  return business.businessStatus === 'deleted' || business.adminStatus === 'deleted';
}

export function isArchived(business: Partial<Business>): boolean {
  return business.adminStatus === 'archived';
}

export function isVisible(business: Partial<Business>): boolean {
  const adminStatus = business.adminStatus || 'active';
  const visibility = business.visibility || 'published';
  const businessStatus = business.businessStatus;

  return adminStatus === 'active' && visibility === 'published' && businessStatus === 'published';
}
