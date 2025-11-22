/**
 * Script de migración para agregar nextPaymentDate a negocios existentes
 * 
 * Este script:
 * 1. Busca todos los negocios con plan 'featured' o 'sponsor'
 * 2. Les asigna una fecha de pago (30 días desde hoy o desde planUpdatedAt)
 * 3. Inicializa campos de pago necesarios
 * 
 * Ejecutar con: node scripts/addPaymentDates.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Asegúrate de tener este archivo

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function addPaymentDatesToBusinesses() {
  console.log('🚀 Iniciando migración de fechas de pago...\n');

  try {
    // Obtener todos los negocios con plan de pago
    const snapshot = await db.collection('businesses')
      .where('plan', 'in', ['featured', 'sponsor'])
      .get();

    console.log(`📊 Encontrados ${snapshot.size} negocios con planes de pago\n`);

    if (snapshot.empty) {
      console.log('✅ No hay negocios para migrar');
      return;
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Procesar cada negocio
    for (const doc of snapshot.docs) {
      const business = doc.data();
      const businessId = doc.id;

      // Saltar si ya tiene nextPaymentDate
      if (business.nextPaymentDate) {
        console.log(`⏭️  Saltando ${business.name || businessId} - Ya tiene nextPaymentDate`);
        skipped++;
        continue;
      }

      try {
        // Calcular fecha de próximo pago
        let nextPaymentDate;
        
        if (business.planUpdatedAt) {
          // Si tiene fecha de actualización de plan, usar esa + 30 días
          const planDate = new Date(business.planUpdatedAt);
          nextPaymentDate = new Date(planDate);
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        } else {
          // Si no, usar fecha actual + 30 días
          nextPaymentDate = new Date();
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        }

        // Preparar actualización
        const updateData = {
          nextPaymentDate: nextPaymentDate.toISOString(),
          isActive: business.isActive !== undefined ? business.isActive : true,
          paymentStatus: business.paymentStatus || 'active',
        };

        // Si tiene planUpdatedAt, usarlo como lastPaymentDate
        if (business.planUpdatedAt) {
          updateData.lastPaymentDate = business.planUpdatedAt;
        }

        // Actualizar documento
        await db.collection('businesses').doc(businessId).update(updateData);

        console.log(`✅ ${business.name || businessId}`);
        console.log(`   Plan: ${business.plan}`);
        console.log(`   Próximo pago: ${nextPaymentDate.toLocaleDateString('es-MX')}`);
        console.log('');

        updated++;
      } catch (error) {
        console.error(`❌ Error en ${business.name || businessId}:`, error.message);
        errors++;
      }
    }

    // Resumen
    console.log('\n📈 RESUMEN DE MIGRACIÓN');
    console.log('========================');
    console.log(`✅ Actualizados: ${updated}`);
    console.log(`⏭️  Saltados: ${skipped}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📊 Total procesados: ${snapshot.size}`);
    console.log('\n✨ Migración completada\n');

  } catch (error) {
    console.error('💥 Error fatal en la migración:', error);
    throw error;
  }
}

// Ejecutar migración
addPaymentDatesToBusinesses()
  .then(() => {
    console.log('👋 Proceso terminado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💀 Error fatal:', error);
    process.exit(1);
  });
