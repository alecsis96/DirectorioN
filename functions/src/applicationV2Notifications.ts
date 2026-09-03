import {
  beginApplicationV2NotificationDelivery,
  type NotificationDeliveryFirestore,
} from "./notificationDelivery";
import {
  duplicateLabelForTelegram,
  type ApplicationRiskAssessment,
} from "./applicationRiskAssessment";
import type {TelegramDeliveryResult} from "./telegramNotifications";

type ApplicationV2NotificationInput = {
  db: NotificationDeliveryFirestore;
  applicationId: string;
  eventId: string;
  serverTimestamp: () => unknown;
  assessRisk: () => Promise<ApplicationRiskAssessment>;
  sendEmail: () => Promise<boolean>;
  sendAdminNotice: () => Promise<boolean>;
  sendTelegram: (duplicateLabel: ReturnType<typeof duplicateLabelForTelegram>) => Promise<TelegramDeliveryResult>;
  onAssessmentPending?: () => void;
};

export type ApplicationV2NotificationResult = {
  deduplicated: boolean;
  assessmentPending: boolean;
  emailSent?: boolean;
  adminNoticeSent?: boolean;
  telegramSent?: boolean;
};

/**
 * Orquesta el trabajo posterior al alta. La evaluación de duplicados es
 * deliberadamente best-effort y nunca puede interrumpir los canales de aviso.
 */
export async function processApplicationV2Created(
  input: ApplicationV2NotificationInput,
): Promise<ApplicationV2NotificationResult> {
  let riskAssessment: ApplicationRiskAssessment | null = null;
  let assessmentPending = false;
  try {
    riskAssessment = await input.assessRisk();
  } catch {
    assessmentPending = true;
    input.onAssessmentPending?.();
  }

  const delivery = await beginApplicationV2NotificationDelivery(
    input.db,
    input.serverTimestamp,
    input.applicationId,
    input.eventId,
  );
  if (!delivery.acquired) return {deduplicated: true, assessmentPending};

  const [emailSent, adminNoticeSent, telegram] = await Promise.all([
    input.sendEmail(),
    input.sendAdminNotice(),
    input.sendTelegram(duplicateLabelForTelegram(riskAssessment)),
  ]);
  const telegramOk = telegram.skipped || telegram.sent;
  await delivery.reference.set({
    status: emailSent && adminNoticeSent && telegramOk ? "sent" : "partial",
    emailSent,
    adminNoticeSent,
    telegramSent: telegram.sent,
    telegramSkipped: telegram.skipped,
    ...(telegram.messageId ? {telegramMessageId: telegram.messageId} : {}),
    completedAt: input.serverTimestamp(),
  }, {merge: true});

  return {
    deduplicated: false,
    assessmentPending,
    emailSent,
    adminNoticeSent,
    telegramSent: telegram.sent,
  };
}
