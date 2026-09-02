/**
 * ADMIN PANEL - GESTIÓN DE SOLICITUDES Y NEGOCIOS
 * Nuevo sistema con 3 vistas separadas
 */

'use server';

import { assertAdminToken } from '../../lib/server/authorization';
import {
  MONETIZATION_FEATURE_ENABLED,
  PUBLIC_APPLICATION_V2_ENABLED,
} from '../../lib/featureFlags';
import { getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { serializeTimestamps } from '../../lib/server/serializeFirestore';
import {
  getApplicationAdminQueue,
  resolveLinkedApplicationId,
} from '../../lib/applications/compatibility';
import { 
  type ApplicationStatus, 
  type BusinessStatus,
  updateBusinessState,
} from '../../lib/businessStates';

/**
 * 1️⃣ NUEVAS SOLICITUDES (submitted)
 * Negocios que acaban de completar el wizard
 * EXCLUYE: archived y deleted
 */
export async function getNewSubmissions(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'submitted')
    .where('businessStatus', '==', 'draft')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  // Filtrar archived/deleted en memoria
  const businesses = snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      return adminStatus === 'active' && data.businessStatus !== 'deleted';
    })
    .map(doc => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        ...data,
      });
    });
  
  return businesses;
}

/**
 * Base v2 para la futura bandeja Nuevas. No se conecta al panel visible en 0.2R.1.
 * El status persistido manda; la completitud del perfil no promueve la solicitud.
 */
export async function getNewApplicationV2Submissions(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  if (!PUBLIC_APPLICATION_V2_ENABLED) return [];

  const db = getAdminFirestore();
  const snapshot = await db
    .collection('applications')
    .where('schemaVersion', '==', 2)
    .where('status', '==', 'submitted')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        applicationId: doc.id,
        queue: getApplicationAdminQueue(data),
        ...data,
      });
    })
    .filter((application) => (application as any).queue === 'new');
}

/**
 * 2️⃣ PENDIENTES DEL NEGOCIO (needs_info / draft incompleto)
 * Negocios que necesitan más información o están incompletos
 * EXCLUYE: submitted (están en "Nuevas"), ready_for_review (están en "Listas"), archived y deleted
 */
export async function getPendingBusinesses(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  // Obtener negocios con needs_info o draft con baja completitud
  const snapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'draft')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  // Filtrar para excluir submitted, ready_for_review, archived y deleted
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
      const bizStatus = business.businessStatus;
      const adminStatus = business.adminStatus || 'active';
      
      // ⛔ Excluir deleted y archived
      if (bizStatus === 'deleted' || adminStatus !== 'active') {
        return false;
      }
      
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
 * EXCLUYE: archived y deleted
 */
