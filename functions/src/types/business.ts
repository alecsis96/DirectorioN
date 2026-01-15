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
  reviewCount?: number;
  ownerId?: string;
  ownerEmail?: string;
  plan?: "free" | "featured" | "sponsor" | string;
  isOpen?: "si" | "no" | string;
  hasEnvio?: boolean;
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
  previousPlan?: string;
  downgradedAt?: string;
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
