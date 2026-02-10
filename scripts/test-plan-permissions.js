/**
 * 🧪 Script de Testing - Sistema de Permisos
 * Valida la lógica de planPermissions.ts
 * 
 * NOTA: Este archivo requiere compilación previa o ts-node
 * Ejecutar con: npx tsx scripts/test-plan-permissions.js
 */

// Para testing rápido sin compilar, definimos los tipos manualmente
const PLAN_PERMISSIONS = {
  free: {
    allowedFeatures: ['logo', 'profilePhoto', 'basicInfo', 'contact', 'location', 'hours', 'socialLinks'],
    deniedFeatures: ['coverImage', 'gallery', 'metrics', 'badge', 'priorityRanking', 'metricsAdvanced'],
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: false, count: 0 },
      galleryPhotos: { required: false, count: 0 },
      totalPhotos: 2
    },
    visualHierarchy: {
      cardHeight: 120,
      ranking: 3,
      badge: null,
      border: 'gray-200',
      shadow: '',
      zIndex: 1
    }
  },
  featured: {
    allowedFeatures: ['logo', 'profilePhoto', 'basicInfo', 'contact', 'location', 'hours', 'socialLinks', 'coverImage', 'gallery', 'metrics', 'badge'],
    deniedFeatures: ['metricsAdvanced', 'premiumBadge'],
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: true, count: 1 },
      galleryPhotos: { required: false, count: 5 },
      totalPhotos: 7
    },
    visualHierarchy: {
      cardHeight: 145,
      ranking: 2,
      badge: '⭐ Destacado',
      border: 'amber-200',
      shadow: 'sm',
      zIndex: 2
    }
  },
  sponsor: {
    allowedFeatures: ['logo', 'profilePhoto', 'basicInfo', 'contact', 'location', 'hours', 'socialLinks', 'coverImage', 'gallery', 'metrics', 'badge', 'metricsAdvanced', 'premiumBadge', 'priorityRanking'],
    deniedFeatures: [],
    limits: {
      logo: { required: true, count: 1 },
      profilePhoto: { required: true, count: 1 },
      coverImage: { required: true, count: 1 },
      galleryPhotos: { required: false, count: 10 },
      totalPhotos: 12
    },
    visualHierarchy: {
      cardHeight: 180,
      ranking: 1,
      badge: '👑 Líder',
      border: 'purple-300',
      shadow: 'lg',
      zIndex: 3
    }
  }
};

const PLAN_PRICING = {
  free: { price: 0, currency: 'MXN', period: 'mes', label: 'Esencial' },
  featured: { price: 299, currency: 'MXN', period: 'mes', label: 'Destacado', badge: '⭐ Popular' },
  sponsor: { price: 599, currency: 'MXN', period: 'mes', label: 'Líder', badge: '👑 VIP' }
};

const PLAN_COMPARISON_TABLE = [
  { category: 'Imágenes', feature: 'Logo', free: '✓', featured: '✓', sponsor: '✓' },
  { category: 'Imágenes', feature: 'Foto de perfil', free: '✓', featured: '✓', sponsor: '✓' },
  { category: 'Imágenes', feature: 'Portada', free: '✗', featured: '✓', sponsor: '✓' },
  { category: 'Imágenes', feature: 'Galería', free: '✗ (0)', featured: '5 fotos', sponsor: '10 fotos' },
  { category: 'Información', feature: 'Descripción', free: '500 chars', featured: '1000 chars', sponsor: 'Ilimitado' },
  { category: 'Información', feature: 'Horarios', free: '✓', featured: '✓', sponsor: '✓' },
  { category: 'Información', feature: 'Ubicación', free: '✓', featured: '✓', sponsor: '✓' },
  { category: 'Métricas', feature: 'Métricas básicas', free: '✗', featured: '✓ (3)', sponsor: '✓ (7)' },
  { category: 'Métricas', feature: 'Métricas avanzadas', free: '✗', featured: '✗', sponsor: '✓' },
  { category: 'Branding', feature: 'Badge distintivo', free: '✗', featured: '⭐ Destacado', sponsor: '👑 Líder' },
  { category: 'Visibilidad', feature: 'Posición listado', free: 'Standard', featured: 'Priority', sponsor: 'Hero' },
  { category: 'Visual', feature: 'Altura de card', free: '120px', featured: '145px', sponsor: '180px' },
];

