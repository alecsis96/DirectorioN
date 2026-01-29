'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FaBan, FaCheckCircle, FaTrash, FaEye, FaEdit, FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa';
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
  paymentStatus?: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'featured' | 'sponsor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'payment_issue'>('all');

  // Filtrado y búsqueda en tiempo real
  const filteredItems = useMemo(() => {
    return items.filter(business => {
      // Filtro de búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        business.businessName.toLowerCase().includes(searchLower) ||
        business.ownerName?.toLowerCase().includes(searchLower) ||
        business.ownerEmail?.toLowerCase().includes(searchLower);

      // Filtro de plan
      const matchesPlan = planFilter === 'all' || business.plan === planFilter;

      // Filtro de estado
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = business.isActive !== false;
      } else if (statusFilter === 'disabled') {
        matchesStatus = business.isActive === false;
      } else if (statusFilter === 'payment_issue') {
        matchesStatus = business.plan !== 'free' && 
          (business.stripeSubscriptionStatus === 'payment_failed' || 
           business.stripeSubscriptionStatus === 'past_due');
      }

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [items, searchTerm, planFilter, statusFilter]);

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
                nextPaymentDate: data.nextPaymentDate ?? biz.nextPaymentDate ?? null,
                paymentStatus: plan === 'free' ? null : biz.paymentStatus ?? 'active',
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
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar negocio, propietario o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtro de plan */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos los planes</option>
              <option value="free">🆓 Gratuito</option>
              <option value="featured">⭐ Destacado</option>
              <option value="sponsor">👑 Patrocinado</option>
            </select>
          </div>

          {/* Filtro de estado */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">Todos</option>
              <option value="active">✓ Activos</option>
              <option value="disabled">🚫 Deshabilitados</option>
              <option value="payment_issue">⚠️ Problemas de pago</option>
            </select>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
          <span>
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> negocios
          </span>
          {(searchTerm || planFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPlanFilter('all');
                setStatusFilter('all');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de negocios */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaSearch className="mx-auto text-gray-400 text-4xl mb-3" />
          <p className="text-gray-600 text-lg">No se encontraron negocios</p>
          <p className="text-gray-500 text-sm mt-1">Intenta con otros criterios de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((business) => (
            <div key={business.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Vista compacta (siempre visible) */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Información principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {business.businessName}
                          </h3>
                          {getPlanBadge(business.plan, business.stripeSubscriptionStatus)}
                          {business.isActive === false && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                              🚫 Deshabilitado
                            </span>
                          )}
                          {business.plan !== 'free' && getSubscriptionStatusBadge(business.stripeSubscriptionStatus)}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{business.ownerName || 'Sin nombre'}</span>
                          {' • '}
                          <span className="text-gray-500">{business.ownerEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Métricas clave */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{business.viewCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{business.reviewCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>⭐</span>
                        <span>{business.avgRating?.toFixed(1) || '0.0'}</span>
                      </div>
                      {business.category && (
                        <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          {business.category}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/negocios/${business.id}`}
                      target="_blank"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver negocio"
                    >
                      <FaEye />
                    </Link>
                    <Link
                      href={`/dashboard/${business.id}`}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => setExpandedId(expandedId === business.id ? null : business.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title={expandedId === business.id ? "Contraer" : "Ver más opciones"}
                    >
                      {expandedId === business.id ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vista expandida (solo cuando se hace clic) */}
              {expandedId === business.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                  {/* Cambio de plan */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                      Cambiar Plan (Pago manual)
                    </p>
                    <select
                      value={business.plan}
                      onChange={(e) => handlePlanChange(business.id, e.target.value)}
                      disabled={planLoading === business.id}
                      className="w-full sm:w-64 text-sm border-2 border-blue-300 rounded-lg px-3 py-2 bg-white font-medium hover:border-blue-400 transition-colors disabled:opacity-50"
                    >
                      <option value="free">🆓 Gratuito</option>
                      <option value="featured">⭐ Destacado</option>
                      <option value="sponsor">👑 Patrocinado</option>
                    </select>
                    {planLoading === business.id && (
                      <p className="text-xs text-blue-600 mt-1">Actualizando...</p>
                    )}
                  </div>

                  {/* Información de pagos */}
                  {business.plan !== 'free' && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                        Información de Pago
                      </p>
                      <div className="space-y-1 text-sm text-gray-600">
                        {business.nextPaymentDate ? (
                          <div>
                            <span className="font-medium">Próximo pago:</span>{' '}
                            {new Date(business.nextPaymentDate).toLocaleDateString('es-MX')}
                          </div>
                        ) : (
                          <div className="text-yellow-600">⚠️ Sin fecha de pago</div>
                        )}
                        {business.lastPaymentDate && (
                          <div className="text-xs text-gray-500">
                            Último pago: {new Date(business.lastPaymentDate).toLocaleDateString('es-MX')}
                          </div>
                        )}
                        {business.planExpiresAt && (
                          <div className="text-xs text-gray-500">
                            Expira: {new Date(business.planExpiresAt).toLocaleDateString('es-MX')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fechas */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                      Fechas
                    </p>
                    <div className="space-y-1 text-sm text-gray-600">
                      {business.createdAt && (
                        <div>
                          <span className="font-medium">Creado:</span>{' '}
                          {new Date(business.createdAt).toLocaleDateString('es-MX')}
                        </div>
                      )}
                      {business.approvedAt && (
                        <div>
                          <span className="font-medium">Aprobado:</span>{' '}
                          {new Date(business.approvedAt).toLocaleDateString('es-MX')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones avanzadas */}
                  <div className="pt-3 border-t border-gray-300">
                    <p className="text-xs font-medium text-gray-700 uppercase mb-2">
                      Acciones Administrativas
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {business.isActive !== false ? (
                        <button
                          onClick={() => handleDisable(business.id)}
                          disabled={loading === business.id}
                          className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <FaBan />
                          Deshabilitar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(business.id)}
                          disabled={loading === business.id}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <FaCheckCircle />
                          Habilitar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(business.id)}
                        disabled={loading === business.id}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <FaTrash />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

