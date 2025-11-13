export const normalizeDigits = (s?: string) =>
  (s || "").replace(/[^\d+]/g, "");

export const waLink = (raw?: string) => {
  const phone = normalizeDigits(raw);
  return phone ? `https://wa.me/${phone}` : "";
};

export const mapsLink = (
  lat?: number | null,
  lng?: number | null,
  address?: string
) => {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "#";
};
