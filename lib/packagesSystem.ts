/**
 * 💼 Sistema de Paquetes de Alta Asistida
 * Define estructura de precios, duraciones y beneficios
 */

import type { BusinessPlan } from './planPermissions';

export type PackageTier = 'esencial' | 'destacado' | 'lider';
export type BusinessCategory = 'alto-ticket' | 'ticket-medio' | 'bajo-ticket';

/**
 * 📦 DEFINICIÓN DE PAQUETES
 */
export const PACKAGES = {
  esencial: {
    id: 'esencial',
    name: 'Esencial Digital',
    tagline: 'Tu negocio online sin complicaciones',
    targetPlan: 'free' as BusinessPlan,
    setupFee: 499,
    monthlyFee: 0,
    includedMonths: 0, // FREE para siempre
    minimumCommitment: 0, // Sin compromiso
    
    included: [
      '✅ Sesión presencial 30 minutos',
      '✅ Alta completa del negocio',
      '✅ 1 logo + 1 foto de local',
      '✅ Capacitación básica dashboard',
      '✅ Perfil visible en Google',
      '✅ Sin mensualidad (FREE forever)',
    ],
    
    notIncluded: [
      '❌ Portada profesional',
      '❌ Galería de fotos adicionales',
      '❌ Métricas de negocio',
      '❌ Badge destacado',
      '❌ Posicionamiento prioritario',
    ],
    
    ideal: [
      'Negocios escépticos',
      'Prueba de concepto',
      'Budget muy limitado',
      'Baja digitalización',
    ],
    
    upsellTo: 'destacado',
    conversionRate: 0.40, // 40% suben a destacado en 30 días
    
    pitch: {
      opening: 'Te doy de alta completamente hoy mismo. Tú solo me das logo y tomamos foto del local.',
      value: 'En 30 minutos estás visible en Google y redes.',
      close: 'No pagas mensualidad, solo el trabajo de alta. $499 una vez.',
    },
  },
  
  destacado: {
    id: 'destacado',
    name: 'Destacado Profesional',
    tagline: 'Perfil premium que convierte',
    badge: '⭐ Más Vendido',
    targetPlan: 'featured' as BusinessPlan,
    setupFee: 799,
    monthlyFee: 199,
    includedMonths: 3, // 3 meses prepagados
    minimumCommitment: 3, // Mínimo 3 meses
    
    included: [
      '✅ Sesión presencial 60 minutos',
      '✅ Alta completa premium',
      '✅ 1 logo + 1 foto + PORTADA diseñada',
      '✅ Sesión fotográfica (hasta 5 fotos)',
      '✅ Capacitación completa (métricas, edición)',
      '✅ Plan Destacado (3 meses incluidos)',
      '✅ Badge "Negocio Destacado"',
      '✅ Métricas básicas (vistas, clics, guardados)',
      '✅ Posicionamiento prioritario',
      '✅ Soporte WhatsApp 30 días',
    ],
    
    notIncluded: [
      '❌ Métricas avanzadas',
      '❌ Badge premium "Líder"',
      '❌ Posición hero garantizada',
      '❌ Video del negocio',
    ],
    
    ideal: [
      'Negocios con intención de crecer',
      'Budget moderado ($200/mes)',
      'Competencia en categoría',
      'Esperan ROI concreto',
    ],
    
    roi: {
      breakEven: 2, // clientes/mes
      expected: 15, // clientes/mes promedio
      percentIncrease: 250, // vs FREE
    },
    
    upsellTo: 'lider',
    
    pitch: {
      opening: 'Te hago un perfil que se vea como McDonald\'s, no como changarro.',
      value: 'Con fotos profesionales, portada bonita y badge de Negocio Destacado. Los primeros 3 meses ya están pagados.',
      pricing: 'Después solo $199 al mes. Olvídate de Facebook que nadie te ve.',
      cost: '$799 hoy + $199/mes después del mes 3',
      firstYearTotal: 2590, // $799 + ($199 × 9)
      averageMonthly: 215, // $2,590 / 12
    },
  },
  
  lider: {
    id: 'lider',
    name: 'Líder de Categoría',
    tagline: 'Domina tu mercado',
    badge: '👑 Premium',
    targetPlan: 'sponsor' as BusinessPlan,
    setupFee: 1499,
    monthlyFee: 399,
    includedMonths: 6, // 6 meses prepagados
    minimumCommitment: 6, // Mínimo 6 meses
    cancellationPenalty: 0.50, // 50% de meses restantes
    
    included: [
      '✅ Sesión presencial 90 minutos',
      '✅ Alta ultra-premium',
      '✅ Branding completo (logo si no tiene)',
      '✅ Sesión fotográfica extendida (10 fotos)',
      '✅ Video corto del negocio (30 seg)',
      '✅ Capacitación avanzada',
      '✅ Plan Patrocinado (6 meses incluidos)',
      '✅ Badge "Negocio Líder en la Zona"',
      '✅ Métricas avanzadas completas',
      '✅ Posición #1 garantizada en categoría',
      '✅ Soporte prioritario 60 días',
      '✅ Revisión mensual de performance',
    ],
    
    notIncluded: [], // Todo incluido
    
    ideal: [
      'Negocios establecidos',
      'Budget alto ($400/mes)',
      'Quieren dominar categoría',
      'Largo plazo (6-12 meses)',
    ],
    
    roi: {
      breakEven: 3, // clientes/mes
      expected: 80, // clientes/mes promedio
      percentIncrease: 500, // vs FREE
    },
    
    pitch: {
      opening: 'Te convierto en EL negocio de referencia en tu categoría.',
      value: 'Tu competencia va a estar abajo tuyo SIEMPRE. Fotos profesionales, video, métricas completas.',
      pricing: 'Los primeros 6 meses ya pagados. Es como tener un gerente de marketing por $13 al día.',
      cost: '$1,499 hoy + $399/mes después del mes 6',
      firstYearTotal: 3893, // $1,499 + ($399 × 6)
      averageMonthly: 324, // $3,893 / 12
      dailyCost: 13.30, // $399 / 30
    },
  },
} as const;

