/**
 * ADMIN PANEL - GESTIÓN DE SOLICITUDES Y NEGOCIOS
 * Nuevo sistema con 3 vistas separadas
 */

'use server';

import { getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { serializeTimestamps } from '../../lib/server/serializeFirestore';
import { 
  type ApplicationStatus, 
  type BusinessStatus,
  computeProfileCompletion,
  updateBusinessState,
} from '../../lib/businessStates';

/**
 * 1️⃣ NUEVAS SOLICITUDES (submitted)
 * Negocios que acaban de completar el wizard
 */
export async function getNewSubmissions(): Promise<any[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'submitted')
    .where('businessStatus', '==', 'draft')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  const businesses = snapshot.docs.map(doc => {
    const data = doc.data();
    return serializeTimestamps({
      id: doc.id,
      ...data,
    });
  });
  
  return businesses;
}

/**
 * 2️⃣ PENDIENTES DEL NEGOCIO (needs_info / draft incompleto)
 * Negocios que necesitan más información o están incompletos
 * EXCLUYE: submitted (están en "Nuevas") y ready_for_review (están en "Listas")
 */
export async function getPendingBusinesses(): Promise<any[]> {
  const db = getAdminFirestore();
  
  // Obtener negocios con needs_info o draft con baja completitud
  const snapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'draft')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  // Filtrar para excluir submitted y ready_for_review
  const businesses = snapshot.docs
    .map(doc => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        ...data,
      });
    })
    .filter(biz => {
      const business = biz as any;
      const appStatus = business.applicationStatus;
      
      // Excluir submitted (van a Nuevas) y ready_for_review (van a Listas)
      if (appStatus === 'submitted' || appStatus === 'ready_for_review') {
        return false;
      }
      
      // Incluir needs_info O incompletos
      return (
        appStatus === 'needs_info' ||
        (business.completionPercent || 0) < 100 ||
        !business.isPublishReady
      );
    });
  
  return businesses;
}

/**
 * 3️⃣ LISTOS PARA PUBLICAR (ready_for_review + in_review)
 * Negocios que cumplen requisitos y están esperando aprobación
 */
export async function getReadyForReview(): Promise<any[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'ready_for_review')
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  
  const businesses = snapshot.docs.map(doc => {
    const data = doc.data();
    return serializeTimestamps({
      id: doc.id,
      ...data,
    });
  });
  
  return businesses;
}

/**
 * ACCIÓN: APROBAR NEGOCIO
 * Admin aprueba y publica el negocio
 */
