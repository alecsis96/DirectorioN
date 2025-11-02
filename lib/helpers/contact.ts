// lib/helpers/contact.ts
export function normalizeDigits(s?: string) {
  return (s || "").replace(/\D+/g, "");
}

export function asE164Mx(phone?: string) {
  const d = normalizeDigits(phone);
  if (!d) return "";
  return d.startsWith("52") ? d : `52${d}`;
}

export function waLink(phone?: string, msg?: string) {
  const p = asE164Mx(phone);
  if (!p) return "";
  const text = encodeURIComponent(
    msg || "Hola, vi tu negocio en el Directorio Yajalón y me gustaría más información."
  );
  return `https://wa.me/${p}?text=${text}`;
}

export function mapsLink(
  lat?: number | null,
  lng?: number | null,
  address?: string
) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return "https://www.google.com/maps";
}
