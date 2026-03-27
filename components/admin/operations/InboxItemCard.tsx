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

const actionConfig: Record<string, { label: string; tone: string }> = {
  approve: { label: 'Aprobar', tone: 'bg-green-600 text-white hover:bg-green-700' },
  reject: { label: 'Rechazar', tone: 'bg-red-600 text-white hover:bg-red-700' },
  'request-info': { label: 'Pedir info', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
  publish: { label: 'Publicar', tone: 'bg-green-600 text-white hover:bg-green-700' },
  remind: { label: 'Recordar', tone: 'bg-blue-600 text-white hover:bg-blue-700' },
  suspend: { label: 'Suspender', tone: 'bg-orange-600 text-white hover:bg-orange-700' },
  extend: { label: 'Extender', tone: 'bg-gray-900 text-white hover:bg-black' },
};

function getTitle(item: Props['item']) {
  switch (item.type) {
    case 'application':
      return 'Solicitud nueva';
    case 'review':
      return 'Listo para revisar';
    case 'payment':
      return `Pago vencido ${item.metadata.daysOverdue ? `hace ${item.metadata.daysOverdue} días` : ''}`.trim();
    case 'expiration':
      return `Vence en ${item.metadata.daysUntilExpiration} días`;
    default:
      return 'Tarea pendiente';
  }
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

  const businessMeta = item.metadata.plan
    ? item.metadata.plan === 'sponsor'
      ? 'Premium'
      : item.metadata.plan === 'featured'
        ? 'Premium'
        : 'Free'
    : null;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{item.businessName}</h3>
            <StatusBadge status={item.priority} label={getTitle(item)} size="sm" />
            {businessMeta ? (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{businessMeta}</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {item.metadata.email || item.metadata.category || 'Acción pendiente en el inbox'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {item.actions.map((action) => {
            const config = actionConfig[action] || {
              label: action,
              tone: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            };

            return (
              <button
                key={action}
                type="button"
                onClick={() => handleAction(action)}
                disabled={loading}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${config.tone} ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
