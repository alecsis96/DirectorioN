'use client';

import { useState } from 'react';
import { FaTrash, FaBan, FaCheckCircle, FaClock, FaHistory, FaExclamationTriangle } from 'react-icons/fa';

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
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'disabled' | 'overdue' | 'upcoming'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [migrating, setMigrating] = useState(false);

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

  const filteredBusinesses = businesses.filter(biz => {
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

      setBusinesses(prev =>
        prev.map(b => (b.id === businessId ? { ...b, isActive: false, disabledReason: reason } : b))
      );
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

      setBusinesses(prev =>
        prev.map(b => (b.id === businessId ? { ...b, isActive: true, disabledReason: undefined } : b))
      );
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

      setBusinesses(prev => prev.filter(b => b.id !== businessId));
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

  const handleMigration = async (dryRun: boolean) => {
    if (!dryRun && !confirm('¿Estás seguro de ejecutar la migración? Esto actualizará todos los negocios sin fecha de pago.')) {
      return;
    }

    setMigrating(true);
    try {
      const res = await fetch('/api/migrate-payment-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });

      if (!res.ok) throw new Error('Error en la migración');

      const result = await res.json();
      
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
      alert('❌ Error: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botones de utilidades */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-blue-900">⚙️ Herramientas de Migración</h3>
            <p className="text-sm text-blue-700 mt-1">
              Agrega fechas de pago a negocios existentes que no las tienen
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleMigration(true)}
              disabled={migrating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
            >
              {migrating ? 'Procesando...' : '🔍 Simular'}
            </button>
            <button
              onClick={() => handleMigration(false)}
              disabled={migrating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {migrating ? 'Procesando...' : '✅ Ejecutar Migración'}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded whitespace-nowrap ${
            filter === 'all' ? 'bg-[#38761D] text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Todos ({businesses.length})
        </button>
        <button
          onClick={() => setFilter('disabled')}
          className={`px-4 py-2 rounded whitespace-nowrap ${
            filter === 'disabled' ? 'bg-[#38761D] text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Deshabilitados ({businesses.filter(b => b.isActive === false).length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded whitespace-nowrap ${
            filter === 'overdue' ? 'bg-[#38761D] text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Vencidos ({businesses.filter(b => {
            const days = getDaysUntilPayment(b.nextPaymentDate);
            return days !== null && days < 0;
          }).length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded whitespace-nowrap ${
            filter === 'upcoming' ? 'bg-[#38761D] text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Próximos (7d) ({businesses.filter(b => {
            const days = getDaysUntilPayment(b.nextPaymentDate);
            return days !== null && days >= 0 && days <= 7;
          }).length})
        </button>
      </div>

      {/* Lista de negocios */}
      <div className="space-y-3">
        {filteredBusinesses.map((biz) => (
          <div
            key={biz.id}
            className={`border rounded-lg p-4 ${
              biz.isActive === false ? 'bg-red-50 border-red-200' : 'bg-white'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{biz.name}</h3>
                  {getStatusBadge(biz)}
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 capitalize">
                    {biz.plan || 'free'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  <div>📧 {biz.ownerEmail || 'Sin email'}</div>
                  {biz.ownerName && <div>👤 {biz.ownerName}</div>}
                  
                  {biz.nextPaymentDate && (
                    <div className="flex items-center gap-1">
                      <FaClock className="text-gray-400" />
                      Próximo pago: {new Date(biz.nextPaymentDate).toLocaleDateString('es-MX')}
                      {getDaysUntilPayment(biz.nextPaymentDate) !== null && (
                        <span className="font-medium">
                          ({getDaysUntilPayment(biz.nextPaymentDate)! > 0 ? 'en ' : 'hace '}
                          {Math.abs(getDaysUntilPayment(biz.nextPaymentDate)!)} días)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {biz.lastPaymentDate && (
                    <div className="flex items-center gap-1">
                      <FaCheckCircle className="text-green-500" />
                      Último pago: {new Date(biz.lastPaymentDate).toLocaleDateString('es-MX')}
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

              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {biz.isActive !== false ? (
                  <>
                    <button
                      onClick={() => handleSendReminder(biz.id)}
                      disabled={loading === biz.id}
                      className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <FaClock />
                      Recordar
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Motivo de deshabilitación:', 'Falta de pago');
                        if (reason) handleDisable(biz.id, reason);
                      }}
                      disabled={loading === biz.id}
                      className="px-3 py-2 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      <FaBan />
                      Deshabilitar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEnable(biz.id)}
                    disabled={loading === biz.id}
                    className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <FaCheckCircle />
                    Habilitar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(biz.id)}
                  disabled={loading === biz.id}
                  className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                >
                  <FaTrash />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredBusinesses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay negocios con problemas de pago en esta categoría
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
