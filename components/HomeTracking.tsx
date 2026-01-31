'use client';

import { useEffect } from 'react';
import { trackPageView, trackBusinessInteraction } from '../lib/telemetry';

/**
 * HomeTracking - Component para tracking de eventos en el Home
 * Registra pageview inicial y expone funciones para tracking de CTAs
 */
export function HomeTracking() {
  useEffect(() => {
    trackPageView('home', {
      title: 'Directorio de Negocios Yajalón',
    });
  }, []);

  return null;
}

/**
 * Función helper para tracking de clicks en Home
 * @param action - Acción específica (ej: 'ver_negocios', 'registrar_negocio')
 * @param section - Sección del home ('hero', 'action_cards', 'categories', etc.)
 * @param label - Label descriptivo opcional
 * @param businessId - ID del negocio si aplica
 */
export function trackHomeClick(
  action: string,
  section: 'hero' | 'action_cards' | 'categories' | 'new_businesses' | 'cta_register' | 'premium_carousel',
  label?: string,
  businessId?: string
) {
  // Trackear como business interaction si hay businessId
  if (businessId) {
    trackBusinessInteraction('business_card_clicked', businessId, label, undefined, {
      section,
      action,
      timestamp: Date.now(),
    });
  } else {
    // Para CTAs generales, usar tipo genérico
    import('../lib/telemetry').then(({ sendEvent }) => {
      sendEvent({
        event: 'page_view', // Usar event válido
        page: 'home',
        metadata: {
          section,
          action,
          label,
          timestamp: Date.now(),
        },
      });
    });
  }
}
