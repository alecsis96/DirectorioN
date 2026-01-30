import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride as checkAdminOverride } from '../../../lib/adminOverrides';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

type TimeRange = 'today' | '7d' | '30d' | 'all';

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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);

    // Verificar que sea admin
    const isAdmin = await checkAdminOverride(decoded.email);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Validar timeRange
    const VALID_RANGES: TimeRange[] = ['today', '7d', '30d', 'all'];
    const requestedRange = req.query.timeRange as string;
    const timeRange: TimeRange = VALID_RANGES.includes(requestedRange as TimeRange)
      ? (requestedRange as TimeRange)
      : '7d';
    
    const startDate = getStartDate(timeRange);

    // Query base
    let query = adminDb.collection('telemetry_events');
    
    if (startDate) {
      query = query.where('createdAt', '>=', startDate) as any;
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calcular estadísticas
    const analytics = calculateAnalytics(events, timeRange);

    res.status(200).json(analytics);
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getStartDate(timeRange: TimeRange): Date | null {
  const now = new Date();
  
  switch (timeRange) {
    case 'today':
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    
    case '7d':
      const week = new Date(now);
      week.setDate(week.getDate() - 7);
      return week;
    
    case '30d':
      const month = new Date(now);
      month.setDate(month.getDate() - 30);
      return month;
    
    case 'all':
    default:
      return null;
  }
}

function calculateAnalytics(events: any[], timeRange: TimeRange) {
  const now = new Date();
  
  // Total events
  const totalEvents = events.length;
  
  // Unique users - Diferenciar autenticados vs sesiones totales
  const authenticatedUsers = new Set(events.map(e => e.userId).filter(Boolean));
  const totalSessions = new Set(
    events.map(e => e.sessionId || e.clientId).filter(Boolean)
  );
  const uniqueUsers = totalSessions.size; // Total sesiones (auth + anon)
  const authenticatedCount = authenticatedUsers.size;
  
  // Page views
  const pageViews = events.filter(e => e.event === 'page_view').length;
  
  // Top events
  const eventCounts: Record<string, number> = {};
  events.forEach(e => {
    eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
  });
  const topEvents = Object.entries(eventCounts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count);
  
  // Top businesses
  const businessViews: Record<string, { businessId: string; businessName: string; views: number }> = {};
  events
    .filter(e => e.businessId && (e.event === 'business_viewed' || e.event === 'business_card_clicked'))
    .forEach(e => {
      if (!businessViews[e.businessId]) {
        businessViews[e.businessId] = {
          businessId: e.businessId,
          businessName: e.businessName || 'Sin nombre',
          views: 0
        };
      }
      businessViews[e.businessId].views++;
    });
  const topBusinesses = Object.values(businessViews)
    .sort((a, b) => b.views - a.views);
  
  // Top CTAs
  const ctaCounts: Record<string, number> = {};
  events
    .filter(e => e.event.startsWith('cta_'))
    .forEach(e => {
      ctaCounts[e.event] = (ctaCounts[e.event] || 0) + 1;
    });
  const topCTAs = Object.entries(ctaCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  
  // Recent errors
  const errorMap: Record<string, { message: string; count: number; lastOccurred: string }> = {};
  events
    .filter(e => e.event === 'error_occurred' && e.error)
    .forEach(e => {
      const msg = e.error.message;
      if (!errorMap[msg]) {
        errorMap[msg] = {
          message: msg,
          count: 0,
          lastOccurred: e.timestamp || e.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      }
      errorMap[msg].count++;
      const currentTime = e.timestamp || e.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
      if (currentTime > errorMap[msg].lastOccurred) {
        errorMap[msg].lastOccurred = currentTime;
      }
    });
  const recentErrors = Object.values(errorMap)
    .sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime());
  
  // User engagement
  const userEngagement = {
    searches: events.filter(e => e.event === 'search').length,
    favorites: events.filter(e => e.event === 'favorite_added' || e.event === 'favorite_removed').length,
    reviews: events.filter(e => e.event === 'review_submitted').length,
    registrations: events.filter(e => e.event === 'register_completed').length,
  };
  
  // Time range stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);
  
  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);
  
  const timeRangeStats = {
    today: events.filter(e => {
      const date = e.createdAt?.toDate?.() || new Date(e.timestamp);
      return date >= today;
    }).length,
    yesterday: events.filter(e => {
      const date = e.createdAt?.toDate?.() || new Date(e.timestamp);
      return date >= yesterday && date < today;
    }).length,
    last7Days: events.filter(e => {
      const date = e.createdAt?.toDate?.() || new Date(e.timestamp);
      return date >= last7Days;
    }).length,
    last30Days: events.filter(e => {
      const date = e.createdAt?.toDate?.() || new Date(e.timestamp);
      return date >= last30Days;
    }).length,
  };
  
  return {
    totalEvents,
    uniqueUsers, // Total sesiones
    authenticatedUsers: authenticatedCount, // Usuarios con cuenta
    anonymousRate: totalSessions.size > 0 
      ? ((totalSessions.size - authenticatedCount) / totalSessions.size * 100).toFixed(1)
      : '0',
    pageViews,
    topEvents,
    topBusinesses,
    topCTAs,
    recentErrors,
    userEngagement,
    timeRangeStats,
  };
}
