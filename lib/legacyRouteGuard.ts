/**
 * Legacy Route Guard
 * 
 * Protege rutas legacy del admin panel con feature flag.
 * Si el flag está deshabilitado, redirige a 404 o muestra página deprecada.
 * 
 * Además, registra eventos de telemetría para monitorear uso de rutas legacy
 * y tomar decisiones de deprecación basadas en datos.
 */

import { redirect } from 'next/navigation';

/**
 * Verifica si las rutas legacy están habilitadas
 */
export function isLegacyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_LEGACY_ADMIN === 'true';
}

/**
 * Lista de rutas legacy conocidas
 */
export const LEGACY_ROUTES = [
  '/admin/applications',
  '/admin/pending-businesses',
] as const;

export type LegacyRoute = typeof LEGACY_ROUTES[number];

/**
 * Verifica si una ruta es legacy
 */
export function isLegacyRoute(pathname: string): boolean {
  return LEGACY_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Guard para rutas legacy - Server Side
 * 
 * Uso en Server Components:
 * ```tsx
 * export default async function ApplicationsPage() {
 *   requireLegacyAccess('/admin/applications');
 *   // ... resto del componente
 * }
 * ```
 * 
 * @param route - Ruta legacy actual
 * @throws Redirige a /admin/solicitudes si legacy está deshabilitado
 */
export function requireLegacyAccess(route: LegacyRoute): void {
  if (!isLegacyEnabled()) {
    // Log deprecation attempt
    console.warn(`[LEGACY] Access denied to deprecated route: ${route}`);
    
    // Redirigir a la ruta alternativa moderna
    const modernRoute = getModernAlternative(route);
    redirect(modernRoute);
  }
  
  // Log successful legacy access (para telemetría)
  console.info(`[LEGACY] Access granted to legacy route: ${route}`);
}

/**
 * Obtiene la ruta moderna alternativa para una ruta legacy
 */
function getModernAlternative(legacyRoute: LegacyRoute): string {
  const alternatives: Record<LegacyRoute, string> = {
    '/admin/applications': '/admin/solicitudes',
    '/admin/pending-businesses': '/admin/solicitudes',
  };
  
  return alternatives[legacyRoute] || '/admin/solicitudes';
}

/**
 * Logging de eventos de rutas legacy para telemetría
 * 
 * Uso en Client Components (useEffect):
 * ```tsx
 * useEffect(() => {
 *   logLegacyRouteAccess('/admin/applications', user?.uid);
 * }, []);
 * ```
 */
export function logLegacyRouteAccess(
  route: LegacyRoute,
  userId?: string
): void {
  const eventData = {
    event: 'legacy_route_accessed',
    route,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
    referrer: typeof window !== 'undefined' ? document.referrer : null,
  };
  
  // Log a consola (en producción esto debería ir a un servicio de analytics)
  console.info('[TELEMETRY]', eventData);
  
  // TODO: Enviar a servicio de analytics (Google Analytics, Mixpanel, etc)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'legacy_route_accessed', {
      page_path: route,
      user_id: userId,
    });
  }
}