export async function getReadyForReview(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'ready_for_review')
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();
  
  // Filtrar archived/deleted en memoria
  const businesses = snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      return adminStatus === 'active' && data.businessStatus !== 'deleted';
    })
    .map(doc => {
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
  adminToken: string,
  adminNotes?: string
) {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data() || {};
  
  // Actualizar negocio
  await businessRef.update({
    businessStatus: 'published' as BusinessStatus,
    applicationStatus: 'approved' as ApplicationStatus,
    adminStatus: 'active',
    visibility: 'published', // Hacer visible en directorio público
    isActive: true,
    publishedAt: new Date(),
    lastReviewedAt: new Date(),
    adminNotes: adminNotes || null,
  });
  
  // 🔥 Sincronizar application (crear o actualizar)
  const linkedApplicationId = resolveLinkedApplicationId(data);
  if (linkedApplicationId) {
    try {
      const appRef = db.collection('applications').doc(linkedApplicationId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        // Actualizar existente
        await appRef.update({
          status: 'approved',
          updatedAt: new Date(),
        });
      } else if (data?.applicationSchemaVersion !== 2) {
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
  rejectionReason: string,
  adminToken: string
) {
  await assertAdminToken(adminToken);
  if (!rejectionReason || rejectionReason.trim().length < 10) {
    throw new Error('Debes proporcionar un motivo de rechazo (mínimo 10 caracteres)');
  }
  
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data() || {};
  
  // Actualizar negocio
  await businessRef.update({
    applicationStatus: 'rejected' as ApplicationStatus,
    businessStatus: 'draft' as BusinessStatus,
    rejectionReason,
    lastReviewedAt: new Date(),
    updatedAt: new Date(),
  });
  
  // 🔥 Sincronizar application (crear o actualizar)
  const linkedApplicationId = resolveLinkedApplicationId(data);
  if (linkedApplicationId) {
    try {
      const appRef = db.collection('applications').doc(linkedApplicationId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        await appRef.update({
          status: 'rejected',
          rejectionReason,
          updatedAt: new Date(),
        });
      } else if (data?.applicationSchemaVersion !== 2) {
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
  adminToken: string,
  missingFields?: string[]
) {
  await assertAdminToken(adminToken);
  if (!adminNotes || adminNotes.trim().length < 10) {
    throw new Error('Debes especificar qué información se necesita');
  }
  
  const db = getAdminFirestore();
  
  const businessRef = db.collection('businesses').doc(businessId);
  const snapshot = await businessRef.get();
  
  if (!snapshot.exists) {
    throw new Error('Negocio no encontrado');
  }
  
  const data = snapshot.data() || {};
  
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
  const linkedApplicationId = resolveLinkedApplicationId(data);
  if (linkedApplicationId) {
    try {
      const appRef = db.collection('applications').doc(linkedApplicationId);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        await appRef.update({
          status: 'needs_info',
          adminNotes,
          updatedAt: new Date(),
        });
      } else if (data?.applicationSchemaVersion !== 2) {
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
  reason: string,
  adminToken: string
) {
  await assertAdminToken(adminToken);
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
export async function getAdminStats(adminToken: string) {
  await assertAdminToken(adminToken);
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
export async function recalculateBusinessState(businessId: string, adminToken: string) {
  await assertAdminToken(adminToken);
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
 * EXCLUYE: archived y deleted
 */
export async function getPublishedBusinesses(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('businessStatus', '==', 'published')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  // Filtrar archived/deleted
  return snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      return adminStatus === 'active' && data.businessStatus !== 'deleted';
    })
    .map(doc => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        ...data,
      });
    });
}

/**
 * Obtener negocios rechazados
 * EXCLUYE: archived y deleted
 */
export async function getRejectedBusinesses(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .where('applicationStatus', '==', 'rejected')
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      return adminStatus === 'active' && data.businessStatus !== 'deleted';
    })
    .map(doc => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        ...data,
      });
    });
}

/**
 * Obtener todos los negocios (para tab "Todos")
 * INCLUYE archived (gris) y deleted (informativo)
 * Este tab muestra TODOS los negocios sin filtros
 */
export async function getAllBusinesses(adminToken: string): Promise<any[]> {
  await assertAdminToken(adminToken);
  const db = getAdminFirestore();
  
  const snapshot = await db
    .collection('businesses')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  
  // Tab "Todos" muestra active + archived, pero EXCLUYE deleted
  // Filtrar negocios eliminados (ambos campos por compatibilidad)
  return snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const adminStatus = data.adminStatus || 'active';
      const businessStatus = data.businessStatus;
      
      // Excluir si cualquiera de los dos campos indica deleted
      return adminStatus !== 'deleted' && businessStatus !== 'deleted';
    })
    .map(doc => {
      const data = doc.data();
      return serializeTimestamps({
        id: doc.id,
        ...data,
      });
    });
}

/**
 * ⚠️ ADMIN: BORRADO LÓGICO DE NEGOCIO (override de permisos)
 * 
 * Permite al admin eliminar cualquier negocio sin verificar ownership
 * - Marca businessStatus = 'deleted'
 * - Registra quién (admin) y cuándo eliminó
 * - Negocio desaparece de listados
 * 
 * PRECAUCIÓN: Solo usar cuando sea necesario (ej: contenido inapropiado)
 */
