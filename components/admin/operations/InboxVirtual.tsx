'use client';

import { useMemo, useState } from 'react';

import EmptyState from '../shared/EmptyState';
import InboxItemCard from './InboxItemCard';

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

  const grouped = useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((item) => item.priority === filter);
    return {
      all: filtered,
      critical: filtered.filter((item) => item.priority === 'critical'),
      warning: filtered.filter((item) => item.priority === 'warning'),
      info: filtered.filter((item) => item.priority === 'info'),
    };
  }, [filter, items]);

  if (!items.length) {
    return (
      <EmptyState
        icon="✅"
        title="Todo al día"
        description="No hay tareas pendientes en este momento."
        action={{ label: 'Ver negocios', href: '/admin/businesses' }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todos', count: items.length },
          { key: 'critical', label: 'Crítico', count: grouped.critical.length },
          { key: 'warning', label: 'Atención', count: grouped.warning.length },
          { key: 'info', label: 'Pendiente', count: grouped.info.length },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as typeof filter)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === item.key ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
            }`}
          >
            {item.label}
            <span className="ml-2 opacity-75">({item.count})</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {grouped.all.map((item) => (
          <InboxItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
