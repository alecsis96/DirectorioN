import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../../lib/server/firebaseAdmin';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

/**
 * API endpoint para obtener analytics de un negocio específico
 * Solo el dueño del negocio puede acceder
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const userId = decodedToken.uid;
    const businessId = req.query.id as string;

    if (!businessId) {
      return res.status(400).json({ error: 'ID de negocio requerido' });
    }

    // Verificar que el usuario es dueño del negocio
    const businessDoc = await adminDb.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const businessData = businessDoc.data();
    if (businessData?.ownerId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos datos' });
    }

    // Verificar que el negocio tenga plan destacado o patrocinado
    const plan = businessData?.plan || 'free';
    if (plan !== 'featured' && plan !== 'sponsor') {
      return res.status(403).json({ 
        error: 'Los reportes solo están disponibles para negocios con plan Destacado o Patrocinado',
        requiresUpgrade: true,
        currentPlan: plan
      });
    }

    // Obtener período de tiempo (por defecto últimos 30 días)
    const daysParam = req.query.days ? parseInt(req.query.days as string) : 30;
    const days = Math.min(Math.max(daysParam, 1), 90); // Entre 1 y 90 días

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener eventos de telemetría para este negocio
    const eventsSnapshot = await adminDb
      .collection('telemetry_events')
      .where('businessId', '==', businessId)
      .where('createdAt', '>=', startDate)
      .orderBy('createdAt', 'desc')
      .get();

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    // Calcular métricas
    const analytics = calculateBusinessAnalytics(events, days, plan);

    return res.status(200).json(analytics);
  } catch (error: any) {
    console.error('Error fetching business analytics:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function calculateBusinessAnalytics(events: any[], days: number, plan: string) {
  // Total de eventos
  const totalEvents = events.length;

  // Vistas del negocio
  const businessViews = events.filter(
    e => e.event === 'business_viewed' || e.event === 'business_card_clicked'
  ).length;

  // Vistas únicas (por userId o IP)
  const uniqueViewers = new Set();
  events
    .filter(e => e.event === 'business_viewed' || e.event === 'business_card_clicked')
    .forEach(e => {
      const identifier = e.userId || e.ip || 'anonymous';
      uniqueViewers.add(identifier);
    });

  // Clics en CTAs
  const ctaClicks = {
    call: events.filter(e => e.event === 'cta_call').length,
    whatsapp: events.filter(e => e.event === 'cta_whatsapp').length,
    maps: events.filter(e => e.event === 'cta_maps').length,
    facebook: events.filter(e => e.event === 'cta_facebook').length,
    instagram: events.filter(e => e.event === 'cta_instagram').length,
    website: events.filter(e => e.event === 'cta_website').length,
    email: events.filter(e => e.event === 'cta_email').length,
  };

  const totalCTAClicks = Object.values(ctaClicks).reduce((sum, count) => sum + count, 0);

  // Favoritos
  const favoritesAdded = events.filter(e => e.event === 'favorite_added').length;
  const favoritesRemoved = events.filter(e => e.event === 'favorite_removed').length;
  const netFavorites = favoritesAdded - favoritesRemoved;

  // Reviews
  const reviewsSubmitted = events.filter(e => e.event === 'review_submitted').length;
  const reviewsEdited = events.filter(e => e.event === 'review_edited').length;
  const reviewsDeleted = events.filter(e => e.event === 'review_deleted').length;

  // Imágenes vistas
  const imageViews = events.filter(e => e.event === 'business_image_viewed').length;

  // Horarios consultados
  const hoursChecked = events.filter(e => e.event === 'business_hours_checked').length;

  // Compartidos
  const shares = events.filter(e => e.event === 'business_shared').length;

  // Tasa de conversión (CTAs / Vistas)
  const conversionRate = businessViews > 0 ? (totalCTAClicks / businessViews) * 100 : 0;

  // Engagement rate (interacciones / vistas)
  const interactions = totalCTAClicks + favoritesAdded + reviewsSubmitted + shares;
  const engagementRate = businessViews > 0 ? (interactions / businessViews) * 100 : 0;

  // Datos por día (últimos 7 días para gráficos)
  const last7Days = getLast7DaysData(events);

  // Top CTAs (ordenados por cantidad)
  const topCTAs = Object.entries(ctaClicks)
    .map(([type, count]) => ({ type, count }))
    .filter(cta => cta.count > 0)
    .sort((a, b) => b.count - a.count);

  // Dispositivos (basado en user agent) y Horarios Populares: SOLO para plan Sponsor
  let devices = { mobile: 0, desktop: 0, unknown: 0 };
  let topHours: Array<{ hour: number; count: number }> = [];

  if (plan === 'sponsor') {
    devices = {
      mobile: events.filter(e => e.userAgent?.toLowerCase().includes('mobile')).length,
      desktop: events.filter(e => e.userAgent && !e.userAgent.toLowerCase().includes('mobile')).length,
      unknown: events.filter(e => !e.userAgent).length,
    };

    // Horarios de mayor actividad (hora del día)
    const hourlyActivity: Record<number, number> = {};
    events.forEach(e => {
      if (e.createdAt) {
        const hour = new Date(e.createdAt).getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      }
    });

    topHours = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  return {
    period: {
      days,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    overview: {
      totalEvents,
      businessViews,
      uniqueViewers: uniqueViewers.size,
      totalCTAClicks,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      engagementRate: parseFloat(engagementRate.toFixed(2)),
    },
    ctas: {
      ...ctaClicks,
      total: totalCTAClicks,
      topCTAs,
    },
    engagement: {
      favoritesAdded,
      favoritesRemoved,
      netFavorites,
      reviewsSubmitted,
      reviewsEdited,
      reviewsDeleted,
      imageViews,
      hoursChecked,
      shares,
    },
    trends: {
      last7Days,
    },
    audience: {
      devices,
      topHours,
    },
  };
}

function getLast7DaysData(events: any[]) {
  const data: Array<{ date: string; views: number; ctas: number; favorites: number }> = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayEvents = events.filter(e => {
      const eventDate = new Date(e.createdAt);
      return eventDate >= date && eventDate < nextDate;
    });
    
    const views = dayEvents.filter(
      e => e.event === 'business_viewed' || e.event === 'business_card_clicked'
    ).length;
    
    const ctas = dayEvents.filter(e => e.event.startsWith('cta_')).length;
    
    const favorites = dayEvents.filter(e => e.event === 'favorite_added').length;
    
    data.push({
      date: date.toISOString().split('T')[0],
      views,
      ctas,
      favorites,
    });
  }
  
  return data;
}
