'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { FaBan, FaCheckCircle, FaChevronDown, FaEdit, FaEye, FaSearch, FaTrash } from 'react-icons/fa';

import { auth } from '../firebaseConfig';
import { resolveVisibleTier } from '../lib/businessPlanVisibility';

interface BusinessData {
  id: string;
  businessName: string;
  ownerName?: string;
  ownerEmail?: string;
  category?: string;
  status: string;
  plan: string;
  planExpiresAt?: string | null;
  createdAt?: string;
  approvedAt?: string;
  viewCount?: number;
  reviewCount?: number;
  avgRating?: number;
  stripeSubscriptionStatus?: string;
  nextPaymentDate?: string | null;
  lastPaymentDate?: string | null;
  isActive?: boolean;
  paymentStatus?: string | null;
}

interface Props {
  businesses: BusinessData[];
}

const fetcher = async (url: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  const token = await user.getIdToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al cargar datos');
  return res.json();
};

function getPlanBadge(plan: string) {
  if (resolveVisibleTier(plan) === 'premium') {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Premium</span>;
  }

  return <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Perfil base</span>;
}

function getStatusBadge(business: BusinessData) {
  if (business.isActive === false) {
    return <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Pausado</span>;
  }

  if (
    resolveVisibleTier(business.plan) === 'premium' &&
    (business.stripeSubscriptionStatus === 'payment_failed' || business.stripeSubscriptionStatus === 'past_due')
  ) {
    return <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">Pago pendiente</span>;
  }

  return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Activo</span>;
}

export default function AdminBusinessList({ businesses }: Props) {
  const { data, error, isLoading, mutate } = useSWR<{ businesses: BusinessData[] }>(
    '/api/admin/businesses-data',
    fetcher,
    {
      fallbackData: { businesses },
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const items = data?.businesses || businesses;

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'payment_issue'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return items.filter((business) => {
      const matchesSearch =
        !searchLower ||
        business.businessName.toLowerCase().includes(searchLower) ||
        business.ownerName?.toLowerCase().includes(searchLower) ||
        business.ownerEmail?.toLowerCase().includes(searchLower);

      const visibleTier = resolveVisibleTier(business.plan);
      const matchesPlan = planFilter === 'all' || visibleTier === planFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = business.isActive !== false;
      if (statusFilter === 'paused') matchesStatus = business.isActive === false;
      if (statusFilter === 'payment_issue') {
        matchesStatus =
          visibleTier === 'premium' &&
          (business.stripeSubscriptionStatus === 'payment_failed' || business.stripeSubscriptionStatus === 'past_due');
      }

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [items, planFilter, searchTerm, statusFilter]);

  const handlePlanChange = async (businessId: string, nextPlan: string) => {
    if (!nextPlan) return;

    const user = auth.currentUser;
    if (!user) {
      alert('Debes iniciar sesion como administrador');
      return;
    }

    setPlanLoading(businessId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, plan: nextPlan }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Error al actualizar plan');

      await mutate();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al actualizar plan');
    } finally {
      setPlanLoading(null);
    }
  };

  const handleToggleActive = async (business: BusinessData) => {
    setActionLoading(business.id);
    try {
      if (business.isActive === false) {
        const res = await fetch('/api/admin/enable-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: business.id }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Error al activar negocio');
      } else {
        const reason = prompt('Motivo para pausar el negocio', 'Revision administrativa');
        if (!reason) {
          setActionLoading(null);
          return;
        }

        const user = auth.currentUser;
        if (!user) throw new Error('Debes iniciar sesion');
        const token = await user.getIdToken();

        const res = await fetch('/api/admin/disable-business', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ businessId: business.id, reason }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Error al pausar negocio');
      }

      await mutate();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (businessId: string, businessName: string) => {
    const confirmText = prompt(`Para eliminar "${businessName}" escribe ELIMINAR`);
    if (confirmText !== 'ELIMINAR') return;

    setActionLoading(businessId);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Debes iniciar sesion');
      const token = await user.getIdToken();

      const res = await fetch('/api/admin/delete-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Error al eliminar negocio');

      await mutate();
      setMenuId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar negocio');
    } finally {
      setActionLoading(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">No se pudieron cargar los negocios.</p>
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  if (isLoading && !data) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Cargando negocios...</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar negocio o contacto"
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <select
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value as typeof planFilter)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Todos los planes</option>
            <option value="free">Perfil base</option>
            <option value="premium">Premium</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="paused">Pausados</option>
            <option value="payment_issue">Pago pendiente</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-sm text-gray-500">
          <span>
            {filteredItems.length} de {items.length} negocios listos para gestionar
          </span>
          {searchTerm || planFilter !== 'all' || statusFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPlanFilter('all');
                setStatusFilter('all');
              }}
              className="font-medium text-emerald-700 transition hover:text-emerald-900"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </section>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-gray-700">No hay negocios para esta vista.</p>
          <p className="mt-1 text-sm text-gray-500">Prueba con otros filtros o busca por nombre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((business) => (
            <article key={business.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{business.businessName}</h3>
                    {getPlanBadge(business.plan)}
                    {getStatusBadge(business)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={resolveVisibleTier(business.plan) === 'premium' ? 'sponsor' : 'free'}
                    onChange={(event) => handlePlanChange(business.id, event.target.value)}
                    disabled={planLoading === business.id}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="free">Perfil base</option>
                    <option value="sponsor">Premium</option>
                  </select>

                  <Link
                    href={`/dashboard/${business.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <FaEdit className="text-xs" />
                    Dashboard
                  </Link>

                  <Link
                    href={`/negocios/${business.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <FaEye className="text-xs" />
                    Ver
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(business)}
                    disabled={actionLoading === business.id}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      business.isActive === false ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {business.isActive === false ? <FaCheckCircle className="text-xs" /> : <FaBan className="text-xs" />}
                    {business.isActive === false ? 'Activar' : 'Pausar'}
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuId((current) => (current === business.id ? null : business.id))}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <FaChevronDown className="text-xs" />
                    </button>

                    {menuId === business.id ? (
                      <>
                        <button
                          type="button"
                          aria-label="Cerrar menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setMenuId(null)}
                        />
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => handleDelete(business.id, business.businessName)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-700 transition hover:bg-red-50"
                          >
                            <FaTrash className="text-xs" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
