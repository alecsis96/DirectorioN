'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { FaBan, FaCheckCircle, FaTrash, FaEye, FaEdit, FaChevronDown, FaChevronUp, FaSearch, FaArrowUp, FaArrowDown, FaDownload, FaChartBar, FaCheckSquare, FaSquare, FaExclamationTriangle } from 'react-icons/fa';
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
  nextPaymentDate?: string | null;
  lastPaymentDate?: string | null;
  isActive?: boolean;
  paymentStatus?: string | null;
}

interface Props {
  businesses: BusinessData[]; // Initial SSR data
}

type SortField = 'businessName' | 'viewCount' | 'reviewCount' | 'avgRating' | 'createdAt' | 'plan';
type SortDirection = 'asc' | 'desc';

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
  // SWR para datos en tiempo real
  const { data, error, isLoading, mutate } = useSWR<{ businesses: BusinessData[]; stats: any }>(
    '/api/admin/businesses-data',
    fetcher,
    {
      fallbackData: { businesses, stats: null },
      refreshInterval: 30000, // 30 segundos
      revalidateOnFocus: true,
    }
  );

  const items = data?.businesses || businesses;

  const [loading, setLoading] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'featured' | 'sponsor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'payment_issue'>('all');
  
  // Estados de sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados de bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filtrado, búsqueda y sorting en tiempo real
  const filteredItems = useMemo(() => {
    let filtered = items.filter(business => {
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

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Convert dates to timestamps
      if (sortField === 'createdAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Plan ordering: sponsor > featured > free
      if (sortField === 'plan') {
        const planOrder: Record<string, number> = { sponsor: 3, featured: 2, free: 1 };
        aVal = planOrder[aVal] || 0;
        bVal = planOrder[bVal] || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, searchTerm, planFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FaArrowUp className="inline ml-1 text-xs" /> : <FaArrowDown className="inline ml-1 text-xs" />;
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Nombre Negocio',
      'Propietario',
      'Email',
      'Categoría',
      'Plan',
      'Estado Suscripción',
      'Estado',
      'Vistas',
      'Reseñas',
      'Rating Promedio',
      'Fecha Creación',
      'Fecha Aprobación',
      'Próximo Pago',
      'Último Pago',
      'Expira',
    ];

    const rows = filteredItems.map((b) => [
      b.id,
      b.businessName,
      b.ownerName || '',
      b.ownerEmail || '',
      b.category || '',
      b.plan,
      b.stripeSubscriptionStatus || '',
      b.isActive === false ? 'Deshabilitado' : 'Activo',
      b.viewCount || 0,
      b.reviewCount || 0,
      b.avgRating?.toFixed(1) || '0.0',
      b.createdAt ? new Date(b.createdAt).toLocaleDateString('es-MX') : '',
      b.approvedAt ? new Date(b.approvedAt).toLocaleDateString('es-MX') : '',
      b.nextPaymentDate ? new Date(b.nextPaymentDate).toLocaleDateString('es-MX') : '',
      b.lastPaymentDate ? new Date(b.lastPaymentDate).toLocaleDateString('es-MX') : '',
      b.planExpiresAt ? new Date(b.planExpiresAt).toLocaleDateString('es-MX') : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `negocios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Alertas predictivas
  const predictiveAlerts = useMemo(() => {
    const alerts: Array<{ type: 'warning' | 'danger' | 'info'; message: string; count: number }> = [];

    // Negocios con planes próximos a vencer (dentro de 7 días)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = filteredItems.filter(b => 
      b.plan !== 'free' && 
      b.planExpiresAt && 
      new Date(b.planExpiresAt) <= sevenDaysFromNow
    );
    if (expiringSoon.length > 0) {
      alerts.push({ type: 'warning', message: 'Negocios con plan próximo a vencer', count: expiringSoon.length });
    }

    // Negocios sin actividad reciente (0 vistas)
    const noActivity = filteredItems.filter(b => (b.viewCount || 0) === 0);
    if (noActivity.length > 0) {
      alerts.push({ type: 'info', message: 'Negocios sin vistas', count: noActivity.length });
    }

    // Negocios con problemas de pago
    const paymentIssues = filteredItems.filter(b => 
      b.plan !== 'free' && 
      (b.stripeSubscriptionStatus === 'payment_failed' || b.stripeSubscriptionStatus === 'past_due')
    );
    if (paymentIssues.length > 0) {
      alerts.push({ type: 'danger', message: 'Negocios con problemas de pago', count: paymentIssues.length });
    }

    // Negocios deshabilitados
    const disabled = filteredItems.filter(b => b.isActive === false);
    if (disabled.length > 0) {
      alerts.push({ type: 'warning', message: 'Negocios deshabilitados', count: disabled.length });
    }

    return alerts;
  }, [filteredItems]);

  // Bulk selection
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(b => b.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Bulk actions
  const handleBulkPlanChange = async (plan: string) => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un negocio');
      return;
    }

    if (!confirm(`¿Cambiar ${selectedIds.size} negocios al plan ${plan}?`)) return;

    setBulkLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();

      const promises = Array.from(selectedIds).map(businessId =>
        fetch('/api/admin/update-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ businessId, plan }),
        })
      );

      await Promise.all(promises);

      // Revalidar datos
      await mutate();
      setSelectedIds(new Set());
      alert(`✅ ${selectedIds.size} negocios actualizados`);
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDisable = async () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un negocio');
      return;
    }

    const reason = prompt('Motivo de deshabilitación masiva:', 'Acción administrativa');
    if (!reason) return;

    if (!confirm(`¿Deshabilitar ${selectedIds.size} negocios?`)) return;

    setBulkLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No autenticado');
      const token = await user.getIdToken();

      const promises = Array.from(selectedIds).map(businessId =>
        fetch('/api/admin/disable-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ businessId, reason }),
        })
      );

      await Promise.all(promises);

      // Revalidar datos
      await mutate();
      setSelectedIds(new Set());
      alert(`✅ ${selectedIds.size} negocios deshabilitados`);
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkEnable = async () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un negocio');
      return;
    }

    if (!confirm(`¿Habilitar ${selectedIds.size} negocios?`)) return;

    setBulkLoading(true);
    try {
      const promises = Array.from(selectedIds).map(businessId =>
        fetch('/api/admin/enable-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId }),
        })
      );

      await Promise.all(promises);

      // Revalidar datos
      await mutate();
      setSelectedIds(new Set());
      alert(`✅ ${selectedIds.size} negocios habilitados`);
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setBulkLoading(false);
    }
  };

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

      // Mutación optimista
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            businesses: current.businesses.map((biz) =>
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
            ),
          };
        },
        { revalidate: true }
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

      // Mutación optimista
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            businesses: current.businesses.map((biz) =>
              biz.id === businessId ? { ...biz, isActive: false } : biz
            ),
          };
        },
        { revalidate: true }
      );

      alert('✅ Negocio deshabilitado exitosamente');
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

      // Mutación optimista
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            businesses: current.businesses.map((biz) =>
              biz.id === businessId ? { ...biz, isActive: true } : biz
            ),
          };
        },
        { revalidate: true }
      );

      alert('✅ Negocio habilitado exitosamente');
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

      // Mutación optimista - eliminar del array
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            businesses: current.businesses.filter((biz) => biz.id !== businessId),
          };
        },
        { revalidate: true }
      );

      alert('✅ Negocio eliminado permanentemente');
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  // Estados de error y loading
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-medium mb-2">Error al cargar negocios</p>
        <p className="text-sm text-red-500 mb-4">{error.message}</p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Indicador de loading */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-blue-600 text-sm">🔄 Actualizando datos...</p>
        </div>
      )}

      {/* Alertas predictivas */}
      {predictiveAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <FaExclamationTriangle className="text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Alertas del Sistema</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {predictiveAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  alert.type === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <p className="text-xs font-medium text-gray-700 mb-1">{alert.message}</p>
                <p className="text-2xl font-bold text-gray-900">{alert.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Panel de bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg shadow-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <FaCheckSquare className="text-blue-600" />
                {selectedIds.size} negocio{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1">Selecciona acciones para aplicar masivamente</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkPlanChange(e.target.value);
                  e.target.value = '';
                }}
                disabled={bulkLoading}
                className="px-3 py-2 text-sm border-2 border-blue-300 rounded-lg bg-white font-medium hover:border-blue-400 transition-colors disabled:opacity-50"
              >
                <option value="">Cambiar plan...</option>
                <option value="free">🆓 Gratuito</option>
                <option value="featured">⭐ Destacado</option>
                <option value="sponsor">👑 Patrocinado</option>
              </select>
              <button
                onClick={handleBulkEnable}
                disabled={bulkLoading}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <FaCheckCircle />
                Habilitar
              </button>
              <button
                onClick={handleBulkDisable}
                disabled={bulkLoading}
                className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <FaBan />
                Deshabilitar
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de sorting */}
      <div className="bg-white rounded-lg shadow-md p-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Checkbox select all */}
          <button
            onClick={toggleSelectAll}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title={selectedIds.size === filteredItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
          >
            {selectedIds.size === filteredItems.length ? (
              <FaCheckSquare className="text-blue-600 text-lg" />
            ) : (
              <FaSquare className="text-gray-400 text-lg" />
            )}
          </button>
          <div className="w-px h-6 bg-gray-300"></div>
          <span className="text-sm font-medium text-gray-700 mr-2">Ordenar por:</span>
          <button
            onClick={() => handleSort('businessName')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'businessName'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Nombre <SortIcon field="businessName" />
          </button>
          <button
            onClick={() => handleSort('viewCount')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'viewCount'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Vistas <SortIcon field="viewCount" />
          </button>
          <button
            onClick={() => handleSort('reviewCount')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'reviewCount'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Reseñas <SortIcon field="reviewCount" />
          </button>
          <button
            onClick={() => handleSort('avgRating')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'avgRating'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rating <SortIcon field="avgRating" />
          </button>
          <button
            onClick={() => handleSort('plan')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'plan'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Plan <SortIcon field="plan" />
          </button>
          <button
            onClick={() => handleSort('createdAt')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sortField === 'createdAt'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Fecha <SortIcon field="createdAt" />
          </button>
        </div>
      </div>

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

        {/* Contador de resultados y acciones */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
          <span>
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> negocios
          </span>
          <div className="flex items-center gap-2">
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
            <button
              onClick={exportToCSV}
              disabled={filteredItems.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaDownload className="text-xs" />
              <span className="font-medium">Export CSV</span>
            </button>
          </div>
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
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectOne(business.id)}
                    className="mt-1 p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  >
                    {selectedIds.has(business.id) ? (
                      <FaCheckSquare className="text-blue-600 text-xl" />
                    ) : (
                      <FaSquare className="text-gray-300 text-xl" />
                    )}
                  </button>
                  
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
                    <Link
                      href={`/admin/analytics?businessId=${business.id}`}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Ver analytics"
                    >
                      <FaChartBar />
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

