'use client';

import { useState, useMemo } from 'react';
import { FaTrash, FaBan, FaCheckCircle, FaClock, FaHistory, FaExclamationTriangle, FaSort, FaSortUp, FaSortDown, FaFileDownload } from 'react-icons/fa';
import { auth } from '../firebaseConfig';
import useSWR from 'swr';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function PaymentManager({ businesses: initialBusinesses }: PaymentManagerProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'disabled' | 'overdue' | 'upcoming'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showMigrationTools, setShowMigrationTools] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'nextPaymentDate' | 'plan' | 'status'>('nextPaymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stripeStatusFilter, setStripeStatusFilter] = useState<string>('all');
  const [showCharts, setShowCharts] = useState(false);
  const [selectedBusinesses, setSelectedBusinesses] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // SWR para auto-refresh de datos
  const fetcher = async () => {
    const user = auth.currentUser;
    if (!user) return initialBusinesses;
    
    const token = await user.getIdToken();
    const response = await fetch('/api/admin/payment-businesses', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!response.ok) return initialBusinesses;
    return response.json();
  };

  const { data: businesses = initialBusinesses, mutate } = useSWR<Business[]>(
    'payment-businesses',
    fetcher,
    {
      fallbackData: initialBusinesses,
      refreshInterval: 30000, // 30s
      revalidateOnFocus: true,
    }
  );

  const getDaysUntilPayment = (dateStr?: string) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (business: Business) => {
    if (business.isActive === false) {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">❌ Deshabilitado</span>;
    }

    const days = getDaysUntilPayment(business.nextPaymentDate);
    if (days !== null) {
      if (days < 0) {
        return <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">⚠️ Vencido ({Math.abs(days)}d)</span>;
      } else if (days <= 7) {
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">🕐 Vence en {days}d</span>;
      }
    }

    if (['past_due', 'unpaid', 'canceled', 'payment_failed'].includes(business.stripeSubscriptionStatus || '')) {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">❌ Problema de pago</span>;
    }

    return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">✅ Activo</span>;
  };

  const filteredAndSortedBusinesses = useMemo(() => {
    let filtered = businesses.filter(biz => {
      // Filtro por categoría
      if (filter === 'disabled') return biz.isActive === false;
      if (filter === 'overdue') {
        const days = getDaysUntilPayment(biz.nextPaymentDate);
        return days !== null && days < 0;
      }
      if (filter === 'upcoming') {
        const days = getDaysUntilPayment(biz.nextPaymentDate);
        return days !== null && days >= 0 && days <= 7;
      }
      return true;
    });

    // Filtro por plan
    if (planFilter !== 'all') {
      filtered = filtered.filter(biz => biz.plan === planFilter);
    }

    // Filtro por estado Stripe
    if (stripeStatusFilter !== 'all') {
      filtered = filtered.filter(biz => biz.stripeSubscriptionStatus === stripeStatusFilter);
    }

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(biz => 
        biz.name.toLowerCase().includes(term) ||
        biz.ownerEmail?.toLowerCase().includes(term) ||
        biz.ownerName?.toLowerCase().includes(term) ||
        biz.id.toLowerCase().includes(term)
      );
    }

    // Sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'nextPaymentDate':
          const dateA = a.nextPaymentDate ? new Date(a.nextPaymentDate).getTime() : 0;
          const dateB = b.nextPaymentDate ? new Date(b.nextPaymentDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'plan':
          comparison = (a.plan || '').localeCompare(b.plan || '');
          break;
        case 'status':
          const statusA = a.isActive === false ? 0 : (getDaysUntilPayment(a.nextPaymentDate) || 999);
          const statusB = b.isActive === false ? 0 : (getDaysUntilPayment(b.nextPaymentDate) || 999);
          comparison = statusA - statusB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [businesses, filter, searchTerm, sortBy, sortOrder, planFilter, stripeStatusFilter]);

  const handleDisable = async (businessId: string, reason: string) => {
    if (!confirm('¿Estás seguro de deshabilitar este negocio?')) return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/disable-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, reason }),
      });

      if (!res.ok) throw new Error('Error al deshabilitar');

      mutate();
      alert('✅ Negocio deshabilitado correctamente');
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleEnable = async (businessId: string) => {
    if (!confirm('¿Estás seguro de habilitar este negocio?')) return;

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/enable-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Error al habilitar');

      mutate();
      alert('✅ Negocio habilitado correctamente');
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (businessId: string) => {
    const confirmText = prompt(
      'Esta acción es IRREVERSIBLE. Escriba "ELIMINAR" para confirmar la eliminación del negocio y su dueño:'
    );
    
    if (confirmText !== 'ELIMINAR') {
      alert('Eliminación cancelada');
      return;
    }

    setLoading(businessId);
    try {
      const res = await fetch('/api/admin/delete-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!res.ok) throw new Error('Error al eliminar');

      mutate();
      alert('✅ Negocio eliminado permanentemente');
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
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

      alert('✅ Recordatorio enviado correctamente');
    } catch (error: any) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const exportToCSV = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const csvData: string[] = [];
    
    // Header
    csvData.push('Reporte de Negocios con Problemas de Pago');
    csvData.push(`Generado: ${new Date().toLocaleString()}`);
    csvData.push(`Total negocios: ${filteredAndSortedBusinesses.length}`);
    csvData.push('');
    
    // Columnas
    csvData.push('ID,Nombre,Email,Plan,Estado,Próximo Pago,Días,Razón Deshabilitado,Estado Stripe');
    
    // Datos
    filteredAndSortedBusinesses.forEach(biz => {
      const days = getDaysUntilPayment(biz.nextPaymentDate);
      const daysText = days !== null ? (days >= 0 ? `${days}` : `${days} (vencido)`) : 'N/A';
      const nextPayment = biz.nextPaymentDate ? new Date(biz.nextPaymentDate).toLocaleDateString() : 'N/A';
      
      csvData.push(
        `${biz.id},"${biz.name.replace(/"/g, '""')}",${biz.ownerEmail || 'N/A'},${biz.plan || 'free'},${biz.isActive ? 'Activo' : 'Deshabilitado'},${nextPayment},${daysText},"${biz.disabledReason || 'N/A'}",${biz.stripeSubscriptionStatus || 'N/A'}`
      );
    });
    
    // Crear y descargar
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `negocios-problemas-pago-${timestamp}.csv`;
    link.click();
  };

  const toggleBusinessSelection = (businessId: string) => {
    const newSelection = new Set(selectedBusinesses);
    if (newSelection.has(businessId)) {
      newSelection.delete(businessId);
    } else {
      newSelection.add(businessId);
    }
    setSelectedBusinesses(newSelection);
  };

  const selectAll = () => {
    setSelectedBusinesses(new Set(filteredAndSortedBusinesses.map(b => b.id)));
  };

  const clearSelection = () => {
    setSelectedBusinesses(new Set());
  };

  const bulkDisable = async () => {
    if (selectedBusinesses.size === 0) return;
    
    const reason = prompt('Motivo de deshabilitación masiva:', 'Falta de pago');
    if (!reason) return;
    
    if (!confirm(`¿Deshabilitar ${selectedBusinesses.size} negocios?`)) return;

    const promises = Array.from(selectedBusinesses).map(async (businessId) => {
      try {
        const res = await fetch('/api/admin/disable-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, reason, sendEmail: true }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r).length;
    
    mutate();
    clearSelection();
    alert(`✅ ${successful}/${selectedBusinesses.size} negocios deshabilitados`);
  };

  const bulkSendReminder = async () => {
    if (selectedBusinesses.size === 0) return;
    
    if (!confirm(`¿Enviar recordatorio a ${selectedBusinesses.size} negocios?`)) return;

    const promises = Array.from(selectedBusinesses).map(async (businessId) => {
      try {
        const res = await fetch('/api/admin/send-payment-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successful = results.filter(r => r).length;
    
    clearSelection();
    alert(`✅ ${successful}/${selectedBusinesses.size} recordatorios enviados`);
  };

  // Detectar patrones problemáticos
  const detectProblematicPatterns = () => {
    const alerts: string[] = [];
    
    // Negocios con múltiples pagos fallidos
    const multipleFailures = businesses.filter(b => 
      b.paymentHistory && b.paymentHistory.filter((p: any) => p.status === 'failed').length >= 2
    );
    if (multipleFailures.length > 0) {
      alerts.push(`⚠️ ${multipleFailures.length} negocios con múltiples pagos fallidos`);
    }
    
    // Negocios deshabilitados recientemente (sin historial de pagos exitosos)
    const disabledNoHistory = businesses.filter(b => 
      b.isActive === false && (!b.paymentHistory || b.paymentHistory.length === 0)
    );
    if (disabledNoHistory.length > 0) {
      alerts.push(`🚨 ${disabledNoHistory.length} negocios deshabilitados sin historial de pago`);
    }
    
    // Spike de vencimientos en los próximos 7 días
    const upcoming = businesses.filter(b => {
      const days = getDaysUntilPayment(b.nextPaymentDate);
      return b.isActive !== false && days !== null && days >= 0 && days <= 7;
    });
    if (upcoming.length > 5) {
      alerts.push(`📈 Spike: ${upcoming.length} pagos vencen en los próximos 7 días`);
    }
    
    return alerts;
  };

  const patterns = detectProblematicPatterns();

  const handleMigration = async (dryRun: boolean) => {
    if (!dryRun && !confirm('¿Estás seguro de ejecutar la migración? Esto actualizará todos los negocios sin fecha de pago.')) {
      return;
    }

    setMigrating(true);
    try {
      // Obtener token del usuario actual
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      const token = await user.getIdToken();

      const res = await fetch('/api/migrate-payment-dates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dryRun }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error en la migración');
      }
      
      if (dryRun) {
        alert(`✅ Simulación completada:\n\n` +
          `Total: ${result.results.total}\n` +
          `A actualizar: ${result.results.updated}\n` +
          `Ya tienen fecha: ${result.results.skipped}\n` +
          `Errores: ${result.results.errors.length}\n\n` +
          `Ver consola para detalles`);
        console.log('Resultados de simulación:', result);
      } else {
        alert(`✅ Migración completada:\n\n` +
          `Actualizados: ${result.results.updated}\n` +
          `Saltados: ${result.results.skipped}\n` +
          `Errores: ${result.results.errors.length}`);
        
        // Recargar página para ver cambios
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error en migración:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alertas de Patrones Problemáticos */}
      {patterns.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Patrones Detectados</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {patterns.map((pattern, i) => (
                    <li key={i}>{pattern}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header con Export y Charts */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">💳 Negocios con Problemas de Pago</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm flex items-center gap-2"
          >
            <span>📊</span>
            <span className="hidden md:inline">{showCharts ? 'Ocultar' : 'Mostrar'} Gráficos</span>
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
          >
            <FaFileDownload />
            <span className="hidden md:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Gráficos */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Distribución por Estado */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🟢 Distribución por Estado</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Deshabilitados', value: businesses.filter(b => b.isActive === false).length, color: '#EF4444' },
                    { name: 'Vencidos', value: businesses.filter(b => {
                      const days = getDaysUntilPayment(b.nextPaymentDate);
                      return b.isActive !== false && days !== null && days < 0;
                    }).length, color: '#F97316' },
                    { name: 'Próximos 7d', value: businesses.filter(b => {
                      const days = getDaysUntilPayment(b.nextPaymentDate);
                      return b.isActive !== false && days !== null && days >= 0 && days <= 7;
                    }).length, color: '#F59E0B' },
                    { name: 'OK', value: businesses.filter(b => {
                      const days = getDaysUntilPayment(b.nextPaymentDate);
                      return b.isActive !== false && (days === null || days > 7);
                    }).length, color: '#10B981' },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={70}
                  dataKey="value"
                >
                  {[
                    { color: '#EF4444' },
                    { color: '#F97316' },
                    { color: '#F59E0B' },
                    { color: '#10B981' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución por Plan */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">🎯 Negocios por Plan</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { plan: 'Sponsor', count: businesses.filter(b => b.plan === 'sponsor').length },
                { plan: 'Premium', count: businesses.filter(b => b.plan === 'premium').length },
                { plan: 'Otro', count: businesses.filter(b => b.plan && !['sponsor', 'premium'].includes(b.plan)).length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#38761D" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, email o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Filtros y Sorting - Mobile-first compacto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {/* Filtros - Scroll horizontal optimizado */}
      <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="flex gap-2 pb-2 snap-x snap-mandatory">
          <button
            onClick={() => setFilter('all')}
            className={`h-8 px-3 rounded whitespace-nowrap text-xs md:text-sm font-medium transition-colors snap-start flex-shrink-0 ${
              filter === 'all' ? 'bg-[#38761D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Todos ({businesses.length})
          </button>
          <button
            onClick={() => setFilter('disabled')}
            className={`h-8 px-3 rounded whitespace-nowrap text-xs md:text-sm font-medium transition-colors snap-start flex-shrink-0 ${
              filter === 'disabled' ? 'bg-[#38761D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚫 Deshabilitados ({businesses.filter(b => b.isActive === false).length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`h-8 px-3 rounded whitespace-nowrap text-xs md:text-sm font-medium transition-colors border-2 snap-start flex-shrink-0 ${
              filter === 'overdue' 
                ? 'bg-orange-600 text-white border-orange-700 shadow-md' 
                : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
            }`}
          >
            ⚠️ Vencidos ({businesses.filter(b => {
              const days = getDaysUntilPayment(b.nextPaymentDate);
              return days !== null && days < 0;
            }).length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`h-8 px-3 rounded whitespace-nowrap text-xs md:text-sm font-medium transition-colors snap-start flex-shrink-0 ${
              filter === 'upcoming' ? 'bg-[#38761D] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🕐 Próximos 7d ({businesses.filter(b => {
              const days = getDaysUntilPayment(b.nextPaymentDate);
              return days !== null && days >= 0 && days <= 7;
            }).length})
          </button>
        </div>
      </div>
        </div>

      {/* Sorting controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-600">Ordenar:</span>
        {(['name', 'nextPaymentDate', 'plan', 'status'] as const).map((field) => {
          const labels = {
            name: 'Nombre',
            nextPaymentDate: 'Fecha',
            plan: 'Plan',
            status: 'Estado'
          };
          const Icon = sortBy === field ? (sortOrder === 'asc' ? FaSortUp : FaSortDown) : FaSort;
          
          return (
            <button
              key={field}
              onClick={() => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(field);
                  setSortOrder('asc');
                }
              }}
              className={`px-3 py-1 text-xs rounded-lg transition flex items-center gap-1 ${
                sortBy === field
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="text-[10px]" />
              {labels[field]}
            </button>
          );
        })}
        <span className="text-xs text-gray-500 ml-2">
          ({filteredAndSortedBusinesses.length} resultados)
        </span>
      </div>

      {/* Filtros Avanzados */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-600">Filtros:</span>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="all">Todos los planes</option>
          <option value="sponsor">Sponsor</option>
          <option value="premium">Premium</option>
        </select>
        
        <select
          value={stripeStatusFilter}
          onChange={(e) => setStripeStatusFilter(e.target.value)}
          className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="all">Todos los estados Stripe</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="unpaid">Unpaid</option>
          <option value="canceled">Canceled</option>
          <option value="payment_failed">Payment Failed</option>
        </select>
      </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedBusinesses.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-900">
              {selectedBusinesses.size} negocio{selectedBusinesses.size > 1 ? 's' : ''} seleccionado{selectedBusinesses.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Limpiar
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={bulkSendReminder}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <FaClock className="text-xs" />
              <span className="hidden md:inline">Recordatorio masivo</span>
              <span className="md:hidden">Recordar</span>
            </button>
            <button
              onClick={bulkDisable}
              className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-2"
            >
              <FaBan className="text-xs" />
              <span className="hidden md:inline">Deshabilitar masivo</span>
              <span className="md:hidden">Deshab.</span>
            </button>
          </div>
        </div>
      )}

      {/* Controles de selección */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            ✓ Todos ({filteredAndSortedBusinesses.length})
          </button>
          {selectedBusinesses.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              ✗ Deseleccionar
            </button>
          )}
        </div>
      </div>

      {/* Lista de negocios */}
      <div className="space-y-2 md:space-y-3">
        {filteredAndSortedBusinesses.map((biz) => {
          const days = getDaysUntilPayment(biz.nextPaymentDate);
          const isOverdue = days !== null && days < 0;
          
          return (
          <div
            key={biz.id}
            className={`border-2 rounded-lg p-3 md:p-4 transition-shadow ${
              biz.isActive === false 
                ? 'bg-red-50 border-red-300' 
                : isOverdue
                ? 'bg-orange-50 border-orange-400 shadow-lg'
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-3">              {/* Checkbox de selección */}
              <div className="flex items-start pt-1">
                <input
                  type="checkbox"
                  checked={selectedBusinesses.has(biz.id)}
                  onChange={() => toggleBusinessSelection(biz.id)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate max-w-[200px] md:max-w-none">{biz.name}</h3>
                  {getStatusBadge(biz)}
                  <span className="px-2 py-0.5 text-[10px] md:text-xs rounded bg-blue-100 text-blue-700 capitalize font-medium">
                    {biz.plan || 'free'}
                  </span>
                </div>
                
                <div className="text-xs md:text-sm text-gray-600 space-y-0.5">
                  <div className="flex items-center gap-1 truncate">📧 <span className="truncate">{biz.ownerEmail || 'Sin email'}</span></div>
                  {biz.ownerName && <div className="flex items-center gap-1 truncate">👤 <span className="truncate">{biz.ownerName}</span></div>}
                  
                  {biz.nextPaymentDate && (
                    <div className="flex items-center gap-1">
                      <FaClock className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        Próximo: {new Date(biz.nextPaymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        {getDaysUntilPayment(biz.nextPaymentDate) !== null && (
                          <span className="font-medium ml-1">
                            ({getDaysUntilPayment(biz.nextPaymentDate)! > 0 ? '' : 'hace '}
                            {Math.abs(getDaysUntilPayment(biz.nextPaymentDate)!)}d)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {biz.lastPaymentDate && (
                    <div className="flex items-center gap-1">
                      <FaCheckCircle className="text-green-500 flex-shrink-0 text-[10px]" />
                      <span className="text-[11px] text-gray-500 truncate">
                        Último: {new Date(biz.lastPaymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  )}
                  
                  {biz.disabledReason && (
                    <div className="flex items-center gap-1 text-red-600">
                      <FaExclamationTriangle />
                      Razón: {biz.disabledReason}
                    </div>
                  )}
                  
                  {biz.paymentHistory && biz.paymentHistory.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedBusiness(biz);
                        setShowHistory(true);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <FaHistory />
                      Ver historial ({biz.paymentHistory.length} pagos)
                    </button>
                  )}
                </div>
              </div>

              {/* Botones de acción - Compactos mobile-first */}
              <div className="flex flex-col md:flex-row gap-2 pt-2 md:pt-3 border-t border-gray-200 md:border-t-0 md:items-center">
                {biz.isActive !== false ? (
                  <>
                    <button
                      onClick={() => handleSendReminder(biz.id)}
                      disabled={loading === biz.id}
                      className="flex-1 h-9 md:h-10 px-3 text-xs md:text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium"
                    >
                      <FaClock className="text-xs" />
                      <span>Recordatorio</span>
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Motivo de deshabilitación:', 'Falta de pago');
                        if (reason) handleDisable(biz.id, reason);
                      }}
                      disabled={loading === biz.id}
                      className="flex-1 h-9 md:h-10 px-3 text-xs md:text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium"
                    >
                      <FaBan className="text-xs" />
                      <span>Deshabilitar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEnable(biz.id)}
                    disabled={loading === biz.id}
                    className="flex-1 h-9 md:h-10 px-3 text-xs md:text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium"
                  >
                    <FaCheckCircle className="text-xs" />
                    <span>Habilitar</span>
                  </button>
                )}
                
                {/* Botón eliminar - Estilo ghost/destructivo menos prominente */}
                <button
                  onClick={() => handleDelete(biz.id)}
                  disabled={loading === biz.id}
                  className="h-9 md:h-10 px-3 text-xs md:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium border border-red-200 md:flex-shrink-0"
                  title="Eliminar permanentemente"
                >
                  <FaTrash className="text-[10px] md:text-xs" />
                  <span className="md:inline">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        );  
        })}

        {filteredAndSortedBusinesses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? (
              <>
                <p className="text-4xl mb-2">🔍</p>
                <p>No se encontraron resultados para "{searchTerm}"</p>
              </>
            ) : (
              <p>No hay negocios con problemas de pago en esta categoría</p>
            )}
          </div>
        )}
      </div>

      {/* Modal de historial */}
      {showHistory && selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Historial de Pagos - {selectedBusiness.name}
              </h2>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setSelectedBusiness(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {selectedBusiness.paymentHistory && selectedBusiness.paymentHistory.length > 0 ? (
                selectedBusiness.paymentHistory.map((payment) => (
                  <div key={payment.id} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900">
                          ${payment.amount.toFixed(2)} MXN
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(payment.date).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          Plan: {payment.plan}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          payment.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : payment.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {payment.status === 'success' ? '✅ Exitoso' : 
                         payment.status === 'failed' ? '❌ Fallido' : '🔄 Reembolsado'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay historial de pagos disponible
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
