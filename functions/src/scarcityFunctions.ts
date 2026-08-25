/**
 * 🔥 Cloud Functions - Sistema de Escasez y Alta Asistida
 * Automatización de notificaciones y validación de límites
 */

import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  MONETIZATION_DISABLED_CODE,
  MONETIZATION_DISABLED_MESSAGE,
  MONETIZATION_DISABLED_RESULT,
  MONETIZATION_FEATURE_ENABLED,
} from "./featureFlags";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Types
type BusinessPlan = 'free' | 'featured' | 'sponsor';

interface ScarcityLimits {
  featured: number;
  sponsor: number;
}

// Límites por categoría
const SCARCITY_LIMITS: Record<string, ScarcityLimits> = {
  restaurantes: { featured: 10, sponsor: 3 },
  hoteles: { featured: 8, sponsor: 2 },
  cafeterias: { featured: 8, sponsor: 2 },
  bares: { featured: 8, sponsor: 2 },
  default: { featured: 10, sponsor: 3 },
};

// Helper: Contar negocios en un plan
async function countBusinessesInPlan(
  categoryId: string,
  plan: BusinessPlan,
  zone?: string,
  specialty?: string
): Promise<number> {
  if (!MONETIZATION_FEATURE_ENABLED) return 0;

  let query = db.collection('businesses')
    .where('category', '==', categoryId)
    .where('plan', '==', plan)
    .where('status', '==', 'published');

  if (zone) query = query.where('zone', '==', zone);
  if (specialty) query = query.where('specialty', '==', specialty);

  const snapshot = await query.get();
  return snapshot.size;
}

// Helper: Verificar si puede hacer upgrade
async function canUpgrade(
  categoryId: string,
  targetPlan: BusinessPlan,
  zone?: string,
  specialty?: string
): Promise<{ allowed: boolean; slotsLeft: number }> {
  if (!MONETIZATION_FEATURE_ENABLED) {
    return {allowed: false, slotsLeft: 0};
  }

  if (targetPlan === 'free') {
    return { allowed: true, slotsLeft: Infinity };
  }

  const limits = SCARCITY_LIMITS[categoryId] || SCARCITY_LIMITS.default;
  const maxSlots = targetPlan === 'sponsor' ? limits.sponsor : limits.featured;
  
  const currentCount = await countBusinessesInPlan(categoryId, targetPlan, zone, specialty);
  const slotsLeft = maxSlots - currentCount;

  return {
    allowed: slotsLeft > 0,
    slotsLeft: Math.max(0, slotsLeft),
  };
}


// Helper: Obtener rank del plan (menor = mejor)
function getPlanRank(plan: string): number {
  if (plan === 'sponsor') return 1;
  if (plan === 'featured') return 2;
  return 3; // free
}

/**
 * 🔽 TRIGGER: Cuando un negocio baja de plan
 * Notifica al primero en lista de espera
 */
export const onBusinessPlanChange = onDocumentUpdated(
  'businesses/{businessId}',
  async (event) => {
    if (!MONETIZATION_FEATURE_ENABLED) return;

    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // Solo actuar si cambió el plan
    if (before.plan === after.plan) return;
    
    const oldPlanRank = getPlanRank(before.plan);
    const newPlanRank = getPlanRank(after.plan);
    
    // Si bajó de plan (ej: sponsor -> featured)
    if (newPlanRank > oldPlanRank) {
      console.log(`📉 Business ${event.params.businessId} downgraded from ${before.plan} to ${after.plan}`);
      
      // Notificar lista de espera
      await notifyWaitlist(
        after.category,
        before.plan as BusinessPlan,
        after.zone,
        after.specialty
      );
    }
  }
);

