/**
 * Script para probar notificaciones de Slack, WhatsApp y Email
 * Ejecutar con: node test-notifications.js
 */

// Leer .env.local manualmente
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key] = value;
      }
    }
  });
}

// Test 1: Verificar variables de entorno
console.log('\n📋 VERIFICACIÓN DE VARIABLES DE ENTORNO:\n');
console.log('✓ SLACK_WEBHOOK_URL:', process.env.SLACK_WEBHOOK_URL ? '✓ Configurado' : '✗ FALTA');
console.log('✓ ADMIN_WHATSAPP_NUMBER:', process.env.ADMIN_WHATSAPP_NUMBER || '✗ FALTA');
console.log('✓ CALLMEBOT_API_KEY:', process.env.CALLMEBOT_API_KEY || '✗ FALTA');
console.log('✓ EMAIL_USER:', process.env.EMAIL_USER || '✗ FALTA');
console.log('✓ EMAIL_PASS:', process.env.EMAIL_PASS || '✗ FALTA');
console.log('✓ NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || '✗ FALTA');

// Test 2: Probar Slack
async function testSlack() {
  console.log('\n🔔 PROBANDO SLACK...\n');
  
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('✗ No se encontró SLACK_WEBHOOK_URL');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🧪 *TEST DE NOTIFICACIONES*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🧪 *Prueba de Notificación Slack*\n\nSi ves este mensaje, ¡Slack está funcionando correctamente!'
            }
          }
        ]
      })
    });

    if (response.ok) {
      console.log('✓ Slack: Mensaje enviado correctamente');
      return true;
    } else {
      console.log('✗ Slack: Error', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.log('✗ Slack: Error de conexión', error.message);
    return false;
  }
}

// Test 3: Probar WhatsApp
async function testWhatsApp() {
  console.log('\n📱 PROBANDO WHATSAPP...\n');
  
  const phone = process.env.ADMIN_WHATSAPP_NUMBER;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) {
    console.log('✗ Faltan credenciales de WhatsApp');
    console.log('  ADMIN_WHATSAPP_NUMBER:', phone || 'FALTA');
    console.log('  CALLMEBOT_API_KEY:', apiKey || 'FALTA');
    return false;
  }

  const message = '🧪 TEST: Si recibes este mensaje, WhatsApp está funcionando correctamente!';
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    
    console.log('Respuesta de CallMeBot:', text);
    
    if (response.ok || text.includes('success') || text.includes('Message queued')) {
      console.log('✓ WhatsApp: Mensaje enviado (verifica tu teléfono)');
      return true;
    } else {
      console.log('✗ WhatsApp: Error en respuesta');
      console.log('\n⚠️  INSTRUCCIONES CALLMEBOT:');
      console.log('   1. Agrega +34 644 34 78 89 a tus contactos');
      console.log('   2. Envíale el mensaje: "I allow callmebot to send me messages"');
      console.log('   3. Recibirás un API key, actualiza CALLMEBOT_API_KEY en .env.local');
      return false;
    }
  } catch (error) {
    console.log('✗ WhatsApp: Error de conexión', error.message);
    return false;
  }
}

// Test 4: Verificar configuración de Email
function testEmailConfig() {
  console.log('\n📧 VERIFICANDO EMAIL...\n');
  
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.log('✗ Email: Faltan credenciales');
    console.log('  EMAIL_USER:', user || 'FALTA');
    console.log('  EMAIL_PASS:', pass ? '✓ Configurado' : 'FALTA');
    console.log('\n⚠️  Para configurar email, agrega en .env.local:');
    console.log('   EMAIL_USER=tu-email@gmail.com');
    console.log('   EMAIL_PASS=tu-app-password');
    return false;
  }

  console.log('✓ Email: Credenciales configuradas');
  console.log('  (No se enviará email de prueba, solo verificación de config)');
  return true;
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   TEST DE SISTEMA DE NOTIFICACIONES   ║');
  console.log('╚═══════════════════════════════════════╝');

  const slackOk = await testSlack();
  const whatsappOk = await testWhatsApp();
  const emailOk = testEmailConfig();

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║           RESUMEN DE PRUEBAS          ║');
  console.log('╚═══════════════════════════════════════╝\n');
  console.log('Slack:', slackOk ? '✓ OK' : '✗ FALLO');
  console.log('WhatsApp:', whatsappOk ? '✓ OK' : '✗ FALLO');
  console.log('Email Config:', emailOk ? '✓ OK' : '✗ FALLO');
  
  console.log('\n───────────────────────────────────────\n');
  
  if (!slackOk || !whatsappOk || !emailOk) {
    console.log('⚠️  Algunas notificaciones tienen problemas.');
    console.log('   Revisa los mensajes de error arriba.\n');
  } else {
    console.log('✓ Todas las notificaciones están configuradas!\n');
  }
}

// Ejecutar
runAllTests().catch(console.error);
