import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import InboxVirtual from '@/components/admin/operations/InboxVirtual';
import { hasAdminOverride } from '@/lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '@/lib/server/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Inbox - Admin Panel',
};

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) redirect('/para-negocios?auth=required');

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

interface InboxItem {
  id: string;
  type: string;
  priority: 'critical' | 'warning' | 'info';
  priorityScore: number;
  businessName: string;
  businessId: string;
  metadata: any;
  actions: string[];
}

async function fetchInboxItems() {
  const db = getAdminFirestore();
  const now = new Date();
  const items: InboxItem[] = [];

  try {
    const applicationsSnap = await db.collection('applications').where('status', 'in', ['pending', 'solicitud']).limit(20).get();
    applicationsSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        type: 'application',
        priority: 'info',
        priorityScore: 3,
        businessName: data.businessName || 'Sin nombre',
        businessId: doc.id,
        metadata: {
          plan: data.plan || 'free',
          email: data.ownerEmail || data.email,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        },
        actions: ['approve', 'reject', 'request-info'],
      });
    });

    const inReviewSnap = await db.collection('businesses').where('businessStatus', '==', 'in_review').limit(20).get();
    inReviewSnap.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        type: 'review',
        priority: 'warning',
        priorityScore: 2,
        businessName: data.businessName || data.name || 'Sin nombre',
        businessId: doc.id,
        metadata: {
          plan: data.plan,
          category: data.category,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        },
        actions: ['publish', 'reject'],
      });
    });

    const paymentsSnap = await db.collection('businesses').where('plan', 'in', ['featured', 'sponsor']).get();
    paymentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (!data.planExpiresAt) return;

      const expiresAt = data.planExpiresAt.toDate();
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        items.push({
          id: `payment-${doc.id}`,
          type: 'payment',
          priority: 'critical',
          priorityScore: 1,
          businessName: data.businessName || data.name || 'Sin nombre',
          businessId: doc.id,
          metadata: {
            plan: data.plan,
            daysOverdue: Math.abs(daysUntil),
          },
          actions: ['remind', 'suspend', 'extend'],
        });
      } else if (daysUntil <= 7) {
        items.push({
          id: `payment-${doc.id}`,
          type: 'expiration',
          priority: 'warning',
          priorityScore: 2,
          businessName: data.businessName || data.name || 'Sin nombre',
          businessId: doc.id,
          metadata: {
            plan: data.plan,
            daysUntilExpiration: daysUntil,
          },
          actions: ['remind', 'extend'],
        });
      }
    });

    items.sort((a, b) => a.priorityScore - b.priorityScore);
  } catch (error) {
    console.error('[inbox] Error fetching items:', error);
  }

  return items;
}

export default async function AdminInboxPage() {
  await requireAdmin();
  const items = await fetchInboxItems();

  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Core</p>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-sm text-gray-600">Una bandeja para ver qué requiere acción hoy y resolverlo rápido.</p>
      </div>

      <InboxVirtual items={items} />
    </div>
  );
}