export async function approveBusiness(
  businessId: string,
  adminNotes?: string
) {
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data();
  
  // Actualizar negocio
  await businessRef.update({
    businessStatus: 'published' as BusinessStatus,
    applicationStatus: 'approved' as ApplicationStatus,
    publishedAt: new Date(),
    lastReviewedAt: new Date(),
    adminNotes: adminNotes || null,
  });
  
  // 🔥 Sincronizar application (crear o actualizar)
  if (data?.ownerId) {
    try {
      const appRef = db.collection('applications').doc(data.ownerId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        // Actualizar existente
        await appRef.update({
          status: 'approved',
          updatedAt: new Date(),
        });
      } else {
        // Crear nuevo documento
        await appRef.set({
          businessId: businessId,
          businessName: data.name || 'Negocio sin nombre',
          ownerEmail: data.ownerEmail || '',
          ownerId: data.ownerId,
          status: 'approved',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (appError) {
      console.warn('[approveBusiness] Error sincronizando application (no crítico):', appError);
    }
  }
  
  // TODO: Enviar notificación al owner (WhatsApp/Email)
  
  return { success: true, message: 'Negocio aprobado y publicado' };
}

/**
 * ACCIÓN: RECHAZAR NEGOCIO
 * Admin rechaza la solicitud con motivo
 */
export async function rejectBusiness(
  businessId: string,
  rejectionReason: string
) {
  if (!rejectionReason || rejectionReason.trim().length < 10) {
    throw new Error('Debes proporcionar un motivo de rechazo (mínimo 10 caracteres)');
  }
  
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data();
  
  // Actualizar negocio
  await businessRef.update({
    applicationStatus: 'rejected' as ApplicationStatus,
    businessStatus: 'draft' as BusinessStatus,
    rejectionReason,
    lastReviewedAt: new Date(),
    updatedAt: new Date(),
  });
  
  // 🔥 Sincronizar application (crear o actualizar)
  if (data?.ownerId) {
    try {
      const appRef = db.collection('applications').doc(data.ownerId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        await appRef.update({
          status: 'rejected',
          rejectionReason,
          updatedAt: new Date(),
        });
      } else {
        await appRef.set({
          businessId: businessId,
          businessName: data.name || 'Negocio sin nombre',
          ownerEmail: data.ownerEmail || '',
          ownerId: data.ownerId,
          status: 'rejected',
          rejectionReason,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (appError) {
      console.warn('[rejectBusiness] Error sincronizando application (no crítico):', appError);
    }
  }
  
  // TODO: Enviar notificación al owner (WhatsApp/Email)
  
  return { success: true, message: 'Negocio rechazado' };
}

/**
 * ACCIÓN: SOLICITAR MÁS INFORMACIÓN
 * Admin solicita cambios o más datos
 */
export async function requestMoreInfo(
  businessId: string,
  adminNotes: string,
  missingFields?: string[]
) {
  if (!adminNotes || adminNotes.trim().length < 10) {
    throw new Error('Debes especificar qué información se necesita');
  }
  
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data();
  
  // Actualizar negocio
  await businessRef.update({
    applicationStatus: 'needs_info' as ApplicationStatus,
    businessStatus: 'draft' as BusinessStatus,
    adminNotes,
    missingFields: missingFields || [],
    lastReviewedAt: new Date(),
    updatedAt: new Date(),
  });
  
  // 🔥 Sincronizar application (crear o actualizar)
  if (data?.ownerId) {
    try {
      const appRef = db.collection('applications').doc(data.ownerId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        await appRef.update({
          status: 'needs_info',
          adminNotes,
          updatedAt: new Date(),
        });
      } else {
        await appRef.set({
          businessId: businessId,
          businessName: data.name || 'Negocio sin nombre',
          ownerEmail: data.ownerEmail || '',
          ownerId: data.ownerId,
          status: 'needs_info',
          adminNotes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (appError) {
      console.warn('[requestMoreInfo] Error sincronizando application (no crítico):', appError);
    }
  }
  
  // TODO: Enviar notificación al owner (WhatsApp/Email)
  
  return { success: true, message: 'Solicitud de información enviada' };
}

/**
 * ACCIÓN: DESPUBLICAR NEGOCIO
 * Admin despublica un negocio ya publicado
 */
export async function unpublishBusiness(
  businessId: string,
  reason: string
) {
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  // Actualizar negocio
  await businessRef.update({
    businessStatus: 'draft' as BusinessStatus,
    applicationStatus: 'needs_info' as ApplicationStatus,
    adminNotes: `Despublicado: ${reason}`,
    unpublishedAt: new Date(),
    updatedAt: new Date(),
  });
  
  return { success: true, message: 'Negocio despublicado' };
}

/**
 * OBTENER ESTADÍSTICAS DEL PANEL ADMIN
 */
export async function getAdminStats() {
  const db = getAdminFirestore();
  
  const [newSubmissions, pending, readyForReview, published] = await Promise.all([
    db.collection('businesses').where('applicationStatus', '==', 'submitted').count().get(),
    db.collection('businesses').where('applicationStatus', '==', 'needs_info').count().get(),
    db.collection('businesses').where('applicationStatus', '==', 'ready_for_review').count().get(),
    db.collection('businesses').where('businessStatus', '==', 'published').count().get(),
  ]);
  
  return {
    newSubmissions: newSubmissions.data().count,
    pending: pending.data().count,
    readyForReview: readyForReview.data().count,
    published: published.data().count,
  };
}

/**
 * RECALCULAR ESTADO DE UN NEGOCIO
 * Útil para migración o corrección
 */
export async function recalculateBusinessState(businessId: string) {
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data();
  if (!data) {
    throw new Error('Datos del negocio no disponibles');
  }
  
  // Recalcular estado
  const stateUpdate = updateBusinessState(data as any);
  
  // Actualizar en Firestore
  await businessRef.update({
    completionPercent: stateUpdate.completionPercent,
    isPublishReady: stateUpdate.isPublishReady,
    missingFields: stateUpdate.missingFields,
    applicationStatus: stateUpdate.applicationStatus,
    updatedAt: new Date(),
  });
  
  return {
    success: true,
    completionPercent: stateUpdate.completionPercent,
    isPublishReady: stateUpdate.isPublishReady,
    applicationStatus: stateUpdate.applicationStatus,
  };
}

/**
 * Obtener negocios publicados
 */
/**
 * 4️⃣ PUBLICADOS
 * Negocios aprobados y visibles públicamente
 */
export async function getPublishedBusinesses(): Promise<any[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'published')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return serializeTimestamps({
      id: doc.id,
      ...data,
    });
  });
}

/**
 * Obtener negocios rechazados
 */
export async function getRejectedBusinesses(): Promise<any[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'rejected')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return serializeTimestamps({
      id: doc.id,
      ...data,
    });
  });
}

/**
 * Obtener todos los negocios (para tab "Todos")
 */
export async function getAllBusinesses(): Promise<any[]> {
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return serializeTimestamps({
      id: doc.id,
      ...data,
    });
  });
}
