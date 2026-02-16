/**
 * Server Action mejorada para registro de negocios
 * 
 * CAMBIOS PRINCIPALES:
 * 1. Crea el business INMEDIATAMENTE (no espera aprobación)
 * 2. businessStatus = 'draft'
 * 3. applicationStatus = 'submitted' (auto-actualiza a ready_for_review si cumple requisitos)
 * 4. Calcula completionPercent automáticamente
 * 5. Retorna businessId para redirección inmediata
 */

'use server';

import { z } from 'zod';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { 
  updateBusinessState, 
  type ApplicationStatus, 
  type BusinessStatus 
} from '../../lib/businessStates';
import { resolveCategory } from '../../lib/categoriesCatalog';

const createBusinessSchema = z.object({
  token: z.string().min(1, 'Missing auth token'),
  formPayload: z.string().min(2, 'Missing form data JSON'),
  mode: z.enum(['new', 'default']).optional(), // 'new' = forzar nuevo negocio sin dedupe
});

type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
type HorarioDia = { abierto: boolean; desde: string; hasta: string };
type HorariosSemana = Partial<Record<DayKey, HorarioDia>>;

const weekdays: DayKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// Helpers (mantener los del archivo original)
function asString(value: unknown, max = 500): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.length > max ? str.slice(0, max) : str;
}

