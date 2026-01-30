'use client';

import { useState } from 'react';
import { FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';

interface ReceiptActionsClientProps {
  receiptId: string;
  businessName: string;
  onActionComplete: () => void;
}

export default function ReceiptActionsClient({
  receiptId,
  businessName,
  onActionComplete,
}: ReceiptActionsClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject') => {
    const confirmMessage = action === 'approve'
      ? `¿Aprobar el comprobante y activar el plan para "${businessName}"?`
      : `¿Rechazar el comprobante de "${businessName}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/approve-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el comprobante');
      }

      alert(data.message || `Comprobante ${action === 'approve' ? 'aprobado' : 'rechazado'} correctamente`);
      
      // Recargar la página para actualizar la lista
      onActionComplete();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors"
        title="Aprobar y activar plan"
      >
        {loading ? <FaSpinner className="animate-spin text-[10px]" /> : <FaCheck className="text-[10px]" />}
        <span>Aprobar</span>
      </button>
      
      <button
        onClick={() => handleAction('reject')}
        disabled={loading}
        className="flex-1 h-9 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors"
        title="Rechazar comprobante"
      >
        {loading ? <FaSpinner className="animate-spin text-[10px]" /> : <FaTimes className="text-[10px]" />}
        <span>Rechazar</span>
      </button>
      
      {error && (
        <span className="text-[11px] text-red-600 absolute -bottom-5 left-0">{error}</span>
      )}
    </div>
  );
}
