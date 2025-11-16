'use client';

import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { auth } from '../firebaseConfig';
import { approveApplication, deleteApplication } from '../app/actions/admin';
import AdminQAModal from './AdminQAModal';

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

const cardClass =
  'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3 transition hover:border-gray-300';

function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  const color = (tone && badgeMap[tone]) || 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{children}</span>;
}

export default function AdminApplicationsList({ applications }: { applications: AdminApplication[] }) {
  const [apps, setApps] = useState(applications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminApplication | null>(null);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debes iniciar sesión como administrador.');
    }
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
    [getToken],
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
    [getToken],
  );

  if (!apps.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
        No hay solicitudes pendientes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {apps.map((app) => (
        <article key={app.uid} className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">UID: {app.uid}</p>
              <h3 className="text-lg font-semibold text-gray-900">{app.businessName || 'Negocio sin nombre'}</h3>
              <p className="text-sm text-gray-600">{app.ownerName}</p>
            </div>
            <Badge tone={app.status}>{app.status ?? 'pendiente'}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
            <p>
              <span className="font-semibold text-gray-800">Plan:</span> {app.plan || 'free'}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Email:</span> {app.email || '—'}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Teléfono:</span> {app.phone || '—'}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Creada:</span>{' '}
              {app.createdAt ? new Date(app.createdAt).toLocaleString() : '—'}
            </p>
          </div>
          {app.notes && <p className="text-sm text-gray-500 whitespace-pre-line">{app.notes}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setSelected(app)}
              disabled={busyId !== null}
            >
              Revisar / Editar
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-[#38761D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f5a1a]"
              onClick={() => handleApprove(app.uid)}
              disabled={busyId !== null}
            >
              {busyId === `approve:${app.uid}` ? 'Aprobando...' : 'Aprobar'}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
              onClick={() => handleDelete(app.uid)}
              disabled={busyId !== null}
            >
              {busyId === `delete:${app.uid}` ? 'Eliminando...' : 'Eliminar'}
            </button>
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
