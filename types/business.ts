import { resolveCategory, type CategoryGroupId } from "../lib/categoriesCatalog";

export type Business = {
  id?: string;
  name: string;
  category?: string;
  categoryId?: string;
  categoryName?: string;
  categoryGroupId?: CategoryGroupId;
  description?: string;
  colonia?: string;
  neighborhood?: string;
  address?: string;
  hours?: string;
  horarios?: {
    lunes?: { abierto: boolean; desde: string; hasta: string };
    martes?: { abierto: boolean; desde: string; hasta: string };
    miercoles?: { abierto: boolean; desde: string; hasta: string };
    jueves?: { abierto: boolean; desde: string; hasta: string };
    viernes?: { abierto: boolean; desde: string; hasta: string };
    sabado?: { abierto: boolean; desde: string; hasta: string };
    domingo?: { abierto: boolean; desde: string; hasta: string };
  };
  phone?: string;
  WhatsApp?: string;
  Facebook?: string;
  price?: string;
  rating?: number;
  ownerId?: string;
  ownerEmail?: string;
  plan?: "free" | "featured" | "sponsor" | string;
  isOpen?: "si" | "no" | string;
  hasEnvio?: boolean;
  envioCost?: "free" | "paid" | "varies" | string;
  envioInfo?: string;
  location?: { lat: number; lng: number } | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  coverUrl?: string | null;
  coverPublicId?: string | null;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  images?: { url?: string | null; publicId?: string }[];
  featured?: boolean | string;
  priceRange?: string;
  // Location coordinates
  lat?: number | null;
  lng?: number | null;
  // Status field (legacy - mantener por compatibilidad)
  status?: 'draft' | 'review' | 'published' | 'rejected';
  
  // Sistema Dual-State (nuevo sistema de estados)
  businessStatus?: 'draft' | 'in_review' | 'published' | 'deleted';
  applicationStatus?: 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected' | 'deleted';
  completionPercent?: number; // 0-100
  isPublishReady?: boolean;
  missingFields?: string[];
  adminNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string; // ISO timestamp
  publishedAt?: string; // ISO timestamp
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  submittedForReviewAt?: string; // ISO timestamp - cuando se envió a revisión
  submittedForReviewBy?: string; // userId - quien envió a revisión
  lastReviewRequestedAt?: string; // ISO timestamp - última solicitud de revisión
  deletedAt?: string; // ISO timestamp - cuando se eliminó
  deletedBy?: string; // userId - quien eliminó
  
  // Admin Operations (gestión de duplicados y archivado)
  adminStatus?: 'active' | 'archived' | 'deleted'; // Estado administrativo
  visibility?: 'published' | 'hidden'; // Visibilidad en directorio
  duplicateOf?: string; // businessId del negocio canonical si es duplicado
  archivedAt?: string; // ISO timestamp - cuando se archivó
  archivedBy?: string; // userId admin - quien archivó
  archiveReason?: string; // Motivo del archivado
  
  // Payment fields
  isActive?: boolean;
  paymentStatus?: 'active' | 'pending' | 'overdue' | 'canceled';
  planPaymentMethod?: 'transfer' | 'stripe' | 'cash';
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  disabledReason?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSessionId?: string;
  stripeSubscriptionStatus?: string;
  planUpdatedAt?: string;
  previousPlan?: string; // Plan anterior antes de degradar a free
  downgradedAt?: string; // Fecha de degradación
  paymentHistory?: PaymentRecord[];
};

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  plan: string;
  status: 'success' | 'failed' | 'refunded';
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
}

export interface Review {
  id?: string;
  businessId: string;
  name: string;
  text: string;
  rating: number;
  created: string;
  userId: string;
}

export interface BusinessPreview {
  id: string;
  name: string;
  category: string;
  categoryId?: string;
  categoryName?: string;
  categoryGroupId?: CategoryGroupId;
  colonia: string;
  rating?: number | null;
  ownerId?: string;
  ownerEmail?: string;
  isOpen: "si" | "no";
  address: string;
  phone?: string;
  WhatsApp?: string;
  hours?: string;
  horarios?: Business["horarios"];
  hasEnvio?: boolean;
  featured?: boolean | string;
  plan?: string;
  priceRange?: string;
  description?: string;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  images?: { url?: string | null; publicId?: string }[];
  location?: { lat: number; lng: number } | null;
}

export const pickBusinessPreview = (biz: Business): BusinessPreview => {
  const resolved = resolveCategory(biz.categoryId || biz.categoryName || biz.category);
  const categoryName = biz.categoryName || resolved.categoryName;
  const phone = typeof biz.phone === "string" && biz.phone.trim().length ? biz.phone.trim() : undefined;
  const whatsapp = typeof biz.WhatsApp === "string" && biz.WhatsApp.trim().length ? biz.WhatsApp.trim() : undefined;
  const sanitizedHorarios = biz.horarios ? { ...biz.horarios } : undefined;

  return {
    id: biz.id ?? "",
    name: biz.name,
    category: categoryName ?? biz.category ?? "",
    categoryId: biz.categoryId ?? resolved.categoryId,
    categoryName: categoryName ?? resolved.categoryName,
    categoryGroupId: biz.categoryGroupId ?? resolved.groupId,
    colonia: biz.colonia ?? biz.neighborhood ?? "",
    ownerId: biz.ownerId,
    ownerEmail: biz.ownerEmail,
    rating: typeof biz.rating === "number" ? biz.rating : null,
    isOpen: biz.isOpen === "no" ? "no" : "si",
    address: biz.address ?? "",
    description: biz.description,
    hours: biz.hours,
    hasEnvio: biz.hasEnvio === true,
    featured: biz.featured === true || biz.featured === 'true',
    plan: biz.plan,
    priceRange: biz.priceRange,
    image1: biz.image1,
    image2: biz.image2,
    image3: biz.image3,
    logoUrl: biz.logoUrl,
    coverUrl: biz.coverUrl,
    images: biz.images,
    location: biz.location,
    ...(phone ? { phone } : {}),
    ...(whatsapp ? { WhatsApp: whatsapp } : {}),
    ...(sanitizedHorarios ? { horarios: sanitizedHorarios } : {}),
  };
};
