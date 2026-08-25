import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebaseAdmin';
import {
  assertAdminToken,
  AuthorizationError,
  extractBearerToken,
} from '@/lib/server/authorization';
import { MONETIZATION_FEATURE_ENABLED } from '@/lib/featureFlags';

const ACTIONS_BY_TYPE: Record<string, ReadonlySet<string>> = {
  application: new Set(['approve', 'reject', 'request-info']),
  review: new Set(['publish', 'reject']),
  payment: new Set(['remind', 'suspend']),
  expiration: new Set(['remind', 'extend']),
};

export async function POST(request: NextRequest) {
  try {
    await assertAdminToken(extractBearerToken(request.headers));

    const body = await request.json();
    const { itemId, businessId, action, type } =
      body && typeof body === 'object' && !Array.isArray(body) ? body : {};
    if (
      typeof itemId !== 'string' || !itemId.trim() ||
      typeof businessId !== 'string' || !businessId.trim() ||
      typeof action !== 'string' ||
      typeof type !== 'string' ||
      !ACTIONS_BY_TYPE[type]?.has(action)
    ) {
      return NextResponse.json({ error: 'Invalid inbox action payload' }, { status: 400 });
    }

    if (!MONETIZATION_FEATURE_ENABLED && (type === 'payment' || type === 'expiration')) {
      return NextResponse.json(
        { error: 'Monetization is temporarily disabled', code: 'MONETIZATION_DISABLED' },
        { status: 503 }
      );
    }

    const db = getAdminFirestore();
    
    // Execute action based on type
    switch (action) {
      case 'approve':
        if (type === 'application') {
          await db.collection('applications').doc(itemId).update({
            status: 'approved',
            approvedAt: new Date().toISOString(),
          });
        }
        break;
      
      case 'publish':
        await db.collection('businesses').doc(businessId).update({
          businessStatus: 'published',
          applicationStatus: 'approved',
          adminStatus: 'active',
          visibility: 'published',
          isActive: true,
          publishedAt: new Date().toISOString(),
          lastReviewedAt: new Date().toISOString(),
        });
        break;
      
      case 'reject':
        if (type === 'application') {
          await db.collection('applications').doc(itemId).update({
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
          });
        } else {
          await db.collection('businesses').doc(businessId).update({
            applicationStatus: 'rejected',
            rejectedAt: new Date().toISOString(),
          });
        }
        break;
      
      case 'remind':
        // TODO: Enviar notificación WhatsApp/email
        console.log('[inbox-action] Sending reminder for:', businessId);
        break;
      
      case 'suspend':
        await db.collection('businesses').doc(businessId).update({
          isActive: false,
          disabledReason: 'payment_overdue',
          suspendedAt: new Date().toISOString(),
        });
        break;
      
      case 'extend':
        // Extend planExpiresAt by 30 days
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        const currentExpires = businessDoc.data()?.planExpiresAt?.toDate() || new Date();
        const newExpires = new Date(currentExpires.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        await db.collection('businesses').doc(businessId).update({
          planExpiresAt: newExpires,
          extendedAt: new Date().toISOString(),
        });
        break;
      
      case 'request-info':
        if (type === 'application') {
          await db.collection('applications').doc(itemId).update({
            status: 'needs_info',
            infoRequestedAt: new Date().toISOString(),
          });
          // TODO: Send notification to business owner
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[inbox-action] Error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
