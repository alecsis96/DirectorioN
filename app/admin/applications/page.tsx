import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminApplicationsList, { type AdminApplication } from '../../../components/AdminApplicationsList';
import AdminQuickNav from '../../../components/AdminQuickNav';
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
    // fallback to ID token
    try {
      const decoded = await auth.verifyIdToken(token);
      if ((decoded as any).admin === true || hasAdminOverride(decoded.email)) return decoded;
    } catch (error) {
      console.error('[admin/applications] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

function serializeTimestamp(value: any): string | null {
  if (value?.toDate) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

async function fetchPendingApplications(): Promise<AdminApplication[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection('applications').where('status', 'in', ['pending', 'solicitud']).get();
  if (snapshot.empty) return [];

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, any>;
    const formData = (data.formData as Record<string, any>) || {};
    return {
      uid: doc.id,
      businessName: (data.businessName as string) || 'Negocio sin nombre',
      ownerName: data.ownerName as string | undefined,
      email: data.ownerEmail || data.email,
      phone: data.ownerPhone as string | undefined,
      plan: data.plan as string | undefined,
      status: data.status as string | undefined,
      notes: data.notes as string | undefined,
      createdAt: serializeTimestamp(data.createdAt),
      formData,
    };
  });
}

export default async function AdminApplicationsPage() {
  await requireAdmin();
  const applications = await fetchPendingApplications();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Panel de control</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">Solicitudes Pendientes</h1>
          <p className="text-sm sm:text-base text-gray-600">Revisa las aplicaciones que están en proceso de aprobación</p>
        </div>

        {/* Content */}
        <AdminApplicationsList applications={applications} />
      </div>
      
      {/* Navegación flotante */}
      <AdminQuickNav />
    </main>
  );
}
