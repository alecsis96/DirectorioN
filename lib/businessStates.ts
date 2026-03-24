/**
 * NUEVA ARQUITECTURA DE ESTADOS - MARKETPLACE MODERNO
 * ====================================================
 * 
 * Este sistema permite que los usuarios accedan inmediatamente a su dashboard
 * después de completar el wizard, sin esperar aprobación admin.
 * 
 * MÁQUINA DE ESTADOS:
 * 
 * applicationStatus (en collection 'applications'):
 *   - submitted: Usuario completó wizard, solicitud enviada
 *   - needs_info: Admin solicitó cambios/más información
 *   - ready_for_review: Negocio cumple requisitos mínimos, listo para publicar
 *   - approved: Admin aprobó, negocio publicado
 *   - rejected: Admin rechazó la solicitud
 * 
 * businessStatus (en collection 'businesses'):
 *   - draft: Usuario editando, no visible públicamente
 *   - in_review: Usuario solicitó publicación, pendiente de admin
 *   - published: Visible públicamente en el directorio
 * 
 * FLUJO:
 * 1. Usuario completa wizard → businessStatus=draft, applicationStatus=submitted
 * 2. Usuario completa perfil → applicationStatus=ready_for_review (automático)
 * 3. Usuario click "Publicar" → businessStatus=in_review
 * 4. Admin aprueba → businessStatus=published, applicationStatus=approved
 */

import { PLAN_PERMISSIONS, getResourceLimit, normalizePlan, type BusinessPlan } from './planPermissions';

// ============================================
// TIPOS
// ============================================

export type ApplicationStatus = 
  | 'submitted'       // Solicitud inicial enviada
  | 'needs_info'      // Admin solicitó cambios
  | 'ready_for_review' // Cumple requisitos, puede publicarse
  | 'approved'        // Aprobado y publicado
  | 'rejected'        // Rechazado
  | 'deleted';        // Eliminado

export type BusinessStatus = 
  | 'draft'        // Borrador, no visible
  | 'in_review'    // Enviado a revisión
  | 'published'    // Publicado y visible
  | 'deleted';     // Eliminado (borrado lógico)

export type AdminStatus =
  | 'active'       // Normal, visible según businessStatus
  | 'archived'     // Archivado, no visible pero recuperable
  | 'deleted';     // Eliminado por admin

export type Visibility =
  | 'published'    // Visible en directorio público
  | 'hidden';      // Oculto del directorio

/**
 * Estructura mejorada del negocio con nuevos campos de estado
 */
export interface BusinessWithState {
  // Campos originales
  id: string;
  name: string;
  category: string;
  description?: string;
  phone?: string;
  WhatsApp?: string;
  address?: string;
  colonia?: string;
  lat?: number;
  lng?: number;
  logoUrl?: string;
  coverUrl?: string;
  images?: Array<{ url?: string; publicId?: string }>;
  horarios?: Record<string, { abierto: boolean; desde: string; hasta: string }>;
  
  // Owner
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  
  // NUEVOS CAMPOS DE ESTADO
  businessStatus: BusinessStatus;
  applicationStatus: ApplicationStatus;
  
  // NUEVOS CAMPOS DE COMPLETITUD
  completionPercent: number;  // 0-100
  isPublishReady: boolean;     // TRUE cuando cumple requisitos mínimos
  missingFields?: string[];    // Lista de campos críticos faltantes
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt?: Date | string;
  lastReviewedAt?: Date | string;
  
  // Admin feedback
  adminNotes?: string;
  rejectionReason?: string;
  
  // Plan y otros
  plan?: 'free' | 'featured' | 'sponsor';
  featured?: boolean;
  [key: string]: any; // Mantener compatibilidad
}

/**
 * Helpers para validar requisitos por plan
 */
function isCoverRequiredForPlan(plan?: string): boolean {
  if (!plan || plan === 'free') return false;
  return plan === 'featured' || plan === 'sponsor';
}

function getCoverWeightForPlan(plan?: string): number {
  // Portada NO disponible para FREE (peso 0)
  if (!plan || plan === 'free') return 0;
  // Portada requerida para FEATURED/SPONSOR (peso 30%)
  return 30;
}

function getLogoWeightForPlan(plan?: string): number {
  // Logo opcional para todos los planes
  // Pero ajustar peso si cover no está disponible (para que FREE pueda llegar a 100%)
  if (!plan || plan === 'free') return 35; // Aumentado para compensar ausencia de cover
  return 5; // Peso normal si tiene cover disponible
}

/**
 * Pesos de cada campo para calcular completitud
 * Total debe sumar 100
 * 
 * ⚠️ IMPORTANTE: Portada es CONDICIONAL por plan
 * - FREE: NO disponible (peso 0%) → Logo aumenta a 35%
 * - FEATURED/SPONSOR: REQUERIDA (peso 30%)
 */