/**
 * 💰 AJUSTES DE PRICING POR CATEGORÍA
 */
export const CATEGORY_PRICING_ADJUSTMENTS: Record<BusinessCategory, {
  esencial: { setup: number; monthly: number };
  destacado: { setup: number; monthly: number };
  lider: { setup: number; monthly: number };
}> = {
  'alto-ticket': {
    // Doctores, Abogados, Arquitectos
    esencial: { setup: 499, monthly: 0 },
    destacado: { setup: 999, monthly: 299 },
    lider: { setup: 1999, monthly: 499 },
  },
  'ticket-medio': {
    // Restaurantes, Gimnasios, Salones
    esencial: { setup: 499, monthly: 0 },
    destacado: { setup: 799, monthly: 199 },
    lider: { setup: 1499, monthly: 399 },
  },
  'bajo-ticket': {
    // Taquerías, Papelerías, Tintorerías
    esencial: { setup: 499, monthly: 0 },
    destacado: { setup: 599, monthly: 149 },
    lider: { setup: 999, monthly: 299 },
  },
};

/**
 * 🎁 DESCUENTOS ESTRATÉGICOS
 */
export const DISCOUNTS = {
  anualPrepaid: {
    name: 'Pago Anual Anticipado',
    discount: 0.16, // 16%
    applies: ['destacado', 'lider'],
    calculate: (monthlyFee: number) => {
      const annual = monthlyFee * 12;
      const discounted = annual * (1 - 0.16);
      return {
        original: annual,
        discounted,
        savings: annual - discounted,
      };
    },
  },
  
  referralCertified: {
    name: 'Referido Certificado',
    referrerBonus: 'monthly', // 1 mes gratis
    referredDiscount: 200, // $200 OFF setup
    applies: ['destacado', 'lider'],
  },
  
  categoryPioneer: {
    name: 'Pionero de Categoría',
    setupDiscount: 0.50, // 50% OFF
    freeMonthsExtra: 2,
    badge: 'Pionero en [Categoría]',
    applies: ['destacado', 'lider'],
  },
  
  multiLocation: {
    name: 'Bundle Multi-Sucursal',
    secondLocation: 0.70, // 30% OFF
    thirdPlusLocation: 0.50, // 50% OFF
    applies: ['destacado', 'lider'],
    calculate: (setupFee: number, locations: number) => {
      if (locations === 1) return setupFee;
      
      let total = setupFee; // Primera sucursal full price
      
      if (locations >= 2) {
        total += setupFee * 0.70; // 2da con 30% desc
      }
      
      if (locations >= 3) {
        total += (setupFee * 0.50) * (locations - 2); // 3ra+ con 50% desc
      }
      
      return total;
    },
    example: {
      destacado: {
        '1 sucursal': 799,
        '2 sucursales': 799 + 559, // = 1,358
        '3 sucursales': 799 + 559 + 399, // = 1,757
      },
    },
  },
  
  limitedTimeOffer: {
    name: 'Oferta Limitada (Hoy)',
    setupDiscount: 100, // $100 OFF
    expiresIn: 24, // horas
    applies: ['destacado', 'lider'],
    trigger: 'on-site', // Solo al dar de alta presencial
  },
};

