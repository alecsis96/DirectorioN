'use client';

import { useMemo, useState } from 'react';
import { approveApplicationV2 } from '../../../app/actions/adminBusinessActions';
import { auth } from '../../../firebaseConfig';

export type AdminApplicationRecord = { id: string; name: string; category: string | null; status: string; schemaVersion: number; createdAt: string | null };
type Filter = 'new' | 'needs_info' | 'approved' | 'rejected' | 'all';
const FILTERS: Array<[Filter, string]> = [['new', 'Nuevas'], ['needs_info', 'Necesita información'], ['approved', 'Aprobadas'], ['rejected', 'Rechazadas'], ['all', 'Todas']];
const isNew = (status: string) => ['submitted', 'pending', 'solicitud'].includes(status);

export default function AdminApplicationsOperations({ applications }: { applications: AdminApplicationRecord[] }) {
  const [filter, setFilter] = useState<Filter>('new');
  const [items, setItems] = useState(applications);
  const [busy, setBusy] = useState<string | null>(null);
  const filtered = useMemo(() => items.filter(item => filter === 'all' || (filter === 'new' ? isNew(item.status) : item.status === filter)), [filter, items]);

  async function update(application: AdminApplicationRecord, action: 'approve' | 'reject' | 'request-info') {
    const user = auth.currentUser;
    if (!user) return alert('La sesión administrativa ya no está disponible.');
    setBusy(application.id);
    try {
      const token = await user.getIdToken();
      if (action === 'approve' && application.schemaVersion === 2) {
        await approveApplicationV2(application.id, token);
      } else {
        const response = await fetch('/api/admin/inbox-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ itemId: application.id, businessId: application.id, action, type: 'application' }) });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar la solicitud.');
      }
      const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_info';
      setItems(current => current.map(item => item.id === application.id ? { ...item, status } : item));
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo actualizar la solicitud.'); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <header><p className="text-xs uppercase tracking-wider text-gray-500">Operación</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Solicitudes</h1><p className="mt-1 text-sm text-gray-600">Decide qué solicitudes iniciales pasan a convertirse en negocio.</p></header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar solicitudes">{FILTERS.map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === id ? 'bg-emerald-600 text-white' : 'border bg-white text-gray-700'}`}>{label}</button>)}</div>
    {filtered.length === 0 ? <p className="rounded-2xl border bg-white p-8 text-center text-gray-500">No hay solicitudes en esta vista.</p> : <div className="grid gap-3 lg:grid-cols-2">{filtered.map(application => <article key={application.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-900">{application.name}</h2><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{isNew(application.status) ? 'Nueva' : application.status === 'needs_info' ? 'Necesita información' : application.status === 'approved' ? 'Aprobada' : 'Rechazada'}</span></div>{application.category ? <p className="mt-1 text-sm text-gray-600">{application.category}</p> : null}{application.createdAt ? <p className="mt-1 text-xs text-gray-500">Recibida {new Date(application.createdAt).toLocaleString('es-MX')}</p> : null}</div></div>
      {isNew(application.status) ? <div className="mt-4 grid gap-2 sm:grid-cols-3"><button disabled={busy === application.id} onClick={() => void update(application, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Aprobar solicitud</button><button disabled={busy === application.id} onClick={() => void update(application, 'request-info')} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">Pedir información</button><button disabled={busy === application.id} onClick={() => void update(application, 'reject')} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50">Rechazar</button></div> : null}
    </article>)}</div>}
  </div>;
}
