import AdminBusinessesOperations, { type AdminBusinessRecord } from '../../../components/admin/businesses/AdminBusinessesOperations';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';

export const dynamic = 'force-dynamic';

function timestamp(value: any): string | null {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

async function fetchBusinesses(): Promise<AdminBusinessRecord[]> {
  const snapshot = await getAdminFirestore().collection('businesses').get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.businessName || data.name || 'Sin nombre',
      category: data.categoryName || data.category || null,
      businessStatus: data.businessStatus || (data.status === 'published' ? 'published' : 'draft'),
      isActive: data.isActive !== false,
      adminStatus: data.adminStatus || null,
      submittedAt: timestamp(data.submittedForReviewAt || data.updatedAt || data.createdAt),
    };
  }).filter(business => business.businessStatus !== 'deleted' && business.adminStatus !== 'deleted')
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
}

export default async function AdminBusinessesPage() {
  await requireAdminPage('/admin/businesses');
  return <AdminBusinessesOperations businesses={await fetchBusinesses()} />;
}
