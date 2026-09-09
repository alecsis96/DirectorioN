import { requireAdminPage } from '../../../lib/server/adminPageAuthorization';

export default async function AdminConfigurationPage() {
  await requireAdminPage('/admin/configuracion');
  return <div className="space-y-4">
    <header><p className="text-xs uppercase tracking-wider text-gray-500">Administración</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Configuración</h1></header>
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
      No hay ajustes editables desde el panel en esta fase.
    </div>
  </div>;
}