// Helper: Notificar waitlist cuando hay disponibilidad
async function notifyWaitlist(
  categoryId: string,
  plan: BusinessPlan,
  zone?: string,
  specialty?: string
): Promise<void> {
  if (!MONETIZATION_FEATURE_ENABLED) return;

  let query = db.collection('waitlist')
    .where('category', '==', categoryId)
    .where('targetPlan', '==', plan)
    .where('status', '==', 'waiting')
    .orderBy('createdAt', 'asc')
    .limit(1);

  const snapshot = await query.get();
  
  if (snapshot.empty) {
    console.log(`No hay negocios en waitlist para ${plan} en ${categoryId}`);
    return;
  }

  const waitlistEntry = snapshot.docs[0];
  const businessDoc = await db.collection('businesses').doc(waitlistEntry.data().businessId).get();
  
  if (!businessDoc.exists) return;
  
  const business = businessDoc.data();
  if (!business) return;

  // Log para integración con SendGrid
  console.log(`📧 Email a enviar a ${business.contactEmail}:
    Plan ${plan} ahora disponible en ${categoryId}
    Link de confirmación: ${process.env.APP_URL || 'https://yajagon.com'}/dashboard/upgrade?token=${waitlistEntry.id}
  `);

  // Actualizar waitlist entry
  await waitlistEntry.ref.update({
    status: 'notified',
    notifiedAt: FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), // +48h
  });
}

/**
 * ➕ CALLABLE: Agregar negocio a lista de espera
 */
export const addToWaitlistCallable = onCall(async (request) => {
  if (!MONETIZATION_FEATURE_ENABLED) {
    throw new HttpsError(
      "failed-precondition",
      MONETIZATION_DISABLED_MESSAGE,
      {code: MONETIZATION_DISABLED_CODE}
    );
  }

  // Validar autenticación
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Debes estar autenticado para unirte a la lista de espera'
    );
  }
  
  const { businessId, categoryId, targetPlan, zone, specialty } = request.data;
  
  // Validar que el negocio pertenece al usuario
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists) {
    throw new HttpsError('not-found', 'Negocio no encontrado');
  }
  
  const business = businessDoc.data();
  if (business?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      'permission-denied',
      'No tienes permiso para modificar este negocio'
    );
  }
  
  // Verificar disponibilidad
  const availability = await canUpgrade(categoryId, targetPlan, zone, specialty);
  
  if (availability.allowed) {
    return {
      success: false,
      message: 'Hay espacios disponibles. Puedes hacer upgrade directamente.',
      slotsLeft: availability.slotsLeft,
    };
  }
  
  // Agregar a waitlist
  const waitlistRef = await db.collection('waitlist').add({
    businessId,
    category: categoryId,
    targetPlan,
    zone: zone || null,
    specialty: specialty || null,
    status: 'waiting',
    createdAt: FieldValue.serverTimestamp(),
  });
  
  // Obtener posición
  const position = await db.collection('waitlist')
    .where('category', '==', categoryId)
    .where('targetPlan', '==', targetPlan)
    .where('status', '==', 'waiting')
    .orderBy('createdAt', 'asc')
    .get();
  
  // Log para analytics
  console.log(`📝 Added to waitlist: ${businessId} for ${targetPlan} in ${categoryId}`);
  
  return {
    success: true,
    position: position.size,
    estimatedWaitDays: 30,
    message: `Agregado a lista de espera en posición #${position.size}`,
    waitlistId: waitlistRef.id,
  };
});

/**
 * ✅ CALLABLE: Confirmar upgrade desde lista de espera
 */
