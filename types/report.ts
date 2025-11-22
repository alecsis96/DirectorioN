export type ReportReason =
  | 'inappropriate_content'
  | 'wrong_information'
  | 'closed_business'
  | 'spam'
  | 'duplicate'
  | 'offensive'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface BusinessReport {
  id?: string;
  businessId: string;
  businessName: string;
  reporterId?: string;
  reporterEmail?: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: Date;
  updatedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  resolvedAt?: Date;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_content: 'Contenido inapropiado',
  wrong_information: 'Información incorrecta',
  closed_business: 'Negocio cerrado',
  spam: 'Spam o publicidad engañosa',
  duplicate: 'Negocio duplicado',
  offensive: 'Contenido ofensivo',
  other: 'Otro motivo',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  reviewing: 'En revisión',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
};
