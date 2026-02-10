/**
 * Script de prueba para el sistema de notificaciones WhatsApp
 * 
 * Uso:
 * 1. Asegúrate de tener las variables de entorno configuradas
 * 2. npm run test-whatsapp
 * 3. Revisa la consola y tu WhatsApp
 */

// Test básico de los adapters
async function testAdapters() {
  console.log('🧪 Probando adapters de WhatsApp...\n');
  
  const { sendWhatsApp, formatWizardCompleteMessage } = require('./lib/whatsapp/adapters');
  
  // Formatear mensaje de prueba
  const message = formatWizardCompleteMessage({
    businessName: 'Test Restaurant',
    category: 'Restaurante',
    phone: '6671234567',
    ownerName: 'Test Owner',
    businessId: 'test-123-' + Date.now(),
    timestamp: new Date().toLocaleString('es-MX'),
  });

  console.log('📝 Mensaje a enviar:');
  console.log('-------------------');
  console.log(message);
  console.log('-------------------\n');

  // Obtener número de destino
  const toNumber = process.env.ADMIN_WHATSAPP_TO || process.env.ADMIN_WHATSAPP_NUMBER || '';
  
  if (!toNumber) {
    console.error('❌ Error: ADMIN_WHATSAPP_TO no está configurado');
    console.log('💡 Agrega ADMIN_WHATSAPP_TO=+5219191565865 a tu .env.local\n');
    return;
  }

  console.log(`📱 Enviando a: ${toNumber}`);
  console.log(`🔧 Proveedor: ${process.env.WHATSAPP_PROVIDER || 'callmebot'}\n`);

  // Enviar
  const result = await sendWhatsApp({
    to: toNumber,
    body: message,
  });

  // Mostrar resultado
  console.log('\n📊 Resultado:');
  console.log('-------------------');
  console.log('Success:', result.success);
  console.log('Provider:', result.provider);
  console.log('Message ID:', result.messageId);
  if (result.error) {
    console.log('Error:', result.error);
  }
  console.log('-------------------\n');

  if (result.success) {
    console.log('✅ ¡Éxito! Deberías recibir el mensaje en WhatsApp');
  } else {
    console.log('❌ Falló el envío. Revisa la configuración:');
    console.log('   - Variables de entorno correctas');
    console.log('   - CallMeBot/Twilio activado');
    console.log('   - Formato de número correcto');
  }
}

// Test del servicio completo con idempotencia
async function testNotificationService() {
  console.log('\n\n🧪 Probando servicio de notificaciones...\n');
  
  const { sendWizardCompleteNotification } = require('./lib/whatsapp/notificationService');
  
  const payload = {
    businessId: 'test-idempotency-' + Date.now(),
    businessName: 'Test Idempotency Business',
    category: 'Servicios',
    phone: '6671234567',
    ownerName: 'Test User',
    ownerEmail: 'test@example.com',
    timestamp: new Date().toLocaleString('es-MX'),
  };

  console.log('📤 Primera llamada (debería enviar)...');
  const result1 = await sendWizardCompleteNotification(payload);
  console.log('   Sent:', result1.sent);
  console.log('   Duplicate:', result1.duplicate);
  console.log('   Error:', result1.error || 'N/A');

  console.log('\n📤 Segunda llamada (debería detectar duplicado)...');
  const result2 = await sendWizardCompleteNotification(payload);
  console.log('   Sent:', result2.sent);
  console.log('   Duplicate:', result2.duplicate);
  console.log('   Error:', result2.error || 'N/A');

  if (!result1.sent) {
    console.log('\n⚠️ Primera llamada no envió. Revisa configuración.');
  } else if (result2.duplicate) {
    console.log('\n✅ ¡Idempotencia funciona! No envió duplicado.');
  } else {
    console.log('\n❌ Problema: Segunda llamada no detectó duplicado.');
  }

  console.log('\n💡 Revisa Firestore en notifications/' + payload.businessId + '_wizard_complete');
}

// Ejecutar tests
async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('   TEST DE NOTIFICACIONES WHATSAPP');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Test 1: Adapters básicos
    await testAdapters();

    // Test 2: Servicio con idempotencia
    await testNotificationService();

    console.log('\n═══════════════════════════════════════════════');
    console.log('   TESTS COMPLETADOS');
    console.log('═══════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error durante los tests:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runTests().then(() => {
    console.log('👋 Terminado\n');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testAdapters, testNotificationService };
