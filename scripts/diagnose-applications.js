/**
 * Script de diagnóstico para verificar el estado de applications en Firestore
 * 
 * Uso: node scripts/diagnose-applications.js <email-del-usuario>
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Intentar cargar .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

// Inicializar Firebase Admin usando variables de entorno
try {
  if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Faltan variables de entorno de Firebase Admin');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      })
    });
  }
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
  console.log('\nAsegúrate de tener configuradas las variables de entorno en .env.local:');
  console.log('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  console.log('  - FIREBASE_ADMIN_CLIENT_EMAIL');
  console.log('  - FIREBASE_ADMIN_PRIVATE_KEY');
  process.exit(1);
}

const db = admin.firestore();

async function diagnoseUser(email) {
  console.log('🔍 Buscando usuario con email:', email);
  console.log('─'.repeat(60));
  
  try {
    // Buscar el usuario en Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('✅ Usuario encontrado en Firebase Auth:');
      console.log('   - UID:', userRecord.uid);
      console.log('   - Email:', userRecord.email);
      console.log('   - Display Name:', userRecord.displayName || 'No establecido');
      console.log('');
    } catch (authError) {
      console.log('❌ Usuario NO encontrado en Firebase Auth');
      console.log('');
      return;
    }
    
    // Buscar en applications
    console.log('🔍 Buscando en colección "applications"...');
    const appDoc = await db.collection('applications').doc(userRecord.uid).get();
    
    if (appDoc.exists) {
      const appData = appDoc.data();
      console.log('✅ Documento encontrado en applications:');
      console.log('   - Document ID (debe ser igual al UID):', appDoc.id);
      console.log('   - ownerId:', appData.ownerId);
      console.log('   - ownerUid:', appData.ownerUid);
      console.log('   - ownerEmail:', appData.ownerEmail);
      console.log('   - businessName:', appData.businessName);
      console.log('   - status:', appData.status);
      console.log('   - plan:', appData.plan);
      console.log('   - createdAt:', appData.createdAt?.toDate?.() || appData.createdAt);
      console.log('');
      
      // Verificar si los IDs coinciden
      if (appData.ownerId !== userRecord.uid && appData.ownerUid !== userRecord.uid) {
        console.log('⚠️  ADVERTENCIA: Los campos ownerId/ownerUid NO coinciden con el UID del usuario');
        console.log('   - UID del usuario:', userRecord.uid);
        console.log('   - ownerId en documento:', appData.ownerId);
        console.log('   - ownerUid en documento:', appData.ownerUid);
        console.log('');
      }
    } else {
      console.log('❌ NO se encontró documento en applications/' + userRecord.uid);
      console.log('');
    }
    
    // Buscar en businesses
    console.log('🔍 Buscando en colección "businesses"...');
    const businessesSnapshot = await db.collection('businesses')
      .where('ownerId', '==', userRecord.uid)
      .get();
    
    if (businessesSnapshot.empty) {
      console.log('❌ NO se encontraron negocios aprobados para este usuario');
    } else {
      console.log(`✅ Encontrados ${businessesSnapshot.size} negocios aprobados:`);
      businessesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Nombre: ${data.name}`);
        console.log(`     ownerId: ${data.ownerId}`);
        console.log(`     status: ${data.status}`);
        console.log(`     plan: ${data.plan}`);
        console.log(`     createdAt: ${data.createdAt?.toDate?.() || data.createdAt}`);
        console.log('');
      });
    }
    
    // Buscar negocios con ownerEmail
    console.log('🔍 Buscando negocios por email...');
    const businessesByEmail = await db.collection('businesses')
      .where('ownerEmail', '==', email)
      .get();
    
    if (!businessesByEmail.empty) {
      console.log(`⚠️  Encontrados ${businessesByEmail.size} negocios con ownerEmail pero posiblemente ownerId incorrecto:`);
      businessesByEmail.forEach((doc) => {
        const data = doc.data();
        if (data.ownerId !== userRecord.uid) {
          console.log(`   - ID: ${doc.id}`);
          console.log(`     Nombre: ${data.name}`);
          console.log(`     ownerId: ${data.ownerId} ❌ (debería ser ${userRecord.uid})`);
          console.log(`     ownerEmail: ${data.ownerEmail} ✅`);
          console.log('');
        }
      });
    }
    
    console.log('─'.repeat(60));
    console.log('✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Main
const email = process.argv[2];

if (!email) {
  console.log('❌ Uso: node scripts/diagnose-applications.js <email-del-usuario>');
  console.log('   Ejemplo: node scripts/diagnose-applications.js usuario@gmail.com');
  process.exit(1);
}

diagnoseUser(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
