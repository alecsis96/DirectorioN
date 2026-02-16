/**
 * 🛠️ BUSINESS HELPERS
 * Utilidades para normalizar y obtener datos de negocios
 */

import type { Business } from '../types/business';

/**
 * BusinessPlan - Planes válidos del sistema
 */
export type BusinessPlan = 'free' | 'featured' | 'sponsor';

/**
 * 📌 getEffectivePlan
 * 
 * Obtiene el plan efectivo de un negocio normalizando diferentes formatos.
 * 
 * CASOS MANEJADOS:
 * - Valores en mayúsculas: 'SPONSOR' → 'sponsor'
 * - Valores en español: 'patrocinado' → 'sponsor', 'destacado' → 'featured'
 * - Valores null/undefined → 'free'
 * - Valores legacy: 'premium' → 'featured'
 * 
 * @param business - Objeto de negocio (puede tener plan en diferentes formatos)
 * @returns Plan normalizado: 'free' | 'featured' | 'sponsor'
 * 
 * @example
 * getEffectivePlan({ plan: 'SPONSOR' }) // → 'sponsor'
 * getEffectivePlan({ plan: 'patrocinado' }) // → 'sponsor'
 * getEffectivePlan({ plan: null }) // → 'free'
 * getEffectivePlan({ plan: 'featured' }) // → 'featured'
 */
export function getEffectivePlan(business: Partial<Business>): BusinessPlan {
  const planValue = business?.plan;
  
  // Si no hay plan, es free
  if (!planValue || planValue === '') {
    return 'free';
  }
  
  // Normalizar a lowercase para comparación
  const normalized = planValue.toLowerCase().trim();
  
  // Mapeo de valores legacy/alternos a canónicos
  const planMap: Record<string, BusinessPlan> = {
    // Valores correctos (lowercase)
    'free': 'free',
    'featured': 'featured',
    'sponsor': 'sponsor',
    
    // Valores legacy en español
    'gratis': 'free',
    'destacado': 'featured',
    'patrocinado': 'sponsor',
    
    // Valores legacy en inglés
    'premium': 'featured',
    'sponsored': 'sponsor',
    
    // Fallback para mayúsculas (aunque ya normalizamos)
    'FREE': 'free',
    'FEATURED': 'featured',
    'SPONSOR': 'sponsor',
  };
  
  // Retornar plan mapeado o free por defecto
  return planMap[normalized] || 'free';
}

/**
 * 🏷️ getPlanDisplayName
 * 
 * Retorna el nombre del plan para mostrar en UI
 */
export function getPlanDisplayName(plan: BusinessPlan): string {
  const displayNames: Record<BusinessPlan, string> = {
    'free': '🆓 FREE',
    'featured': '🌟 DESTACADO',
    'sponsor': '⭐ SPONSOR',
  };
  
  return displayNames[plan];
}

/**
 * 🎨 getPlanBadgeClasses
 * 
 * Retorna las clases de Tailwind CSS para el badge del plan
 */
export function getPlanBadgeClasses(plan: BusinessPlan): string {
  const classes: Record<BusinessPlan, string> = {
    'free': 'bg-blue-100 text-blue-700',
    'featured': 'bg-yellow-100 text-yellow-700',
    'sponsor': 'bg-purple-100 text-purple-700',
  };
  
  return classes[plan];
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