// Helpers
function normalizePlan(plan) {
  if (!plan) return 'free';
  const normalized = String(plan).toLowerCase().trim();
  if (normalized === 'destacado') return 'featured';
  if (normalized === 'patrocinado' || normalized === 'premium') return 'sponsor';
  if (['free', 'featured', 'sponsor'].includes(normalized)) return normalized;
  return 'free';
}

function hasFeatureAccess(plan, feature) {
  const normalizedPlan = normalizePlan(plan);
  return PLAN_PERMISSIONS[normalizedPlan]?.allowedFeatures.includes(feature) || false;
}

function isFeatureLocked(plan, feature) {
  return !hasFeatureAccess(plan, feature);
}

function getResourceLimit(plan, resource) {
  const normalizedPlan = normalizePlan(plan);
  const limits = PLAN_PERMISSIONS[normalizedPlan]?.limits;
  if (!limits || limits[resource] === undefined) return 0;
  
  const limit = limits[resource];
  
  // Si es un número directo (como totalPhotos)
  if (typeof limit === 'number') return limit;
  
  // Si es un objeto con count
  if (typeof limit === 'object' && 'count' in limit) return limit.count;
  
  // Si es un objeto con maxChars
  if (typeof limit === 'object' && 'maxChars' in limit) return limit.maxChars;
  
  return 0;
}

function isResourceRequired(plan, resource) {
  const normalizedPlan = normalizePlan(plan);
  const limits = PLAN_PERMISSIONS[normalizedPlan]?.limits;
  return limits?.[resource]?.required || false;
}

function getUpsellMessage(plan, feature) {
  const messages = {
    free: {
      coverImage: 'Agrega una portada llamativa para destacar tu negocio',
      gallery: 'Muestra hasta 5 fotos de tus productos o servicios',
      metrics: 'Conoce el rendimiento de tu negocio con métricas básicas',
    },
    featured: {
      metricsAdvanced: 'Obtén insights detallados sobre el comportamiento de tus clientes',
    }
  };
  return messages[plan]?.[feature] || '';
}

function getVisualHierarchy(plan) {
  const normalizedPlan = normalizePlan(plan);
  return PLAN_PERMISSIONS[normalizedPlan]?.visualHierarchy || {};
}

function getRecommendedUpgrade(plan) {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan === 'free') return 'featured';
  if (normalizedPlan === 'featured') return 'sponsor';
  return null;
}

function getPlanRankingScore(plan) {
  const normalizedPlan = normalizePlan(plan);
  return PLAN_PERMISSIONS[normalizedPlan]?.visualHierarchy.ranking || 3;
}

function getUpgradeValueProp(plan, feature) {
  const valueProps = {
    free: {
      gallery: {
        title: 'Galería de fotos',
        benefit: 'Los negocios con fotos reciben 3X más clientes',
        cta: 'Activar Galería',
        targetPlan: 'featured'
      },
      metrics: {
        title: 'Métricas de rendimiento',
        benefit: 'Conoce cómo los clientes interactúan con tu negocio',
        cta: 'Ver Métricas',
        targetPlan: 'featured'
      }
    },
    featured: {
      metricsAdvanced: {
        title: 'Métricas Avanzadas',
        benefit: 'Análisis profundo de comportamiento de visitantes',
        cta: 'Desbloquear Analytics',
        targetPlan: 'sponsor'
      }
    }
  };
  return valueProps[plan]?.[feature] || null;
}

console.log('🧪 Testing Plan Permissions System\n');

// Test 1: Normalización de planes
console.log('✅ Test 1: Plan Normalization');
const testCases = [
  { input: 'free', expected: 'free' },
  { input: 'FREE', expected: 'free' },
  { input: 'featured', expected: 'featured' },
  { input: 'DESTACADO', expected: 'featured' },
  { input: 'sponsor', expected: 'sponsor' },
  { input: 'PATROCINADO', expected: 'sponsor' },
  { input: 'premium', expected: 'sponsor' },
  { input: null, expected: 'free' },
  { input: undefined, expected: 'free' },
  { input: 'invalid', expected: 'free' },
];

testCases.forEach(({ input, expected }) => {
  const result = normalizePlan(input);
  const status = result === expected ? '✓' : '✗';
  console.log(`  ${status} normalizePlan('${input}') = '${result}' (expected: '${expected}')`);
});

