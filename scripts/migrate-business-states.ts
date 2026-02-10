/**
 * SCRIPT DE MIGRACIÓN
 * Actualiza negocios existentes al nuevo sistema de estados
 * 
 * IMPORTANTE: Ejecutar en horario de bajo tráfico
 * 
 * Uso:
 * npm run migrate:business-states
 * o
 * npx tsx scripts/migrate-business-states.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { 
  updateBusinessState,
  type ApplicationStatus,
  type BusinessStatus,
} from '../lib/businessStates';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('❌ FIREBASE_SERVICE_ACCOUNT no está configurado en .env.local');
  }
  
  try {
    const credential = JSON.parse(serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(credential),
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT:', error);
    throw error;
  }
}

const db = admin.firestore();

interface OldBusiness {
  id: string;
  status?: 'draft' | 'review' | 'published' | 'rejected' | 'pending';
  [key: string]: any;
}

/**
 * Mapeo de estados antiguos a nuevos
 */
function mapOldToNewStatus(oldStatus?: string): {
  businessStatus: BusinessStatus;
  applicationStatus: ApplicationStatus;
} {
  switch (oldStatus) {
    case 'published':
      return {
        businessStatus: 'published',
        applicationStatus: 'approved',
      };
    
    case 'review':
    case 'pending':
      return {
        businessStatus: 'in_review',
        applicationStatus: 'ready_for_review',
      };
    
    case 'rejected':
      return {
        businessStatus: 'draft',
        applicationStatus: 'rejected',
      };
    
    case 'draft':
    default:
      return {
        businessStatus: 'draft',
        applicationStatus: 'submitted',
      };
  }
}

/**
 * Migrar un batch de negocios
 */
