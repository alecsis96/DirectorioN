/**
 * Script de migración: Generar placeholders elegantes para negocios sin coverUrl
 * 
 * PROBLEMA: Negocios sin portada no pueden publicarse
 * SOLUCIÓN: Asignar placeholder elegante temporal con inicial del negocio
 * 
 * USO:
 * npx tsx scripts/migrate-cover-placeholders.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../firebaseServiceAccount.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * Generar URL de placeholder SVG dinámico
 * Usa degradado elegante con inicial del negocio
 */
function generatePlaceholderUrl(businessName: string, category?: string): string {
  const initial = businessName.charAt(0).toUpperCase();
  const encodedInitial = encodeURIComponent(initial);
  
  // Degradados elegantes por categoría
  const gradients: Record<string, { from: string; to: string }> = {
    'Restaurante': { from: '#FF6B6B', to: '#FF8E53' },
    'Tienda': { from: '#4ECDC4', to: '#44A08D' },
    'Servicios': { from: '#6C5CE7', to: '#A29BFE' },
    'Salud': { from: '#00B894', to: '#00CEC9' },
    'Educación': { from: '#FDCB6E', to: '#FD79A8' },
    'Entretenimiento': { from: '#E17055', to: '#FDCB6E' },
    default: { from: '#667EEA', to: '#764BA2' },
  };
  
  const colors = gradients[category || ''] || gradients.default;
  
  // SVG placeholder con degradado
  const svg = `<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="1200" height="400" fill="url(#grad)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="180" font-weight="bold" fill="white" opacity="0.9">${initial}</text>
    <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white" opacity="0.7">${businessName.substring(0, 30)}</text>
  </svg>`;
  
  // Codificar SVG para data URL
  const encodedSvg = encodeURIComponent(svg)
    .replace(/%20/g, ' ')
    .replace(/%0A/g, '')
    .replace(/%09/g, '');
  
  return `data:image/svg+xml,${encodedSvg}`;
}

/**
 * Migrar negocios sin coverUrl
 */
async function migrateBusinessPlaceholders() {
  console.log('🚀 Iniciando migración de placeholders de portada...\n');
  
  try {
    // 1. Obtener negocios sin coverUrl
    const snapshot = await db
      .collection('businesses')
      .get();
    
    console.log(`📊 Total de negocios encontrados: ${snapshot.size}\n`);
    
   const businessesWithoutCover = snapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.coverUrl || data.coverUrl.trim().length === 0;
    });
    
    console.log(`⚠️  Negocios SIN portada: ${businessesWithoutCover.length}\n`);
    
    if (businessesWithoutCover.length === 0) {
      console.log('✅ Todos los negocios ya tienen portada. No se requiere migración.');
      return;
    }
    
    // 2. Generar y asignar placeholders
    let updated = 0;
    let errors = 0;
    
    for (const doc of businessesWithoutCover) {
      try {
        const data = doc.data();
        const businessName = data.name || data.businessName || 'Negocio';
        const category = data.category;
        
        const placeholderUrl = generatePlaceholderUrl(businessName, category);
        
        await db.collection('businesses').doc(doc.id).update({
          coverUrl: placeholderUrl,
          coverPublicId: 'placeholder-generated',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        updated++;
        console.log(`✅ [${updated}/${businessesWithoutCover.length}] ${businessName}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error al actualizar ${doc.id}:`, error);
      }
    }
    
    // 3. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total procesados: ${businessesWithoutCover.length}`);
    console.log('='.repeat(60) + '\n');
    
    if (updated > 0) {
      console.log('💡 IMPORTANTE:');
      console.log('   Los placeholders son temporales.');
      console.log('   Los dueños deben subir una portada real desde su dashboard.');
      console.log('   Las portadas temporales tienen publicId: "placeholder-generated"\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    throw error;
  }
}

/**
 * Función opcional: Revertir placeholders generados
 */
async function revertPlaceholders() {
  console.log('🔄 Revirtiendo placeholders generados...\n');
  
  const snapshot = await db
    .collection('businesses')
    .where('coverPublicId', '==', 'placeholder-generated')
    .get();
  
  console.log(`📊 Negocios con placeholder generado: ${snapshot.size}\n`);
  
  let reverted = 0;
  for (const doc of snapshot.docs) {
    await db.collection('businesses').doc(doc.id).update({
      coverUrl: admin.firestore.FieldValue.delete(),
      coverPublicId: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    reverted++;
  }
  
  console.log(`✅ Placeholders revertidos: ${reverted}\n`);
}

// Ejecutar migración
const command = process.argv[2];

if (command === 'revert') {
  revertPlaceholders()
    .then(() => {
      console.log('✅ Reversión completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error al revertir:', error);
      process.exit(1);
    });
} else {
  migrateBusinessPlaceholders()
    .then(() => {
      console.log('✅ Migración completada exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error en la migración:', error);
      process.exit(1);
    });
}