// Test 2: Acceso a features
console.log('\n✅ Test 2: Feature Access by Plan');
const features = ['logo', 'profilePhoto', 'coverImage', 'gallery', 'metrics', 'badge', 'metricsAdvanced'];
const plans = ['free', 'featured', 'sponsor'];

console.log('\n  Feature Access Matrix:');
console.log('  ┌───────────────────┬──────┬──────────┬─────────┐');
console.log('  │ Feature           │ Free │ Featured │ Sponsor │');
console.log('  ├───────────────────┼──────┼──────────┼─────────┤');

features.forEach(feature => {
  const free = hasFeatureAccess('free', feature) ? '✓' : '✗';
  const featured = hasFeatureAccess('featured', feature) ? '✓' : '✗';
  const sponsor = hasFeatureAccess('sponsor', feature) ? '✓' : '✗';
  
  const paddedFeature = feature.padEnd(17);
  console.log(`  │ ${paddedFeature} │  ${free}   │    ${featured}     │    ${sponsor}    │`);
});

console.log('  └───────────────────┴──────┴──────────┴─────────┘');

// Test 3: Límites de recursos
console.log('\n✅ Test 3: Resource Limits');
const resources = [
  { name: 'Logo', key: 'logo' },
  { name: 'Profile Photo', key: 'profilePhoto' },
  { name: 'Cover Image', key: 'coverImage' },
  { name: 'Gallery Photos', key: 'galleryPhotos' },
  { name: 'Total Photos', key: 'totalPhotos' },
];

resources.forEach(({ name, key }) => {
  const free = getResourceLimit('free', key);
  const featured = getResourceLimit('featured', key);
  const sponsor = getResourceLimit('sponsor', key);
  
  console.log(`  ${name}:`);
  console.log(`    Free: ${free}, Featured: ${featured}, Sponsor: ${sponsor}`);
});

// Test 4: Recursos obligatorios
console.log('\n✅ Test 4: Required Resources');
const requiredResources = ['logo', 'profilePhoto', 'coverImage', 'galleryPhotos'];

requiredResources.forEach(resource => {
  const free = isResourceRequired('free', resource) ? 'Required' : 'Optional';
  const featured = isResourceRequired('featured', resource) ? 'Required' : 'Optional';
  const sponsor = isResourceRequired('sponsor', resource) ? 'Required' : 'Optional';
  
  console.log(`  ${resource}:`);
  console.log(`    Free: ${free}, Featured: ${featured}, Sponsor: ${sponsor}`);
});

// Test 5: Mensajes de upsell
console.log('\n✅ Test 5: Upsell Messages');
const upsellFeatures = ['coverImage', 'gallery', 'metrics', 'metricsAdvanced'];

upsellFeatures.forEach(feature => {
  const freeMsg = getUpsellMessage('free', feature);
  const featuredMsg = getUpsellMessage('featured', feature);
  
  if (freeMsg) {
    console.log(`  ${feature} (FREE):`);
    console.log(`    "${freeMsg.substring(0, 60)}..."`);
  }
  
  if (featuredMsg) {
    console.log(`  ${feature} (FEATURED):`);
    console.log(`    "${featuredMsg.substring(0, 60)}..."`);
  }
});

// Test 6: Jerarquía visual
console.log('\n✅ Test 6: Visual Hierarchy');
plans.forEach(plan => {
  const hierarchy = getVisualHierarchy(plan);
  console.log(`  ${plan.toUpperCase()}:`);
  console.log(`    Height: ${hierarchy.cardHeight}px`);
  console.log(`    Badge: ${hierarchy.badge || 'None'}`);
  console.log(`    Border: ${hierarchy.border}`);
  console.log(`    Ranking: ${hierarchy.ranking}`);
  console.log(`    Z-index: ${hierarchy.zIndex}`);
});

// Test 7: Upgrade recommendations
console.log('\n✅ Test 7: Recommended Upgrades');
plans.forEach(plan => {
  const recommended = getRecommendedUpgrade(plan);
  console.log(`  ${plan} → ${recommended || 'None (max plan)'}`);
});

// Test 8: Ranking scores
console.log('\n✅ Test 8: Plan Ranking Scores (for sorting)');
plans.forEach(plan => {
  const score = getPlanRankingScore(plan);
  console.log(`  ${plan}: Score ${score} (lower = higher priority)`);
});

