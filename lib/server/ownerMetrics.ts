import { getAdminFirestore } from "./firebaseAdmin";

export type OwnerMetrics = {
  totalViews: number;
  totalPhoneClicks: number;
  totalWhatsappClicks: number;
  totalMapClicks: number;
  totalFavorites: number;
  totalReviews: number;
  avgRating: number;
};

export type BusinessWithMetrics = {
  id: string;
  name?: string;
  businessName?: string;
  category?: string;
  status?: string;
  plan?: string;
  planExpiresAt?: any;
  logoUrl?: string;
  image1?: string;
  coverUrl?: string;
  description?: string;
  address?: string;
  createdAt?: any;
  metrics?: {
    views: number;
    phoneClicks: number;
    whatsappClicks: number;
  };
};

/**
 * Obtiene métricas agregadas de todos los negocios del propietario
 */
export async function getOwnerAggregatedMetrics(ownerId: string): Promise<OwnerMetrics> {
  const db = getAdminFirestore();
  
  try {
    // Obtener todos los negocios del owner
    const businessesSnapshot = await db
      .collection('businesses')
      .where('ownerId', '==', ownerId)
      .get();

    if (businessesSnapshot.empty) {
      return {
        totalViews: 0,
        totalPhoneClicks: 0,
        totalWhatsappClicks: 0,
        totalMapClicks: 0,
        totalFavorites: 0,
        totalReviews: 0,
        avgRating: 0,
      };
    }

    const businessIds = businessesSnapshot.docs.map(doc => doc.id);

    // Calcular fecha de 30 días atrás
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalViews = 0;
    let totalPhoneClicks = 0;
    let totalWhatsappClicks = 0;
    let totalMapClicks = 0;

    // Obtener eventos de telemetría para todos los negocios
    for (const businessId of businessIds) {
      const eventsSnapshot = await db
        .collection('telemetry_events')
        .where('businessId', '==', businessId)
        .where('timestamp', '>', thirtyDaysAgo)
        .get();

      eventsSnapshot.docs.forEach(doc => {
        const event = doc.data().event;
        if (event === 'business_viewed') totalViews++;
        if (event === 'cta_call') totalPhoneClicks++;
        if (event === 'cta_whatsapp') totalWhatsappClicks++;
        if (event === 'cta_maps') totalMapClicks++;
      });
    }

    // Contar favoritos y reseñas
    let totalFavorites = 0;
    let totalReviews = 0;
    let sumRatings = 0;

    for (const businessId of businessIds) {
      // Contar favoritos (aproximado por eventos)
      const favSnapshot = await db
        .collection('telemetry_events')
        .where('businessId', '==', businessId)
        .where('event', '==', 'favorite_added')
        .count()
        .get();
      
      totalFavorites += favSnapshot.data().count;

      // Contar reseñas
      const reviewsSnapshot = await db
        .collection('reviews')
        .where('businessId', '==', businessId)
        .get();
      
      totalReviews += reviewsSnapshot.size;
      reviewsSnapshot.docs.forEach(doc => {
        sumRatings += doc.data().rating || 0;
      });
    }

    const avgRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    return {
      totalViews,
      totalPhoneClicks,
      totalWhatsappClicks,
      totalMapClicks,
      totalFavorites,
      totalReviews,
      avgRating,
    };
  } catch (error) {
    console.error('[ownerMetrics] Error fetching metrics:', error);
    return {
      totalViews: 0,
      totalPhoneClicks: 0,
      totalWhatsappClicks: 0,
      totalMapClicks: 0,
      totalFavorites: 0,
      totalReviews: 0,
      avgRating: 0,
    };
  }
}

/**
 * Obtiene los negocios del propietario con métricas básicas
 */
export async function getBusinessesWithMetrics(ownerId: string): Promise<BusinessWithMetrics[]> {
  const db = getAdminFirestore();
  
  const businessesSnapshot = await db
    .collection('businesses')
    .where('ownerId', '==', ownerId)
    .get();

  if (businessesSnapshot.empty) {
    return [];
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const businesses: BusinessWithMetrics[] = await Promise.all(
    businessesSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Obtener métricas básicas de telemetría
      const eventsSnapshot = await db
        .collection('telemetry_events')
        .where('businessId', '==', doc.id)
        .where('timestamp', '>', thirtyDaysAgo)
        .get();

      let views = 0;
      let phoneClicks = 0;
      let whatsappClicks = 0;

      eventsSnapshot.docs.forEach(eventDoc => {
        const event = eventDoc.data().event;
        if (event === 'business_viewed') views++;
        if (event === 'cta_call') phoneClicks++;
        if (event === 'cta_whatsapp') whatsappClicks++;
      });

      return {
        id: doc.id,
        name: data.name || data.businessName,
        businessName: data.businessName,
        category: data.category,
        status: data.status,
        plan: data.plan || 'free',
        planExpiresAt: data.planExpiresAt,
        logoUrl: data.logoUrl,
        image1: data.image1,
        coverUrl: data.coverUrl,
        description: data.description,
        address: data.address,
        createdAt: data.createdAt,
        metrics: {
          views,
          phoneClicks,
          whatsappClicks,
        },
      };
    })
  );

  return businesses;
}