export async function adminDeleteBusiness(
  businessId: string,
  adminToken: string,
  reason?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const decoded = await assertAdminToken(adminToken);
    const db = getAdminFirestore();
    
    // Obtener negocio
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    
    if (!businessSnap.exists) {
      return {
        success: false,
        error: 'Negocio no encontrado',
      };
    }
    
    const businessData = businessSnap.data();
    
    // Verificar si ya está eliminado (ambos campos legacy y nuevo)
    if (businessData?.businessStatus === 'deleted' || businessData?.adminStatus === 'deleted') {
      return {
        success: false,
        error: 'Este negocio ya fue eliminado',
      };
    }
    
    // Borrado lógico - setear AMBOS campos para compatibilidad
    await businessRef.update({
      // Campo legacy (mantener por compatibilidad)
      businessStatus: 'deleted' as BusinessStatus,
      // Campo nuevo canónico (sistema adminStatus)
      adminStatus: 'deleted',
      // Ocultar de directorio público
      visibility: 'hidden',
      // Audit trail
      deletedAt: new Date(),
      deletedBy: decoded.uid,
      adminNotes: reason ? `Admin delete: ${reason}` : 'Eliminado por admin',
      updatedAt: new Date(),
    });
    
    // Sincronizar application
    const linkedApplicationId = resolveLinkedApplicationId(businessData);
    if (linkedApplicationId) {
      try {
        const appRef = db.collection('applications').doc(linkedApplicationId);
        const appSnap = await appRef.get();
        
        if (appSnap.exists) {
          await appRef.update(
            businessData?.applicationSchemaVersion === 2
              ? {
                  status: 'rejected',
                  adminNotes: 'Associated business deleted by admin',
                  updatedAt: new Date(),
                }
              : {
                  status: 'deleted',
                  updatedAt: new Date(),
                },
          );
        }
      } catch (appError) {
        console.warn('[adminDeleteBusiness] Error actualizando application (no crítico):', appError);
      }
    }
    
    return {
      success: true,
      message: 'Negocio eliminado correctamente (admin override)',
    };
    
  } catch (error) {
    console.error('[adminDeleteBusiness] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar negocio',
    };
  }
}

/**
 * 📦 ADMIN: ARCHIVAR NEGOCIO (reversible)
 * 
 * Oculta el negocio del directorio pero lo mantiene recuperable
 * - Establece adminStatus = 'archived'
 * - Si está publicado, cambia visibility = 'hidden'
 * - Registra quién y cuándo archivó
 * - REVERSIBLE: puede desarchivarse después
 * 
 * Casos de uso:
 * - Negocio cerrado temporalmente
 * - Duplicados (mejor que eliminar)
 * - Contenido cuestionable que requiere revisión
 */
export async function adminArchiveBusiness(
  businessId: string,
  adminToken: string,
  reason?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const decoded = await assertAdminToken(adminToken);
    const db = getAdminFirestore();
    
    // Obtener negocio
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    
    if (!businessSnap.exists) {
      return {
        success: false,
        error: 'Negocio no encontrado',
      };
    }
    
    const businessData = businessSnap.data();
    
    // Verificar si ya está archivado
    if (businessData?.adminStatus === 'archived') {
      return {
        success: false,
        error: 'Este negocio ya está archivado',
      };
    }
    
    // Preparar actualización
    const updateData: any = {
      adminStatus: 'archived',
      archivedAt: new Date(),
      archivedBy: decoded.uid,
      updatedAt: new Date(),
    };
    
    // Si tiene razón, agregarla
    if (reason) {
      updateData.archiveReason = reason;
    }
    
    // Si está publicado, ocultar del directorio
    if (businessData?.businessStatus === 'published') {
      updateData.visibility = 'hidden';
    }
    
    // Archivar
    await businessRef.update(updateData);
    
    // Log de auditoría en notas
    const auditLog = `[${new Date().toISOString()}] Archivado por admin (${decoded.email || decoded.uid}). Motivo: ${reason || 'No especificado'}`;
    const existingNotes = businessData?.adminNotes || '';
    await businessRef.update({
      adminNotes: existingNotes + '\n' + auditLog,
    });
    
    return {
      success: true,
      message: 'Negocio archivado correctamente',
    };
    
  } catch (error) {
    console.error('[adminArchiveBusiness] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al archivar negocio',
    };
  }
}