export const FIELD_WEIGHTS = {
  // CRÍTICOS (obligatorios para publicar) - 90% base
  name: 10,           // Obligatorio para todos
  category: 10,       // Obligatorio para todos
  location: 10,       // colonia + lat/lng - Obligatorio para todos
  contactPhone: 10,   // phone o WhatsApp - Obligatorio para todos
  description: 10,    // Mínimo 2 caracteres - Obligatorio para todos
  horarios: 10,       // Al menos 1 día configurado - Obligatorio para todos
  coverPhoto: 30,     // ⚠️ CONDICIONAL: 30% si featured/sponsor, 0% si free
  
  // EXTRAS (mejoran presencia) - 10% base
  logo: 5,            // ⚠️ CONDICIONAL: 35% si free (compensa cover), 5% si featured/sponsor
  gallery: 3,         // 2+ fotos adicionales según el límite del plan
  socialMedia: 1,     // Facebook o Instagram
  detailedInfo: 1,    // Precio, envío, etc.
} as const;

/**
 * Requisitos mínimos para publicación
 * 
 * ⚠️ CAMBIO: coverPhoto es SIEMPRE OPCIONAL (no requisito para ningún plan)
 * - FREE: cover opcional (beneficio visual)
 * - FEATURED/SPONSOR: cover opcional pero ALTAMENTE RECOMENDADA
 * 
 * Los campos recomendados (no obligatorios) están en getRecommendedImprovements()
 */
export const PUBLISH_REQUIREMENTS = {
  name: { required: true, min: 2, max: 140 },
  category: { required: true },
  location: { required: true }, // colonia o lat/lng
  contact: { required: true },   // phone o WhatsApp
  description: { required: true, min: 2, max: 2000 },
  horarios: { required: true, minDays: 1 },
  // ✅ coverPhoto NO es requisito (siempre opcional)
} as const;

// ============================================
// FUNCIONES CORE
// ============================================

/**
 * Calcula el porcentaje de completitud del perfil
 * 
 * Ajusta pesos dinámicamente según el plan:
 * - FREE: Sin cover (0%), logo aumenta a 35%
 * - FEATURED/SPONSOR: Con cover (30%), logo normal 5%
 * 
 * @param business - Negocio a evaluar
 * @returns Número entre 0-100
 */
export function computeProfileCompletion(business: Partial<BusinessWithState>): number {
  let score = 0;
  const plan = business.plan as BusinessPlan | undefined;
  
  // Obtener pesos dinámicos según plan
  const coverWeight = getCoverWeightForPlan(plan);
  const logoWeight = getLogoWeightForPlan(plan);
  
  // CRÍTICOS (obligatorios para publicar) - 60% base
  
  // Nombre (10%)
  if (business.name && business.name.trim().length >= 2) {
    score += FIELD_WEIGHTS.name;
  }
  
  // Categoría (10%)
  if (business.category && business.category.trim().length > 0) {
    score += FIELD_WEIGHTS.category;
  }
  
  // Ubicación (10%)
  const hasLocation = (
    (business.colonia && business.colonia.trim().length > 0) ||
    (business.lat && business.lng)
  );
  if (hasLocation) {
    score += FIELD_WEIGHTS.location;
  }
  
  // Teléfono/WhatsApp (10%)
  const hasContact = (
    (business.phone && business.phone.trim().length >= 7) ||
    (business.WhatsApp && business.WhatsApp.trim().length >= 7)
  );
  if (hasContact) {
    score += FIELD_WEIGHTS.contactPhone;
  }
  
  // Descripción (10%)
  if (business.description && business.description.trim().length >= 2) {
    score += FIELD_WEIGHTS.description;
  }
  
  // Horarios (10%)
  if (business.horarios) {
    const openDays = Object.values(business.horarios).filter(day => day?.abierto).length;
    if (openDays >= 1) {
      score += FIELD_WEIGHTS.horarios;
    }
  }
  
  // IMPORTANTES (40% ajustable según plan)
  
  // Logo (5-35% según plan - Opcional para todos)
  if (business.logoUrl && business.logoUrl.trim().length > 0) {
    score += logoWeight;
  }
  
  // Foto de portada (0-30% según plan - Solo featured/sponsor)
  if (coverWeight > 0 && business.coverUrl && business.coverUrl.trim().length > 0) {
    score += coverWeight;
  }
  
  // Galería (5%)
  const hasGallery = (
    business.images && business.images.length >= 2 &&
    business.images.filter(img => img.url && img.url.trim().length > 0).length >= 2
  );
  if (hasGallery) {
    score += FIELD_WEIGHTS.gallery;
  }
  
  // Redes sociales (5%)
  const hasSocial = (
    (business.Facebook && business.Facebook.trim().length > 0) ||
    (business as any).Instagram && (business as any).Instagram.trim().length > 0
  );
  if (hasSocial) {
    score += FIELD_WEIGHTS.socialMedia;
  }
  
  // Info detallada (5%)
  const hasDetailedInfo = (
    (business as any).priceRange ||
    (business as any).hasEnvio !== undefined ||
    ((business as any).servicios && (business as any).servicios.length > 0)
  );
  if (hasDetailedInfo) {
    score += FIELD_WEIGHTS.detailedInfo;
  }
  
  return Math.round(score);
}

