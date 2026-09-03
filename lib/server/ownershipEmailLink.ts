import nodemailer from 'nodemailer';

import { EMAIL_LINK_AUTH_ENABLED, OWNERSHIP_CLAIMS_ENABLED } from '../featureFlags';
import { getAdminAuth, getAdminFirestore } from './firebaseAdmin';
import { validateOwnershipClaimForEmailLink } from './ownershipClaimRedeem';

export const OWNERSHIP_EMAIL_LINK_RATE_LIMITS_COLLECTION = 'ownershipEmailLinkRateLimits' as const;
export const OWNERSHIP_EMAIL_LINK_COOLDOWN_MS = 60_000;

type OwnershipEmailLinkOptions = {
  db?: ReturnType<typeof getAdminFirestore>;
  now?: Date;
  baseUrl?: string;
  enabled?: boolean;
  generateSignInLink?: (email: string, continueUrl: string) => Promise<string>;
  sendMail?: (message: { to: string; subject: string; text: string; html: string }) => Promise<void>;
};

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function continueUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('EMAIL_LINK_BASE_URL_INVALID');
  }
  return `${parsed.origin}/reclamar-negocio`;
}

async function defaultGenerateSignInLink(email: string, url: string): Promise<string> {
  return getAdminAuth().generateSignInWithEmailLink(email, { url, handleCodeInApp: true });
}

async function defaultSendMail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error('EMAIL_LINK_DELIVERY_NOT_CONFIGURED');
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await transporter.sendMail({ from: `"YajaGon" <${user}>`, ...message });
}

/** Genera y entrega el enlace al email canónico del claim, nunca a un email del body. */
export async function sendOwnershipEmailSignInLink(
  token: string,
  options: OwnershipEmailLinkOptions = {},
): Promise<void> {
  const enabled = options.enabled ?? (OWNERSHIP_CLAIMS_ENABLED && EMAIL_LINK_AUTH_ENABLED);
  if (!enabled) throw new Error('EMAIL_LINK_AUTH_DISABLED');
  const db = options.db ?? getAdminFirestore();
  const now = options.now ?? new Date();
  const claim = await validateOwnershipClaimForEmailLink(token, null, {
    db,
    enabled: true,
    now,
  });
  const rateRef = db.collection(OWNERSHIP_EMAIL_LINK_RATE_LIMITS_COLLECTION).doc(claim.claimId);
  const shouldSend = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const lastSentAt = asDate(snapshot.data()?.lastSentAt);
    if (lastSentAt && now.getTime() - lastSentAt.getTime() < OWNERSHIP_EMAIL_LINK_COOLDOWN_MS) {
      return false;
    }
    transaction.set(rateRef, { claimId: claim.claimId, lastSentAt: now, updatedAt: now });
    return true;
  });
  if (!shouldSend) return;

  const url = continueUrl(options.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '');
  const authLink = await (options.generateSignInLink ?? defaultGenerateSignInLink)(
    claim.emailNormalized,
    url,
  );
  await (options.sendMail ?? defaultSendMail)({
    to: claim.emailNormalized,
    subject: 'Accede para reclamar tu negocio en YajaGon',
    text: `Usa este enlace para autenticarte y continuar la reclamación:\n\n${authLink}\n\nEste enlace no asigna la propiedad por sí solo.`,
    html: `<p>Usa este enlace para autenticarte y continuar la reclamación:</p><p><a href="${authLink}">Continuar por correo</a></p><p>Este enlace no asigna la propiedad por sí solo.</p>`,
  });
}
