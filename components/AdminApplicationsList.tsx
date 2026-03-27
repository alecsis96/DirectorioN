'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { approveApplication, deleteApplication } from '../app/actions/admin';
import AdminQAModal from './AdminQAModal';
import { auth } from '../firebaseConfig';

export type AdminApplication = {
  uid: string;
  businessName: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  plan?: string;
  status?: string;
  notes?: string;
  createdAt?: string | null;
  formData?: Record<string, any>;
};

const badgeMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  solicitud: 'bg-indigo-100 text-indigo-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  const color = (tone && badgeMap[tone]) || 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}

export default function AdminApplicationsList({ applications }: { applications: AdminApplication[] }) {
  const [apps, setApps] = useState(applications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminApplication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión como administrador.');
    return user.getIdToken();
  }, []);

  const handleApprove = useCallback(
    async (applicationId: string) => {
      try {
        setError(null);
        setBusyId(`approve:${applicationId}`);
        const token = await getToken();
        await approveApplication(token, applicationId);
        setApps((prev) => prev.filter((app) => app.uid !== applicationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo aprobar la solicitud.');
      } finally {
        setBusyId(null);
      }
    },
    [getToken]
  );

  const handleDelete = useCallback(
    async (applicationId: string) => {
      try {
        setError(null);
        setBusyId(`delete:${applicationId}`);
        const token = await getToken();
        await deleteApplication(token, applicationId);
        setApps((prev) => prev.filter((app) => app.uid !== applicationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la solicitud.');
      } finally {
        setBusyId(null);
      }
    },
    [getToken]
  );

  const filteredApps = useMemo(() => {
    if (!searchTerm.trim()) return apps;
    const term = searchTerm.toLowerCase();
    return apps.filter((app) =>
      [app.businessName, app.email, app.ownerName, app.phone].some((value) => value?.toLowerCase().includes(term))
    );
  }, [apps, searchTerm]);

  if (!apps.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
        No hay solicitudes pendientes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar negocio, email o teléfono"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />

      {filteredApps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm font-semibold text-gray-600">No se encontraron resultados</p>
        </div>
      ) : null}

      {filteredApps.map((app) => (
        <article key={app.uid} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{app.businessName || 'Negocio sin nombre'}</h3>
                <Badge tone={app.status}>{app.status ?? 'pendiente'}</Badge>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {app.plan === 'sponsor' || app.plan === 'featured' ? 'Premium' : app.plan || 'free'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{app.email || app.phone || app.ownerName || 'Sin contacto principal'}</p>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => setSelected(app)}
                disabled={busyId !== null}
              >
                Revisar
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#38761D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2f5a1a]"
                onClick={() => handleApprove(app.uid)}
                disabled={busyId !== null}
              >
                {busyId === `approve:${app.uid}` ? 'Aprobando...' : 'Aprobar'}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                onClick={() => handleDelete(app.uid)}
                disabled={busyId !== null}
              >
                {busyId === `delete:${app.uid}` ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </article>
      ))}

      {selected ? (
        <AdminQAModal
          application={selected}
          onClose={() => setSelected(null)}
          onApproved={(id) => {
            setApps((prev) => prev.filter((app) => app.uid !== id));
            setSelected(null);
          }}
          onDeleted={(id) => {
            setApps((prev) => prev.filter((app) => app.uid !== id));
            setSelected(null);
          }}
          getToken={getToken}
        />
      ) : null}
    </div>
  );
}
