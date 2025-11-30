'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaBan, FaCheckCircle, FaTrash } from 'react-icons/fa';
import { auth } from '../firebaseConfig';

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
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  isActive?: boolean;
}

interface Props {
  businesses: BusinessData[];
}

function getPlanBadge(plan: string, subscriptionStatus?: string) {
  if (plan === 'sponsor') {
    return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">👑 Patrocinado</span>;
  }
  if (plan === 'featured') {
    return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">⭐ Destacado</span>;
  }
  return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">🆓 Gratuito</span>;
}

function getSubscriptionStatusBadge(status?: string) {
  if (!status) return null;
  
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: '✓ Activa', color: 'bg-green-100 text-green-800' },
    payment_failed: { label: '⚠️ Pago fallido', color: 'bg-red-100 text-red-800' },
    canceled: { label: '✕ Cancelada', color: 'bg-gray-100 text-gray-600' },
    past_due: { label: '⏰ Vencida', color: 'bg-yellow-100 text-yellow-800' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  
  return (
    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function AdminBusinessList({ businesses }: Props) {
  const [items, setItems] = useState<BusinessData[]>(businesses);
  const [loading, setLoading] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<string | null>(null);

  const handlePlanChange = async (businessId: string, plan: string) => {
    if (!plan) return;

    const user = auth.currentUser;
    if (!user) {
      alert('Debes iniciar sesi��n como administrador');
      return;
    }

    setPlanLoading(businessId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId, plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar plan');
      }

      setItems((prev) =>
        prev.map((biz) =>
          biz.id === businessId
            ? {
                ...biz,
                plan,
                planExpiresAt: data.planExpiresAt ?? biz.planExpiresAt ?? null,
                stripeSubscriptionStatus: plan === 'free' ? undefined : biz.stripeSubscriptionStatus,
              }
            : biz
        )
      );

      alert('Plan actualizado');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setPlanLoading(null);
    }
  };

  const handleDisable = async (businessId: string) => {
    const reason = prompt('Motivo de deshabilitación:', 'Violación de términos de servicio');
    if (!reason) return;

    if (!confirm('¿Estás seguro de que deseas deshabilitar este negocio?')) return;

    setLoading(businessId);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('❌ Debes iniciar sesión');
        return;
      }
      
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/disable-business', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessId, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al deshabilitar negocio');
      }

      alert('✅ Negocio deshabilitado exitosamente');
      window.location.reload();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleEnable = async (businessId: string) => {
    if (!confirm('¿Estás seguro de que deseas habilitar este negocio?')) return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/enable-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al habilitar negocio');
      }

      alert('✅ Negocio habilitado exitosamente');
      window.location.reload();
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (businessId: string) => {
    const confirmText = prompt(
      '⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.\n\n' +
      'Se eliminará:\n' +
      '- El negocio\n' +
      '- Todas sus reseñas\n' +
      '- El usuario dueño\n\n' +
      'Escribe "ELIMINAR" para confirmar:'
    );

    if (confirmText !== 'ELIMINAR') {
      alert('Eliminación cancelada');
      return;
    }

    setLoading(businessId);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('❌ Debes iniciar sesión');
        setLoading(null);
        return;
      }
      
      const token = await user.getIdToken();
      console.log('Deleting business:', businessId);
      
      const res = await fetch('/api/admin/delete-business', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessId }),
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar negocio');
      }

      alert('✅ Negocio eliminado permanentemente');
      window.location.reload();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Vista de tabla para desktop (oculta en móvil) */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propietario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estadísticas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {business.businessName}
                          </div>
                          {business.isActive === false && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              🚫 Deshabilitado
                            </span>
                          )}
                        </div>
                        {business.category && (
                          <div className="text-sm text-gray-500">{business.category}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{business.ownerName || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{business.ownerEmail || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getPlanBadge(business.plan, business.stripeSubscriptionStatus)}
                      {business.plan !== 'free' && getSubscriptionStatusBadge(business.stripeSubscriptionStatus)}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={business.plan}
                        onChange={(e) => handlePlanChange(business.id, e.target.value)}
                        disabled={planLoading === business.id}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="free">Plan gratuito</option>
                        <option value="featured">Plan destacado</option>
                        <option value="sponsor">Plan patrocinado</option>
                      </select>
                      <span className="text-[11px] text-gray-500">
                        Manual (admin)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      <div>👁️ {business.viewCount || 0} vistas</div>
                      <div>⭐ {business.reviewCount || 0} reseñas ({business.avgRating?.toFixed(1) || '0.0'})</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {business.plan !== 'free' && business.nextPaymentDate ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-gray-900 font-medium">
                          {new Date(business.nextPaymentDate).toLocaleDateString('es-MX')}
                        </div>
                        {business.lastPaymentDate && (
                          <div className="text-gray-500 text-xs">
                            Último: {new Date(business.lastPaymentDate).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>
                    ) : business.plan !== 'free' ? (
                      <span className="text-yellow-600 text-xs">⚠️ Sin fecha</span>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {business.approvedAt
                      ? new Date(business.approvedAt).toLocaleDateString('es-MX')
                      : business.createdAt
                      ? new Date(business.createdAt).toLocaleDateString('es-MX')
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Link
                        href={`/negocios/${business.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        target="_blank"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/dashboard/${business.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Editar
                      </Link>
                      {business.isActive !== false ? (
                        <button
                          onClick={() => handleDisable(business.id)}
                          disabled={loading === business.id}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 flex items-center gap-1"
                        >
                          <FaBan className="text-xs" />
                          Deshabilitar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(business.id)}
                          disabled={loading === business.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center gap-1"
                        >
                          <FaCheckCircle className="text-xs" />
                          Habilitar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(business.id)}
                        disabled={loading === business.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center gap-1"
                      >
                        <FaTrash className="text-xs" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de tarjetas para móvil (oculta en desktop) */}
      <div className="lg:hidden space-y-4">
        {items.map((business) => (
          <div key={business.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            {/* Header con nombre y plan */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {business.businessName}
                  </h3>
                  {business.isActive === false && (
                    <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                      🚫 Deshabilitado
                    </span>
                  )}
                </div>
                {business.category && (
                  <p className="text-sm text-gray-500">{business.category}</p>
                )}
              </div>
              <div className="ml-2 flex-shrink-0">
                {getPlanBadge(business.plan, business.stripeSubscriptionStatus)}
              </div>
            </div>

            {/* Suscripción status */}
            {business.plan !== 'free' && business.stripeSubscriptionStatus && (
              <div className="mb-3">
                {getSubscriptionStatusBadge(business.stripeSubscriptionStatus)}
              </div>
            )}

            {/* Propietario */}
            <div className="mb-3 pb-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Propietario</p>
              <p className="text-sm text-gray-900">{business.ownerName || 'N/A'}</p>
              <p className="text-xs text-gray-500">{business.ownerEmail || 'N/A'}</p>
            </div>

            {/* Estadísticas */}
            <div className="mb-3 pb-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Estadísticas</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>👁️</span>
                  <span>{business.viewCount || 0} vistas</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐</span>
                  <span>{business.reviewCount || 0} reseñas</span>
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Calificación: {business.avgRating?.toFixed(1) || '0.0'} / 5.0
              </div>
            </div>

            {/* Fecha de pago (solo para planes de pago) */}
            {business.plan !== 'free' && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">💳 Información de Pago</p>
                {business.nextPaymentDate ? (
                  <>
                    <div className="text-sm text-gray-900">
                      <span className="font-medium">Próximo pago:</span> {new Date(business.nextPaymentDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    {business.lastPaymentDate && (
                      <div className="text-xs text-gray-500 mt-1">
                        Último pago: {new Date(business.lastPaymentDate).toLocaleDateString('es-MX')}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-yellow-600">⚠️ Sin fecha de pago configurada</div>
                )}
              </div>
            )}

            {/* Fecha */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Fecha de publicación</p>
              <p className="text-sm text-gray-900">
                {business.approvedAt
                  ? new Date(business.approvedAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : business.createdAt
                  ? new Date(business.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </p>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
              <Link
                href={`/negocios/${business.id}`}
                className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                target="_blank"
              >
                👁️ Ver
              </Link>
              <Link
                href={`/dashboard/${business.id}`}
                className="flex-1 text-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                ✏️ Editar
              </Link>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {business.isActive !== false ? (
                <button
                  onClick={() => handleDisable(business.id)}
                  disabled={loading === business.id}
                  className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <FaBan />
                  Deshabilitar
                </button>
              ) : (
                <button
                  onClick={() => handleEnable(business.id)}
                  disabled={loading === business.id}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <FaCheckCircle />
                  Habilitar
                </button>
              )}
              <button
                onClick={() => handleDelete(business.id)}
                disabled={loading === business.id}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <FaTrash />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