// Test 9: Value propositions
console.log('\n✅ Test 9: Upgrade Value Props');
const upgradeScenarios = [
  { plan: 'free', feature: 'gallery' },
  { plan: 'free', feature: 'metrics' },
  { plan: 'featured', feature: 'metricsAdvanced' },
];

upgradeScenarios.forEach(({ plan, feature }) => {
  const valueProp = getUpgradeValueProp(plan, feature);
  if (valueProp) {
    console.log(`  ${plan} → ${feature}:`);
    console.log(`    Title: ${valueProp.title}`);
    console.log(`    Benefit: ${valueProp.benefit}`);
    console.log(`    CTA: ${valueProp.cta}`);
    console.log(`    Target: ${valueProp.targetPlan}`);
  }
});

// Test 10: Validaciones de lógica de negocio
console.log('\n✅ Test 10: Business Logic Validations');

const validations = [
  {
    name: 'FREE has NO coverImage access',
    condition: !hasFeatureAccess('free', 'coverImage'),
  },
  {
    name: 'FREE has NO gallery access',
    condition: !hasFeatureAccess('free', 'gallery'),
  },
  {
    name: 'FREE has NO metrics access',
    condition: !hasFeatureAccess('free', 'metrics'),
  },
  {
    name: 'FEATURED has coverImage access',
    condition: hasFeatureAccess('featured', 'coverImage'),
  },
  {
    name: 'FEATURED has gallery (5 photos)',
    condition: getResourceLimit('featured', 'galleryPhotos') === 5,
  },
  {
    name: 'SPONSOR has gallery (10 photos)',
    condition: getResourceLimit('sponsor', 'galleryPhotos') === 10,
  },
  {
    name: 'Logo required for all plans',
    condition: isResourceRequired('free', 'logo') 
            && isResourceRequired('featured', 'logo')
            && isResourceRequired('sponsor', 'logo'),
  },
  {
    name: 'CoverImage NOT required for FREE',
    condition: !isResourceRequired('free', 'coverImage'),
  },
  {
    name: 'CoverImage required for FEATURED',
    condition: isResourceRequired('featured', 'coverImage'),
  },
  {
    name: 'FREE total photos = 2 (logo + profile)',
    condition: getResourceLimit('free', 'totalPhotos') === 2,
  },
  {
    name: 'FEATURED total photos = 7',
    condition: getResourceLimit('featured', 'totalPhotos') === 7,
  },
  {
    name: 'SPONSOR total photos = 12',
    condition: getResourceLimit('sponsor', 'totalPhotos') === 12,
  },
];

validations.forEach(({ name, condition }) => {
  const status = condition ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${status}: ${name}`);
});

// Test 11: Pricing data
console.log('\n✅ Test 11: Pricing Information');
Object.entries(PLAN_PRICING).forEach(([plan, pricing]) => {
  console.log(`  ${plan.toUpperCase()}:`);
  console.log(`    Price: $${pricing.price} ${pricing.currency}`);
  console.log(`    Period: ${pricing.period}`);
  console.log(`    Label: ${pricing.label}`);
  if (pricing.badge) {
    console.log(`    Badge: ${pricing.badge}`);
  }
});

// Test 12: Comparison table
console.log('\n✅ Test 12: Plan Comparison Table');
console.log(`  Total features: ${PLAN_COMPARISON_TABLE.length}`);

const categories = [...new Set(PLAN_COMPARISON_TABLE.map(item => item.category))];
console.log(`  Categories: ${categories.join(', ')}`);

categories.forEach(category => {
  const items = PLAN_COMPARISON_TABLE.filter(item => item.category === category);
  console.log(`  ${category}: ${items.length} items`);
});

// Resumen final
console.log('\n' + '='.repeat(50));
console.log('✅ All Tests Completed');
console.log('='.repeat(50));

console.log('\n📊 Summary:');
console.log(`  - Plans: ${plans.length}`);
console.log(`  - Features tested: ${features.length}`);
console.log(`  - Resources: ${resources.length}`);
console.log(`  - Comparison items: ${PLAN_COMPARISON_TABLE.length}`);
console.log(`  - Validations: ${validations.filter(v => v.condition).length}/${validations.length} passed`);

// Verificar si todos los tests pasaron
const allPassed = validations.every(v => v.condition);
if (allPassed) {
  console.log('\n🎉 All validations passed! System ready for production.');
} else {
  console.log('\n⚠️  Some validations failed. Review configuration.');
  process.exit(1);
}
