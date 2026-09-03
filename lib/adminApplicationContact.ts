export type ApprovedApplicationContact = {
  publicReference?: string;
  ownerName?: string;
  ownerPhone?: string;
  business: {
    businessName: string;
    phone?: string;
    whatsapp?: string;
  };
};

export function normalizeWhatsAppRecipient(value: string | undefined): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  return /^\d{11,15}$/.test(digits) ? digits : '';
}

function sanitizeWhatsAppCopy(value: string | undefined, fallback: string, maxLength: number): string {
  const sanitized = (value || '')
    .replace(/#token=[^\s&]+/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (sanitized || fallback).slice(0, maxLength);
}

export function buildApprovedApplicationWhatsAppUrl(
  application: ApprovedApplicationContact,
): string | null {
  const recipient = normalizeWhatsAppRecipient(
    application.business.whatsapp || application.ownerPhone || application.business.phone,
  );
  if (!recipient) return null;

  const ownerName = sanitizeWhatsAppCopy(application.ownerName, 'Hola', 140);
  const folio = sanitizeWhatsAppCopy(application.publicReference, 'tu solicitud', 40);
  const businessName = sanitizeWhatsAppCopy(application.business.businessName, 'tu negocio', 140);
  const message = [
    `Hola ${ownerName}, te escribimos de YajaGon sobre la solicitud ${folio} de ${businessName}.`,
    'La solicitud fue aprobada. Revisa tu correo para conocer los siguientes pasos seguros.',
  ].join(' ');

  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}
