import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/server/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { itemId, businessId, action, type } = await request.json();
    
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
          publishedAt: new Date().toISOString(),
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
    console.error('[inbox-action] Error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