/**
 * 🎯 CALCULAR PRECIO FINAL
 */
export function calculatePackagePrice(
  packageId: PackageTier,
  options: {
    category?: BusinessCategory;
    annualPrepaid?: boolean;
    multiLocation?: number;
    pioneerDiscount?: boolean;
    referralCode?: string;
    limitedOffer?: boolean;
  } = {}
): {
  setupFee: number;
  monthlyFee: number;
  includedMonths: number;
  firstYearTotal: number;
  breakdown: string[];
  savings: number;
} {
  const pkg = PACKAGES[packageId];
  const categoryType = options.category || 'ticket-medio';
  
  // Pricing base ajustado por categoría
  let setupFee = CATEGORY_PRICING_ADJUSTMENTS[categoryType][packageId].setup;
  let monthlyFee = CATEGORY_PRICING_ADJUSTMENTS[categoryType][packageId].monthly;
  const includedMonths = pkg.includedMonths;
  
  const breakdown: string[] = [];
  let totalSavings = 0;
  
  // Aplicar descuentos
  
  // 1. Multi-location
  if (options.multiLocation && options.multiLocation > 1) {
    const originalSetup = setupFee;
    setupFee = DISCOUNTS.multiLocation.calculate(setupFee, options.multiLocation);
    const saved = (originalSetup * options.multiLocation) - setupFee;
    totalSavings += saved;
    breakdown.push(`Multi-sucursal (${options.multiLocation}): -$${saved.toFixed(0)}`);
  }
  
  // 2. Pionero de categoría
  if (options.pioneerDiscount) {
    const originalSetup = setupFee;
    setupFee = setupFee * (1 - DISCOUNTS.categoryPioneer.setupDiscount);
    const saved = originalSetup - setupFee;
    totalSavings += saved;
    breakdown.push(`Pionero de Categoría: -$${saved.toFixed(0)}`);
  }
  
  // 3. Oferta limitada
  if (options.limitedOffer) {
    setupFee -= DISCOUNTS.limitedTimeOffer.setupDiscount;
    totalSavings += DISCOUNTS.limitedTimeOffer.setupDiscount;
    breakdown.push(`Oferta Hoy: -$${DISCOUNTS.limitedTimeOffer.setupDiscount}`);
  }
  
  // 4. Código de referido
  if (options.referralCode) {
    setupFee -= DISCOUNTS.referralCertified.referredDiscount;
    totalSavings += DISCOUNTS.referralCertified.referredDiscount;
    breakdown.push(`Referido: -$${DISCOUNTS.referralCertified.referredDiscount}`);
  }
  
  // Calcular total año 1
  let firstYearTotal = setupFee;
  
  if (options.annualPrepaid && monthlyFee > 0) {
    // Pago anual con descuento
    const annualCalc = DISCOUNTS.anualPrepaid.calculate(monthlyFee);
    firstYearTotal += annualCalc.discounted;
    totalSavings += annualCalc.savings;
    breakdown.push(`Pago Anual (16% desc): -$${annualCalc.savings.toFixed(0)}`);
  } else {
    // Pago mensual normal
    const monthsToPayFirstYear = 12 - includedMonths;
    firstYearTotal += monthlyFee * monthsToPayFirstYear;
  }
  
  return {
    setupFee: Math.round(setupFee),
    monthlyFee,
    includedMonths,
    firstYearTotal: Math.round(firstYearTotal),
    breakdown,
    savings: Math.round(totalSavings),
  };
}