export const confirmWaitlistUpgrade = onCall(async (request) => {
  if (!MONETIZATION_FEATURE_ENABLED) {
    throw new HttpsError(
      "failed-precondition",
      MONETIZATION_DISABLED_MESSAGE,
      {code: MONETIZATION_DISABLED_CODE}
    );
  }

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado');
  }
  
  const { waitlistId, businessId } = request.data;
  
  // Validar ownership
  const businessDoc = await db.collection('businesses').doc(businessId).get();
  if (!businessDoc.exists || businessDoc.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'No autorizado');
  }
  
  // Obtener entrada de waitlist
  const waitlistDoc = await db.collection('waitlist').doc(waitlistId).get();
  if (!waitlistDoc.exists) {
    throw new HttpsError('not-found', 'Entrada de lista de espera no encontrada');
  }
  
  const waitlistData = waitlistDoc.data();
  
  // Verificar que está notificado y no ha expirado
  if (waitlistData?.status !== 'notified') {
    throw new HttpsError('failed-precondition', 'Aún no hay espacio disponible');
  }
  
  const expiresAt = waitlistData.expiresAt?.toDate();
  if (expiresAt && new Date() > expiresAt) {
    throw new HttpsError('deadline-exceeded', 'El tiempo para confirmar ha expirado');
  }
  
  // Verificar disponibilidad nuevamente (por si alguien más tomó el lugar)
  const availability = await canUpgrade(
    waitlistData.category,
    waitlistData.targetPlan,
    waitlistData.zone,
    waitlistData.specialty
  );
  
  if (!availability.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      'Lo sentimos, el lugar ya fue tomado por otro negocio'
    );
  }
  
  // Actualizar plan del negocio
  await db.collection('businesses').doc(businessId).update({
    plan: waitlistData.targetPlan,
    upgradedAt: FieldValue.serverTimestamp(),
    upgradedFrom: 'waitlist',
  });
  
  // Marcar waitlist como completada
  await waitlistDoc.ref.update({
    status: 'confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
  });
  
  // Log
  console.log(`✅ Waitlist upgrade confirmed: ${businessId} -> ${waitlistData.targetPlan}`);
  
  return {
    success: true,
    message: `Upgrade a ${waitlistData.targetPlan} completado exitosamente`,
    newPlan: waitlistData.targetPlan,
  };
});

/**
 * ⏰ SCHEDULED: Limpiar waitlist expirados (cada 6 horas)
 */
export const cleanExpiredWaitlist = onSchedule('every 6 hours', async (event) => {
  if (!MONETIZATION_FEATURE_ENABLED) return;

  const now = admin.firestore.Timestamp.now();
  
  // Buscar entradas notificadas que expiraron
  const expiredQuery = await db.collection('waitlist')
    .where('status', '==', 'notified')
    .where('expiresAt', '<', now)
    .get();
  
  const batch = db.batch();
  let count = 0;
  
  expiredQuery.docs.forEach(doc => {
    // Marcar como expirado
    batch.update(doc.ref, {
      status: 'expired',
      expiredAt: FieldValue.serverTimestamp(),
    });
    count++;
  });
  
  await batch.commit();
  
  console.log(`🧹 Cleaned ${count} expired waitlist entries`);
  
  // Notificar al siguiente en cada categoría que tenía expirados
  const categories = new Set(expiredQuery.docs.map(d => d.data().category));
  
  for (const category of categories) {
    const firstExpired = expiredQuery.docs.find(d => d.data().category === category);
    if (firstExpired) {
      const data = firstExpired.data();
      await notifyWaitlist(
        data.category,
        data.targetPlan,
        data.zone,
        data.specialty
      );
    }
  }
});

/**
 * 🔍 CALLABLE: Verificar disponibilidad de upgrade
 */
export const checkUpgradeAvailability = onCall(async (request) => {
  if (!MONETIZATION_FEATURE_ENABLED) {
    return {
      ...MONETIZATION_DISABLED_RESULT,
      allowed: false,
      slotsLeft: 0,
      totalSlots: 0,
      urgencyLevel: "none" as const,
      waitlistPosition: 0,
    };
  }

  const { categoryId, targetPlan, zone, specialty } = request.data;
  
  const availability = await canUpgrade(categoryId, targetPlan, zone, specialty);
  
  // Obtener posición en waitlist si existe
  let waitlistPosition = 0;
  if (!availability.allowed) {
    const waitlistSnapshot = await db.collection('waitlist')
      .where('category', '==', categoryId)
      .where('targetPlan', '==', targetPlan)
      .where('status', '==', 'waiting')
      .orderBy('createdAt', 'asc')
      .get();
    waitlistPosition = waitlistSnapshot.size;
  }
  
  const limits = SCARCITY_LIMITS[categoryId] || SCARCITY_LIMITS.default;
  const totalSlots = targetPlan === 'sponsor' ? limits.sponsor : limits.featured;
  
  return {
    allowed: availability.allowed,
    slotsLeft: availability.slotsLeft,
    totalSlots,
    message: availability.allowed ? 'Espacio disponible' : 'Sin espacios, únete a la lista de espera',
    urgencyLevel: availability.slotsLeft <= 1 ? 'high' : availability.slotsLeft <= 3 ? 'medium' : 'low',
    waitlistPosition,
  };
});

