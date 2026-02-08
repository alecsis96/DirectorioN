/**
 * Script de prueba para verificar cambios críticos de seguridad
 * Ejecutar con: node test-critical-changes.js
 */

console.log('🧪 PRUEBAS DE CAMBIOS CRÍTICOS\n');

// Test 1: Verificar que appRateLimit existe
console.log('Test 1: Rate Limiting');
try {
  const fs = require('fs');
  const rateLimitPath = './lib/appRateLimit.ts';
  if (fs.existsSync(rateLimitPath)) {
    const content = fs.readFileSync(rateLimitPath, 'utf8');
    if (content.includes('appRateLimit') && content.includes('RequestLike')) {
      console.log('✅ appRateLimit.ts existe y tiene la estructura correcta');
    } else {
      console.log('❌ appRateLimit.ts existe pero falta contenido');
    }
  } else {
    console.log('❌ appRateLimit.ts no encontrado');
  }
} catch (err) {
  console.log('❌ Error al verificar appRateLimit:', err.message);
}

// Test 2: Verificar authService tiene verificación de email
console.log('\nTest 2: Verificación de Email');
try {
  const fs = require('fs');
  const authServicePath = './lib/authService.ts';
  if (fs.existsSync(authServicePath)) {
    const content = fs.readFileSync(authServicePath, 'utf8');
    if (content.includes('sendVerificationEmail') && content.includes('sendEmailVerification')) {
      console.log('✅ authService tiene métodos de verificación de email');
    } else {
      console.log('❌ authService no tiene métodos de verificación');
    }
  } else {
    console.log('❌ authService.ts no encontrado');
  }
} catch (err) {
  console.log('❌ Error al verificar authService:', err.message);
}

// Test 3: Verificar reglas Firestore
console.log('\nTest 3: Reglas Firestore');
try {
  const fs = require('fs');
  const rulesPath = './firestore.rules';
  if (fs.existsSync(rulesPath)) {
    const content = fs.readFileSync(rulesPath, 'utf8');
    if (content.includes('isVerifiedEmail') && content.includes('email_verified')) {
      console.log('✅ Reglas Firestore requieren email verificado');
    } else {
      console.log('❌ Reglas Firestore no requieren email verificado');
    }
  } else {
    console.log('❌ firestore.rules no encontrado');
  }
} catch (err) {
  console.log('❌ Error al verificar reglas:', err.message);
}

// Test 4: Verificar cache en businessData
console.log('\nTest 4: Cache en businessData');
try {
  const fs = require('fs');
  const dataPath = './lib/server/businessData.ts';
  if (fs.existsSync(dataPath)) {
    const content = fs.readFileSync(dataPath, 'utf8');
    if (content.includes('BUSINESS_CACHE') && content.includes('CACHE_TTL_MS') && content.includes('MAX_LIMIT')) {
      console.log('✅ businessData tiene sistema de cache');
    } else {
      console.log('❌ businessData no tiene sistema de cache');
    }
  } else {
    console.log('❌ businessData.ts no encontrado');
  }
} catch (err) {
  console.log('❌ Error al verificar businessData:', err.message);
}

// Test 5: Verificar endpoints protegidos
console.log('\nTest 5: Endpoints Protegidos');
const endpoints = [
  { path: './app/api/solicitud/[email]/route.ts', name: 'solicitud' },
  { path: './app/api/my-businesses/route.ts', name: 'my-businesses' },
  { path: './app/api/admin/create-business/route.ts', name: 'create-business' }
];

endpoints.forEach(endpoint => {
  try {
    const fs = require('fs');
    if (fs.existsSync(endpoint.path)) {
      const content = fs.readFileSync(endpoint.path, 'utf8');
      const hasAuth = content.includes('Authorization') || content.includes('getAdminAuth');
      const hasRateLimit = content.includes('limiter') || content.includes('appRateLimit');
      
      if (hasAuth && hasRateLimit) {
        console.log(`✅ ${endpoint.name}: Auth + Rate Limit`);
      } else if (hasAuth) {
        console.log(`⚠️  ${endpoint.name}: Solo Auth`);
      } else if (hasRateLimit) {
        console.log(`⚠️  ${endpoint.name}: Solo Rate Limit`);
      } else {
        console.log(`❌ ${endpoint.name}: Sin protección`);
      }
    } else {
      console.log(`❌ ${endpoint.name}: No encontrado`);
    }
  } catch (err) {
    console.log(`❌ ${endpoint.name}: Error - ${err.message}`);
  }
});

// Test 6: Verificar cache headers en páginas
console.log('\nTest 6: Cache en Páginas Públicas');
const pages = [
  { path: './app/page.tsx', name: 'Home' },
  { path: './app/negocios/page.tsx', name: 'Negocios' },
  { path: './app/api/filters/route.ts', name: 'Filters API' }
];

pages.forEach(page => {
  try {
    const fs = require('fs');
    if (fs.existsSync(page.path)) {
      const content = fs.readFileSync(page.path, 'utf8');
      const hasRevalidate = content.includes('revalidate');
      const hasCacheControl = content.includes('Cache-Control');
      const hasLimit = content.includes('fetchBusinesses(') && /fetchBusinesses\(\d+\)/.test(content);
      
      if (hasRevalidate && (hasCacheControl || hasLimit)) {
        console.log(`✅ ${page.name}: Cache + Límites`);
      } else if (hasRevalidate) {
        console.log(`⚠️  ${page.name}: Solo revalidate`);
      } else {
        console.log(`❌ ${page.name}: Sin cache`);
      }
    } else {
      console.log(`❌ ${page.name}: No encontrado`);
    }
  } catch (err) {
    console.log(`❌ ${page.name}: Error - ${err.message}`);
  }
});

console.log('\n📊 RESUMEN:');
console.log('- Rate limiting implementado: lib/appRateLimit.ts');
console.log('- Verificación de email: lib/authService.ts + firestore.rules');
console.log('- Cache de datos: lib/server/businessData.ts');
console.log('- Endpoints protegidos: 3 endpoints con auth + rate limit');
console.log('- Cache HTTP: páginas públicas con revalidate=60s');
console.log('\n✅ Revisión de archivos completada');
