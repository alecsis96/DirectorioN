import AdminBusinessCreator from '../../../../components/AdminBusinessCreator';
import { requireAdminPage } from '../../../../lib/server/adminPageAuthorization';

export const dynamic = 'force-dynamic';

export default async function AdminCreateBusinessPage() {
  await requireAdminPage('/admin/businesses/nuevo');

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
