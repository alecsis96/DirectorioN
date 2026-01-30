import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';

export const dynamic = 'force-dynamic';

interface TelemetryEvent {
  eventType?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: {
    businessId?: string;
    businessName?: string;
    message?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifyIdToken(token);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) {
      return decoded;
    }
  } catch (error) {
    console.error('[admin/analytics] auth error', error);
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '7d';

    const db = getAdminFirestore();
    
    // Calcular fecha límite según el rango
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Obtener eventos de telemetría
    let eventsQuery = db.collection('telemetry');
    
    if (timeRange !== 'all') {
      eventsQuery = eventsQuery.where('timestamp', '>=', startDate) as any;
    }
    
    const eventsSnapshot = await eventsQuery
      .orderBy('timestamp', 'desc')
      .limit(10000)
      .get();

    const events = eventsSnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
    })) as TelemetryEvent[];

    // Calcular métricas
    const totalEvents = events.length;
    const uniqueUsers = new Set(events.map(e => e.userId || e.sessionId || 'anonymous')).size;
    const pageViews = events.filter(e => e.eventType === 'page_view').length;

    // Top eventos
    const eventCounts: Record<string, number> = {};
    events.forEach(e => {
      const key = e.eventType || 'unknown';
      eventCounts[key] = (eventCounts[key] || 0) + 1;
    });
    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    // Top negocios
    const businessViews: Record<string, { name: string; views: number }> = {};
    events
      .filter(e => e.eventType === 'business_viewed' && e.metadata?.businessId)
      .forEach(e => {
        const id = e.metadata.businessId;
        if (!businessViews[id]) {
          businessViews[id] = { name: e.metadata.businessName || id, views: 0 };
        }
        businessViews[id].views++;
      });
    const topBusinesses = Object.entries(businessViews)
      .map(([businessId, data]) => ({ businessId, businessName: data.name, views: data.views }))
      .sort((a, b) => b.views - a.views);

    // Top CTAs
    const ctaCounts: Record<string, number> = {};
    events
      .filter(e => e.eventType?.startsWith('cta_'))
      .forEach(e => {
        const key = e.eventType || 'unknown';
        ctaCounts[key] = (ctaCounts[key] || 0) + 1;
      });
    const topCTAs = Object.entries(ctaCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Errores recientes
    const errorEvents = events.filter(e => e.eventType === 'error');
    const errorGroups: Record<string, { count: number; lastOccurred: Date }> = {};
    errorEvents.forEach(e => {
      const msg = e.metadata?.message || 'Unknown error';
      if (!errorGroups[msg]) {
        errorGroups[msg] = { count: 0, lastOccurred: e.timestamp };
      }
      errorGroups[msg].count++;
      if (e.timestamp > errorGroups[msg].lastOccurred) {
        errorGroups[msg].lastOccurred = e.timestamp;
      }
    });
    const recentErrors = Object.entries(errorGroups)
      .map(([message, data]) => ({
        message,
        count: data.count,
        lastOccurred: data.lastOccurred.toISOString()
      }))
      .sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime());

    // User engagement
    const searches = events.filter(e => e.eventType === 'search').length;
    const favorites = events.filter(e => e.eventType === 'favorite_added').length;
    const reviews = events.filter(e => e.eventType === 'review_submitted').length;
    const registrations = events.filter(e => e.eventType === 'register_completed').length;

    // Time range stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const timeRangeStats = {
      today: events.filter(e => e.timestamp >= today).length,
      yesterday: events.filter(e => e.timestamp >= yesterday && e.timestamp < today).length,
      last7Days: events.filter(e => e.timestamp >= last7Days).length,
      last30Days: events.filter(e => e.timestamp >= last30Days).length,
    };

    return NextResponse.json({
      totalEvents,
      uniqueUsers,
      pageViews,
      topEvents,
      topBusinesses,
      topCTAs,
      recentErrors,
      userEngagement: {
        searches,
        favorites,
        reviews,
        registrations,
      },
      timeRangeStats,
    });

  } catch (error) {
    console.error('[admin/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
