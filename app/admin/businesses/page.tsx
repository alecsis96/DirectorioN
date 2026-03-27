import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminBusinessList from '../../../components/AdminBusinessList';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { downgradeExpiredPremiumPlans } from '../../../lib/server/premiumPlanExpiry';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    redirect('/para-negocios?auth=required');
  }

  const auth = getAdminAuth();
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
  } catch {
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin/businesses] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

interface BusinessData {
  id: string;
  businessName: string;
  ownerName?: string;
  ownerEmail?: string;
  category?: string;
  status: string;
  plan: string;
  planExpiresAt?: string | null;
  createdAt?: string;
  approvedAt?: string;
  viewCount?: number;
  reviewCount?: number;
  avgRating?: number;
  stripeSubscriptionStatus?: string;
  nextPaymentDate?: string | null;
  lastPaymentDate?: string | null;
  isActive?: boolean;
}

async function fetchAllBusinesses(): Promise<BusinessData[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection('businesses').where('businessStatus', '==', 'published').get();

  if (snapshot.empty) return [];

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessName: data.businessName || data.name || 'Sin nombre',
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        category: data.category,
        status: data.status,
        plan: data.plan || 'free',
        planExpiresAt: data.planExpiresAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        viewCount: data.viewCount || 0,
        reviewCount: data.reviewCount || 0,
        avgRating: data.avgRating || 0,
        stripeSubscriptionStatus: data.stripeSubscriptionStatus,
        nextPaymentDate: data.nextPaymentDate?.toDate?.()?.toISOString() || null,
        lastPaymentDate: data.lastPaymentDate?.toDate?.()?.toISOString() || null,
        isActive: data.isActive,
      };
    })
    .sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export default async function AdminBusinessesPage() {
  await requireAdmin();
  await downgradeExpiredPremiumPlans({ force: true });
  const businesses = await fetchAllBusinesses();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
          <h1 className="mb-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Negocios</h1>
          <p className="text-sm text-gray-600">Lista corta para cambiar plan, editar o pausar sin ruido extra.</p>
        </div>

        {businesses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
            <div className="mb-4 text-4xl text-gray-400 sm:text-5xl">•</div>
            <p className="text-gray-500">No hay negocios publicados aun.</p>
          </div>
        ) : (
          <>
            <AdminBusinessList businesses={businesses} />
            <div className="mt-6 text-center text-sm text-gray-500">Mostrando {businesses.length} negocios publicados</div>
          </>
        )}
      </div>
    </main>
  );
}
