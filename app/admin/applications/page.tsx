import AdminApplicationsList, { type AdminApplication } from '../../../components/AdminApplicationsList';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';
import { requireLegacyAccess } from '../../../lib/legacyRouteGuard';

export const dynamic = 'force-dynamic';

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
  // Guard: verificar si rutas legacy están habilitadas
  requireLegacyAccess('/admin/applications');
  
  await requireAdminPage('/admin/applications');
  const applications = await fetchPendingApplications();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Legacy</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">Solicitudes iniciales</h1>
          <p className="text-sm sm:text-base text-gray-600">Vista heredada. Usa Inbox o Solicitudes para la operacion diaria.</p>
        </div>

        <AdminApplicationsList applications={applications} />
      </div>
    </main>
  );
}