/**
 * 🔄 ADMIN: DESARCHIVAR NEGOCIO
 * 
 * Restaura un negocio archivado
 * - Cambia adminStatus de 'archived' a 'active'
 * - Si estaba publicado, restaura visibility = 'published'
 */
export async function adminUnarchiveBusiness(
  businessId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const decoded = await assertAdminToken(adminToken);
    const db = getAdminFirestore();
    
    const businessRef = db.collection('businesses').doc(businessId);
    const businessSnap = await businessRef.get();
    
    if (!businessSnap.exists) {
      return {
        success: false,
        error: 'Negocio no encontrado',
      };
    }
    
    const businessData = businessSnap.data();
    
    if (businessData?.adminStatus !== 'archived') {
      return {
        success: false,
        error: 'Este negocio no está archivado',
      };
    }
    
    const updateData: any = {
      adminStatus: 'active',
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      updatedAt: new Date(),
    };
    
    // Si estaba publicado antes, restaurar visibilidad
    if (businessData?.businessStatus === 'published') {
      updateData.visibility = 'published';
    }
    
    await businessRef.update(updateData);
    
    // Log de auditoría
    const auditLog = `[${new Date().toISOString()}] Desarchivado por admin (${decoded.email || decoded.uid})`;
    const existingNotes = businessData?.adminNotes || '';
    await businessRef.update({
      adminNotes: existingNotes + '\n' + auditLog,
    });
    
    return {
      success: true,
      message: 'Negocio desarchivado correctamente',
    };
    
  } catch (error) {
    console.error('[adminUnarchiveBusiness] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desarchivar negocio',
    };
  }
}

/**
 * 🔗 ADMIN: MARCAR COMO DUPLICADO
 * 
 * Marca un negocio como duplicado de otro (canonical)
 * - Establece duplicateOf = canonicalBusinessId
 * - Archiva automáticamente el duplicado
 * - El negocio canonical sigue activo
 * 
 * Proceso recomendado para duplicados:
 * 1. Identificar negocio canonical (el mejor / más completo)
 * 2. Marcar otros como duplicados del canonical
 * 3. Los duplicados se archivan automáticamente
 */
export async function adminMarkDuplicate(
  businessId: string,
  canonicalBusinessId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const decoded = await assertAdminToken(adminToken);
    const db = getAdminFirestore();
    
    // Validar que no sean el mismo negocio
    if (businessId === canonicalBusinessId) {
      return {
        success: false,
        error: 'Un negocio no puede ser duplicado de sí mismo',
      };
    }
    
    // Verificar que ambos negocios existan
    const businessRef = db.collection('businesses').doc(businessId);
    const canonicalRef = db.collection('businesses').doc(canonicalBusinessId);
    
    const [businessSnap, canonicalSnap] = await Promise.all([
      businessRef.get(),
      canonicalRef.get(),
    ]);
    
    if (!businessSnap.exists) {
      return {
        success: false,
        error: 'Negocio no encontrado',
      };
    }
    
    if (!canonicalSnap.exists) {
      return {
        success: false,
        error: 'Negocio canonical no encontrado',
      };
    }
    
    const canonicalData = canonicalSnap.data();
    const businessData = businessSnap.data();
    
    // Actualizar negocio duplicado
    await businessRef.update({
      duplicateOf: canonicalBusinessId,
      adminStatus: 'archived',
      archivedAt: new Date(),
      archivedBy: decoded.uid,
      archiveReason: `Duplicado de: ${canonicalData?.name || canonicalBusinessId}`,
      visibility: 'hidden', // Ocultar del directorio
      updatedAt: new Date(),
    });
    
    // Log de auditoría
    const auditLog = `[${new Date().toISOString()}] Marcado como duplicado de "${canonicalData?.name}" (${canonicalBusinessId}) por admin (${decoded.email || decoded.uid})`;
    const existingNotes = businessData?.adminNotes || '';
    await businessRef.update({
      adminNotes: existingNotes + '\n' + auditLog,
    });
    
    return {
      success: true,
      message: `Negocio marcado como duplicado de "${canonicalData?.name}"`,
    };
    
  } catch (error) {
    console.error('[adminMarkDuplicate] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al marcar duplicado',
    };
  }
}