/**
 * 📊 CALLABLE: Obtener métricas de categoría
 */
export const getCategoryMetrics = onCall(async (request) => {
  if (!MONETIZATION_FEATURE_ENABLED) {
    return {
      ...MONETIZATION_DISABLED_RESULT,
      totalBusinesses: 0,
      byPlan: {free: 0, featured: 0, sponsor: 0},
      saturation: {featured: 0, sponsor: 0},
      limits: null,
      competitionLevel: "disabled" as const,
    };
  }

  const { categoryId, zone, specialty } = request.data;
  
  // Contar negocios por plan
  const freeCount = await countBusinessesInPlan(categoryId, 'free', zone, specialty);
  const featuredCount = await countBusinessesInPlan(categoryId, 'featured', zone, specialty);
  const sponsorCount = await countBusinessesInPlan(categoryId, 'sponsor', zone, specialty);
  
  const limits = SCARCITY_LIMITS[categoryId] || SCARCITY_LIMITS.default;
  
  return {
    totalBusinesses: freeCount + featuredCount + sponsorCount,
    byPlan: {
      free: freeCount,
      featured: featuredCount,
      sponsor: sponsorCount,
    },
    saturation: {
      featured: Math.round((featuredCount / limits.featured) * 100),
      sponsor: Math.round((sponsorCount / limits.sponsor) * 100),
    },
    limits,
    competitionLevel: sponsorCount >= limits.sponsor ? 'saturated' : featuredCount >= limits.featured * 0.8 ? 'high' : 'medium',
  };
});

/**
 * 📧 TRIGGER: Enviar email de bienvenida al registrar paquete
 */
export const onPackagePurchase = onDocumentCreated(
  'purchases/{purchaseId}',
  async (event) => {
    if (!MONETIZATION_FEATURE_ENABLED) return;

    const purchase = event.data?.data();
    
    if (!purchase || !purchase.businessId || !purchase.packageId) return;
    
    // Obtener info del negocio
    const businessDoc = await db.collection('businesses').doc(purchase.businessId).get();
    if (!businessDoc.exists) return;
    
    const business = businessDoc.data();
    const email = business?.email || business?.contactEmail;
    
    if (!email) return;
    
    // TODO: Integrar con servicio de email
    console.log(`📧 Send welcome email to ${email} for package ${purchase.packageId}`);
    console.log(`Package details:`, {
      businessName: business.name,
      packageId: purchase.packageId,
      amount: purchase.amount,
    });
    
    // Ejemplo con SendGrid:
    // await sendEmail({
    //   to: email,
    //   template: 'package-welcome',
    //   data: {
    //     businessName: business.name,
    //     packageName: purchase.packageId,
    //     setupDate: purchase.createdAt,
    //   }
    // });
  }
);

/**
 * 📈 SCHEDULED: Reporte diario de métricas (cada día a las 9am)
 */
export const dailyMetricsReport = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/Mexico_City',
  },
  async (event) => {
    if (!MONETIZATION_FEATURE_ENABLED) return;

    // Obtener estadísticas del día anterior
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Contar nuevos registros
    const newBusinesses = await db.collection('businesses')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(today))
      .get();
    
    // Contar upgrades
    const upgrades = await db.collection('businesses')
      .where('upgradedAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
      .where('upgradedAt', '<', admin.firestore.Timestamp.fromDate(today))
      .get();
    
    // Contar compras de paquetes
    const purchases = await db.collection('purchases')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(today))
      .get();
    
    const report = {
      date: yesterday.toISOString().split('T')[0],
      newBusinesses: newBusinesses.size,
      upgrades: upgrades.size,
      purchases: purchases.size,
      revenue: purchases.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0),
    };
    
    console.log('📊 Daily Metrics Report:', report);
    
    // Guardar reporte
    await db.collection('reports').add({
      type: 'daily-metrics',
      ...report,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    // TODO: Enviar por email a admins
  }
);


