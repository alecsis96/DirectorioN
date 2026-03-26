/**
 * 🎨 Design Tokens para Jerarquía Visual de Planes
 * Sistema de diseño que diferencia FREE | DESTACADO | PATROCINADO
 * 
 * FILOSOFÍA:
 * - FREE: Digno, funcional, confiable
 * - DESTACADO: Notable, premium, aspiracional  
 * - PATROCINADO: Dominante, hero, irresistible
 */

export type BusinessPlan = 'free' | 'featured' | 'sponsor';

/**
 * 📐 LAYOUT TOKENS
 * Controlan dimensiones y espaciado
 * 🎯 CONSISTENCIA: Todas las portadas tienen la misma altura base (180px) para uniformidad
 */
export const LAYOUT_TOKENS = {
  free: {
    // Portada altura consistente
    coverHeight: 'h-[180px]',
    coverHeightPx: 180,
    
    // Card compacta y eficiente
    cardPadding: 'p-4',
    cardGap: 'gap-3',
    
    // Sin márgenes especiales
    cardMargin: '',
    
    // Logo estándar
    logoSize: 'w-14 h-14',
  },
  
  featured: {
    // Portada altura consistente
    coverHeight: 'h-[180px]',
    coverHeightPx: 180,
    
    // Card con más respiración
    cardPadding: 'p-5',
    cardGap: 'gap-4',
    
    // Margen para destacar
    cardMargin: 'my-1',
    
    // Logo slightly larger
    logoSize: 'w-16 h-16',
  },
  
  sponsor: {
    // Portada altura consistente
    coverHeight: 'h-[180px]',
    coverHeightPx: 180,
    
    // Card espaciosa
    cardPadding: 'p-6',
    cardGap: 'gap-5',
    
    // Margen hero
    cardMargin: 'my-2',
    
    // Logo destacado
    logoSize: 'w-20 h-20',
  },
} as const;

/**
 * 🎨 COLOR TOKENS
 * Paleta de colores por plan
 */
export const COLOR_TOKENS = {
  free: {
    // Neutral, limpio
    border: 'border-gray-200',
    borderWidth: 'border',
    
    bg: 'bg-white',
    
    shadow: '', // Sin sombra - limpio
    hover: 'hover:shadow-md',
    
    // Sin overlay en portada
    coverOverlay: '',
    
    // Texto neutral
    titleColor: 'text-gray-900',
    categoryColor: 'text-gray-600',
  },
  
  featured: {
    // Amber/Orange - aspiracional
    border: 'border-amber-300',
    borderWidth: 'border-2',
    
    bg: 'bg-white',
    
    // Sombra suave amber
    shadow: 'shadow-lg shadow-amber-100',
    hover: 'hover:shadow-xl hover:shadow-amber-200',
    
    // Overlay sutil dorado
    coverOverlay: 'before:absolute before:inset-0 before:bg-gradient-to-t before:from-amber-500/10 before:to-transparent before:pointer-events-none',
    
    // Texto con toque amber
    titleColor: 'text-gray-900',
    categoryColor: 'text-amber-700',
  },
  
  sponsor: {
    // Purple/Pink - premium hero
    border: 'border-purple-400',
    borderWidth: 'border-[3px]',
    
    // Gradient bg sutil
    bg: 'bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30',
    
    // Sombra dramática purple
    shadow: 'shadow-2xl shadow-purple-200/60',
    hover: 'hover:shadow-3xl hover:shadow-purple-300/70',
    
    // Overlay premium
    coverOverlay: 'before:absolute before:inset-0 before:bg-gradient-to-t before:from-purple-600/20 before:via-transparent before:to-transparent before:pointer-events-none',
    
    // Texto con toque purple
    titleColor: 'text-purple-900',
    categoryColor: 'text-purple-700',
  },
} as const;

/**
 * 🏷️ BADGE TOKENS
 * Distintivos visuales por plan
 */
