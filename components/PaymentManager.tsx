'use client';

import { useMemo, useState } from 'react';
import { FaBan, FaCheckCircle, FaClock, FaSearch, FaTrash } from 'react-icons/fa';
import useSWR from 'swr';

import { auth } from '../firebaseConfig';

interface Business {
  id: string;
  name: string;
  ownerEmail?: string;
  ownerName?: string;
  plan?: string;
  isActive?: boolean;
  paymentStatus?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  disabledReason?: string;
  stripeSubscriptionStatus?: string;
  paymentHistory?: Array<{
    id: string;
    amount: number;
    date: string;
    plan: string;
    status: string;
  }>;
}

interface PaymentManagerProps {
  businesses: Business[];
}

type Filter = 'all' | 'disabled' | 'overdue' | 'upcoming';

const fetcher = async (initialBusinesses: Business[]) => {
  const user = auth.currentUser;
  if (!user) return initialBusinesses;

  const token = await user.getIdToken();
  const response = await fetch('/api/admin/payment-businesses', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return initialBusinesses;
  return response.json();
};

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysUntilPayment(dateStr?: string) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days;
}

function getStatusCopy(business: Business) {
  if (business.isActive === false) {
    return {
      label: 'Pausado',
      className: 'bg-red-100 text-red-700',
      meta: business.disabledReason || 'Negocio pausado por admin',
    };
  }

  const days = getDaysUntilPayment(business.nextPaymentDate);
  if (days !== null && days < 0) {
    return {
      label: 'Vencido',
      className: 'bg-orange-100 text-orange-700',
      meta: `${Math.abs(days)} dias de atraso`,
    };
  }

  if (days !== null && days <= 7) {
    return {
      label: 'Por vencer',
      className: 'bg-yellow-100 text-yellow-800',
      meta: `Vence en ${days} dias`,
    };
  }

  if (['past_due', 'unpaid', 'canceled', 'payment_failed'].includes(business.stripeSubscriptionStatus || '')) {
    return {
      label: 'Pago pendiente',
      className: 'bg-yellow-100 text-yellow-800',
      meta: 'Revisar suscripcion',
    };
  }

  return {
    label: 'Activo',
    className: 'bg-emerald-100 text-emerald-700',
    meta: 'Sin riesgo inmediato',
  };
}