/**
 * 🆕 ALTA ASISTIDA - Crear negocio desde admin
 * Crea un negocio con estado ready_for_review para que caiga en "Listas para publicar"
 */
export async function createAssistedBusiness(
  businessData: {
    name: string;
    phone: string;
    WhatsApp: string;
    categoryId: string;
    colonia?: string;
    neighborhood?: string;
    sourceChannel: 'whatsapp' | 'messenger' | 'visita' | 'telefono' | 'otro';
    plan?: 'free' | 'featured' | 'sponsor';
    internalNote?: string;
  },
  authToken: string
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  try {
    const decoded = await assertAdminToken(authToken);

    const db = getAdminFirestore();
    const { resolveCategory } = await import('../../lib/categoriesCatalog');
    
    // Resolver categoría
    const category = resolveCategory(businessData.categoryId);
    
    // Crear documento de negocio
    const newBusinessRef = db.collection('businesses').doc();
    const now = new Date();
    
    const business = {
      // Datos básicos
      name: businessData.name,
      phone: businessData.phone,
      WhatsApp: businessData.WhatsApp,
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryGroupId: category.groupId,
      colonia: businessData.colonia || null,
      neighborhood: businessData.neighborhood || null,
      
      // La infraestructura comercial se conserva, pero no puede activarse con el kill switch apagado.
      plan: MONETIZATION_FEATURE_ENABLED ? businessData.plan || 'free' : 'free',
      featured:
        MONETIZATION_FEATURE_ENABLED &&
        (businessData.plan === 'featured' || businessData.plan === 'sponsor'),
      
      // Estados del sistema dual
      businessStatus: 'draft' as BusinessStatus,
      applicationStatus: 'ready_for_review' as ApplicationStatus,
      isPublishReady: true,
      completionPercent: 60, // Mínimo requerido
      
      // Metadata de creación asistida
      createdVia: 'admin_assisted',
      createdByAdminId: decoded.uid,
      createdByAdminEmail: decoded.email || null,
      createdByAdminAt: now,
      sourceChannel: businessData.sourceChannel,
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      submittedForReviewAt: now, // Ya está listo para revisión
      submittedForReviewBy: decoded.uid,
      
      // Admin status
      adminStatus: 'active',
      visibility: 'hidden', // Oculto hasta que se publique
      
      // Notas internas
      adminNotes: businessData.internalNote 
        ? `[ALTA ASISTIDA por ${decoded.email || decoded.uid}]\n${businessData.internalNote}`
        : `[ALTA ASISTIDA por ${decoded.email || decoded.uid}]`,
      
      // Campos faltantes (para que el admin complete después)
      missingFields: [
        'description',
        'address',
        'location',
        'hours',
        'logoUrl',
      ],
    };
    
    await newBusinessRef.set(business);
    
    return {
      success: true,
      businessId: newBusinessRef.id,
    };
    
  } catch (error) {
    console.error('[createAssistedBusiness] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear alta asistida',
    };
  }
}

