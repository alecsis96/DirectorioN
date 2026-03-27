/**
 * 🔥 Cloud Functions - Sistema de Contadores Agregados
 * 
 * Mantiene contadores en tiempo real para optimizar queries del dashboard.
 * 
 * Funciones:
 * - updateBusinessCounters: Actualiza contadores cuando cambia un negocio
 * - dailyCounterCheck: Verifica consistencia diaria y re-sincroniza si es necesario
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Actualiza contadores cuando se crea/actualiza/elimina un negocio
 */
export const updateBusinessCounters = onDocumentWritten(
  'businesses/{businessId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    
    const counterRef = db.collection('counters').doc('business_stats');
    const scarcityRef = db.collection('counters').doc('scarcity');
    
    const updates: any = { updatedAt: FieldValue.serverTimestamp() };
    const scarcityUpdates: any = {};
    
    // ================== DOCUMENTO CREADO ==================
    if (!before && after) {
      console.log('📝 Negocio creado:', event.params.businessId);
      
      if (after.businessStatus === 'published') {
        const plan = after.plan || 'free';
        updates.total = FieldValue.increment(1);
        updates[plan] = FieldValue.increment(1);
        
        // Actualizar escasez si es premium
        if (plan === 'featured' || plan === 'sponsor') {
          const colonia = after.colonia || 'sin_zona';
          const category = after.category || 'sin_categoria';
          scarcityUpdates[`${colonia}.${category}.${plan}`] = FieldValue.increment(1);
        }
      } else if (after.businessStatus === 'in_review') {
        updates.in_review = FieldValue.increment(1);
      } else if (after.businessStatus === 'draft') {
        updates.draft = FieldValue.increment(1);
      }
    }
    
    // ================== DOCUMENTO ACTUALIZADO ==================
    if (before && after) {
      const statusChanged = before.businessStatus !== after.businessStatus;
      const planChanged = before.plan !== after.plan;
      const coloniaChanged = before.colonia !== after.colonia;
      const categoryChanged = before.category !== after.category;
      
      if (statusChanged || planChanged || coloniaChanged || categoryChanged) {
        console.log('🔄 Negocio actualizado:', event.params.businessId, {
          statusChanged,
          planChanged,
          coloniaChanged,
          categoryChanged,
        });
        
        // ========== CAMBIO DE STATUS ==========
        if (statusChanged) {
          const oldStatus = before.businessStatus || 'draft';
          const newStatus = after.businessStatus || 'draft';
          
          // Decrementar status anterior
          if (oldStatus === 'published') {
            const oldPlan = before.plan || 'free';
            updates.total = FieldValue.increment(-1);
            updates[oldPlan] = FieldValue.increment(-1);
            
            // Decrementar escasez
            if (oldPlan === 'featured' || oldPlan === 'sponsor') {
              const oldColonia = before.colonia || 'sin_zona';
              const oldCategory = before.category || 'sin_categoria';
              scarcityUpdates[`${oldColonia}.${oldCategory}.${oldPlan}`] = FieldValue.increment(-1);
            }
          } else if (oldStatus === 'in_review') {
            updates.in_review = FieldValue.increment(-1);
          } else if (oldStatus === 'draft') {
            updates.draft = FieldValue.increment(-1);
          }
          
          // Incrementar status nuevo
          if (newStatus === 'published') {
            const newPlan = after.plan || 'free';
            updates.total = FieldValue.increment(1);
            updates[newPlan] = FieldValue.increment(1);
            
            // Incrementar escasez
            if (newPlan === 'featured' || newPlan === 'sponsor') {
              const newColonia = after.colonia || 'sin_zona';
              const newCategory = after.category || 'sin_categoria';
              scarcityUpdates[`${newColonia}.${newCategory}.${newPlan}`] = FieldValue.increment(1);
            }
          } else if (newStatus === 'in_review') {
            updates.in_review = FieldValue.increment(1);
          } else if (newStatus === 'draft') {
            updates.draft = FieldValue.increment(1);
          }
        }
        
        // ========== CAMBIO DE PLAN (sin cambio de status) ==========
        if (planChanged && !statusChanged && after.businessStatus === 'published' && before.businessStatus === 'published') {
          const oldPlan = before.plan || 'free';
          const newPlan = after.plan || 'free';
          
          updates[oldPlan] = FieldValue.increment(-1);
          updates[newPlan] = FieldValue.increment(1);
          
          // Actualizar escasez
          const colonia = after.colonia || 'sin_zona';
          const category = after.category || 'sin_categoria';
          
          if (oldPlan === 'featured' || oldPlan === 'sponsor') {
            scarcityUpdates[`${colonia}.${category}.${oldPlan}`] = FieldValue.increment(-1);
          }
          if (newPlan === 'featured' || newPlan === 'sponsor') {
            scarcityUpdates[`${colonia}.${category}.${newPlan}`] = FieldValue.increment(1);
          }
        }
        
        // ========== CAMBIO DE COLONIA/CATEGORÍA (solo si es premium published) ==========
        if ((coloniaChanged || categoryChanged) && !statusChanged && !planChanged 
            && after.businessStatus === 'published' 
            && (after.plan === 'featured' || after.plan === 'sponsor')) {
          
          const oldColonia = before.colonia || 'sin_zona';
          const oldCategory = before.category || 'sin_categoria';
          const newColonia = after.colonia || 'sin_zona';
          const newCategory = after.category || 'sin_categoria';
          const plan = after.plan;
          
          scarcityUpdates[`${oldColonia}.${oldCategory}.${plan}`] = FieldValue.increment(-1);
          scarcityUpdates[`${newColonia}.${newCategory}.${plan}`] = FieldValue.increment(1);
        }
      }
    }
    
    // ================== DOCUMENTO ELIMINADO ==================
    if (before && !after) {
      console.log('🗑️ Negocio eliminado:', event.params.businessId);
      
      if (before.businessStatus === 'published') {
        const plan = before.plan || 'free';
        updates.total = FieldValue.increment(-1);
        updates[plan] = FieldValue.increment(-1);
        
        // Decrementar escasez
        if (plan === 'featured' || plan === 'sponsor') {
          const colonia = before.colonia || 'sin_zona';
          const category = before.category || 'sin_categoria';
          scarcityUpdates[`${colonia}.${category}.${plan}`] = FieldValue.increment(-1);
        }
      } else if (before.businessStatus === 'in_review') {
        updates.in_review = FieldValue.increment(-1);
      } else if (before.businessStatus === 'draft') {
        updates.draft = FieldValue.increment(-1);
      }
    }
    
    // ================== APLICAR UPDATES ==================
    const batch = db.batch();
    
    if (Object.keys(updates).length > 1) { // Más de solo updatedAt
      batch.update(counterRef, updates);
    }
    
    if (Object.keys(scarcityUpdates).length > 0) {
      scarcityUpdates.updatedAt = FieldValue.serverTimestamp();
      batch.update(scarcityRef, scarcityUpdates);
    }
    
    await batch.commit();
    
    console.log('✅ Contadores actualizados:', { updates, scarcityUpdates });
  }
);

