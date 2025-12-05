import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import PendingBusinessesList from '../../../components/PendingBusinessesList';
import AdminNavigation from '../../../components/AdminNavigation';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

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
      console.error('[admin/pending-businesses] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

function serializeTimestamp(value: any): string | null {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export interface PendingBusiness {
  id: string;
  name: string;
  category?: string;
  ownerEmail?: string;
  ownerName?: string;
  phone?: string;
  status: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  description?: string;
  address?: string;
}

async function fetchPendingBusinesses(): Promise<PendingBusiness[]> {
  const db = getAdminFirestore();
  // Buscar negocios en revisión (enviados por el dueño después de editar)
  const snapshot = await db.collection('businesses').where('status', '==', 'review').get();
  
  if (snapshot.empty) return [];

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, any>;
    return {
      id: doc.id,
      name: data.name || 'Sin nombre',
      category: data.category,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      phone: data.phone,
      status: data.status,
      updatedAt: serializeTimestamp(data.updatedAt),
      createdAt: serializeTimestamp(data.createdAt),
      description: data.description,
      address: data.address,
    };
  });
}

export default async function PendingBusinessesPage() {
  await requireAdmin();
  const businesses = await fetchPendingBusinesses();

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6 pl-14 lg:pl-0">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Panel de control</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#38761D]">Negocios en revisión</h1>
        <p className="text-sm text-gray-600">
          Revisa los negocios que han sido editados y enviados a revisión para publicación.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <AdminNavigation variant="sidebar" />
        <div className="lg:col-start-2">
          <PendingBusinessesList businesses={businesses} />
        </div>
      </div>
    </main>
  );
}
