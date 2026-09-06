export type AttentionCode =
  | 'APPROVED_BUSINESS_MISSING'
  | 'APPLICATION_BUSINESS_MISSING'
  | 'APPLICATION_BUSINESS_SOURCE_MISMATCH'
  | 'INVALID_SOURCE_APPLICATION'
  | 'SOURCE_APPLICATION_BUSINESS_MISMATCH'
  | 'OWNERLESS_NON_PUBLISHED'
  | 'LEGACY_STATUS_MISMATCH';

export type AdminApplicationObservation = {
  id: string;
  businessName: string;
  email: string | null;
  status: string;
  adminStatus: string | null;
  businessId: string | null;
  schemaVersion: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  attention: AttentionCode[];
};

export type AdminBusinessObservation = {
  id: string;
  businessName: string;
  email: string | null;
  ownerPresent: boolean;
  businessStatus: string;
  legacyStatus: string | null;
  visibility: string | null;
  adminStatus: string | null;
  sourceApplicationId: string | null;
  relatedApplicationStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attention: AttentionCode[];
};

export type ApplicationFilter = 'all' | 'new' | 'approved' | 'needs_info' | 'rejected' | 'deleted' | 'attention';
export type BusinessFilter = 'all' | 'published' | 'in_review' | 'draft' | 'hidden' | 'deleted' | 'ownerless' | 'attention';

const string = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const nested = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

const timestamp = (value: unknown): string | null => string(value);

function legacyBusinessStatus(value: unknown): string | null {
  const status = string(value);
  if (status === 'approved' || status === 'published') return 'published';
  if (status === 'review' || status === 'in_review') return 'in_review';
  if (status === 'pending' || status === 'solicitud' || status === 'draft') return 'draft';
  if (status === 'rejected' || status === 'deleted') return 'deleted';
  return null;
}

export const ATTENTION_LABELS: Record<AttentionCode, string> = {
  APPROVED_BUSINESS_MISSING: 'Aprobada sin business existente',
  APPLICATION_BUSINESS_MISSING: 'Business relacionado inexistente',
  APPLICATION_BUSINESS_SOURCE_MISMATCH: 'Business no enlaza de regreso a la application v2',
  INVALID_SOURCE_APPLICATION: 'sourceApplicationId no existe',
  SOURCE_APPLICATION_BUSINESS_MISMATCH: 'Application y business no se enlazan mutuamente',
  OWNERLESS_NON_PUBLISHED: 'Sin propietario y no publicado',
  LEGACY_STATUS_MISMATCH: 'status legacy contradice businessStatus',
};

export function buildAdminObservability(
  applicationDocs: Array<{ id: string; data: Record<string, unknown> }>,
  businessDocs: Array<{ id: string; data: Record<string, unknown> }>,
): { applications: AdminApplicationObservation[]; businesses: AdminBusinessObservation[] } {
  const applicationsById = new Map(applicationDocs.map(document => [document.id, document.data]));
  const businessesById = new Map(businessDocs.map(document => [document.id, document.data]));

  const applications = applicationDocs.map(({ id, data }) => {
    const business = nested(data.business);
    const form = nested(data.form);
    const formData = nested(data.formData);
    const status = string(data.status) || 'unknown';
    const businessId = string(data.businessId);
    const attention: AttentionCode[] = [];
    const linkedBusiness = businessId ? businessesById.get(businessId) : undefined;
    if (status === 'approved' && (!businessId || !linkedBusiness)) attention.push('APPROVED_BUSINESS_MISSING');
    else if (businessId && !linkedBusiness) attention.push('APPLICATION_BUSINESS_MISSING');
    if (data.schemaVersion === 2 && linkedBusiness && string(linkedBusiness.sourceApplicationId) !== id) {
      attention.push('APPLICATION_BUSINESS_SOURCE_MISMATCH');
    }
    return {
      id,
      businessName: string(data.businessName) || string(data.name) || string(business.businessName) ||
        string(form.businessName) || string(formData.businessName) || 'Negocio sin nombre',
      email: string(data.ownerEmail) || string(data.email) || string(business.ownerEmail) ||
        string(form.ownerEmail) || string(formData.ownerEmail),
      status,
      adminStatus: string(data.adminStatus),
      businessId,
      schemaVersion: typeof data.schemaVersion === 'number' ? data.schemaVersion : null,
      createdAt: timestamp(data.createdAt) || timestamp(data.submittedAt),
      updatedAt: timestamp(data.updatedAt) || timestamp(data.reviewedAt),
      attention,
    };
  });

  const businesses = businessDocs.map(({ id, data }) => {
    const businessStatus = string(data.businessStatus) || 'unknown';
    const legacyStatus = string(data.status);
    const sourceApplicationId = string(data.sourceApplicationId);
    const sourceApplication = sourceApplicationId ? applicationsById.get(sourceApplicationId) : undefined;
    const ownerPresent = Boolean(string(data.ownerId) || string(data.ownerUid));
    const attention: AttentionCode[] = [];
    const mappedLegacy = legacyBusinessStatus(legacyStatus);
    const isPublished = businessStatus === 'published' || string(data.visibility) === 'published' ||
      (businessStatus === 'unknown' && mappedLegacy === 'published');
    if (sourceApplicationId && !sourceApplication) attention.push('INVALID_SOURCE_APPLICATION');
    if (sourceApplication && string(sourceApplication.businessId) !== id) attention.push('SOURCE_APPLICATION_BUSINESS_MISMATCH');
    if (!ownerPresent && !isPublished) attention.push('OWNERLESS_NON_PUBLISHED');
    if (mappedLegacy && businessStatus !== 'unknown' && mappedLegacy !== businessStatus) {
      attention.push('LEGACY_STATUS_MISMATCH');
    }
    return {
      id,
      businessName: string(data.businessName) || string(data.name) || 'Negocio sin nombre',
      email: string(data.ownerEmail) || string(data.email) || string(data.contactEmail),
      ownerPresent,
      businessStatus,
      legacyStatus,
      visibility: string(data.visibility),
      adminStatus: string(data.adminStatus) || string(data.applicationStatus),
      sourceApplicationId,
      relatedApplicationStatus: sourceApplication ? string(sourceApplication.status) : null,
      createdAt: timestamp(data.createdAt),
      updatedAt: timestamp(data.updatedAt),
      attention,
    };
  });

  const newestFirst = <T extends { createdAt: string | null }>(left: T, right: T) =>
    String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
  return { applications: applications.sort(newestFirst), businesses: businesses.sort(newestFirst) };
}

export function matchesApplicationFilter(application: AdminApplicationObservation, filter: ApplicationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'attention') return application.attention.length > 0;
  if (filter === 'new') return ['pending', 'solicitud', 'submitted'].includes(application.status);
  return application.status === filter;
}

export function matchesBusinessFilter(business: AdminBusinessObservation, filter: BusinessFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'attention') return business.attention.length > 0;
  if (filter === 'hidden') return business.visibility === 'hidden';
  if (filter === 'ownerless') return !business.ownerPresent;
  if (filter === 'deleted') {
    return business.businessStatus === 'deleted' || business.adminStatus === 'deleted' || business.legacyStatus === 'deleted';
  }
  return business.businessStatus === filter;
}
