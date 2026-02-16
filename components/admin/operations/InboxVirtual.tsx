'use client';

import { useState } from 'react';
import InboxItemCard from './InboxItemCard';
import EmptyState from '../shared/EmptyState';

interface InboxItem {
  id: string;
  type: string;
  priority: 'critical' | 'warning' | 'info';
  priorityScore: number;
  businessName: string;
  businessId: string;
  metadata: any;
  actions: string[];
}

interface Props {
  items: InboxItem[];
}

export default function InboxVirtual({ items }: Props) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.priority === filter);

  const grouped = {
    critical: filteredItems.filter(i => i.priority === 'critical'),
    warning: filteredItems.filter(i => i.priority === 'warning'),
    info: filteredItems.filter(i => i.priority === 'info'),
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="¡Todo al día!"
        description="No hay tareas pendientes en este momento."
        action={{ label: 'Ver todos los negocios', href: '/admin/businesses' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todos', count: items.length },
          { key: 'critical', label: 'Crítico', count: grouped.critical.length },
          { key: 'warning', label: 'Atención', count: grouped.warning.length },
          { key: 'info', label: 'Pendiente', count: grouped.info.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === f.key 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
              }
            `}
          >
            {f.label}
            <span className="ml-2 opacity-75">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Critical Section */}
      {grouped.critical.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-red-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            CRÍTICO ({grouped.critical.length})
          </h2>
          <div className="space-y-2">
            {grouped.critical.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Warning Section */}
      {grouped.warning.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-yellow-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            ATENCIÓN ({grouped.warning.length})
          </h2>
          <div className="space-y-2">
            {grouped.warning.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Info Section */}
      {grouped.info.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-blue-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            PENDIENTE ({grouped.info.length})
          </h2>
          <div className="space-y-2">
            {grouped.info.map(item => (
              <InboxItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
