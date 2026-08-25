/**
 * Script de sincronización de datos Firestore → Algolia
 * Ejecutar: npm run sync-algolia
 * 
 * Este script:
 * 1. Lee todos los negocios publicados de Firestore
 * 2. Los transforma al formato de Algolia
 * 3. Los indexa en batch para mejor rendimiento
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminClient, ALGOLIA_INDEX_NAME, INDEX_SETTINGS } from '../lib/algoliaClient';
import {
  applyAlgoliaIndexSnapshot,
  selectVisibleBusinessesForAlgolia,
  transformBusinessForAlgolia,
} from '../lib/algoliaIndexing';
import type { Business } from '../types/business';

// Inicializar Firebase Admin si no está inicializado
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('../serviceAccountKey.json'); // Fallback al archivo local

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

/**
 * Sincroniza todos los negocios publicados de Firestore a Algolia
 */
async function syncBusinessesToAlgolia() {
  console.log('🔄 Iniciando sincronización Firestore → Algolia...\n');

  try {
    // Obtener cliente admin de Algolia
    const algoliaClient = getAdminClient();

    // Obtener todos los negocios publicados
    console.log('📖 Leyendo negocios de Firestore...');
    const snapshot = await db
      .collection('businesses')
      .where('businessStatus', '==', 'published')
      .get();

    console.log(`📊 Encontrados ${snapshot.size} negocios publicados\n`);

    // Aplicar el mismo predicado canónico que el directorio público.
    const candidates = snapshot.docs.map(doc => {
      const business = doc.data() as Business;
      return { ...business, id: doc.id };
    });
    const records = selectVisibleBusinessesForAlgolia(candidates).map(transformBusinessForAlgolia);

    // Aplicar settings efectivos y reemplazar el contenido para retirar registros obsoletos.
    console.log('📤 Preparando reemplazo completo del índice de Algolia...');
    await applyAlgoliaIndexSnapshot(
      algoliaClient,
      ALGOLIA_INDEX_NAME,
      records,
      INDEX_SETTINGS,
    );

    console.log(`✅ Sincronización completada!`);
    console.log(`📊 Estadísticas:`);
    console.log(`   - Negocios indexados: ${records.length}`);
    console.log(`   - Índice: ${ALGOLIA_INDEX_NAME}\n`);

    // Mostrar distribución por categoría
    const categoryCount = records.reduce((acc, record) => {
      acc[record.category] = (acc[record.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📈 Distribución por categoría:');
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   - ${category}: ${count}`);
      });

    console.log('\n✅ Sincronización exitosa');
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    process.exit(1);
  }
}

/**
 * Eliminar todos los registros del índice (útil para resetear)
 */
async function clearAlgoliaIndex() {
  console.log('🗑️  Limpiando índice de Algolia...');

  try {
    const algoliaClient = getAdminClient();
    
    await algoliaClient.clearObjects({
      indexName: ALGOLIA_INDEX_NAME,
    });
    console.log('✅ Índice limpiado');
  } catch (error) {
    console.error('❌ Error al limpiar índice:', error);
    process.exit(1);
  }
}

// CLI
const command = process.argv[2];

if (command === 'clear') {
  clearAlgoliaIndex().then(() => process.exit(0));
} else {
  syncBusinessesToAlgolia().then(() => process.exit(0));
}
