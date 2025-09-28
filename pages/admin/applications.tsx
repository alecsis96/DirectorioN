import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { auth, googleProvider } from '../../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';

interface ApplicationItem {
  uid: string;
  status: string;
  businessName: string;
  plan: string;
  ownerName: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export default function AdminApplicationsPage() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (next) => setUser(next)), []);

  const fetchApplications = useCallback(async (token: string) => {
    const response = await fetch('/api/admin/applications/list', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((data as any)?.error || 'No se pudieron obtener las solicitudes');
    }
    setApplications((data as { applications: ApplicationItem[] }).applications || []);
  }, []);

  useEffect(() => {
    async function load() {
      if (!user) {
        setApplications([]);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const tokenResult = await user.getIdTokenResult();
        const adminClaim = tokenResult.claims?.admin === true;
        setIsAdmin(adminClaim);
        if (!adminClaim) {
          setApplications([]);
          setError('Esta sección es solo para administradores.');
          return;
        }
        await fetchApplications(tokenResult.token);
      } catch (err) {
        console.error('admin applications load error', err);
        setError('No pudimos cargar las solicitudes.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.uid, fetchApplications]);

  const sortedApplications = useMemo(() => {
    return applications.slice().sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || '';
      const dateB = b.updatedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [applications]);

  async function handleAction(uid: string, status: 'approved' | 'rejected' | 'pending') {
    if (!user) return;
    const confirmMessage =
      status === 'approved'
        ? '¿Seguro que quieres aprobar esta solicitud?'
        : status === 'rejected'
        ? '¿Seguro que quieres rechazar esta solicitud?'
        : '¿Seguro que quieres devolver la solicitud a pendiente?';
    if (!window.confirm(confirmMessage)) return;

    let notes: string | undefined;
    if (status === 'rejected') {
      notes = window.prompt('Motivo del rechazo (opcional):') || undefined;
    }

    try {
      setActioning((prev) => ({ ...prev, [uid]: true }));
      setMessage('');
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/applications/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid, status, notes }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((result as any)?.error || 'No se pudo actualizar la solicitud');
      }
      setMessage(`Solicitud ${uid} actualizada a ${status}.`);
      await fetchApplications(token);
    } catch (err) {
      console.error('admin applications action error', err);
      setError('No pudimos aplicar el cambio.');
    } finally {
      setActioning((prev) => ({ ...prev, [uid]: false }));
    }
  }

  const handleDelete = useCallback(async (uid: string) => {
    if (!user) return;
    if (!window.confirm('Seguro que deseas eliminar el negocio y la solicitud? Esta accion no se puede deshacer.')) return;
    try {
      setActioning((prev) => ({ ...prev, [uid]: true }));
      setMessage('');
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/applications/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ uid })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((result as any)?.error || 'No se pudo eliminar el negocio');
      }
      setMessage(`Negocio ${uid} eliminado.`);
      await fetchApplications(token);
    } catch (err) {
      console.error('admin applications delete error', err);
      setError('No pudimos eliminar el negocio.');
    } finally {
      setActioning((prev) => ({ ...prev, [uid]: false }));
    }
  }, [user, fetchApplications]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const token = await user.getIdToken(true);
      await fetchApplications(token);
      setMessage('Solicitudes actualizadas.');
    } catch (err) {
      console.error('admin applications refresh error', err);
      setError('No pudimos actualizar la lista.');
    } finally {
      setRefreshing(false);
    }
  }, [user, fetchApplications]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de negocios</h1>
          <p className="text-sm text-gray-600">Aprueba, rechaza o revisa las solicitudes enviadas.</p>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{user.email}</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="rounded border border-[#38761D] px-3 py-1 text-xs font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-50"
              >
                {(refreshing || loading) ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                onClick={() => signOut(auth)}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cerrar sesion
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]"
            >
              Iniciar sesion
            </button>
          )}
        </div>
      </header>

      {loading && <p className="text-gray-500">Cargando solicitudes...</p>}
      {!loading && !user && <p className="text-gray-500">Inicia sesión para ver las solicitudes.</p>}
      {!loading && user && !isAdmin && (
        <p className="rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          {error || 'Tu cuenta no tiene permisos de administrador.'}
        </p>
      )}

      {message && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {isAdmin && sortedApplications.length > 0 && (
        <section className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Solicitante</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Negocio</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Plan</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Actualizado</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Acciones</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Administrar negocio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedApplications.map((app) => {
                const isBusy = !!actioning[app.uid];
                return (
                  <tr key={app.uid} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{app.ownerName || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500">{app.email}</div>
                      {app.phone && <div className="text-xs text-gray-500">{app.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{app.businessName || 'Sin nombre'}</div>
                      {app.plan && <div className="text-xs text-gray-500">Plan: {app.plan}</div>}
                      {app.notes && <div className="text-xs text-gray-500">Notas: {app.notes}</div>}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{app.plan}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">{app.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {app.updatedAt ? new Date(app.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          disabled={isBusy || app.status === 'approved'}
                          onClick={() => handleAction(app.uid, 'approved')}
                        >
                          Aprobar
                        </button>
                        <button
                          className="rounded bg-yellow-500 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
                          disabled={isBusy || app.status === 'pending'}
                          onClick={() => handleAction(app.uid, 'pending')}
                        >
                          Pendiente
                        </button>
                        <button
                          className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          disabled={isBusy || app.status === 'rejected'}
                          onClick={() => handleAction(app.uid, 'rejected')}
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => handleDelete(app.uid)}
                      >
                        Eliminar negocio
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {isAdmin && !loading && sortedApplications.length === 0 && (
        <p className="text-gray-500">No hay solicitudes registradas.</p>
      )}
    </main>
  );
}




