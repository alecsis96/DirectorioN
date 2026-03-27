/**
 * 🎯 Script de Inicialización de Contadores Agregados
 * 
 * Este script crea los contadores iniciales para optimizar queries del dashboard.
 * 
 * IMPORTANTE: Ejecutar SOLO UNA VEZ después de desplegar las Cloud Functions.
 * 
 * Uso:
 *   npx tsx scripts/init-counters.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Use default credentials (Application Default Credentials)
  // or environment variables GOOGLE_APPLICATION_CREDENTIALS
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

interface BusinessStats {
  total: number;
  free: number;
  featured: number;
  sponsor: number;
  in_review: number;
  draft: number;
  updatedAt: admin.firestore.FieldValue;
}

interface ScarcityStats {
  [colonia: string]: {
    [category: string]: {
      featured: number;
      sponsor: number;
    };
  };
}

async function initBusinessStats() {
  console.log('📊 Inicializando contadores de negocios...');
  
  const snapshot = await db.collection('businesses').get();
  
  const stats: BusinessStats = {
    total: 0,
    free: 0,
    featured: 0,
    sponsor: 0,
    in_review: 0,
    draft: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const businessStatus = data.businessStatus || 'draft';
    const plan = data.plan || 'free';
    
    // Contar solo publicados para el total
    if (businessStatus === 'published') {
      stats.total++;
      
      if (plan === 'featured') {
        stats.featured++;
      } else if (plan === 'sponsor') {
        stats.sponsor++;
      } else {
        stats.free++;
      }
    } else if (businessStatus === 'in_review') {
      stats.in_review++;
    } else if (businessStatus === 'draft') {
      stats.draft++;
    }
  });
  
  await db.collection('counters').doc('business_stats').set(stats);
  
  console.log('✅ Estadísticas de negocios inicializadas:');
  console.log(`   Total publicados: ${stats.total}`);
  console.log(`   Free: ${stats.free}`);
  console.log(`   Featured: ${stats.featured}`);
  console.log(`   Sponsor: ${stats.sponsor}`);
  console.log(`   En revisión: ${stats.in_review}`);
  console.log(`   Borrador: ${stats.draft}`);
}

async function initScarcityCounters() {
  console.log('\n📦 Inicializando contadores de escasez...');
  
  const snapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'published')
    .get();
  
  const scarcity: ScarcityStats = {};
  
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const colonia = data.colonia || 'sin_zona';
    const category = data.category || 'sin_categoria';
    const plan = data.plan || 'free';
    
    // Solo contar featured y sponsor
    if (plan !== 'featured' && plan !== 'sponsor') return;
    
    // Inicializar estructuras si no existen
    if (!scarcity[colonia]) {
      scarcity[colonia] = {};
    }
    if (!scarcity[colonia][category]) {
      scarcity[colonia][category] = { featured: 0, sponsor: 0 };
    }
    
    // Incrementar contador con type assertion
    const planKey = plan as 'featured' | 'sponsor';
    scarcity[colonia][category][planKey]++;
  });
  
  // Agregar timestamp
  const scarcityWithTimestamp = {
    ...scarcity,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  await db.collection('counters').doc('scarcity').set(scarcityWithTimestamp);
  
  console.log('✅ Contadores de escasez inicializados:');
  console.log(JSON.stringify(scarcity, null, 2));
}

async function initApplicationStats() {
  console.log('\n📥 Inicializando contadores de solicitudes...');
  
  const snapshot = await db.collection('applications').get();
  
  const stats = {
    total: snapshot.size,
    pending: 0,
    approved: 0,
    rejected: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  snapshot.docs.forEach((doc) => {
    const status = doc.data().status;
    if (status === 'pending' || status === 'solicitud') {
      stats.pending++;
    } else if (status === 'approved') {
      stats.approved++;
    } else if (status === 'rejected') {
      stats.rejected++;
    }
  });
  
  await db.collection('counters').doc('application_stats').set(stats);
  
  console.log('✅ Estadísticas de aplicaciones inicializadas:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Pendientes: ${stats.pending}`);
  console.log(`   Aprobadas: ${stats.approved}`);
  console.log(`   Rechazadas: ${stats.rejected}`);
}

async function verifyCounters() {
  console.log('\n🔍 Verificando consistencia de contadores...');
  
  // Verificar business_stats
  const statsDoc = await db.collection('counters').doc('business_stats').get();
  const statsData = statsDoc.data();
  
  const publishedSnapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'published')
    .get();
  
  const actualTotal = publishedSnapshot.size;
  const counterTotal = statsData?.total || 0;
  
  if (actualTotal === counterTotal) {
    console.log(`✅ Contador de total coincide: ${actualTotal}`);
  } else {
    console.error(`❌ Desincronización: Counter=${counterTotal}, Real=${actualTotal}`);
  }
  
  // Verificar plan counts
  let actualFeatured = 0;
  let actualSponsor = 0;
  let actualFree = 0;
  
  publishedSnapshot.docs.forEach((doc) => {
    const plan = doc.data().plan || 'free';
    if (plan === 'featured') actualFeatured++;
    else if (plan === 'sponsor') actualSponsor++;
    else actualFree++;
  });
  
  console.log(`   Featured: Counter=${statsData?.featured}, Real=${actualFeatured} ${statsData?.featured === actualFeatured ? '✅' : '❌'}`);
  console.log(`   Sponsor: Counter=${statsData?.sponsor}, Real=${actualSponsor} ${statsData?.sponsor === actualSponsor ? '✅' : '❌'}`);
  console.log(`   Free: Counter=${statsData?.free}, Real=${actualFree} ${statsData?.free === actualFree ? '✅' : '❌'}`);
}

async function main() {
  console.log('🚀 Iniciando script de contadores agregados\n');
  console.log('⚠️  IMPORTANTE: Este script debe ejecutarse SOLO UNA VEZ\n');
  
  try {
    await initBusinessStats();
    await initScarcityCounters();
    await initApplicationStats();
    await verifyCounters();
    
    console.log('\n🎉 ¡Inicialización completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Desplegar Cloud Functions: firebase deploy --only functions');
    console.log('   2. Actualizar código del dashboard para usar contadores');
    console.log('   3. Monitorear logs de las functions para detectar inconsistencias');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la inicialización:', error);
    process.exit(1);
  }
}

main();
