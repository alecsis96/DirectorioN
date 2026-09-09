import type { Metadata } from 'next';
import AdminApplicationsOperations, { type AdminApplicationRecord } from '../../../../components/admin/applications/AdminApplicationsOperations';
import { requireAdminPage } from '../../../../lib/server/adminPageAuthorization';
import { getAdminFirestore } from '../../../../lib/server/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Solicitudes de negocios | Admin', robots: 'noindex, nofollow' };

function timestamp(value: any): string | null {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

async function fetchApplications(): Promise<AdminApplicationRecord[]> {
  const snapshot = await getAdminFirestore().collection('applications').get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const business = data.business && typeof data.business === 'object' ? data.business : data;
    return {
      id: doc.id,
      name: business.businessName || data.businessName || 'Sin nombre',
      category: business.category || data.category || null,
      status: data.status || 'submitted',
      schemaVersion: data.schemaVersion || 1,
      createdAt: timestamp(data.createdAt || data.updatedAt),
    };
  }).filter(application => application.status !== 'deleted')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export default async function AdminSolicitudesPage() {
  await requireAdminPage('/admin/solicitudes');
  return <AdminApplicationsOperations applications={await fetchApplications()} />;
}
