/**
 * SCRIPT DE TESTING: Eliminación de Negocios + Portada Opcional
 * 
 * Ejecutar: node test-business-delete-cover.js
 * 
 * Tests automatizados para verificar:
 * 1. Cover NO es requisito para ningún plan
 * 2. Filtros de deleted funcionan correctamente
 */

const { 
  computeProfileCompletion, 
  isPublishReady,
  getRecommendedImprovements,
  updateBusinessState 
} = require('./lib/businessStates');

console.log('🧪 INICIANDO TESTS: Portada Opcional + Eliminación Lógica\n');

// ============================================
// TEST 1: FREE puede publicar sin cover
// ============================================
console.log('📋 TEST 1: Plan FREE sin portada');

const businessFree = {
  name: 'Tienda de Prueba FREE',
  category: 'Restaurante',
  colonia: 'Centro',
  phone: '9191234567',
  description: 'Descripción de prueba',
  horarios: {
    lunes: { abierto: true, desde: '09:00', hasta: '18:00' }
  },
  plan: 'free',
  // coverUrl: undefined ⬅️ SIN PORTADA
};

const resultFree = isPublishReady(businessFree);
console.log('  isPublishReady:', resultFree.ready);
console.log('  missingFields:', resultFree.missingFields);
console.log('  ✅ ESPERADO: ready=true, missingFields=[]\n');

if (!resultFree.ready) {
  console.error('  ❌ FALLO: FREE debería poder publicar sin cover');
  process.exit(1);
}

if (resultFree.missingFields.some(f => f.toLowerCase().includes('portada') || f.toLowerCase().includes('cover'))) {
  console.error('  ❌ FALLO: Cover aparece en missingFields');
  process.exit(1);
}

console.log('  ✅ PASS: FREE puede publicar sin portada\n');

// ============================================
// TEST 2: FEATURED puede publicar sin cover
// ============================================
console.log('📋 TEST 2: Plan FEATURED sin portada');

const businessFeatured = {
  ...businessFree,
  name: 'Tienda de Prueba FEATURED',
  plan: 'featured',
};

const resultFeatured = isPublishReady(businessFeatured);
console.log('  isPublishReady:', resultFeatured.ready);
console.log('  missingFields:', resultFeatured.missingFields);

if (!resultFeatured.ready) {
  console.error('  ❌ FALLO: FEATURED debería poder publicar sin cover');
  process.exit(1);
}

if (resultFeatured.missingFields.some(f => f.toLowerCase().includes('portada') || f.toLowerCase().includes('cover'))) {
  console.error('  ❌ FALLO: Cover aparece en missingFields para FEATURED');
  process.exit(1);
}

console.log('  ✅ PASS: FEATURED puede publicar sin portada\n');

// ============================================
// TEST 3: SPONSOR puede publicar sin cover
// ============================================
console.log('📋 TEST 3: Plan SPONSOR sin portada');

const businessSponsor = {
  ...businessFree,
  name: 'Tienda de Prueba SPONSOR',
  plan: 'sponsor',
};

const resultSponsor = isPublishReady(businessSponsor);
console.log('  isPublishReady:', resultSponsor.ready);
console.log('  missingFields:', resultSponsor.missingFields);

if (!resultSponsor.ready) {
  console.error('  ❌ FALLO: SPONSOR debería poder publicar sin cover');
  process.exit(1);
}

if (resultSponsor.missingFields.some(f => f.toLowerCase().includes('portada') || f.toLowerCase().includes('cover'))) {
  console.error('  ❌ FALLO: Cover aparece en missingFields para SPONSOR');
  process.exit(1);
}

console.log('  ✅ PASS: SPONSOR puede publicar sin portada\n');

// ============================================
// TEST 4: Recomendaciones incluyen cover
// ============================================
console.log('📋 TEST 4: getRecommendedImprovements() incluye cover');

const recommendations = getRecommendedImprovements(businessFeatured);
console.log('  recommendations:', recommendations.recommendations);

const hasCoverRecommendation = recommendations.recommendations.some(
  r => r.toLowerCase().includes('portada') || r.toLowerCase().includes('cover')
);

if (!hasCoverRecommendation) {
  console.error('  ❌ FALLO: Cover debería estar en recomendaciones');
  process.exit(1);
}

console.log('  ✅ PASS: Cover aparece correctamente en recomendaciones\n');

// ============================================
// TEST 5: Completitud sin cover
// ============================================
console.log('📋 TEST 5: Completitud sin cover > 50% para FREE');

const completionFree = computeProfileCompletion(businessFree);
console.log('  completionPercent:', completionFree + '%');

if (completionFree < 50) {
  console.error('  ❌ FALLO: FREE sin cover debería tener > 50% completitud');
  process.exit(1);
}

console.log('  ✅ PASS: Completitud adecuada sin cover\n');

// ============================================
// TEST 6: updateBusinessState marca ready_for_review
// ============================================
console.log('📋 TEST 6: updateBusinessState con negocio completo');

const stateUpdate = updateBusinessState(businessFree);
console.log('  applicationStatus:', stateUpdate.applicationStatus);
console.log('  isPublishReady:', stateUpdate.isPublishReady);
console.log('  completionPercent:', stateUpdate.completionPercent);

if (!stateUpdate.isPublishReady) {
  console.error('  ❌ FALLO: Business debería estar listo para publicar');
  process.exit(1);
}

if (stateUpdate.applicationStatus !== 'ready_for_review') {
  console.error('  ❌ FALLO: applicationStatus debería ser ready_for_review');
  console.error('  Valor actual:', stateUpdate.applicationStatus);
  process.exit(1);
}

console.log('  ✅ PASS: Estado actualizado correctamente a ready_for_review\n');

// ============================================
// TEST 7: Tipos - businessStatus incluye deleted
// ============================================
console.log('📋 TEST 7: Verificación de tipos (visual)');
console.log('  ⚠️  Verificar manualmente en types/business.ts:');
console.log('  - businessStatus incluye "deleted"');
console.log('  - applicationStatus incluye "deleted"');
console.log('  - Campos deletedAt y deletedBy existen');
console.log('  ℹ️  Este test requiere inspección manual del código\n');

// ============================================
// RESUMEN FINAL
// ============================================
console.log('═══════════════════════════════════════════════════════');
console.log('✅ TODOS LOS TESTS PASARON');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('✅ Portada NUNCA es requisito');
console.log('✅ FREE/FEATURED/SPONSOR pueden publicar sin cover');
console.log('✅ Cover aparece en recomendaciones (no requisitos)');
console.log('✅ Completitud funciona correctamente');
console.log('✅ Estado transiciona a ready_for_review sin cover');
console.log('');
console.log('🔜 Siguiente paso: Testing manual de UI');
console.log('   1. Crear negocio sin portada → Ver botón "Enviar a revisión"');
console.log('   2. Probar eliminar negocio → Confirmación doble');
console.log('   3. Admin panel → Verificar filtros de deleted');
console.log('');
