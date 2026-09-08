import { isPublishReady } from '../businessStates';

type FirestoreDb = ReturnType<typeof import('./firebaseAdmin').getAdminFirestore>;

export type BusinessReviewTransitionResult = {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  missingFields?: string[];
  notification?: {
    acquired: boolean;
    reference: FirebaseFirestore.DocumentReference;
    businessName: string;
  };
};

const safeLabel = (value: unknown, fallback: string, maxLength: number) => {
  const clean = String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[dato omitido]')
    .replace(/(?:\+?\d[\s().-]*){7,}/g, '[dato omitido]')
    .replace(/https?:\/\/\S+/gi, '[enlace omitido]')
    .replace(/\s+/g, ' ')
    .trim();
  return (clean || fallback).slice(0, maxLength);
};

export async function submitBusinessForReview(
  db: FirestoreDb,
  businessId: string,
  ownerUid: string,
): Promise<BusinessReviewTransitionResult> {
  const businessRef = db.doc(`businesses/${businessId}`);

  return db.runTransaction(async (transaction) => {
    const businessSnap = await transaction.get(businessRef);
    if (!businessSnap.exists) return { success: false, error: 'Negocio no encontrado' };

    const business = businessSnap.data() as Record<string, any>;
    if (business.ownerId !== ownerUid) {
      return { success: false, error: 'No tienes permisos para enviar este negocio' };
    }

    const currentStatus = business.businessStatus ??
      (business.status === 'published' ? 'published' : 'draft');
    if (currentStatus === 'in_review') {
      return { success: true, idempotent: true };
    }
    if (currentStatus !== 'draft') {
      return { success: false, error: 'Sólo un borrador puede enviarse a revisión' };
    }

    const readiness = isPublishReady(business);
    if (!readiness.ready) {
      return {
        success: false,
        error: 'Completa los campos obligatorios antes de enviar a revisión',
        missingFields: readiness.missingFields,
      };
    }

    const reviewVersion = Number.isSafeInteger(business.reviewSubmissionVersion)
      ? business.reviewSubmissionVersion + 1
      : 1;
    const deliveryRef = db.doc(
      `notificationDeliveries/business-review-submitted-${businessId}-${reviewVersion}`,
    );
    const deliverySnap = await transaction.get(deliveryRef);
    if (deliverySnap.exists) {
      return { success: false, error: 'No se pudo reservar la notificación de revisión' };
    }

    const now = new Date();
    transaction.update(businessRef, {
      businessStatus: 'in_review',
      applicationStatus: 'ready_for_review',
      visibility: 'hidden',
      isActive: false,
      submittedForReviewAt: now,
      submittedForReviewBy: ownerUid,
      lastReviewRequestedAt: now,
      reviewSubmissionVersion: reviewVersion,
      updatedAt: now,
    });
    transaction.create(deliveryRef, {
      source: 'business-review-submitted',
      businessId,
      reviewVersion,
      status: 'processing',
      createdAt: now,
    });

    return {
      success: true,
      notification: {
        acquired: true,
        reference: deliveryRef,
        businessName: safeLabel(business.name ?? business.businessName, 'Sin nombre', 140),
      },
    };
  });
}

export async function deliverBusinessReviewTelegram(input: {
  reference: FirebaseFirestore.DocumentReference;
  businessId: string;
  businessName: string;
  fetchImpl?: typeof fetch;
}) {
  const enabled = process.env.TELEGRAM_APPLICATION_ALERTS_ENABLED === 'true';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!enabled || !botToken || !chatId) {
    await input.reference.set({ status: 'skipped', completedAt: new Date() }, { merge: true });
    return { sent: false, skipped: true };
  }

  const panelUrl = new URL(
    '/admin/pending-businesses',
    process.env.NEXT_PUBLIC_BASE_URL || 'https://www.yajagon.com',
  );
  panelUrl.searchParams.set('businessId', input.businessId);
  const response = await (input.fetchImpl ?? fetch)(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: [
          'Negocio listo para revisión',
          `Negocio: ${safeLabel(input.businessName, 'Sin nombre', 140)}`,
          `ID: ${safeLabel(input.businessId, 'Sin ID', 80)}`,
        ].join('\n'),
        protect_content: true,
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [[{ text: 'Revisar negocio', url: panelUrl.toString() }]],
        },
      }),
    },
  );

  const sent = response.ok && ((await response.json()) as { ok?: boolean }).ok === true;
  await input.reference.set(
    { status: sent ? 'sent' : 'failed', completedAt: new Date() },
    { merge: true },
  );
  return { sent, skipped: false };
}

export async function reviewExistingBusiness(input: {
  db: FirestoreDb;
  businessId: string;
  adminUid: string;
  action: 'approve' | 'reject';
  notes?: string;
  missingFields?: string[];
}) {
  const businessRef = input.db.doc(`businesses/${input.businessId}`);
  return input.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(businessRef);
    if (!snapshot.exists) throw new Error('Negocio no encontrado');
    const business = snapshot.data() as Record<string, any>;
    if (business.businessStatus !== 'in_review') {
      throw new Error('El negocio ya no está en revisión');
    }

    const now = new Date();
    if (input.action === 'approve') {
      transaction.update(businessRef, {
        // Espejo legacy necesario para consumidores v1; businessStatus es canónico.
        status: 'published',
        businessStatus: 'published',
        applicationStatus: 'approved',
        adminStatus: 'active',
        visibility: 'published',
        isActive: true,
        publishedAt: now,
        lastReviewedAt: now,
        publishedBy: input.adminUid,
        adminNotes: input.notes?.trim() || null,
        missingFields: input.missingFields ?? business.missingFields ?? [],
        updatedAt: now,
      });
    } else {
      transaction.update(businessRef, {
        status: 'draft',
        businessStatus: 'draft',
        applicationStatus: 'needs_info',
        visibility: 'hidden',
        isActive: false,
        rejectedAt: now,
        rejectedBy: input.adminUid,
        rejectionNotes: input.notes?.trim() || 'Sin motivo especificado',
        adminNotes: input.notes?.trim() || null,
        lastReviewedAt: now,
        updatedAt: now,
      });
    }
    return business;
  });
}
