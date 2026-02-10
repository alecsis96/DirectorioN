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

// ============================================
// TIPOS
// ============================================

export type ApplicationStatus = 
  | 'submitted'       // Solicitud inicial enviada
  | 'needs_info'      // Admin solicitó cambios
  | 'ready_for_review' // Cumple requisitos, puede publicarse
  | 'approved'        // Aprobado y publicado
  | 'rejected';       // Rechazado

export type BusinessStatus = 
  | 'draft'        // Borrador, no visible
  | 'in_review'    // Enviado a revisión
  | 'published';   // Publicado y visible

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
 * Pesos de cada campo para calcular completitud
 * Total debe sumar 100
 */
export const FIELD_WEIGHTS = {
  // CRÍTICOS (obligatorios para publicar) - 60%
  name: 10,           // Obligatorio
  category: 10,       // Obligatorio
  location: 10,       // colonia + lat/lng
  contactPhone: 10,   // phone o WhatsApp
  description: 10,    // Mínimo 50 caracteres
  horarios: 10,       // Al menos 1 día configurado
  
  // IMPORTANTES (mejoran presencia) - 40%
  logo: 15,           // Imagen de perfil
  coverPhoto: 10,     // Imagen de portada
  gallery: 5,         // 2+ fotos adicionales
  socialMedia: 5,     // Facebook o Instagram
  detailedInfo: 5,    // Precio, envío, etc.
} as const;

/**
 * Requisitos mínimos para publicación
 */
export const PUBLISH_REQUIREMENTS = {
  name: { required: true, min: 2, max: 140 },
  category: { required: true },
  location: { required: true }, // colonia o lat/lng
  contact: { required: true },   // phone o WhatsApp
  description: { required: true, min: 50, max: 2000 },
  horarios: { required: true, minDays: 1 },
} as const;

// ============================================
// FUNCIONES CORE
// ============================================

/**
 * Calcula el porcentaje de completitud del perfil
 * 
 * @param business - Negocio a evaluar
 * @returns Número entre 0-100
 */
export function computeProfileCompletion(business: Partial<BusinessWithState>): number {
  let score = 0;
  
  // CRÍTICOS (60%)
  
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
  if (business.description && business.description.trim().length >= 50) {
    score += FIELD_WEIGHTS.description;
  }
  
  // Horarios (10%)
  if (business.horarios) {
    const openDays = Object.values(business.horarios).filter(day => day?.abierto).length;
    if (openDays >= 1) {
      score += FIELD_WEIGHTS.horarios;
    }
  }
  
  // IMPORTANTES (40%)
  
  // Logo (15%)
  if (business.logoUrl && business.logoUrl.trim().length > 0) {
    score += FIELD_WEIGHTS.logo;
  }
  
  // Foto de portada (10%)
  if (business.coverUrl && business.coverUrl.trim().length > 0) {
    score += FIELD_WEIGHTS.coverPhoto;
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
  
  return {
    ready: missing.length === 0,
    missingFields: missing,
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
  
  // Si está listo y aún no ha sido rechazado/aprobado, marcarlo como ready_for_review
  if (ready && (applicationStatus === 'submitted' || applicationStatus === 'needs_info')) {
    applicationStatus = 'ready_for_review';
  }
  
  // Si ya no está listo, regresar a needs_info (si fue modificado)
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
  
  if (status === 'published') {
    return {
      title: '✅ Negocio publicado',
      description: 'Tu negocio es visible en YajaGon y puede recibir clientes.',
      variant: 'success',
    };
  }
  
  if (status === 'in_review') {
    return {
      title: '⏳ En revisión',
      description: 'Tu negocio está siendo revisado. Te notificaremos cuando sea aprobado.',
      variant: 'info',
    };
  }
  
  if (appStatus === 'rejected') {
    return {
      title: '❌ Solicitud rechazada',
      description: business.rejectionReason || 'Revisa las observaciones del administrador.',
      variant: 'error',
    };
  }
  
  if (appStatus === 'ready_for_review') {
    return {
      title: '🔥 ¡Listo para publicar!',
      description: 'Tu perfil está completo. Publica tu negocio y comienza a recibir clientes.',
      action: '🚀 Publicar mi negocio',
      variant: 'success',
    };
  }
  
  if (appStatus === 'needs_info') {
    return {
      title: '⚠️ Se necesita más información',
      description: 'Completa los campos faltantes para poder publicar tu negocio.',
      variant: 'warning',
    };
  }
  
  // draft / submitted
  const percent = business.completionPercent || 0;
  return {
    title: '📝 Completando perfil',
    description: `Tu negocio aún no es visible. Completa tu perfil (${percent}%) para publicarlo.`,
    action: percent < 100 ? '✏️ Completar perfil' : '🚀 Publicar mi negocio',
    variant: 'draft',
  };
}
