import PendingBusinessesList from '../../../components/PendingBusinessesList';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';

export const dynamic = 'force-dynamic';

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
  const snapshot = await db.collection('businesses').where('businessStatus', '==', 'in_review').get();
  
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
  await requireAdminPage('/admin/pending-businesses');
  const businesses = await fetchPendingBusinesses();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#38761D] mb-2">Negocios en revision</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Revisa los negocios que sus propietarios enviaron explícitamente.
          </p>
        </div>
        <PendingBusinessesList businesses={businesses} />
      </div>
    </main>
  );
}