export const BADGE_TOKENS = {
  free: null, // Sin badge - limpio
  
  featured: {
    text: '⭐ DESTACADO',
    
    // Gradient amber/orange
    bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500',
    textColor: 'text-white',
    
    // Sombra suave
    shadow: 'shadow-lg shadow-amber-400/50',
    
    // Animación sutil
    animation: 'hover:scale-105',
    
    // Ring sutil
    ring: 'ring-2 ring-amber-300 ring-offset-2 ring-offset-white',
    
    // Size
    size: 'text-[10px] px-3 py-1',
    font: 'font-bold tracking-wide uppercase',
  },
  
  sponsor: {
    text: '👑 PATROCINADO',
    
    // Gradient purple/pink premium
    bg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600',
    textColor: 'text-white',
    
    // Sombra dramática
    shadow: 'shadow-xl shadow-purple-400/60',
    
    // Animación premium
    animation: 'animate-pulse hover:scale-110',
    
    // Ring premium
    ring: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-white',
    
    // Size más grande
    size: 'text-xs px-4 py-1.5',
    font: 'font-extrabold tracking-wider uppercase',
  },
} as const;

/**
 * ✨ EFFECT TOKENS
 * Efectos visuales y animaciones
 */
export const EFFECT_TOKENS = {
  free: {
    // Transición estándar
    transition: 'transition-all duration-200',
    
    // Hover sutil
    hoverScale: 'hover:scale-[1.01]',
    
    // Sin efectos especiales
    glow: '',
    shimmer: '',
  },
  
  featured: {
    // Transición suave
    transition: 'transition-all duration-300 ease-out',
    
    // Hover notable
    hoverScale: 'hover:scale-[1.02]',
    
    // Glow amber sutil
    glow: 'hover:ring-2 hover:ring-amber-300 hover:ring-offset-2',
    
    // Shimmer sutil
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000',
  },
  
  sponsor: {
    // Transición premium
    transition: 'transition-all duration-500 ease-in-out',
    
    // Hover dramático
    hoverScale: 'hover:scale-[1.03]',
    
    // Glow purple premium
    glow: 'ring-2 ring-purple-300 ring-offset-2 hover:ring-4 hover:ring-purple-400',
    
    // Shimmer premium
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-purple-200/30 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
  },
} as const;

/**
 * 📱 RESPONSIVE TOKENS
 * Ajustes por breakpoint
 * 🎯 CONSISTENCIA: Todas las portadas tienen la misma altura para uniformidad visual en carruseles
 */
export const RESPONSIVE_TOKENS = {
  free: {
    // Altura consistente en todos los planes
    coverHeightMobile: 'h-[180px]',
    coverHeightDesktop: 'md:h-[200px]',
  },
  
  featured: {
    // Altura consistente en todos los planes
    coverHeightMobile: 'h-[180px]',
    coverHeightDesktop: 'md:h-[200px]',
  },
  
  sponsor: {
    // Altura consistente en todos los planes
    coverHeightMobile: 'h-[180px]',
    coverHeightDesktop: 'md:h-[200px]',
  },
} as const;

/**
 * 🎯 POSITION TOKENS
 * Z-index y posicionamiento
 */
export const POSITION_TOKENS = {
  free: {
    zIndex: 'z-0',
    position: 'relative',
  },
  
  featured: {
    zIndex: 'z-10',
    position: 'relative',
  },
  
  sponsor: {
    // Hero - por encima de todo
    zIndex: 'z-20',
    position: 'relative',
  },
} as const;

/**
 * 📱 DETAIL VIEW TOKENS
 * Tokens específicos para BusinessDetailView
 */
