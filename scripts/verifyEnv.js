/**
 * Script para verificar que todas las variables de entorno necesarias estén configuradas
 * Ejecutar antes de desplegar: node scripts/verifyEnv.js
 */

const requiredEnvVars = {
  client: [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ],
  server: [
    'FIREBASE_SERVICE_ACCOUNT_KEY',
  ],
  stripe: [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
  urls: [
    'NEXT_PUBLIC_BASE_URL',
  ],
};

const optionalEnvVars = {
  cloudinary: [
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ],
  email: [
    'EMAIL_USER',
    'EMAIL_PASS',
  ],
  analytics: [
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  ],
};

function checkEnvVars() {
  console.log('🔍 Verificando variables de entorno...\n');

  let missingRequired = [];
  let missingOptional = [];

  // Verificar variables requeridas
  console.log('✅ Variables Requeridas:');
  Object.entries(requiredEnvVars).forEach(([category, vars]) => {
    console.log(`\n📦 ${category.toUpperCase()}:`);
    vars.forEach(varName => {
      const exists = !!process.env[varName];
      const status = exists ? '✓' : '✗';
      console.log(`  ${status} ${varName}`);
      if (!exists) {
        missingRequired.push(varName);
      }
    });
  });

  // Verificar variables opcionales
  console.log('\n\n⚙️  Variables Opcionales:');
  Object.entries(optionalEnvVars).forEach(([category, vars]) => {
    console.log(`\n📦 ${category.toUpperCase()}:`);
    vars.forEach(varName => {
      const exists = !!process.env[varName];
      const status = exists ? '✓' : '○';
      console.log(`  ${status} ${varName}`);
      if (!exists) {
        missingOptional.push(varName);
      }
    });
  });

  // Resumen
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 RESUMEN\n');

  if (missingRequired.length === 0) {
    console.log('✅ Todas las variables requeridas están configuradas');
  } else {
    console.log('❌ Faltan variables requeridas:');
    missingRequired.forEach(v => console.log(`   - ${v}`));
    console.log('\n⚠️  El proyecto NO funcionará correctamente sin estas variables');
  }

  if (missingOptional.length > 0) {
    console.log('\n⚠️  Variables opcionales no configuradas:');
    missingOptional.forEach(v => console.log(`   - ${v}`));
    console.log('\n💡 Algunas funcionalidades pueden no estar disponibles');
  }

  console.log('\n' + '='.repeat(50));

  // Validaciones adicionales
  console.log('\n🔬 Validaciones Adicionales:\n');

  // Verificar que BASE_URL sea HTTPS en producción
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL) {
    if (!process.env.NEXT_PUBLIC_BASE_URL.startsWith('https://')) {
      console.log('⚠️  NEXT_PUBLIC_BASE_URL debería usar HTTPS en producción');
    } else {
      console.log('✓ BASE_URL usa HTTPS');
    }
  }

  // Verificar que Stripe sea producción si NODE_ENV es production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
      console.log('⚠️  Estás usando keys de TEST de Stripe en producción');
    } else if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_')) {
      console.log('✓ Usando keys de producción de Stripe');
    }
  }

  // Verificar formato de SERVICE_ACCOUNT_KEY
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('✓ FIREBASE_SERVICE_ACCOUNT_KEY tiene formato JSON válido');
    } catch (e) {
      console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY no es JSON válido');
    }
  }

  console.log('\n' + '='.repeat(50));

  // Exit code para CI/CD
  if (missingRequired.length > 0) {
    console.log('\n❌ FALLÓ LA VERIFICACIÓN - Configura las variables faltantes');
    process.exit(1);
  } else {
    console.log('\n✅ VERIFICACIÓN EXITOSA - Listo para desplegar');
    process.exit(0);
  }
}

// Ejecutar
checkEnvVars();
