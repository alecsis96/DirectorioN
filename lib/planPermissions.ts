/**
 * 🎯 Sistema de Permisos por Plan - YajaGon Marketplace
 * Arquitectura de monetización basada en psicología de conversión
 * 
 * FILOSOFÍA:
 * - FREE: Digno y funcional - Usuario debe sentirse bien, no castigado
 * - FEATURED: Aspiracional y deseable - Diferenciación clara que justifica upgrade
 * - SPONSOR: Autoridad y dominio - Hero visual que transmite liderazgo
 */

export type BusinessPlan = 'free' | 'featured' | 'sponsor';

/**
 * 📊 TABLA MAESTRA DE PERMISOS
 * Configuración centralizada de features por plan
 */
export const PLAN_PERMISSIONS = {
  free: {
    // ✅ PERMITIDO - Lo esencial para verse profesional
    allowedFeatures: [
      'logo',           // Logo obligatorio - Identidad visual básica
      'profilePhoto',   // 1 foto obligatoria de perfil/local
      'basicInfo',      // Nombre, categoría, descripción
      'contact',        // Teléfono, WhatsApp
      'location',       // Dirección, mapa, coordenadas
      'hours',          // Horario de atención
      'socialLinks',    // Facebook (opcional)
      'gallery',        // Hasta 2 fotos adicionales
    ],
    
    // ❌ BLOQUEADO - Features premium
    deniedFeatures: [
      'coverImage',     // Portada hero NO disponible
      'metrics',        // Métricas analíticas NO disponibles
      'badge',          // Sin badges de distinción
      'priorityRanking', // Sin posicionamiento preferencial
      'reviews',        // Sin módulo de reseñas (pueden aparecer pero sin destacar)
    ],
    
    // 📸 Límites de contenido
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: false, count: 0 },
      galleryPhotos: { required: false, count: 2 },
      description: { maxChars: 500 },
      totalPhotos: 4, // logo + profilePhoto + 2 gallery
    },
    
    // 🎨 Jerarquía visual
    visualHierarchy: {
      cardHeight: 120,              // px - Altura mínima
      badge: null,                   // Sin badge
      border: 'gray-200',            // Border neutral
      shadow: '',                    // Sin sombra
      position: 'standard',          // Posición normal en listados
      zIndex: 0,
      ranking: 3,                    // Prioridad baja
    },
    
    // 💬 Mensajes de upsell
    upsellMessages: {
      coverImage: 'Agrega una portada llamativa y destaca sobre otros negocios. Disponible en Plan Destacado.',
      gallery: 'Mantén tus 2 fotos y desbloquea portada, prioridad y métricas básicas con Plan Destacado.',
      metrics: 'Conoce cuántas personas ven tu negocio, dan clic en WhatsApp y más. Upgrade a Plan Destacado.',
      badge: 'Gana un badge de "Negocio Destacado" y aumenta tu credibilidad. Desde $199/mes.',
    },
  },
  
  featured: {
    // ✅ PERMITIDO - Todo de FREE + diferenciadores clave
    allowedFeatures: [
      // Todo de FREE
      'logo',
      'profilePhoto',
      'basicInfo',
      'contact',
      'location',
      'hours',
      'socialLinks',
      
      // + Premium features
      'coverImage',       // ⭐ Portada hero visible
      'gallery',          // ⭐ Galería de fotos
      'metricsBasic',     // ⭐ Métricas básicas (vistas, clics)
      'badge',            // ⭐ Badge "Negocio Destacado"
      'priorityRanking',  // ⭐ Aparece arriba de FREE
      'reviews',          // ⭐ Módulo de reseñas destacado
    ],
    
    // ❌ BLOQUEADO - Features exclusivos de SPONSOR
    deniedFeatures: [
      'metricsAdvanced',  // Métricas avanzadas (favoritos, etc)
      'premiumBadge',     // Badge premium "Líder en la zona"
      'heroPosition',     // Posición hero (top absolute)
    ],
    
    // 📸 Límites de contenido
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: true, count: 1 },
      galleryPhotos: { required: false, count: 2 },
      description: { maxChars: 1000 },
      totalPhotos: 5, // logo + profile + cover + 2 gallery
    },
    
    // 🎨 Jerarquía visual
    visualHierarchy: {
      cardHeight: 145,               // px - 20% más que FREE
      badge: '⭐ Negocio Destacado',
      badgeStyle: 'amber',
      border: 'amber-300',
      shadow: 'shadow-lg shadow-amber-100',
      position: 'priority',          // Arriba de FREE
      zIndex: 10,
      ranking: 2,                    // Prioridad media-alta
    },
    
    // 💬 Mensajes de upsell
    upsellMessages: {
      metricsAdvanced: 'Accede a métricas avanzadas: favoritos, llamadas, reseñas y más. Upgrade a Patrocinado.',
      premiumBadge: 'Obtén el badge "Negocio Líder en la Zona" y domina tu categoría. Plan Patrocinado desde $399/mes.',
      heroPosition: 'Aparece SIEMPRE en la primera posición. Plan Patrocinado desde $399/mes.',
      morePhotos: 'Sube hasta 10 fotos y muestra todo tu negocio. Upgrade a Patrocinado.',
    },
  },
  
  sponsor: {
    // ✅ PERMITIDO - Acceso total
    allowedFeatures: [
      // Todo de FEATURED
      'logo',
      'profilePhoto',
      'basicInfo',
      'contact',
      'location',
      'hours',
      'socialLinks',
      'coverImage',
      'gallery',
      'metricsBasic',
      'badge',
      'priorityRanking',
      'reviews',
      
      // + Premium exclusive
      'metricsAdvanced',   // 👑 Métricas avanzadas completas
      'premiumBadge',      // 👑 Badge "Negocio Líder"
      'heroPosition',      // 👑 Posición hero absoluta
      'videoSupport',      // 👑 Soporte para video (futuro)
      'verifiedBadge',     // 👑 Badge de verificado
    ],
    
    // ❌ BLOQUEADO - Ninguno (acceso completo)
    deniedFeatures: [],
    
    // 📸 Límites de contenido
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: true, count: 1 },
      galleryPhotos: { required: false, count: 10 },
      description: { maxChars: 2000 },
      totalPhotos: 12, // logo + profile + cover + 10 gallery
    },
    
    // 🎨 Jerarquía visual
    visualHierarchy: {
      cardHeight: 180,               // px - 50% más que FREE
      badge: '👑 Negocio Líder en la Zona',
      badgeStyle: 'purple',
      border: 'purple-400',
      shadow: 'shadow-2xl shadow-purple-200',
      position: 'hero',              // Posición dominante
      zIndex: 20,
      ranking: 1,                    // Prioridad máxima
    },
    
    // 💬 Sin mensajes de upsell (acceso completo)
    upsellMessages: {},
  },
} as const;