function toArrayFromComma(value: unknown, maxItems = 30): string[] {
  const str = asString(value, 2000);
  if (!str) return [];
  return str
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseLatLng(value: unknown): number | null {
  const str = asString(value, 50);
  if (!str) return null;
  const parsed = Number(str.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHorarios(value: unknown): HorariosSemana {
  const normalized: HorariosSemana = {};
  if (typeof value !== 'object' || value === null) return normalized;
  const obj = value as Record<string, any>;
  weekdays.forEach((key) => {
    const raw = obj[key];
    if (!raw || typeof raw !== 'object') return;
    const abierto = Boolean(raw.abierto);
    const desde = /^[0-2]\d:[0-5]\d$/.test(asString(raw.desde, 5)) ? raw.desde : '08:00';
    const hasta = /^[0-2]\d:[0-5]\d$/.test(asString(raw.hasta, 5)) ? raw.hasta : '18:00';
    normalized[key] = { abierto, desde, hasta };
  });
  return normalized;
}

function coerceStringArray(value: unknown, allowed?: string[], maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((entry) => asString(entry, 100))
    .filter(Boolean);
  const filtered = allowed?.length ? items.filter((item) => allowed.includes(item)) : items;
  return Array.from(new Set(filtered)).slice(0, maxItems);
}

/**
 * Crea un nuevo negocio inmediatamente después de completar el wizard
 * NO espera aprobación del admin
 * 
 * @param formData - Datos del formulario del wizard
 * @returns { businessId, completionPercent, isPublishReady, redirectUrl }
 */
export async function createBusinessImmediately(formData: FormData) {
  try {
    const parsed = createBusinessSchema.parse({
      token: formData.get('token'),
      formPayload: formData.get('formData'),
      mode: formData.get('mode') || 'default',
    });

    const payload = JSON.parse(parsed.formPayload) as Record<string, unknown>;
    const isNewBusinessMode = parsed.mode === 'new';
    
    // Verificar auth
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(parsed.token);
    const db = getAdminFirestore();
    
    // ✅ VALIDACIÓN DE DUPLICADOS: Solo si NO es modo "new"
    // Si mode=new, permitir crear múltiples negocios del mismo owner
    if (!isNewBusinessMode) {
      const existingBusinessQuery = await db
        .collection('businesses')
        .where('ownerId', '==', decoded.uid)
        .limit(1)
        .get();
      
      if (!existingBusinessQuery.empty) {
        const existingBusiness = existingBusinessQuery.docs[0];
        const existingData = existingBusiness.data();
        
        return {
          success: true,
          businessId: existingBusiness.id,
          completionPercent: existingData.completionPercent || 0,
          isPublishReady: existingData.isPublishReady || false,
          missingFields: existingData.missingFields || [],
          redirectUrl: `/dashboard/${existingBusiness.id}`,
          isDuplicate: true,
          message: 'Ya tienes un negocio registrado. Te redirigiremos a tu dashboard.',
        };
      }
    }
    
    // Normalizar datos
    const businessName = asString(payload.businessName ?? 'Negocio sin nombre', 140);
    const ownerName = asString(payload.ownerName ?? decoded.name ?? '', 140);
    const ownerEmail = asString(payload.ownerEmail ?? decoded.email ?? '', 200).toLowerCase();
    const ownerPhone = asString(payload.ownerPhone ?? '', 30);
    const description = asString(payload.description, 2000);
    const resolvedCategory = resolveCategory(
      asString(payload.categoryId ?? payload.category ?? payload.categoryName ?? '', 120)
    );
    const category = resolvedCategory.categoryName;
    const tags = toArrayFromComma(payload.tags, 30);
    const address = asString(payload.address ?? '', 400);
    const colonia = asString(payload.colonia ?? '', 140);
    const municipio = asString(payload.municipio ?? '', 140);
    const lat = parseLatLng(payload.lat);
    const lng = parseLatLng(payload.lng);
    const phone = asString(payload.phone ?? '', 30);
    const whatsapp = asString(payload.whatsapp ?? '', 30);
    const emailContact = asString(payload.emailContact ?? '', 140);
    const facebookPage = asString(payload.facebookPage ?? '', 200);
    const instagramUser = asString(payload.instagramUser ?? '', 200);
    const website = asString(payload.website ?? '', 200);
    const logoUrl = asString(payload.logoUrl ?? '', 400);
    const coverPhoto = asString(payload.coverPhoto ?? '', 400);
    const gallery = toArrayFromComma(payload.gallery, 50);
    const videoPromoUrl = asString(payload.videoPromoUrl ?? '', 400);
    const horarios = normalizeHorarios(payload.horarios);
    const metodoPago = coerceStringArray(payload.metodoPago);
    const servicios = coerceStringArray(payload.servicios);
    const priceRange = asString(payload.priceRange ?? '', 10);
    const promocionesActivas = asString(payload.promocionesActivas ?? '', 500);
    
    // Construir objeto business
    const businessData: Record<string, unknown> = {
      name: businessName,
      ownerId: decoded.uid,
      ownerEmail,
      ownerName,
      ownerPhone,
      description,
      category,
      categoryId: resolvedCategory.categoryId,
      categoryName: resolvedCategory.categoryName,
      categoryGroupId: resolvedCategory.groupId,
      tags,
      address,
      colonia,
      municipio,
      phone,
      WhatsApp: whatsapp,
      emailContact,
      Facebook: facebookPage,
      Instagram: instagramUser,
      website,
      logoUrl,
      coverUrl: coverPhoto,
      images: gallery.map(url => ({ url, publicId: '' })),
      videoPromoUrl,
      horarios,
      metodoPago,
      servicios,
      priceRange,
      promocionesActivas,
      
      // NUEVOS CAMPOS DE ESTADO
      businessStatus: 'draft' as BusinessStatus,
      applicationStatus: 'submitted' as ApplicationStatus,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Plan
      plan: 'free',
      featured: false,
      isActive: true,
    };

    // Agregar location si existe
    if (lat != null && lng != null) {
      businessData.location = { lat, lng };
      businessData.lat = lat;
      businessData.lng = lng;
    }

    // Calcular completitud y estado
    const stateUpdate = updateBusinessState(businessData);
    businessData.completionPercent = stateUpdate.completionPercent;
    businessData.isPublishReady = stateUpdate.isPublishReady;
    businessData.missingFields = stateUpdate.missingFields;
    businessData.applicationStatus = stateUpdate.applicationStatus;

    // Crear el negocio en Firestore
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;
    
    await businessRef.set({
      ...businessData,
      id: businessId,
    });

    // También guardar en applications para tracking
    await db.collection('applications').doc(decoded.uid).set({
      businessId,
      businessName,
      ownerName,
      ownerEmail,
      ownerPhone,
      category,
      categoryId: resolvedCategory.categoryId,
      categoryName: resolvedCategory.categoryName,
      categoryGroupId: resolvedCategory.groupId,
      status: stateUpdate.applicationStatus,
      completionPercent: stateUpdate.completionPercent,
      isPublishReady: stateUpdate.isPublishReady,
      missingFields: stateUpdate.missingFields,
      formData: payload,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: decoded.uid,
    }, { merge: true });

    // Enviar notificación WhatsApp (si está configurado)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/notify/wizard-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parsed.token}`,
        },
        body: JSON.stringify({
          businessId,
          businessName,
          category,
          phone,
          ownerName,
          ownerEmail,
        }),
      }).catch(err => console.warn('[WhatsApp notification failed]', err));
    } catch (error) {
      console.warn('[WhatsApp notification error]', error);
    }

    // Retornar datos para redirección
    return {
      success: true,
      businessId,
      completionPercent: stateUpdate.completionPercent,
      isPublishReady: stateUpdate.isPublishReady,
      missingFields: stateUpdate.missingFields,
      redirectUrl: `/dashboard/${businessId}`,
    };

  } catch (error) {
    console.error('[createBusinessImmediately] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el negocio',
    };
  }
}

