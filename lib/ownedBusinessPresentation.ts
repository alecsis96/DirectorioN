export type OwnedBusinessDisplayStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'review'
  | 'published';

/** The v2 dual-state fields are authoritative; `status` remains for legacy businesses. */
export function resolveOwnedBusinessStatus(business: Record<string, unknown>): OwnedBusinessDisplayStatus {
  if (business.businessStatus === 'published' || business.visibility === 'published' || business.status === 'published') return 'published';
  if (business.businessStatus === 'in_review' || business.status === 'review') return 'review';
  if (business.businessStatus === 'draft') return 'draft';
  const legacy = business.status;
  return ['pending', 'approved', 'rejected', 'draft', 'review', 'published'].includes(String(legacy))
    ? legacy as OwnedBusinessDisplayStatus
    : 'draft';
}
