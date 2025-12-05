import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';
import AdminNavigation from '../../../../components/AdminNavigation';
import AdminBusinessCreator from '../../../../components/AdminBusinessCreator';

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
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6 pl-14 lg:pl-0">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Panel de control</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-[#38761D]">Crear Nuevo Negocio</h1>
        <p className="text-sm text-gray-600">
          Registra un negocio manualmente en nombre de un usuario.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <AdminNavigation variant="sidebar" />
        
        <div className="lg:col-start-2">
          <AdminBusinessCreator />
        </div>
      </div>
    </main>
  );
}