/**
 * 🔐 HELPERS DE VALIDACIÓN DE PERMISOS
 */

/**
 * Verifica si un plan tiene acceso a una feature
 */
export function hasFeatureAccess(
  plan: BusinessPlan,
  feature: string
): boolean {
  const permissions = PLAN_PERMISSIONS[plan];
  return (permissions.allowedFeatures as readonly string[]).includes(feature);
}

/**
 * Verifica si una feature está bloqueada para un plan
 */
export function isFeatureLocked(
  plan: BusinessPlan,
  feature: string
): boolean {
  const permissions = PLAN_PERMISSIONS[plan];
  return (permissions.deniedFeatures as readonly string[]).includes(feature);
}

/**
 * Obtiene el límite de un recurso para un plan
 */
export function getResourceLimit(
  plan: BusinessPlan,
  resource: keyof typeof PLAN_PERMISSIONS.free.limits
): number {
  const permissions = PLAN_PERMISSIONS[plan];
  const limit = permissions.limits[resource];
  
  if (typeof limit === 'number') return limit;
  if (typeof limit === 'object' && 'count' in limit) return limit.count;
  if (typeof limit === 'object' && 'maxChars' in limit) return limit.maxChars;
  
  return 0;
}

/**
 * Verifica si un recurso es obligatorio
 */