/**
 * Verifica si el negocio cumple los requisitos mínimos para publicación
 * 
 * @param business - Negocio a evaluar
 * @returns { ready: boolean, missingFields: string[] }
 */
export function isPublishReady(business: Partial<BusinessWithState>): {
  ready: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  
  // Nombre
  if (!business.name || business.name.trim().length < PUBLISH_REQUIREMENTS.name.min) {
    missing.push('nombre del negocio');
  }
  
  // Categoría
  if (!business.category || business.category.trim().length === 0) {
    missing.push('categoría');
  }
  
  // Ubicación
  const hasLocation = (
    (business.colonia && business.colonia.trim().length > 0) ||
    (business.lat && business.lng)
  );
  if (!hasLocation) {
    missing.push('ubicación (colonia)');
  }
  
  // Contacto
  const hasContact = (
    (business.phone && business.phone.trim().length >= 7) ||
    (business.WhatsApp && business.WhatsApp.trim().length >= 7)
  );
  if (!hasContact) {
    missing.push('teléfono o WhatsApp');
  }
  
  // Descripción
  if (!business.description || business.description.trim().length < PUBLISH_REQUIREMENTS.description.min) {
    missing.push(`descripción (mínimo ${PUBLISH_REQUIREMENTS.description.min} caracteres)`);
  }
  
  // Horarios
  if (!business.horarios) {
    missing.push('horarios de atención');
  } else {
    const openDays = Object.values(business.horarios).filter(day => day?.abierto).length;
    if (openDays < PUBLISH_REQUIREMENTS.horarios.minDays) {
      missing.push('horarios (al menos 1 día)');
    }
  }
  
  // ✅ PORTADA ELIMINADA DE REQUISITOS
  // coverPhoto es siempre opcional, ahora está en getRecommendedImprovements()
  
  return {
    ready: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Obtiene mejoras recomendadas (no requisitos) para mejorar presencia
 * 
 * Estas son sugerencias opcionales que mejoran el perfil pero NO bloquean publicación:
 * - Imagen de portada (especialmente para featured/sponsor)
 * - Galería de fotos adicionales
 * - Redes sociales
 * - Logo
 * 
 * @param business - Negocio a evaluar
 * @returns { recommendations: string[] }
 */
export function getRecommendedImprovements(business: Partial<BusinessWithState>): {
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const plan = business.plan as BusinessPlan | undefined;
  
  // Portada - ALTAMENTE recomendada para featured/sponsor, opcional para free
  if (!business.coverUrl || business.coverUrl.trim().length === 0) {
    if (plan === 'featured' || plan === 'sponsor') {
      recommendations.push('🌟 Imagen de portada (altamente recomendada para destacar tu negocio)');
    } else {
      recommendations.push('Imagen de portada (mejora visualización)');
    }
  }
  
  // Logo
  if (!business.logoUrl || business.logoUrl.trim().length === 0) {
    recommendations.push('Logo del negocio');
  }
  
  // Galería (solo para planes pagos)
  const normalizedPlan = normalizePlan(plan);
  const galleryLimit = getResourceLimit(normalizedPlan, 'galleryPhotos');
  if (galleryLimit >= 2) {
    const hasGallery = business.images && business.images.length >= 2;
    if (!hasGallery) {
      recommendations.push('Galería de fotos (al menos 2 imágenes adicionales)');
    }
  }
  
  // Redes sociales
  const hasSocial = (
    (business.Facebook && business.Facebook.trim().length > 0) ||
    (business as any).Instagram && (business as any).Instagram.trim().length > 0
  );
  if (!hasSocial) {
    recommendations.push('Redes sociales (Facebook o Instagram)');
  }
  
  // Info detallada
  const hasDetailedInfo = (
    (business as any).priceRange ||
    (business as any).hasEnvio !== undefined ||
    ((business as any).servicios && (business as any).servicios.length > 0)
  );
  if (!hasDetailedInfo) {
    recommendations.push('Información adicional (rango de precios, envío, servicios)');
  }
  
  return {
    recommendations,
  };
}

/**
 * Actualiza los campos de estado de un negocio
 * Debe llamarse cada vez que se edita el negocio
 * 
 * @param business - Negocio a actualizar
 * @returns BusinessWithState con campos actualizados
 */
export function updateBusinessState(business: Partial<BusinessWithState>): {
  completionPercent: number;
  isPublishReady: boolean;
  missingFields: string[];
  applicationStatus: ApplicationStatus;
} {
  const completionPercent = computeProfileCompletion(business);
  const { ready, missingFields } = isPublishReady(business);
  
  // Auto-actualizar applicationStatus basado en completitud
  let applicationStatus = business.applicationStatus || 'submitted';
  const businessStatus = business.businessStatus || 'draft';
  
  // 🔒 NO modificar si ya está en revisión o publicado
  if (businessStatus === 'in_review' || businessStatus === 'published') {
    // Mantener el applicationStatus actual sin cambios
    return {
      completionPercent,
      isPublishReady: ready,
      missingFields,
      applicationStatus,
    };
  }
  
  // ✅ Si está listo y aún no ha sido enviado a revisión, marcarlo como ready_for_review
  if (ready && (applicationStatus === 'submitted' || applicationStatus === 'needs_info')) {
    applicationStatus = 'ready_for_review';
  }
  
  // ⚠️ Si ya no está listo, regresar a needs_info (si fue modificado)
  if (!ready && applicationStatus === 'ready_for_review') {
    applicationStatus = 'needs_info';
  }
  
  return {
    completionPercent,
    isPublishReady: ready,
    missingFields,
    applicationStatus,
  };
}

/**
 * Verifica si el usuario puede editar el negocio
 * 
 * @param businessStatus - Estado actual del negocio
 * @returns boolean
 */
export function canEditBusiness(businessStatus: BusinessStatus): boolean {
  return businessStatus === 'draft' || businessStatus === 'in_review';
}

/**
 * Verifica si el usuario puede publicar el negocio
 * 
 * @param business - Negocio a verificar
 * @returns boolean
 */
export function canPublishBusiness(business: Partial<BusinessWithState>): boolean {
  const { ready } = isPublishReady(business);
  return (
    ready &&
    (business.businessStatus === 'draft' || business.businessStatus === undefined) &&
    business.applicationStatus !== 'rejected'
  );
}

/**
 * Get descriptive status text for UI
 */
export function getStatusText(business?: Partial<BusinessWithState> | null): {
  title: string;
  description: string;
  action?: string;
  variant: 'draft' | 'warning' | 'success' | 'error' | 'info';
} {
  // ✅ GUARD: Retornar estado por defecto si business es null/undefined
  if (!business || typeof business !== 'object') {
    return {
      title: '📝 Borrador',
      description: 'Completa tu perfil para publicar tu negocio.',
      variant: 'draft',
    };
  }
  
  const status = business.businessStatus || 'draft';
  const appStatus = business.applicationStatus || 'submitted';
  
  // 1️⃣ PRIORIDAD MÁXIMA: Verificar businessStatus primero
  if (status === 'published') {
    return {
      title: '✅ Negocio publicado',
      description: 'Tu negocio es visible en YajaGon y puede recibir clientes.',
      variant: 'success',
    };
  }
  
  if (status === 'in_review') {
    return {
      title: '⏳ En revisión por administrador',
      description: 'Tu solicitud está siendo revisada. Te notificaremos cuando sea aprobada.',
      variant: 'info',
    };
  }
  
  // 2️⃣ SEGUNDA PRIORIDAD: applicationStatus (solo para draft)
  if (appStatus === 'rejected') {
    return {
      title: '❌ Solicitud rechazada',
      description: business.rejectionReason || 'Revisa las observaciones del administrador.',
      variant: 'error',
    };
  }
  
  if (appStatus === 'ready_for_review' && status === 'draft') {
    return {
      title: '✨ Perfil completo',
      description: 'Tu negocio cumple todos los requisitos. Envíalo a revisión para publicarlo.',
      action: '🚀 Enviar a revisión',
      variant: 'success',
    };
  }
  
  if (appStatus === 'needs_info') {
    return {
      title: '⚠️ Se necesita más información',
      description: business.adminNotes || 'Completa los campos faltantes para poder publicar tu negocio.',
      variant: 'warning',
    };
  }
  
  // 3️⃣ TERCERA PRIORIDAD: draft genérico (submitted o incompleto)
  const percent = business.completionPercent || 0;
  const isComplete = business.isPublishReady === true;
  
  if (isComplete) {
    return {
      title: '✨ Perfil completo',
      description: `Tu negocio está completo (${percent}%). Envíalo a revisión cuando estés listo.`,
      action: '🚀 Enviar a revisión',
      variant: 'success',
    };
  }
  
  return {
    title: '📝 Completando perfil',
    description: `Tu negocio aún no es visible. Completa tu perfil (${percent}%) para poder publicarlo.`,
    action: percent >= 50 ? '✏️ Completar perfil' : undefined,
    variant: 'draft',
  };
}
