export type ApplicationNotificationReference = {
  applicationId: string;
  businessId: string | null;
};

export function getSupportedApplicationSchemaVersion(
  application: Record<string, unknown>,
): 1 | 2 | null {
  if (application.schemaVersion === undefined || application.schemaVersion === 1) return 1;
  if (application.schemaVersion === 2) return 2;
  return null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

/** Las notificaciones enlazan IDs persistidos exactos; nunca resuelven por email. */
export function getApplicationNotificationReference(
  applicationId: string,
  application: Record<string, unknown>,
): ApplicationNotificationReference {
  return {
    applicationId,
    businessId: nonEmptyString(application.businessId),
  };
}