/**
 * Verifica consistencia de contadores diariamente a las 2 AM
 * Re-sincroniza si encuentra inconsistencias
 */
export const dailyCounterCheck = onSchedule('every day 02:00', async () => {
  console.log('🔍 Verificando consistencia de contadores...');
  
  try {
    // Obtener contadores
    const statsDoc = await db.collection('counters').doc('business_stats').get();
    const statsData = statsDoc.data();
    
    // Contar negocios reales
    const snapshot = await db.collection('businesses').get();
    
    const actual = {
      total: 0,
      free: 0,
      featured: 0,
      sponsor: 0,
      in_review: 0,
      draft: 0,
    };
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = data.businessStatus || 'draft';
      const plan = data.plan || 'free';
      
      if (status === 'published') {
        actual.total++;
        actual[plan as 'free' | 'featured' | 'sponsor']++;
      } else if (status === 'in_review') {
        actual.in_review++;
      } else if (status === 'draft') {
        actual.draft++;
      }
    });
    
    // Comparar
    const drifts = [];
    for (const key of Object.keys(actual)) {
      const counterValue = statsData?.[key] || 0;
      const actualValue = actual[key as keyof typeof actual];
      if (counterValue !== actualValue) {
        drifts.push({ key, counter: counterValue, actual: actualValue });
      }
    }
    
    if (drifts.length > 0) {
      console.error('❌ Inconsistencias detectadas:', drifts);
      
      // Re-sincronizar
      await db.collection('counters').doc('business_stats').set({
        ...actual,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      console.log('✅ Contadores re-sincronizados');
      
      // TODO: Enviar alerta por email/Slack
    } else {
      console.log('✅ Contadores consistentes');
    }
  } catch (error) {
    console.error('❌ Error en verificación de contadores:', error);
  }
});

/**
 * Re-sincronizar contadores manualmente (callable function)
 */
export const resyncCounters = onSchedule('every 24 hours', async () => {
  console.log('🔄 Re-sincronizando contadores...');
  
  try {
    const snapshot = await db.collection('businesses').get();
    
    const stats = {
      total: 0,
      free: 0,
      featured: 0,
      sponsor: 0,
      in_review: 0,
      draft: 0,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const scarcity: any = {};
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = data.businessStatus || 'draft';
      const plan = data.plan || 'free';
      const colonia = data.colonia || 'sin_zona';
      const category = data.category || 'sin_categoria';
      
      // Business stats
      if (status === 'published') {
        stats.total++;
        stats[plan as 'free' | 'featured' | 'sponsor']++;
        
        // Scarcity stats
        if (plan === 'featured' || plan === 'sponsor') {
          if (!scarcity[colonia]) scarcity[colonia] = {};
          if (!scarcity[colonia][category]) scarcity[colonia][category] = { featured: 0, sponsor: 0 };
          scarcity[colonia][category][plan]++;
        }
      } else if (status === 'in_review') {
        stats.in_review++;
      } else if (status === 'draft') {
        stats.draft++;
      }
    });
    
    // Actualizar Firestore
    const batch = db.batch();
    batch.set(db.collection('counters').doc('business_stats'), stats);
    batch.set(db.collection('counters').doc('scarcity'), {
      ...scarcity,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    
    console.log('✅ Contadores re-sincronizados:', stats);
  } catch (error) {
    console.error('❌ Error re-sincronizando contadores:', error);
    throw error;
  }
});