/**
 * 📊 COMPARAR PAQUETES
 */
export function comparePackages(category: BusinessCategory = 'ticket-medio') {
  const packages = ['esencial', 'destacado', 'lider'] as PackageTier[];
  
  return packages.map(pkgId => {
    const pkg = PACKAGES[pkgId];
    const pricing = calculatePackagePrice(pkgId, { category });
    
    return {
      id: pkgId,
      name: pkg.name,
      tagline: pkg.tagline,
      badge: 'badge' in pkg ? pkg.badge : undefined,
      setupFee: pricing.setupFee,
      monthlyFee: pricing.monthlyFee,
      includedMonths: pricing.includedMonths,
      firstYearTotal: pricing.firstYearTotal,
      averageMonthly: Math.round(pricing.firstYearTotal / 12),
      dailyCost: (pricing.monthlyFee / 30).toFixed(2),
      included: pkg.included,
      notIncluded: pkg.notIncluded,
      ideal: pkg.ideal,
    };
  });
}

/**
 * 🎤 OBTENER PITCH DE VENTA
 */
export function getSalesPitch(
  packageId: PackageTier,
  category: BusinessCategory = 'ticket-medio',
  businessName?: string
): {
  opening: string;
  value: string;
  pricing: string;
  close: string;
  objectionHandlers: Record<string, string>;
} {
  const pkg = PACKAGES[packageId];
  const price = calculatePackagePrice(packageId, { category });
  
  const name = businessName || '[Nombre]';
  
  // Objection handlers comunes
  const objectionHandlers = {
    'muy-caro': packageId === 'lider'
      ? `Don ${name}, son $${(price.monthlyFee / 30).toFixed(2)} al día. Menos que dos cafés. Y recupera la inversión con solo 3 clientes al mes.`
      : `Don ${name}, son $${(price.monthlyFee / 30).toFixed(2)} al día. ¿Cuánto gasta en volantes que la gente tira? Esto trabaja 24/7.`,
    
    'no-funciona': `Le entiendo. Pero déjeme preguntarle: ¿cuántos clientes buscan "${category}" en Google cada semana? Más de 100. Y encuentran a su competencia. ¿Cuánto pierde cada semana sin estar visible?`,
    
    'no-necesito': `Perfecto, eso demuestra que su negocio va bien. Ahora imagínese con 20-30% más clientes sin esfuerzo extra. Eso es lo que hacen las fotos profesionales y aparecer primero.`,
    
    'lo-pienso': `Claro, tómese su tiempo. Pero le paso el dato: esta categoría tiene ${PACKAGES[packageId].targetPlan === 'sponsor' ? '3 lugares' : '10 lugares'} máximo. Si otro negocio lo agarra primero, toca esperar. ¿Prefiere pensarlo o aseguramos el lugar hoy?`,
    
    'no-digital': `Precisamente por eso está este servicio. Yo me encargo de TODO. Usted solo me da su logo, tomo fotos y listo. Ni siquiera necesita computadora. Todo por WhatsApp.`,
  };
  
  return {
    ...pkg.pitch,
    pricing: `Son $${price.firstYearTotal.toLocaleString('es-MX')} el primer año. Incluye todo lo que necesita para empezar.`,
    close: `¿Le entramos hoy mismo? Tengo tiempo para su sesión.`,
    objectionHandlers,
  };
}