export function isResourceRequired(
  plan: BusinessPlan,
  resource: 'logo' | 'profilePhoto' | 'coverImage' | 'galleryPhotos'
): boolean {
  const permissions = PLAN_PERMISSIONS[plan];
  const limit = permissions.limits[resource];
  
  if (typeof limit === 'object' && 'required' in limit) {
    return limit.required;
  }
  
  return false;
}

/**
 * Obtiene el mensaje de upsell para una feature bloqueada
 */
export function getUpsellMessage(
  plan: BusinessPlan,
  feature: string
): string | null {
  const permissions = PLAN_PERMISSIONS[plan];
  return permissions.upsellMessages[feature as keyof typeof permissions.upsellMessages] || null;
}

/**
 * Obtiene la jerarquía visual de un plan
 */
export function getVisualHierarchy(plan: BusinessPlan) {
  return PLAN_PERMISSIONS[plan].visualHierarchy;
}

/**
 * Obtiene el plan recomendado para upgrade
 */
export function getRecommendedUpgrade(plan: BusinessPlan): BusinessPlan | null {
  if (plan === 'free') return 'featured';
  if (plan === 'featured') return 'sponsor';
  return null; // Sponsor ya tiene todo
}

/**
 * Calcula el ranking score para ordenamiento en listados
 */
export function getPlanRankingScore(plan: BusinessPlan): number {
  return PLAN_PERMISSIONS[plan].visualHierarchy.ranking;
}

/**
 * Normaliza el plan a un valor válido
 */
export function normalizePlan(plan?: string | null): BusinessPlan {
  if (!plan) return 'free';
  
  const normalized = plan.toLowerCase().trim();
  
  // Mapeo de variantes
  if (normalized === 'sponsor' || normalized === 'patrocinado' || normalized === 'premium') {
    return 'sponsor';
  }
  if (normalized === 'featured' || normalized === 'destacado') {
    return 'featured';
  }
  
  // Default a free para cualquier valor inválido
  return 'free';
}

/**
 * 🎯 ESTRATEGIAS DE CONVERSIÓN
 */

/**
 * Obtiene la propuesta de valor para upgrade
 */
export function getUpgradeValueProp(fromPlan: BusinessPlan, feature: string): {
  title: string;
  benefit: string;
  cta: string;
  targetPlan: BusinessPlan;
} | null {
  const targetPlan = getRecommendedUpgrade(fromPlan);
  if (!targetPlan) return null;
  
  // Value props específicos por feature
  const valueProps: Record<string, any> = {
    coverImage: {
      title: 'Agrega una Portada Impactante',
      benefit: 'Los negocios con portada reciben 3X más clics',
      cta: 'Ver Plan Destacado',
      targetPlan: 'featured',
    },
    gallery: {
      title: fromPlan === 'free' ? 'Haz que tus fotos destaquen más' : 'Muestra más de tu negocio con fotos',
      benefit: fromPlan === 'free'
        ? 'Mantén tus 2 fotos y además desbloquea portada, prioridad y métricas básicas'
        : 'Sube hasta 10 fotos y muestra todo lo que ofreces',
      cta: fromPlan === 'free' ? 'Ver Plan Destacado' : 'Ver Plan Patrocinado',
      targetPlan,
    },
    metrics: {
      title: 'Conoce a tu Audiencia',
      benefit: 'Descubre cuántas personas te ven y contactan cada día',
      cta: 'Activar Métricas',
      targetPlan: 'featured',
    },
    metricsAdvanced: {
      title: 'Métricas Avanzadas Completas',
      benefit: 'Análisis detallado: favoritos, llamadas, mapas y más',
      cta: 'Ver Plan Patrocinado',
      targetPlan: 'sponsor',
    },
    badge: {
      title: 'Destaca con un Badge Premium',
      benefit: 'Aumenta tu credibilidad y atrae más clientes',
      cta: 'Obtener Badge',
      targetPlan,
    },
    priorityRanking: {
      title: 'Aparece Primero en Búsquedas',
      benefit: 'Los negocios destacados reciben 5X más visibilidad',
      cta: 'Posicionarme Arriba',
      targetPlan: 'featured',
    },
  };
  
  return valueProps[feature] || null;
}

