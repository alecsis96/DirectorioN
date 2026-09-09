'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { auth } from '../../../firebaseConfig';

export type AdminBusinessRecord = { id: string; name: string; category: string | null; businessStatus: string; isActive: boolean; adminStatus: string | null; submittedAt: string | null };
type Filter = 'in_review' | 'published' | 'draft' | 'paused' | 'all';
const FILTERS: Array<[Filter, string]> = [['in_review', 'En revisión'], ['published', 'Publicados'], ['draft', 'Borradores'], ['paused', 'Pausados'], ['all', 'Todos']];

function statusLabel(business: AdminBusinessRecord) {
  if (business.businessStatus === 'in_review') return 'En revisión';
  if (business.businessStatus === 'published') {
    return !business.isActive || business.adminStatus === 'paused' ? 'Pausado' : 'Publicado';
  }
  return 'Borrador';
}

function isPaused(business: AdminBusinessRecord) {
  return business.businessStatus === 'published'
    && (!business.isActive || business.adminStatus === 'paused');
}

export default function AdminBusinessesOperations({ businesses }: { businesses: AdminBusinessRecord[] }) {
  const requested = useSearchParams()?.get('status') || null;
  const [filter, setFilter] = useState<Filter>(FILTERS.some(([id]) => id === requested) ? requested as Filter : 'in_review');
  const [items, setItems] = useState(businesses);
  const [busy, setBusy] = useState<string | null>(null);
  const filtered = useMemo(() => items.filter(business => {
    if (filter === 'all') return true;
    if (filter === 'paused') return isPaused(business);
    if (filter === 'published') return business.businessStatus === 'published' && !isPaused(business);
    return business.businessStatus === filter;
  }), [filter, items]);

  async function review(business: AdminBusinessRecord, action: 'approve' | 'reject') {
    const notes = action === 'reject' ? prompt('Indica las correcciones necesarias') : undefined;
    if (action === 'reject' && (!notes || notes.trim().length < 10)) return;
    const user = auth.currentUser;
    if (!user) return alert('La sesión administrativa ya no está disponible.');
    setBusy(business.id);
    try {
      const response = await fetch('/api/admin/review-business', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ businessId: business.id, action, notes }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo completar la revisión.');
      setItems(current => current.map(item => item.id === business.id ? { ...item, businessStatus: action === 'approve' ? 'published' : 'draft' } : item));
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo completar la revisión.'); }
    finally { setBusy(null); }
  }

  async function togglePaused(business: AdminBusinessRecord) {
    const user = auth.currentUser;
    if (!user) return alert('La sesión administrativa ya no está disponible.');
    const paused = !business.isActive;
    const reason = paused ? undefined : prompt('Motivo para pausar el negocio', 'Revisión administrativa');
    if (!paused && !reason) return;
    setBusy(business.id);
    try {
      const response = await fetch(paused ? '/api/admin/enable-business' : '/api/admin/disable-business', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ businessId: business.id, reason }) });
      if (!response.ok) throw new Error('No se pudo cambiar la disponibilidad.');
      setItems(current => current.map(item => item.id === business.id ? { ...item, isActive: paused } : item));
    } catch (error) { alert(error instanceof Error ? error.message : 'No se pudo cambiar la disponibilidad.'); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <header><p className="text-xs uppercase tracking-wider text-gray-500">Operación</p><h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Negocios</h1><p className="mt-1 text-sm text-gray-600">Revisa y administra negocios ya creados.</p></header>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar negocios">{FILTERS.map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === id ? 'bg-emerald-600 text-white' : 'border bg-white text-gray-700'}`}>{label}</button>)}</div>
    {filtered.length === 0 ? <p className="rounded-2xl border bg-white p-8 text-center text-gray-500">No hay negocios en esta vista.</p> : <div className="space-y-3">{filtered.map(business => <article key={business.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-900">{business.name}</h2><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{statusLabel(business)}</span></div>{business.category ? <p className="mt-1 text-sm text-gray-600">{business.category}</p> : null}{business.businessStatus === 'in_review' && business.submittedAt ? <p className="mt-1 text-xs text-gray-500">Enviado {new Date(business.submittedAt).toLocaleString('es-MX')}</p> : null}</div><div className="flex flex-wrap gap-2">
      <Link href={`/dashboard/${business.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold">{business.businessStatus === 'in_review' ? 'Revisar' : 'Dashboard'}</Link>
      {business.businessStatus === 'in_review' ? <><button disabled={busy === business.id} onClick={() => void review(business, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Publicar</button><button disabled={busy === business.id} onClick={() => void review(business, 'reject')} className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Pedir correcciones</button></> : null}
      {business.businessStatus === 'published' ? <><Link href={`/negocios/${business.id}`} target="_blank" className="rounded-xl border px-3 py-2 text-sm font-semibold">Ver</Link><button disabled={busy === business.id} onClick={() => void togglePaused(business)} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Pausar</button></> : null}
      {isPaused(business) ? <button disabled={busy === business.id} onClick={() => void togglePaused(business)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Activar</button> : null}
    </div></div></article>)}</div>}
  </div>;
}
