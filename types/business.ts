export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  WhatsApp: string;
  Facebook: string;
  price: string;
  rating: number;
  colonia?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  location?: { lat: number; lng: number };
  isOpen: string; // "si" | "no"
  featured: string; // "si" | "no"
  plan?: 'free' | 'featured' | 'sponsor';
  hours: string;
  horarios?: {
    lunes?: { abierto: boolean; desde: string; hasta: string };
    martes?: { abierto: boolean; desde: string; hasta: string };
    miercoles?: { abierto: boolean; desde: string; hasta: string };
    jueves?: { abierto: boolean; desde: string; hasta: string };
    viernes?: { abierto: boolean; desde: string; hasta: string };
    sabado?: { abierto: boolean; desde: string; hasta: string };
    domingo?: { abierto: boolean; desde: string; hasta: string };
  };
  image1?: string;
  image2?: string;
  image3?: string;
  images?: { url: string; publicId?: string }[];
  ownerId?: string;
  ownerEmail?: string; 
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
