import Link from 'next/link';
import { requireAdminPage } from '@/lib/server/adminPageAuthorization';

export const metadata = { title: 'Panel de administración' };

export default async function AdminPanelPage() {
  await requireAdminPage('/admin');
  return <div className="space-y-6">
    <header><p className="text-xs uppercase tracking-wider text-gray-500">Administración</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Panel</h1><p className="mt-1 text-sm text-gray-600">Elige la etapa que quieres gestionar.</p></header>
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/admin/solicitudes" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300"><h2 className="font-bold text-gray-900">Solicitudes</h2><p className="mt-1 text-sm text-gray-600">Aprobar solicitudes iniciales, pedir información o rechazarlas.</p></Link>
      <Link href="/admin/businesses?status=in_review" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300"><h2 className="font-bold text-gray-900">Negocios</h2><p className="mt-1 text-sm text-gray-600">Revisar borradores enviados y publicar negocios.</p></Link>
      <Link href="/admin/observabilidad" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300"><h2 className="font-bold text-gray-900">Observabilidad</h2><p className="mt-1 text-sm text-gray-600">Localizar estados y relaciones que requieren atención.</p></Link>
    </div>
  </div>;
}