/**
 * 📊 TABLA COMPARATIVA DE PLANES
 */
export const PLAN_COMPARISON_TABLE = [
  {
    feature: 'Logo de negocio',
    free: '✅ 1',
    featured: '✅ 1',
    sponsor: '✅ 1',
    category: 'Imágenes',
  },
  {
    feature: 'Foto de perfil/local',
    free: '✅ 1 obligatoria',
    featured: '✅ 1',
    sponsor: '✅ 1',
    category: 'Imágenes',
  },
  {
    feature: 'Portada hero',
    free: '❌',
    featured: '✅ 1',
    sponsor: '✅ 1',
    category: 'Imágenes',
  },
  {
    feature: 'Galería de fotos',
    free: '✅ Hasta 2 fotos',
    featured: '✅ Hasta 2 fotos',
    sponsor: '✅ Hasta 10 fotos',
    category: 'Imágenes',
  },
  {
    feature: 'Total de fotos',
    free: '4 fotos',
    featured: '5 fotos',
    sponsor: '12 fotos',
    category: 'Imágenes',
  },
  {
    feature: 'Información básica',
    free: '✅ Completa',
    featured: '✅ Completa',
    sponsor: '✅ Completa',
    category: 'Datos',
  },
  {
    feature: 'Descripción',
    free: '✅ 500 caracteres',
    featured: '✅ 1000 caracteres',
    sponsor: '✅ 2000 caracteres',
    category: 'Datos',
  },
  {
    feature: 'Contacto (Tel/WhatsApp)',
    free: '✅',
    featured: '✅',
    sponsor: '✅',
    category: 'Datos',
  },
  {
    feature: 'Ubicación y mapa',
    free: '✅',
    featured: '✅',
    sponsor: '✅',
    category: 'Datos',
  },
  {
    feature: 'Horarios',
    free: '✅',
    featured: '✅',
    sponsor: '✅',
    category: 'Datos',
  },
  {
    feature: 'Métricas de negocio',
    free: '❌ No disponible',
    featured: '✅ Básicas (3)',
    sponsor: '✅ Avanzadas (7+)',
    category: 'Analytics',
  },
  {
    feature: 'Badge distintivo',
    free: '❌',
    featured: '⭐ Negocio Destacado',
    sponsor: '👑 Líder en la Zona',
    category: 'Branding',
  },
  {
    feature: 'Posición en listados',
    free: 'Estándar',
    featured: 'Prioritaria (arriba de FREE)',
    sponsor: 'Hero (primera posición)',
    category: 'Visibilidad',
  },
  {
    feature: 'Altura de tarjeta',
    free: '120px',
    featured: '145px (+20%)',
    sponsor: '180px (+50%)',
    category: 'Visual',
  },
  {
    feature: 'Jerarquía visual',
    free: 'Limpia y funcional',
    featured: 'Notable y premium',
    sponsor: 'Dominante y hero',
    category: 'Visual',
  },
  {
    feature: 'Reseñas de clientes',
    free: '✅ Aparecen',
    featured: '✅ Destacadas',
    sponsor: '✅ Premium + Stats',
    category: 'Social Proof',
  },
] as const;

/**
 * 💰 PRECIOS (para referencia en UI)
 */
export const PLAN_PRICING = {
  free: {
    price: 0,
    currency: 'MXN',
    period: 'para siempre',
    label: 'Gratis',
  },
  featured: {
    price: 199,
    currency: 'MXN',
    period: 'al mes',
    label: 'Destacado',
    badge: '⭐ Más Popular',
  },
  sponsor: {
    price: 399,
    currency: 'MXN',
    period: 'al mes',
    label: 'Patrocinado',
    badge: '👑 Mejor Valor',
  },
} as const;
