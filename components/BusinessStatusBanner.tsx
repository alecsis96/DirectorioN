/** Estado visible del negocio dentro del editor del propietario. */
'use client';

import { useState } from 'react';
import { getStatusText, type BusinessWithState } from '../lib/businessStates';

interface BusinessStatusBannerProps {
  business: Partial<BusinessWithState>;
  onPublish?: () => void | Promise<void>;
  onEdit?: () => void;
}

export default function BusinessStatusBanner({ business, onPublish, onEdit }: BusinessStatusBannerProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const status = getStatusText(business);
  const effectiveStatus = business.businessStatus ??
    (business.status === 'published' ? 'published' : 'draft');
  const completionPercent = Math.max(0, Math.min(100, business.completionPercent || 0));
  const missingFields = business.missingFields || [];

  async function handlePublish() {
    if (!onPublish || effectiveStatus !== 'draft') return;
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  }

  const palette = effectiveStatus === 'published'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
    : effectiveStatus === 'in_review'
      ? 'border-blue-200 bg-blue-50 text-blue-950'
      : 'border-amber-200 bg-amber-50 text-gray-900';

  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${palette}`} aria-label="Estado del negocio">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{status.title}</h2>
          <p className="mt-1 text-sm opacity-80">{status.description}</p>
        </div>

        {effectiveStatus === 'draft' && onPublish ? (
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={isPublishing}
            className="min-h-11 w-full shrink-0 rounded-xl bg-[#38761D] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2f5a1a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPublishing ? 'Enviando…' : 'Enviar a revisión'}
          </button>
        ) : null}

        {onEdit && effectiveStatus !== 'in_review' ? (
          <button type="button" onClick={onEdit} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
            Editar
          </button>
        ) : null}
      </div>

      {effectiveStatus === 'draft' ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span>Perfil completado</span>
              <span>{completionPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[#38761D] transition-[width]" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          {missingFields.length > 0 ? (
            <div className="rounded-xl bg-white/70 p-3 text-sm">
              <p className="font-semibold">Falta completar:</p>
              <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                {missingFields.slice(0, 4).map(field => <li key={field}>• {field}</li>)}
              </ul>
              {missingFields.length > 4 ? <p className="mt-1 text-xs opacity-70">y {missingFields.length - 4} más</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {business.adminNotes ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-white/70 p-3 text-sm">
          <p className="font-semibold">Observaciones de revisión</p>
          <p className="mt-1">{business.adminNotes}</p>
        </div>
      ) : null}

      {business.rejectionReason && business.applicationStatus === 'rejected' ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Cambios solicitados</p>
          <p className="mt-1">{business.rejectionReason}</p>
        </div>
      ) : null}
    </section>
  );
}
