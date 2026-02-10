/**
 * Generador de placeholders elegantes para portadas
 * Usa degradados CSS modernos y responsivos
 * 
 * USO:
 * import { generateBusinessPlaceholder } from '@/lib/placeholderGenerator';
 * 
 * const placeholderUrl = generateBusinessPlaceholder('Mi Negocio', 'Restaurante');
 */

/**
 * Degradados por categoría con paletas profesionales
 */
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; emoji: string }> = {
  'Restaurante': { from: '#FF6B6B', to: '#FF8E53', emoji: '🍽️' },
  'Comida': { from: '#FF6B6B', to: '#FF8E53', emoji: '🍴' },
  'Tienda': { from: '#4ECDC4', to: '#44A08D', emoji: '🛍️' },
  'Comercio': { from: '#4ECDC4', to: '#44A08D', emoji: '🏪' },
  'Servicios': { from: '#6C5CE7', to: '#A29BFE', emoji: '⚙️' },
  'Salud': { from: '#00B894', to: '#00CEC9', emoji: '💊' },
  'Belleza': { from: '#FD79A8', to: '#E84393', emoji: '💄' },
  'Educación': { from: '#FDCB6E', to: '#E17055', emoji: '📚' },
  'Entretenimiento': { from: '#E17055', to: '#FDCB6E', emoji: '🎬' },
  'Tecnología': { from: '#0984E3', to: '#6C5CE7', emoji: '💻' },
  'Automotriz': { from: '#2D3436', to: '#636E72', emoji: '🚗' },
  'Hogar': { from: '#81ECEC', to: '#74B9FF', emoji: '🏠' },
  'Deportes': { from: '#55EFC4', to: '#00B894', emoji: '⚽' },
  'Mascotas': { from: '#FAB1A0', to: '#FF7675', emoji: '🐾' },
  'Construcción': { from: '#FD79A8', to: '#FDCB6E', emoji: '🔨' },
  'default': { from: '#667EEA', to: '#764BA2', emoji: '🏢' },
};

/**
 * Generar URL de placeholder SVG para portada
 * 
 * @param businessName - Nombre del negocio
 * @param category - Categoría del negocio (opcional)
 * @returns Data URL con SVG embedido
 */
export function generateBusinessPlaceholder(
  businessName: string,
  category?: string
): string {
  const initial = businessName.charAt(0).toUpperCase();
  const colors = CATEGORY_GRADIENTS[category || ''] || CATEGORY_GRADIENTS.default;
  const emoji = colors.emoji;
  
  // Truncar nombre si es muy largo
  const displayName = businessName.length > 30 
    ? businessName.substring(0, 27) + '...' 
    : businessName;
  
  // SVG optimizado para web
  const svg = `<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="400" fill="url(#grad)"/>
    
    <!-- Pattern overlay sutil -->
    <rect width="1200" height="400" fill="white" opacity="0.05"/>
    
    <!-- Emoji decorativo -->
    <text x="50%" y="35%" dominant-baseline="middle" text-anchor="middle" 
          font-size="60" opacity="0.3">${emoji}</text>
    
    <!-- Inicial grande -->
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="180" font-weight="700" 
          fill="white" opacity="0.95" 
          filter="url(#shadow)">${initial}</text>
    
    <!-- Nombre del negocio -->
    <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="28" font-weight="500" 
          fill="white" opacity="0.85">${displayName}</text>
  </svg>`;
  
  // Codificar para data URL (sin comprimir para mejor calidad)
  const encodedSvg = encodeURIComponent(svg)
    .replace(/%20/g, ' ')
    .replace(/%0A/g, '')
    .replace(/%09/g, '')
    .replace(/%22/g, "'");
  
  return `data:image/svg+xml,${encodedSvg}`;
}

/**
 * Verificar si una URL es un placeholder generado
 * 
 * @param url - URL a verificar
 * @returns true si es placeholder, false si es imagen real
 */
export function isPlaceholderUrl(url?: string | null): boolean {
  if (!url) return true;
  return url.startsWith('data:image/svg+xml');
}

/**
 * Hook React para generar placeholder dinámico
 * 
 * @param businessName - Nombre del negocio
 * @param coverUrl - URL de portada existente
 * @param category - Categoría
 * @returns URL de portada o placeholder
 */
export function usePlaceholder(
  businessName: string,
  coverUrl?: string | null,
  category?: string
): string {
  // Si ya tiene coverUrl y no es placeholder, usarla
  if (coverUrl && !isPlaceholderUrl(coverUrl)) {
    return coverUrl;
  }
  
  // Generar placeholder si no hay coverUrl
  return generateBusinessPlaceholder(businessName, category);
}

/**
 * Obtener CSS inline para mostrar placeholder como background
 * Útil para componentes que usan background-image
 */
export function getPlaceholderStyle(
  businessName: string,
  coverUrl?: string | null,
  category?: string
): React.CSSProperties {
  const url = coverUrl && !isPlaceholderUrl(coverUrl)
    ? coverUrl
    : generateBusinessPlaceholder(businessName, category);
  
  return {
    backgroundImage: `url("${url}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}
