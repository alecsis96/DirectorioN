import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import AdminBusinessCreator from '../../../../components/AdminBusinessCreator';
import { hasAdminOverride } from '../../../../lib/adminOverrides';
import { getAdminAuth } from '../../../../lib/server/firebaseAdmin';

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
      console.error('[admin/businesses/nuevo] auth error', error);
    }
  }

  redirect('/?auth=forbidden');
}

export default async function AdminCreateBusinessPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 pl-14 lg:pl-0">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Operacion</p>
        <h1 className="mt-2 text-2xl font-bold text-[#38761D] sm:text-3xl">Crear negocio</h1>
        <p className="text-sm text-gray-600">Alta manual para un negocio nuevo, sin duplicar navegacion dentro del admin.</p>
      </div>

      <AdminBusinessCreator />
    </main>
  );
}
