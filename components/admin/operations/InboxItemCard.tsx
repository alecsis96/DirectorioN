'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '../shared/StatusBadge';

interface Props {
  item: {
    id: string;
    type: string;
    priority: 'critical' | 'warning' | 'info';
    businessName: string;
    businessId: string;
    metadata: any;
    actions: string[];
  };
}

export default function InboxItemCard({ item }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inbox-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          businessId: item.businessId,
          action,
          type: item.type,
        }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Error al ejecutar acción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al ejecutar acción');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'application': return '📝';
      case 'review': return '🔍';
      case 'payment': return '💳';
      case 'expiration': return '⏰';
      default: return '📋';
    }
  };

  const getTitle = () => {
    switch (item.type) {
      case 'application': return 'Solicitud nueva';
      case 'review': return 'En revisión';
      case 'payment': return `Pago vencido hace ${item.metadata.daysOverdue} días`;
      case 'expiration': return `Vence en ${item.metadata.daysUntilExpiration} días`;
      default: return 'Tarea pendiente';
    }
  };

  const getActionButtons = () => {
    const buttonConfig: Record<string, { label: string; color: string }> = {
      approve: { label: '✅ Aprobar', color: 'green' },
      reject: { label: '❌ Rechazar', color: 'red' },
      'request-info': { label: '📝 Solicitar info', color: 'blue' },
      publish: { label: '✅ Publicar', color: 'green' },
      remind: { label: '📧 Recordar', color: 'blue' },
      suspend: { label: '⏸️ Suspender', color: 'orange' },
      extend: { label: '🔄 Extender', color: 'green' },
    };

    return item.actions.map(action => {
      const config = buttonConfig[action] || { label: action, color: 'gray' };
      return (
        <button
          key={action}
          onClick={() => handleAction(action)}
          disabled={loading}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
            ${config.color === 'green' && 'bg-green-100 text-green-700 hover:bg-green-200'}
            ${config.color === 'red' && 'bg-red-100 text-red-700 hover:bg-red-200'}
            ${config.color === 'blue' && 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
            ${config.color === 'orange' && 'bg-orange-100 text-orange-700 hover:bg-orange-200'}
            ${config.color === 'gray' && 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          `}
        >
          {config.label}
        </button>
      );
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            <span className="text-2xl flex-shrink-0">{getIcon()}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {item.businessName}
              </h3>
              <p className="text-sm text-gray-600">
                {getTitle()}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 ml-11">
            {item.metadata.plan && (
              <StatusBadge
                status="info"
                label={item.metadata.plan === 'sponsor' ? '👑 Sponsor' : item.metadata.plan === 'featured' ? '⭐ Featured' : '🆓 Free'}
                size="sm"
              />
            )}
            {item.metadata.category && (
              <span className="text-xs text-gray-500">{item.metadata.category}</span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
}
