import { timingSafeEqual } from 'node:crypto';

import nodemailer from 'nodemailer';

import { getAdminFirestore } from './firebaseAdmin';
import {
  OWNERSHIP_INVITATION_OUTBOX_COLLECTION,
  generateOwnershipInvitationDeliveryAttemptId,
  type OwnershipInvitationOutboxStatus,
} from './applicationV2Approval';
import {
  OWNERSHIP_CLAIMS_COLLECTION,
  hashOwnershipClaimToken,
} from './ownershipClaims';

const INVITATION_DELIVERY_LEASE_MS = 5 * 60 * 1000;

export type InvitationDeliveryOptions = {
  db?: ReturnType<typeof getAdminFirestore>;
  now?: Date;
  baseUrl?: string;
  sendMail?: (message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
  deliveryAttemptId?: string;
};

export type InvitationDeliveryInput = {
  applicationId: string;
  businessId: string;
  claimId: string;
  outboxId: string;
  token: string;
};

function constantTimeHashMatches(token: string, expectedHash: unknown): boolean {
  if (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(hashOwnershipClaimToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizedBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('INVITATION_BASE_URL_INVALID');
  }
  return parsed.origin;
}

/** El fragmento no viaja en el GET, por lo que el servidor y sus logs no reciben el token. */
export function buildOwnershipInvitationUrl(baseUrl: string, token: string): string {
  if (!token) throw new Error('CLAIM_TOKEN_REQUIRED');
  return `${normalizedBaseUrl(baseUrl)}/reclamar-negocio#token=${encodeURIComponent(token)}`;
}

function buildInvitationMessage(input: {
  recipientName: string;
  businessName: string;
  invitationUrl: string;
}) {
  const recipientName = escapeHtml(input.recipientName);
  const businessName = escapeHtml(input.businessName);
  const invitationUrl = escapeHtml(input.invitationUrl);
  return {
    subject: 'Tu negocio fue aprobado en YajaGon',
    text: [
      `Hola ${input.recipientName},`,
      '',
      `Tu negocio ${input.businessName} fue aprobado en YajaGon.`,
      'Hemos preparado el acceso para que puedas reclamar y administrar tu negocio.',
      '',
      `Administrar mi negocio: ${input.invitationUrl}`,
      '',
      'Abrir el enlace todavía no asigna la propiedad del negocio.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:auto">
        <h1 style="color:#38761D">Tu negocio fue aprobado en YajaGon</h1>
        <p>Hola <strong>${recipientName}</strong>,</p>
        <p>Tu negocio <strong>${businessName}</strong> fue aprobado.</p>
        <p>Hemos preparado el acceso para que puedas reclamar y administrar tu negocio.</p>
        <p style="margin:28px 0"><a href="${invitationUrl}" style="background:#38761D;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Administrar mi negocio</a></p>
        <p style="font-size:13px;color:#6b7280">Abrir este enlace todavía no asigna la propiedad del negocio.</p>
      </div>
    `,
  };
}

async function defaultSendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error('INVITATION_EMAIL_NOT_CONFIGURED');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({
    from: `"YajaGon" <${user}>`,
    ...message,
  });
}

async function finishDelivery(
  input: InvitationDeliveryInput,
  attemptId: string,
  delivered: boolean,
  options: InvitationDeliveryOptions,
) {
  const db = options.db ?? getAdminFirestore();
  const now = options.now ?? new Date();
  const outboxRef = db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc(input.outboxId);
  const applicationRef = db.collection('applications').doc(input.applicationId);

  await db.runTransaction(async (transaction) => {
    const [outboxSnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(outboxRef),
      transaction.get(applicationRef),
    ]);
    if (!outboxSnapshot.exists || !applicationSnapshot.exists) {
      throw new Error('INVITATION_DELIVERY_STATE_NOT_FOUND');
    }
    const outbox = outboxSnapshot.data() || {};
    const application = applicationSnapshot.data() || {};
    if (outbox.deliveryAttemptId !== attemptId || outbox.status !== 'sending') return;

    const status: OwnershipInvitationOutboxStatus = delivered ? 'delivered' : 'failed';
    transaction.update(outboxRef, {
      status,
      updatedAt: now,
      ...(delivered
        ? { deliveredAt: now }
        : { failedAt: now, failureCode: 'EMAIL_DELIVERY_FAILED' }),
    });
    if (application.ownershipInvitationOutboxId === input.outboxId) {
      transaction.update(applicationRef, {
        ownershipInvitationStatus: delivered ? 'delivered' : 'failed',
        ownershipInvitationUpdatedAt: now,
        ...(delivered
          ? { ownershipInvitationDeliveredAt: now, ownershipInvitationFailureCode: null }
          : { ownershipInvitationFailureCode: 'EMAIL_DELIVERY_FAILED' }),
      });
    }
  });
}

/**
 * Entrega una invitación ya comprometida. El correo ocurre fuera de toda transacción.
 * Un outbox failed requiere reemisión, nunca reusa silenciosamente el mismo token.
 */
export async function deliverOwnershipInvitation(
  input: InvitationDeliveryInput,
  options: InvitationDeliveryOptions = {},
): Promise<{ status: 'pending' | 'delivered' | 'failed'; delivered: boolean }> {
  const db = options.db ?? getAdminFirestore();
  const now = options.now ?? new Date();
  const attemptId = options.deliveryAttemptId ?? generateOwnershipInvitationDeliveryAttemptId();
  const outboxRef = db.collection(OWNERSHIP_INVITATION_OUTBOX_COLLECTION).doc(input.outboxId);
  const applicationRef = db.collection('applications').doc(input.applicationId);
  const businessRef = db.collection('businesses').doc(input.businessId);
  const claimRef = db.collection(OWNERSHIP_CLAIMS_COLLECTION).doc(input.claimId);

  const acquired = await db.runTransaction(async (transaction) => {
    const [outboxSnapshot, applicationSnapshot, businessSnapshot, claimSnapshot] = await Promise.all([
      transaction.get(outboxRef),
      transaction.get(applicationRef),
      transaction.get(businessRef),
      transaction.get(claimRef),
    ]);
    if (!outboxSnapshot.exists || !applicationSnapshot.exists || !businessSnapshot.exists || !claimSnapshot.exists) {
      throw new Error('INVITATION_DELIVERY_STATE_NOT_FOUND');
    }
    const outbox = outboxSnapshot.data() || {};
    const application = applicationSnapshot.data() || {};
    const business = businessSnapshot.data() || {};
    const claim = claimSnapshot.data() || {};

    if (outbox.status === 'delivered') return { acquired: false as const, status: 'delivered' as const };
    if (outbox.status !== 'pending') return { acquired: false as const, status: 'pending' as const };
    if (
      outbox.applicationId !== input.applicationId ||
      outbox.businessId !== input.businessId ||
      outbox.claimId !== input.claimId ||
      application.status !== 'approved' ||
      application.businessId !== input.businessId ||
      application.ownershipInvitationOutboxId !== input.outboxId ||
      business.sourceApplicationId !== input.applicationId ||
      business.ownerId ||
      business.ownerUid ||
      claim.status !== 'active' ||
      claim.businessId !== input.businessId ||
      claim.applicationId !== input.applicationId ||
      !constantTimeHashMatches(input.token, claim.tokenHash)
    ) {
      throw new Error('INVITATION_DELIVERY_INTEGRITY_ERROR');
    }
    const expiresAt = claim.expiresAt instanceof Date ? claim.expiresAt : claim.expiresAt?.toDate?.();
    if (!(expiresAt instanceof Date) || expiresAt.getTime() <= now.getTime()) {
      throw new Error('INVITATION_CLAIM_EXPIRED');
    }

    transaction.update(outboxRef, {
      status: 'sending',
      deliveryAttemptId: attemptId,
      deliveryLeaseExpiresAt: new Date(now.getTime() + INVITATION_DELIVERY_LEASE_MS),
      attemptCount: Number(outbox.attemptCount || 0) + 1,
      updatedAt: now,
    });
    return {
      acquired: true as const,
      recipient: String(outbox.emailNormalized),
      recipientName: String(application.ownerName),
      businessName: String(business.name),
    };
  });

  if (!acquired.acquired) {
    return { status: acquired.status, delivered: acquired.status === 'delivered' };
  }

  let delivered = false;
  try {
    const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '';
    const invitationUrl = buildOwnershipInvitationUrl(baseUrl, input.token);
    const message = buildInvitationMessage({
      recipientName: acquired.recipientName,
      businessName: acquired.businessName,
      invitationUrl,
    });
    await (options.sendMail ?? defaultSendMail)({
      to: acquired.recipient,
      ...message,
    });
    delivered = true;
  } catch {
    delivered = false;
  }

  await finishDelivery(input, attemptId, delivered, { ...options, db, now });
  return { status: delivered ? 'delivered' : 'failed', delivered };
}
