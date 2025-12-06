export type Business = {
  id?: string;
  name: string;
  category?: string;
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
  hasDelivery?: boolean;
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
  // Status field
  status?: 'draft' | 'review' | 'published' | 'rejected';
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
  hasDelivery?: boolean;
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
  const phone = typeof biz.phone === "string" && biz.phone.trim().length ? biz.phone.trim() : undefined;
  const whatsapp = typeof biz.WhatsApp === "string" && biz.WhatsApp.trim().length ? biz.WhatsApp.trim() : undefined;
  const sanitizedHorarios = biz.horarios ? { ...biz.horarios } : undefined;

  return {
    id: biz.id ?? "",
    name: biz.name,
    category: biz.category ?? "",
    colonia: biz.colonia ?? biz.neighborhood ?? "",
    ownerId: biz.ownerId,
    ownerEmail: biz.ownerEmail,
    rating: typeof biz.rating === "number" ? biz.rating : null,
    isOpen: biz.isOpen === "no" ? "no" : "si",
    address: biz.address ?? "",
    description: biz.description,
    hours: biz.hours,
    hasDelivery: biz.hasDelivery === true,
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