/**
 * Actualiza el estado de un negocio (cuando el usuario edita)
 */
export async function updateBusinessWithState(
  businessId: string,
  updates: Record<string, unknown>,
  token: string
) {
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminFirestore();
    
    const businessRef = db.collection('businesses').doc(businessId);
    const snapshot = await businessRef.get();
    
    if (!snapshot.exists) {
      throw new Error('Negocio no encontrado');
    }
    
    const currentData = snapshot.data() as Record<string, unknown>;
    
    // Verificar ownership
    if (currentData.ownerId !== decoded.uid) {
      throw new Error('No tienes permisos para editar este negocio');
    }
    
    // Verificar que pueda editar (solo draft o in_review)
    const currentStatus = currentData.businessStatus as BusinessStatus;
    if (currentStatus === 'published') {
      throw new Error('No puedes editar un negocio publicado. Contacta al administrador.');
    }
    
    // Merge updates
    if (updates.category || (updates as any).categoryId || (updates as any).categoryName) {
      const resolved = resolveCategory(
        asString((updates as any).categoryId ?? (updates as any).categoryName ?? updates.category ?? '', 120)
      );
      updates.category = resolved.categoryName;
      (updates as any).categoryId = resolved.categoryId;
      (updates as any).categoryName = resolved.categoryName;
      (updates as any).categoryGroupId = resolved.groupId;
    }
    const updatedData = { ...currentData, ...updates };
    
    // Recalcular estado
    const stateUpdate = updateBusinessState(updatedData);
    
    // Guardar
    await businessRef.update({
      ...updates,
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
    
  } catch (error) {
    console.error('[updateBusinessWithState] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar',
    };
  }
}

/**
 * Usuario solicita publicación (click en "Publicar mi negocio")
 */
export async function requestPublish(businessId: string, token: string) {
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminFirestore();
    
    const businessRef = db.collection('businesses').doc(businessId);
    const snapshot = await businessRef.get();
    
    if (!snapshot.exists) {
      throw new Error('Negocio no encontrado');
    }
    
    const businessData = snapshot.data() as Record<string, unknown>;
    
    // Verificar ownership
    if (businessData.ownerId !== decoded.uid) {
      throw new Error('No tienes permisos');
    }
    
    // 🔥 CRÍTICO: Recalcular estado antes de verificar
    const freshStateUpdate = updateBusinessState(businessData);
    await businessRef.set(freshStateUpdate, { merge: true });
    
    // Obtener datos frescos después de recalcular
    const freshSnapshot = await businessRef.get();
    const freshData = freshSnapshot.data() as Record<string, unknown>;
    
    // Verificar que esté listo
    const { isPublishReady, missingFields } = freshStateUpdate;
    if (!isPublishReady) {
      return {
        success: false,
        error: 'Tu negocio aún no cumple los requisitos mínimos',
        missingFields,
      };
    }
    
    // Cambiar a ready_for_review (listo para que admin apruebe)
    await businessRef.update({
      businessStatus: 'draft' as BusinessStatus, // Mantiene draft hasta aprobación
      applicationStatus: 'ready_for_review' as ApplicationStatus,
      updatedAt: new Date(),
      submittedForReviewAt: new Date(),
      submittedForReviewBy: decoded.uid,
      lastReviewRequestedAt: new Date(),
    });
    
    // Sincronizar application (crear o actualizar)
    try {
      const appRef = db.collection('applications').doc(decoded.uid);
      const appSnap = await appRef.get();
      
      if (appSnap.exists) {
        // Actualizar existente
        await appRef.update({
          status: 'ready_for_review',
          businessId: businessId,
          updatedAt: new Date(),
        });
      } else {
        // Crear nuevo documento de application
        await appRef.set({
          businessId: businessId,
          businessName: freshData.name || 'Negocio sin nombre',
          ownerEmail: decoded.email || freshData.ownerEmail,
          ownerId: decoded.uid,
          status: 'ready_for_review',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (appError) {
      console.warn('[requestPublish] Error actualizando application (no crítico):', appError);
      // No fallar si la actualización de applications falla
    }
    
    // Notificar admin (Slack + WhatsApp)
    try {
      const notifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notify-business-review`;
      await fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: businessId,
          businessName: freshData.name || 'Negocio sin nombre',
        }),
      });
    } catch (notifyError) {
      console.warn('[requestPublish] Error al notificar (no crítico):', notifyError);
      // No fallar si la notificación falla
    }
    
    return {
      success: true,
      message: '¡Tu negocio ha sido enviado a revisión! Te notificaremos cuando sea aprobado.',
    };
    
  } catch (error) {
    console.error('[requestPublish] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al solicitar publicación',
    };
  }
}

/**
 * ⚠️ BORRADO LÓGICO DE NEGOCIO (owner)
 * 
 * Marca el negocio como borrado (no elimina físicamente datos)
 * - Verifica que el usuario sea el owner
 * - Establece businessStatus = 'deleted'
 * - Registra timestamp y usuario
 * - El negocio desaparece de listados públicos y admin
 * 
 * TODO: Implementar cleanup de assets (logo/cover) si es necesario
 */
export async function deleteBusiness(
  businessId: string,
  token: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();
    
    // Verificar token
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (authError) {
      console.error('[deleteBusiness] Token inválido:', authError);
      return {
        success: false,
        error: 'No autorizado. Inicia sesión nuevamente.',
      };
    }
    
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
    
    // Verificar ownership
    if (businessData?.ownerId !== decoded.uid) {
      console.error('[deleteBusiness] Usuario no es owner:', {
        ownerId: businessData?.ownerId,
        userId: decoded.uid,
      });
      return {
        success: false,
        error: 'No tienes permiso para eliminar este negocio',
      };
    }
    
    // Verificar si ya está eliminado
    if (businessData?.businessStatus === 'deleted') {
      return {
        success: false,
        error: 'Este negocio ya fue eliminado',
      };
    }
    
    // Borrado lógico
    await businessRef.update({
      businessStatus: 'deleted' as BusinessStatus,
      deletedAt: new Date(),
      deletedBy: decoded.uid,
      updatedAt: new Date(),
    });
    
    // Sincronizar application
    if (businessData?.ownerId) {
      try {
        const appRef = db.collection('applications').doc(businessData.ownerId);
        const appSnap = await appRef.get();
        
        if (appSnap.exists) {
          await appRef.update({
            status: 'deleted',
            updatedAt: new Date(),
          });
        }
      } catch (appError) {
        console.warn('[deleteBusiness] Error actualizando application (no crítico):', appError);
      }
    }
    
    // TODO: Cleanup de assets (logo/cover/gallery)
    // Si tienes un helper para borrar de Cloud Storage, invocarlo aquí
    // Ejemplo:
    // if (businessData?.logoUrl) await deleteImageFromStorage(businessData.logoUrl);
    // if (businessData?.coverUrl) await deleteImageFromStorage(businessData.coverUrl);
    
    return {
      success: true,
      message: 'Negocio eliminado correctamente',
    };
    
  } catch (error) {
    console.error('[deleteBusiness] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar negocio',
    };
  }
}
