import { z } from 'zod';

export const APPLICATION_V2_SCHEMA_VERSION = 2 as const;

export const ApplicationV2StatusSchema = z.enum([
  'submitted',
  'needs_info',
  'approved',
  'rejected',
]);

const optionalText = (max: number) => z.string().trim().max(max).optional();

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return `${hasPlus ? '+' : ''}${digits}`;
}

const phoneSchema = z
  .string()
  .max(40)
  .transform(normalizePhone)
  .refine((value) => /^\+?\d{7,15}$/.test(value), 'Teléfono inválido');

const optionalPhoneSchema = z
  .union([z.literal('').transform(() => undefined), phoneSchema])
  .optional();

const businessHoursDaySchema = z
  .object({
    abierto: z.boolean(),
    desde: z.string().trim().max(10),
    hasta: z.string().trim().max(10),
  })
  .strict();

const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

/**
 * Allow-list del contenido de negocio aceptado por una futura application v2.
 * Los datos de identidad y ownership quedan deliberadamente fuera de este objeto.
 */
export const ApplicationV2BusinessSchema = z
  .object({
    businessName: z.string().trim().min(1).max(140),
    category: optionalText(120),
    categoryId: optionalText(120),
    categoryGroupId: optionalText(80),
    description: optionalText(2_000),
    address: optionalText(400),
    colonia: optionalText(140),
    municipio: optionalText(140),
    phone: optionalPhoneSchema,
    whatsapp: optionalPhoneSchema,
    facebookPage: optionalText(300),
    instagramUser: optionalText(200),
    emailContact: z.string().trim().email().max(200).optional(),
    website: z.string().trim().url().max(300).optional(),
    hours: optionalText(500),
    horarios: z.record(z.string(), businessHoursDaySchema).optional(),
    gallery: z.array(z.string().trim().url().max(500)).max(5).optional(),
    hasEnvio: z.boolean().optional(),
    envioCost: optionalText(40),
    envioInfo: optionalText(500),
    location: locationSchema.nullable().optional(),
  })
  .strict();

/**
 * Entrada interna que una futura ruta pública podrá entregar al servicio servidor.
 * `.strict()` hace que ownerId, ownerUid y cualquier campo no permitido sean rechazados.
 */
export const AnonymousApplicationV2InputSchema = z
  .object({
    ownerEmail: z.string().trim().toLowerCase().email().max(200),
    ownerName: z.string().trim().min(1).max(140),
    ownerPhone: phoneSchema,
    business: ApplicationV2BusinessSchema,
  })
  .strict();

const persistedTimestampSchema = z.union([
  z.date(),
  z.custom<{ toDate(): Date }>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toDate?: unknown }).toDate === 'function',
    'Timestamp inválido',
  ),
]);

export const ApplicationV2Schema = z
  .object({
    schemaVersion: z.literal(APPLICATION_V2_SCHEMA_VERSION),
    status: ApplicationV2StatusSchema,
    businessId: z.string().trim().min(1).max(128).nullable(),
    /** Referencia pública de seguimiento. Nunca se usa como credencial ni concede acceso. */
    publicReference: z.string().trim().min(8).max(40).optional(),
    ownerEmail: z.string().trim().toLowerCase().email().max(200),
    ownerName: z.string().trim().min(1).max(140),
    ownerPhone: phoneSchema,
    business: ApplicationV2BusinessSchema,
    createdAt: persistedTimestampSchema,
    updatedAt: persistedTimestampSchema,
    approvedAt: persistedTimestampSchema.optional(),
    approvedBy: z.string().trim().min(1).max(128).optional(),
    rejectedAt: persistedTimestampSchema.optional(),
    rejectedBy: z.string().trim().min(1).max(128).optional(),
    rejectionNotes: z.string().trim().max(1_000).optional(),
    rejectionReason: z.string().trim().max(1_000).optional(),
    adminNotes: z.string().trim().max(1_000).optional(),
    missingFields: z.array(z.string().trim().min(1).max(140)).max(50).optional(),
  })
  .strict();

export type ApplicationV2Status = z.infer<typeof ApplicationV2StatusSchema>;
export type ApplicationV2Business = z.infer<typeof ApplicationV2BusinessSchema>;
export type AnonymousApplicationV2Input = z.input<typeof AnonymousApplicationV2InputSchema>;
export type ApplicationV2 = z.infer<typeof ApplicationV2Schema>;

export function buildApplicationV2Record(
  input: AnonymousApplicationV2Input,
  now: Date = new Date(),
  metadata: { publicReference?: string } = {},
): ApplicationV2 {
  const parsed = AnonymousApplicationV2InputSchema.parse(input);

  return ApplicationV2Schema.parse({
    schemaVersion: APPLICATION_V2_SCHEMA_VERSION,
    status: 'submitted',
    businessId: null,
    ...metadata,
    ...parsed,
    createdAt: now,
    updatedAt: now,
  });
}
