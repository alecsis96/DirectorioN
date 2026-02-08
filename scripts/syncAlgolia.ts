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
 * Transforma un documento de negocio de Firestore al formato de Algolia
 */
function transformBusinessForAlgolia(business: Business & { id: string }) {
  return {
    objectID: business.id,
    name: business.name || '',
    description: business.description || '',
    category: business.category || '',
    subcategory: business.subcategory || '',
    tags: business.tags || [],
    address: {
      street: business.address?.street || '',
      city: business.address?.city || '',
      state: business.address?.state || '',
      postalCode: business.address?.postalCode || '',
      country: business.address?.country || 'México',
    },
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    email: business.email || '',
    website: business.website || '',
    socialMedia: business.socialMedia || {},
    images: business.images || [],
    logo: business.logo || '',
    rating: business.rating || 0,
    reviewCount: business.reviewCount || 0,
    isPremium: business.isPremium || false,
    isFeatured: business.isFeatured || false,
    status: business.status || 'draft',
    businessHours: business.businessHours || {},
    // Geolocalización para búsquedas geográficas
    _geoloc: business.location?.latitude && business.location?.longitude
      ? {
          lat: business.location.latitude,
          lng: business.location.longitude,
        }
      : undefined,
  };
}

/**
 * Sincroniza todos los negocios publicados de Firestore a Algolia
 */
async function syncBusinessesToAlgolia() {
  console.log('🔄 Iniciando sincronización Firestore → Algolia...\n');

  try {
    // Obtener cliente admin de Algolia
    const algoliaClient = getAdminClient();
    const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

    // Configurar índice (solo primera vez o cuando cambie configuración)
    console.log('⚙️  Configurando índice...');
    await index.setSettings(INDEX_SETTINGS);
    console.log('✅ Índice configurado\n');

    // Obtener todos los negocios publicados
    console.log('📖 Leyendo negocios de Firestore...');
    const snapshot = await db
      .collection('businesses')
      .where('status', '==', 'published')
      .get();

    console.log(`📊 Encontrados ${snapshot.size} negocios publicados\n`);

    if (snapshot.empty) {
      console.log('⚠️  No hay negocios para sincronizar');
      return;
    }

    // Transformar documentos
    const records = snapshot.docs.map(doc => {
      const business = doc.data() as Business;
      return transformBusinessForAlgolia({ ...business, id: doc.id });
    });

    // Indexar en Algolia (batch)
    console.log('📤 Enviando a Algolia...');
    const result = await index.saveObjects(records);

    console.log(`✅ Sincronización completada!`);
    console.log(`📊 Estadísticas:`);
    console.log(`   - Negocios indexados: ${records.length}`);
    console.log(`   - ObjectIDs: ${result.objectIDs.length}`);
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
    const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
    
    await index.clearObjects();
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
