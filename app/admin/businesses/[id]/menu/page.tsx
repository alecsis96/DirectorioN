import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FaArrowLeft, FaUtensils } from 'react-icons/fa';

import MenuManager from '@/components/MenuManager';
import { hasAdminOverride } from '@/lib/adminOverrides';
import { getAdminAuth, getAdminFirestore } from '@/lib/server/firebaseAdmin';

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
      console.error('[admin/businesses/[id]/menu] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

async function fetchBusiness(businessId: string) {
  const db = getAdminFirestore();
  const snapshot = await db.doc(`businesses/${businessId}`).get();

  if (!snapshot.exists) return null;

  const data = snapshot.data() as Record<string, any>;

  return {
    id: snapshot.id,
    name: data.businessName || data.name || 'Sin nombre',
    category: data.category || data.categoryName || 'Sin categoria',
    ownerName: data.ownerName || 'Sin propietario',
  };
}

export default async function AdminBusinessMenuPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await params;
  const businessId = decodeURIComponent(resolvedParams.id);
  const business = await fetchBusiness(businessId);

  if (!business) {
    notFound();
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/admin/businesses"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Volver a negocios
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <FaUtensils className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                Panel admin
              </p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">{business.name}</h1>
              <p className="mt-2 text-sm text-gray-600">
                Gestiona el menu publico, categorias y disponibilidad de este negocio.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>
              <span className="font-semibold text-gray-900">Categoria:</span> {business.category}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-gray-900">Propietario:</span> {business.ownerName}
            </p>
          </div>
        </div>
      </div>

      <MenuManager businessId={business.id} />
    </main>
  );
}
