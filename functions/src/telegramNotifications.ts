import type {ApplicationDuplicateLabel} from "./applicationRiskAssessment";

export type TelegramDeliveryResult = {
  sent: boolean;
  skipped: boolean;
  messageId?: number;
};

function sanitizePublicLabel(value: string, fallback: string, maxLength: number): string {
  const sanitized = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[dato omitido]")
    .replace(/(?:\+?\d[\s().-]*){7,}/g, "[dato omitido]")
    .replace(/https?:\/\/\S+/gi, "[enlace omitido]")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || fallback).slice(0, maxLength);
}

export async function sendApplicationV2TelegramAlert(input: {
  enabled: boolean;
  botToken?: string;
  chatId?: string;
  adminPanelBaseUrl?: string;
  publicReference: string;
  businessName: string;
  category: string;
  duplicateLabel: ApplicationDuplicateLabel;
  fetchImpl?: typeof fetch;
}): Promise<TelegramDeliveryResult> {
  if (!input.enabled || !input.botToken || !input.chatId) {
    return {sent: false, skipped: true};
  }

  const text = [
    "Nueva solicitud v2",
    `Folio: ${input.publicReference.slice(0, 40)}`,
    `Negocio: ${sanitizePublicLabel(input.businessName, "Sin nombre", 140)}`,
    `Categoría: ${sanitizePublicLabel(input.category, "Sin categoría", 120)}`,
    `Duplicado: ${input.duplicateLabel}`,
  ].join("\n");

  try {
    const panelUrl = new URL("/admin/solicitudes", input.adminPanelBaseUrl || "https://www.yajagon.com");
    const response = await (input.fetchImpl ?? fetch)(
      `https://api.telegram.org/bot${input.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          chat_id: input.chatId,
          text,
          protect_content: true,
          link_preview_options: {is_disabled: true},
          reply_markup: {
            inline_keyboard: [[{text: "Abrir Solicitudes", url: panelUrl.toString()}]],
          },
        }),
      },
    );
    if (!response.ok) return {sent: false, skipped: false};
    const payload = await response.json() as {ok?: boolean; result?: {message_id?: number}};
    if (payload.ok !== true) return {sent: false, skipped: false};
    return {sent: true, skipped: false, messageId: payload.result?.message_id};
  } catch {
    return {sent: false, skipped: false};
  }
}