export const DETAIL_VIEW_TOKENS = {
  free: {
    // Hero pequeño
    heroHeight: 'h-32 sm:h-40',
    heroHeightPx: 160, // Mobile max
    
    // Badge discreto
    badgeText: '✓ Negocio registrado',
    badgeStyle: 'bg-gray-100 text-gray-600 border border-gray-200 text-xs px-2.5 py-1 rounded-md font-normal',
    
    // Sin CTA secundario
    showSecondaryCTA: false,
    secondaryCTAText: '',
    
    // Mensaje de galería bloqueada
    showGalleryBlock: false,
    galleryBlockTitle: 'Este negocio aún no muestra fotos',
    galleryBlockMessage: 'Los negocios con fotos reciben hasta 3X más clientes.',
    galleryBlockCTA: 'Ver planes',
    galleryBlockCTAHref: '/para-negocios',
    galleryEmptyMessage: 'Este negocio aún no muestra fotos.',
  },
  
  featured: {
    // Hero mediano (20% más que FREE)
    heroHeight: 'h-40 sm:h-48',
    heroHeightPx: 192, // Mobile max
    
    // Badge destacado
    badgeText: 'Premium',
    badgeStyle: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white text-sm px-3.5 py-1.5 rounded-full font-semibold shadow-lg shadow-amber-300/50 ring-2 ring-amber-300',
    
    // CTA secundario opcional
    showSecondaryCTA: true,
    secondaryCTAText: '📈 Negocio premium con mas visibilidad en esta zona',
    secondaryCTAStyle: 'bg-amber-50 text-amber-900 border border-amber-200 px-4 py-3 rounded-xl text-sm font-medium',
    
    // Sin bloqueo de galería
    showGalleryBlock: false,
    galleryEmptyMessage: 'Agrega fotos para atraer más clientes.',
  },
  
  sponsor: {
    // Hero grande (50% más que FREE)
    heroHeight: 'h-48 sm:h-56 md:h-64',
    heroHeightPx: 256, // Desktop max
    
    // Badge premium
    badgeText: 'Premium',
    badgeStyle: 'bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white text-sm px-4 py-2 rounded-full font-bold shadow-2xl shadow-purple-400/60 ring-4 ring-purple-400 animate-pulse',
    
    // CTA secundario premium
    showSecondaryCTA: true,
    secondaryCTAText: '🎯 Negocio premium con mayor presencia en YajaGon',
    secondaryCTAStyle: 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-900 border-2 border-purple-300 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg',
    
    // Sin bloqueo de galería
    showGalleryBlock: false,
    galleryEmptyMessage: 'Agrega más fotos para mostrar todo lo que ofreces.',
  },
} as const;

/**
 * 🎨 HELPER: Get all tokens for a plan
 */
export function getPlanTokens(plan: BusinessPlan) {
  return {
    layout: LAYOUT_TOKENS[plan],
    colors: COLOR_TOKENS[plan],
    badge: BADGE_TOKENS[plan],
    effects: EFFECT_TOKENS[plan],
    responsive: RESPONSIVE_TOKENS[plan],
    position: POSITION_TOKENS[plan],
    detailView: DETAIL_VIEW_TOKENS[plan],
  };
}

/**
 * 🎨 HELPER: Get detail view tokens
 */
export function getDetailViewTokens(plan: BusinessPlan) {
  return DETAIL_VIEW_TOKENS[plan];
}

/**
 * 🎨 HELPER: Get hero height class
 */
export function getHeroHeight(plan: BusinessPlan): string {
  return DETAIL_VIEW_TOKENS[plan].heroHeight;
}

/**
 * 🎨 HELPER: Get cover height class
 */
export function getCoverHeight(plan: BusinessPlan, responsive = true): string {
  if (!responsive) {
    return LAYOUT_TOKENS[plan].coverHeight;
  }
  
  const tokens = RESPONSIVE_TOKENS[plan];
  return `${tokens.coverHeightMobile} ${tokens.coverHeightDesktop}`;
}

/**
 * 🎨 HELPER: Get complete card classes
 */
export function getCardClasses(plan: BusinessPlan): string {
  const tokens = getPlanTokens(plan);
  
  return [
    // Base
    'rounded-2xl overflow-hidden',
    tokens.position.position,
    tokens.position.zIndex,
    
    // Layout
    tokens.layout.cardMargin,
    
    // Colors & Effects
    tokens.colors.bg,
    tokens.colors.border,
    tokens.colors.borderWidth,
    tokens.colors.shadow,
    tokens.colors.hover,
    
    // Transitions
    tokens.effects.transition,
    tokens.effects.hoverScale,
    tokens.effects.glow,
  ].filter(Boolean).join(' ');
}

/**
 * 🎨 HELPER: Get badge classes
 */
export function getBadgeClasses(plan: BusinessPlan): string | null {
  const badge = BADGE_TOKENS[plan];
  if (!badge) return null;
  
  return [
    badge.bg,
    badge.textColor,
    badge.shadow,
    badge.animation,
    badge.ring,
    badge.size,
    badge.font,
    'rounded-full',
  ].join(' ');
}
