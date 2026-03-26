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
  return resolveVisibleTier(plan) === 'premium' ? '💎 PREMIUM' : '🆓 FREE';
}

export function getPlanBadgeClasses(plan: BusinessPlan): string {
  return resolveVisibleTier(plan) === 'premium'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-blue-100 text-blue-700';
}

/**
 * 🔍 isDeleted
 * 
 * Verifica si un negocio está eliminado (lógicamente)
 * Revisa ambos campos legacy y nuevos
 */
export function isDeleted(business: Partial<Business>): boolean {
  return (
    business.businessStatus === 'deleted' ||
    business.adminStatus === 'deleted'
  );
}

/**
 * 📦 isArchived
 * 
 * Verifica si un negocio está archivado
 */
export function isArchived(business: Partial<Business>): boolean {
  return business.adminStatus === 'archived';
}

/**
 * 👁️ isVisible
 * 
 * Verifica si un negocio debe ser visible en el directorio público
 */
export function isVisible(business: Partial<Business>): boolean {
  const adminStatus = business.adminStatus || 'active';
  const visibility = business.visibility || 'published';
  const businessStatus = business.businessStatus;
  
  return (
    adminStatus === 'active' &&
    visibility === 'published' &&
    businessStatus === 'published'
  );
}