export default function PaymentManager({ businesses: initialBusinesses }: PaymentManagerProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'premium'>('all');

  const { data: businesses = initialBusinesses, mutate } = useSWR<Business[]>(
    'payment-businesses',
    () => fetcher(initialBusinesses),
    {
      fallbackData: initialBusinesses,
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const filteredBusinesses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return businesses
      .filter((business) => {
        if (planFilter === 'premium' && !['premium', 'sponsor', 'featured'].includes(business.plan || '')) {
          return false;
        }

        const days = getDaysUntilPayment(business.nextPaymentDate);
        if (filter === 'disabled' && business.isActive !== false) return false;
        if (filter === 'overdue' && !(days !== null && days < 0)) return false;
        if (filter === 'upcoming' && !(days !== null && days >= 0 && days <= 7)) return false;

        if (!query) return true;

        return (
          business.name.toLowerCase().includes(query) ||
          business.ownerEmail?.toLowerCase().includes(query) ||
          business.ownerName?.toLowerCase().includes(query) ||
          business.id.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => {
        const leftPaused = left.isActive === false ? 0 : 1;
        const rightPaused = right.isActive === false ? 0 : 1;
        if (leftPaused !== rightPaused) return leftPaused - rightPaused;

        const leftDays = getDaysUntilPayment(left.nextPaymentDate);
        const rightDays = getDaysUntilPayment(right.nextPaymentDate);
        return (leftDays ?? 9999) - (rightDays ?? 9999);
      });
  }, [businesses, filter, planFilter, searchTerm]);

  const summary = useMemo(() => {
    return {
      total: businesses.length,
      disabled: businesses.filter((business) => business.isActive === false).length,
      overdue: businesses.filter((business) => {
        const days = getDaysUntilPayment(business.nextPaymentDate);
        return days !== null && days < 0;
      }).length,
      upcoming: businesses.filter((business) => {
        const days = getDaysUntilPayment(business.nextPaymentDate);
        return days !== null && days >= 0 && days <= 7;
      }).length,
    };
  }, [businesses]);

  const handleDisable = async (businessId: string, reason: string) => {
    if (!confirm('Pausar este negocio por problema de pago?')) return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/disable-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, reason }),
      });

      if (!res.ok) throw new Error('Error al pausar negocio');
      mutate();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al pausar negocio');
    } finally {
      setLoading(null);
    }
  };

  const handleEnable = async (businessId: string) => {
    if (!confirm('Activar este negocio nuevamente?')) return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/enable-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Error al activar negocio');
      mutate();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al activar negocio');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (businessId: string, businessName: string) => {
    const confirmText = prompt(`Para eliminar "${businessName}" escribe ELIMINAR`);
    if (confirmText !== 'ELIMINAR') return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/delete-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Error al eliminar negocio');
      mutate();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al eliminar negocio');
    } finally {
      setLoading(null);
    }
  };

  const handleSendReminder = async (businessId: string) => {
    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Error al enviar recordatorio');
      alert('Recordatorio enviado');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al enviar recordatorio');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="relative block">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar negocio o correo"
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Todos</option>
              <option value="disabled">Pausados</option>
              <option value="overdue">Vencidos</option>
              <option value="upcoming">Proximos 7 dias</option>
            </select>

            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value as 'all' | 'premium')}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Todos los planes</option>
              <option value="premium">Solo premium</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-700">{summary.total} en seguimiento</span>
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">{summary.disabled} pausados</span>
            <span className="rounded-full bg-orange-100 px-3 py-1.5 text-orange-700">{summary.overdue} vencidos</span>
            <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-yellow-800">{summary.upcoming} por vencer</span>
          </div>
        </div>
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-gray-700">No hay negocios para esta vista.</p>
          <p className="mt-1 text-sm text-gray-500">Ajusta filtros o busca por nombre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((business) => {
            const status = getStatusCopy(business);
            return (
              <article key={business.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{business.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                        {['premium', 'sponsor', 'featured'].includes(business.plan || '') ? 'Premium' : 'Perfil base'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{status.meta}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>{business.ownerEmail || 'Sin correo'}</span>
                      <span>Proximo pago: {formatDate(business.nextPaymentDate)}</span>
                      {business.lastPaymentDate ? <span>Ultimo pago: {formatDate(business.lastPaymentDate)}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(business.id)}
                      disabled={loading === business.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      <FaClock className="text-xs" />
                      Recordar
                    </button>

                    {business.isActive === false ? (
                      <button
                        type="button"
                        onClick={() => handleEnable(business.id)}
                        disabled={loading === business.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <FaCheckCircle className="text-xs" />
                        Activar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt('Motivo para pausar por pago', 'Falta de pago');
                          if (reason) handleDisable(business.id, reason);
                        }}
                        disabled={loading === business.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
                      >
                        <FaBan className="text-xs" />
                        Pausar
                      </button>
                    )}

                    {business.paymentHistory && business.paymentHistory.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedBusiness(business)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Historial
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => handleDelete(business.id, business.name)}
                      disabled={loading === business.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <FaTrash className="text-xs" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedBusiness ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedBusiness.name}</h2>
                <p className="text-sm text-gray-500">Historial de pagos</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="text-2xl text-gray-500 transition hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 p-4">
              {selectedBusiness.paymentHistory && selectedBusiness.paymentHistory.length > 0 ? (
                selectedBusiness.paymentHistory.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">${payment.amount.toFixed(2)} MXN</div>
                        <div className="text-sm text-gray-600">
                          {new Date(payment.date).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-gray-500">Plan: {payment.plan}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          payment.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : payment.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payment.status === 'success' ? 'Exitoso' : payment.status === 'failed' ? 'Fallido' : 'Reembolsado'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">No hay historial de pagos disponible.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
