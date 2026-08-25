export const OWNER_EDITABLE_BUSINESS_FIELDS = [
  'name', 'businessName',
  'category', 'categoryId', 'categoryName', 'categoryGroupId',
  'address', 'colonia', 'neighborhood', 'description',
  'phone', 'whatsapp', 'WhatsApp',
  'facebookPage', 'Facebook', 'instagramUser', 'emailContact', 'website',
  'hours', 'horarios', 'images', 'logoUrl', 'coverPhoto', 'image1',
  'hasEnvio', 'envioCost', 'envioInfo',
  'lat', 'lng', 'location', 'price',
] as const;

const OWNER_EDITABLE_FIELD_SET = new Set<string>(OWNER_EDITABLE_BUSINESS_FIELDS);

export function pickOwnerEditableBusinessUpdates(updates: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(updates).filter(
      ([key, value]) => OWNER_EDITABLE_FIELD_SET.has(key) && value !== undefined
    )
  );
}
