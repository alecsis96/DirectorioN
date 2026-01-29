/**
 * Configuración de feature gating para métricas según plan del negocio
 */

export type MetricType = 
  | 'views'
  | 'phoneClicks'
  | 'whatsappClicks'
  | 'mapClicks'
  | 'favoriteAdds'
  | 'totalReviews'
  | 'avgRating';

export type BusinessPlan = 'free' | 'featured' | 'sponsor';

export interface MetricConfig {
  key: MetricType;
  label: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  description: string;
}

// Configuración de todas las métricas disponibles
export const ALL_METRICS: Record<MetricType, MetricConfig> = {
  views: {
    key: 'views',
    label: 'Vistas',
    icon: 'eye',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    description: 'Visualizaciones de tu negocio',
  },
  phoneClicks: {
    key: 'phoneClicks',
    label: 'Tel.',
    icon: 'phone',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    description: 'Clics en el botón de llamada',
  },
  whatsappClicks: {
    key: 'whatsappClicks',
    label: 'WhatsApp',
    icon: 'message-circle',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    description: 'Clics en WhatsApp',
  },
  mapClicks: {
    key: 'mapClicks',
    label: 'Maps',
    icon: 'map',
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-600',
    description: 'Clics en Cómo llegar',
  },
  favoriteAdds: {
    key: 'favoriteAdds',
    label: '❤️',
    icon: 'heart',
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
    description: 'Agregado a favoritos',
  },
  totalReviews: {
    key: 'totalReviews',
    label: 'Reseñas',
    icon: 'star',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    description: 'Número de reseñas',
  },
  avgRating: {
    key: 'avgRating',
    label: 'Rating',
    icon: 'star',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    description: 'Calificación promedio',
  },
};

// Métricas permitidas por plan
export const ALLOWED_METRICS_BY_PLAN: Record<BusinessPlan, MetricType[]> = {
  free: [], // Sin métricas
  featured: ['views', 'whatsappClicks', 'phoneClicks'], // Métricas básicas
  sponsor: ['views', 'phoneClicks', 'whatsappClicks', 'mapClicks', 'favoriteAdds', 'totalReviews', 'avgRating'], // Todas
};

// Métricas bloqueadas por plan
export const LOCKED_METRICS_BY_PLAN: Record<BusinessPlan, MetricType[]> = {
  free: ['views', 'phoneClicks', 'whatsappClicks', 'mapClicks', 'favoriteAdds', 'totalReviews', 'avgRating'],
  featured: ['mapClicks', 'favoriteAdds', 'totalReviews', 'avgRating'],
  sponsor: [],
};

/**
 * Normaliza el plan del negocio a un valor válido
 */
export function normalizePlan(plan?: string): BusinessPlan {
  const normalized = (plan || 'free').toLowerCase();
  if (normalized === 'sponsor' || normalized === 'patrocinado') return 'sponsor';
  if (normalized === 'featured' || normalized === 'destacado') return 'featured';
  return 'free';
}

/**
 * Verifica si una métrica está permitida para un plan
 */
export function isMetricAllowed(metric: MetricType, plan: BusinessPlan): boolean {
  return ALLOWED_METRICS_BY_PLAN[plan].includes(metric);
}

/**
 * Verifica si una métrica está bloqueada para un plan
 */
export function isMetricLocked(metric: MetricType, plan: BusinessPlan): boolean {
  return LOCKED_METRICS_BY_PLAN[plan].includes(metric);
}

/**
 * Obtiene todas las métricas permitidas para un plan
 */
export function getAllowedMetrics(plan: BusinessPlan): MetricConfig[] {
  return ALLOWED_METRICS_BY_PLAN[plan].map(key => ALL_METRICS[key]);
}

/**
 * Obtiene todas las métricas bloqueadas para un plan
 */
export function getLockedMetrics(plan: BusinessPlan): MetricConfig[] {
  return LOCKED_METRICS_BY_PLAN[plan].map(key => ALL_METRICS[key]);
}

/**
 * Verifica si un plan tiene acceso a métricas
 */
export function hasMetricsAccess(plan: BusinessPlan): boolean {
  return ALLOWED_METRICS_BY_PLAN[plan].length > 0;
}

/**
 * Obtiene el mensaje de upgrade según el plan actual
 */
export function getUpgradeMessage(plan: BusinessPlan): string {
  if (plan === 'free') {
    return 'Las métricas están disponibles a partir del plan Destacado. Actualiza tu plan para ver estadísticas de tu negocio.';
  }
  if (plan === 'featured') {
    return 'Tu plan Destacado incluye métricas básicas. Actualiza a Patrocinado para ver métricas completas: Cómo llegar, Favoritos y Reseñas.';
  }
  return '';
}

/**
 * Obtiene el plan recomendado según el plan actual
 */
export function getRecommendedPlan(plan: BusinessPlan): BusinessPlan | null {
  if (plan === 'free') return 'featured';
  if (plan === 'featured') return 'sponsor';
  return null;
}