async function migrateBatch(businesses: OldBusiness[]) {
  const batch = db.batch();
  let updated = 0;
  
  for (const biz of businesses) {
    try {
      const ref = db.collection('businesses').doc(biz.id);
      
      // Mapear estados
      const { businessStatus, applicationStatus } = mapOldToNewStatus(biz.status);
      
      // Calular completitud
      const stateUpdate = updateBusinessState({
        ...biz,
        businessStatus,
        applicationStatus,
      });
      
      // Preparar updates
      const updates: Record<string, any> = {
        businessStatus,
        applicationStatus: stateUpdate.applicationStatus, // Puede auto-actualizarse
        completionPercent: stateUpdate.completionPercent,
        isPublishReady: stateUpdate.isPublishReady,
        missingFields: stateUpdate.missingFields,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Si estaba publicado, agregar publishedAt si no existe
      if (businessStatus === 'published' && !biz.publishedAt) {
        updates.publishedAt = biz.createdAt || admin.firestore.FieldValue.serverTimestamp();
      }
      
      batch.update(ref, updates);
      updated++;
      
      console.log(`✓ ${biz.id}: ${biz.status || 'unknown'} → ${businessStatus}/${applicationStatus} (${stateUpdate.completionPercent}%)`);
      
    } catch (error) {
      console.error(`✗ Error migrando ${biz.id}:`, error);
    }
  }
  
  await batch.commit();
  return updated;
}

/**
 * Migrar applications
 */
async function migrateApplications() {
  console.log('\n📋 Migrando applications...\n');
  
  const snapshot = await db.collection('applications').get();
  const batch = db.batch();
  let updated = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const oldStatus = data.status;
      
      // Mapear status de application
      let newStatus: ApplicationStatus = 'submitted';
      if (oldStatus === 'approved') newStatus = 'approved';
      else if (oldStatus === 'rejected') newStatus = 'rejected';
      else if (oldStatus === 'pending') newStatus = 'ready_for_review';
      
      batch.update(doc.ref, {
        status: newStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      updated++;
      console.log(`✓ Application ${doc.id}: ${oldStatus} → ${newStatus}`);
      
    } catch (error) {
      console.error(`✗ Error migrando application ${doc.id}:`, error);
    }
  }
  
  await batch.commit();
  console.log(`\n✅ ${updated} applications migradas\n`);
}

/**
 * Crear businesses faltantes desde applications
 */
async function createMissingBusinesses() {
  console.log('\n🔄 Buscando applications sin business...\n');
  
  const applicationsSnapshot = await db.collection('applications').get();
  let created = 0;
  
  for (const appDoc of applicationsSnapshot.docs) {
    try {
      const appData = appDoc.data();
      
      // Si ya tiene businessId, verificar que exista
      if (appData.businessId) {
        const bizDoc = await db.collection('businesses').doc(appData.businessId).get();
        if (bizDoc.exists) continue; // Ya existe, skip
      }
      
      // Buscar por ownerId
      const businessesSnapshot = await db
        .collection('businesses')
        .where('ownerId', '==', appDoc.id)
        .limit(1)
        .get();
      
      if (!businessesSnapshot.empty) {
        // Ya existe un business para este owner, actualizar application
        const existingBiz = businessesSnapshot.docs[0];
        await appDoc.ref.update({
          businessId: existingBiz.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✓ Linked application ${appDoc.id} → business ${existingBiz.id}`);
        continue;
      }
      
      // No existe business, crear uno
      const newBusinessRef = db.collection('businesses').doc();
      
      // Primero crear objeto temporal para calcular estado (sin FieldValue)
      const tempBusinessData = {
        id: newBusinessRef.id,
        name: appData.businessName || 'Negocio sin nombre',
        ownerId: appDoc.id,
        ownerEmail: appData.ownerEmail || '',
        ownerName: appData.ownerName || '',
        ownerPhone: appData.ownerPhone || '',
        category: appData.category || '',
        description: appData.formData?.description || '',
        phone: appData.formData?.phone || '',
        WhatsApp: appData.formData?.whatsapp || '',
        address: appData.formData?.address || '',
        colonia: appData.formData?.colonia || '',
        
        businessStatus: 'draft' as BusinessStatus,
        applicationStatus: 'submitted' as ApplicationStatus,
        completionPercent: 0,
        isPublishReady: false,
        
        plan: 'free' as 'free' | 'featured' | 'sponsor',
        featured: false,
        isActive: true,
      };
      
      // Calcular completitud
      const stateUpdate = updateBusinessState(tempBusinessData);
      
      // Ahora crear el objeto final con FieldValue y estado calculado
      const businessData = {
        ...tempBusinessData,
        completionPercent: stateUpdate.completionPercent,
        isPublishReady: stateUpdate.isPublishReady,
        missingFields: stateUpdate.missingFields,
        applicationStatus: stateUpdate.applicationStatus,
        createdAt: appData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await newBusinessRef.set(businessData);
      await appDoc.ref.update({
        businessId: newBusinessRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      created++;
      console.log(`✅ Created business ${newBusinessRef.id} for application ${appDoc.id}`);
      
    } catch (error) {
      console.error(`✗ Error creando business desde application ${appDoc.id}:`, error);
    }
  }
  
  console.log(`\n✅ ${created} negocios creados desde applications\n`);
}

/**
 * Ejecutar migración completa
 */
async function runMigration() {
  console.log('═══════════════════════════════════════════════');
  console.log('   MIGRACIÓN AL NUEVO SISTEMA DE ESTADOS');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // 1. Migrar businesses existentes
    console.log('📦 Migrando businesses...\n');
    
    const snapshot = await db.collection('businesses').get();
    const businesses: OldBusiness[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    console.log(`Total de negocios: ${businesses.length}\n`);
    
    // Procesar en batches de 500 (límite de Firestore)
    const BATCH_SIZE = 500;
    let totalUpdated = 0;
    
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      const batch = businesses.slice(i, i + BATCH_SIZE);
      const updated = await migrateBatch(batch);
      totalUpdated += updated;
      console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}: ${updated} actualizados\n`);
    }
    
    console.log(`\n✅ ${totalUpdated} negocios migrados\n`);
    
    // 2. Migrar applications
    await migrateApplications();
    
    // 3. Crear businesses faltantes
    await createMissingBusinesses();
    
    console.log('═══════════════════════════════════════════════');
    console.log('   ✅ MIGRACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════\n');
    
    // Mostrar estadísticas finales
    const stats = await getStats();
    console.log('📊 ESTADÍSTICAS POST-MIGRACIÓN:\n');
    console.log(`  • Draft: ${stats.draft}`);
    console.log(`  • In Review: ${stats.inReview}`);
    console.log(`  • Published: ${stats.published}`);
    console.log(`  • Total: ${stats.total}\n`);
    
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

/**
 * Obtener estadísticas
 */
async function getStats() {
  const snapshot = await db.collection('businesses').get();
  const stats = {
    draft: 0,
    inReview: 0,
    published: 0,
    total: snapshot.size,
  };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.businessStatus === 'draft') stats.draft++;
    else if (data.businessStatus === 'in_review') stats.inReview++;
    else if (data.businessStatus === 'published') stats.published++;
  });
  
  return stats;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n👋 Migración finalizada\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

export { runMigration, createMissingBusinesses, migrateApplications };
