import { APPLICATION_V2_SCHEMA_VERSION } from './applicationV2';

export type ApplicationRecord = Record<string, unknown>;
export type SupportedApplicationSchemaVersion = 1 | 2;

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function isApplicationV2(application: ApplicationRecord | null | undefined): boolean {
  return application?.schemaVersion === APPLICATION_V2_SCHEMA_VERSION;
}

export function isLegacyApplicationV1(
  application: ApplicationRecord | null | undefined,
): boolean {
  return application?.schemaVersion === undefined || application?.schemaVersion === 1;
}

export function assertSupportedApplicationVersion(
  application: ApplicationRecord | null | undefined,
): SupportedApplicationSchemaVersion {
  if (isLegacyApplicationV1(application)) return 1;
  if (isApplicationV2(application)) return 2;
  throw new Error('APPLICATION_SCHEMA_VERSION_UNSUPPORTED');
}

/**
 * Resuelve ownership únicamente para documentos legacy v1.
 *
 * v1 conserva el fallback histórico applications/{uid}. En v2 el ID es aleatorio,
 * por lo que ni el ID del documento ni ownerEmail pueden producir un ownerId.
 */
export function resolveApplicationOwnerId(
  applicationId: string,
  application: ApplicationRecord,
): string | null {
  if (!isLegacyApplicationV1(application)) return null;

  const form =
    application.formData && typeof application.formData === 'object'
      ? (application.formData as ApplicationRecord)
      : {};
  const explicitOwner = [
    application.uid,
    application.ownerId,
    application.ownerUid,
    form.uid,
    form.ownerId,
    form.ownerUid,
  ]
    .map(nonEmptyString)
    .find((value): value is string => Boolean(value));

  return explicitOwner ?? nonEmptyString(applicationId);
}

/** Obtiene los datos de negocio sin confundir el contenedor v2 con el formato plano v1. */
export function getApplicationBusinessData(application: ApplicationRecord): ApplicationRecord {
  if (isApplicationV2(application)) {
    return application.business && typeof application.business === 'object'
      ? (application.business as ApplicationRecord)
      : {};
  }

  if (!isLegacyApplicationV1(application)) return {};

  return application.formData && typeof application.formData === 'object'
    ? { ...application, ...(application.formData as ApplicationRecord) }
    : application;
}

/**
 * Obtiene el ID exacto de la application asociada a un business.
 * Los negocios v1 conservan el fallback histórico por ownerId.
 */
export function resolveLinkedApplicationId(
  business: ApplicationRecord | null | undefined,
): string | null {
  if (!business) return null;

  const exact = nonEmptyString(business.sourceApplicationId) ?? nonEmptyString(business.applicationId);
  if (exact) return exact;

  if (
    business.applicationSchemaVersion !== undefined &&
    business.applicationSchemaVersion !== 1
  ) {
    return null;
  }
  return nonEmptyString(business.ownerId);
}

export type ApplicationNotificationReference = {
  applicationId: string;
  businessId: string | null;
};

/** Las notificaciones usan referencias persistidas exactas; ownerEmail nunca enlaza entidades. */
export function getApplicationNotificationReference(
  applicationId: string,
  application: ApplicationRecord,
): ApplicationNotificationReference {
  return {
    applicationId,
    businessId: nonEmptyString(application.businessId),
  };
}

export type ApplicationAdminQueue = 'new' | 'needs_info' | 'resolved' | 'legacy';

/**
 * Una v2 submitted permanece en Nuevas aunque su perfil sea publicable.
 * La completitud pertenece al negocio y no altera el estado de intake v2.
 */
export function getApplicationAdminQueue(application: ApplicationRecord): ApplicationAdminQueue {
  if (!isApplicationV2(application)) return 'legacy';
  if (application.status === 'submitted') return 'new';
  if (application.status === 'needs_info') return 'needs_info';
  return 'resolved';
}
