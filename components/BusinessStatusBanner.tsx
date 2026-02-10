/**
 * Banner de estado del negocio
 * Muestra el progreso de completitud y acciones disponibles
 */

'use client';

import { useState } from 'react';
import { 
  getStatusText, 
  type BusinessWithState,
  canPublishBusiness,
} from '../lib/businessStates';

interface BusinessStatusBannerProps {
  business: Partial<BusinessWithState>;
  onPublish?: () => void;
  onEdit?: () => void;
}

export default function BusinessStatusBanner({
  business,
  onPublish,
  onEdit,
}: BusinessStatusBannerProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const status = getStatusText(business);
  const completionPercent = business.completionPercent || 0;
  const canPublish = canPublishBusiness(business);
  const missingFields = business.missingFields || [];

  const handlePublish = async () => {
    if (!onPublish || !canPublish) return;
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  // Determinar colores según el estado
  const colors = {
    draft: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-800',
      icon: '📝',
      progressBg: 'bg-gray-200',
      progressBar: 'bg-gray-500',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-900',
      icon: '⚠️',
      progressBg: 'bg-amber-200',
      progressBar: 'bg-amber-500',
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-900',
      icon: '✅',
      progressBg: 'bg-green-200',
      progressBar: 'bg-green-500',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      icon: '❌',
      progressBg: 'bg-red-200',
      progressBar: 'bg-red-500',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: '⏳',
      progressBg: 'bg-blue-200',
      progressBar: 'bg-blue-500',
    },
  };

  const currentColors = colors[status.variant];

  // Si está publicado, mostrar banner simple de éxito
  if (business.businessStatus === 'published') {
    return (
      <div className={`rounded-xl border-2 p-6 ${currentColors.bg} ${currentColors.text}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentColors.icon}</span>
            <div>
              <h3 className="text-lg font-bold">{status.title}</h3>
              <p className="text-sm opacity-90">{status.description}</p>
            </div>
          </div>
          <a
            href={`/negocios/${business.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            👁️ Ver mi negocio
          </a>
        </div>
      </div>
    );
  }

  // Banner para estados no publicados
  return (
    <div className={`rounded-xl border-2 p-6 ${currentColors.bg} ${currentColors.text} space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-3xl">{currentColors.icon}</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">{status.title}</h3>
            <p className="text-sm opacity-90">{status.description}</p>
          </div>
        </div>
        
        {/* Acciones */}
        <div className="flex items-center gap-2">
          {canPublish && status.action && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2.5 bg-[#38761D] text-white rounded-lg font-bold text-sm hover:bg-[#2f5a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              {isPublishing ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                status.action
              )}
            </button>
          )}
          
          {onEdit && business.businessStatus !== 'in_review' && (
            <button
              onClick={onEdit}
              className="px-4 py-2 border-2 border-gray-300 bg-white text-gray-700 rounded-lg font-semibold text-sm hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              ✏️ Editar
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso (solo si no está publicado ni en revisión) */}
      {business.businessStatus === 'draft' && completionPercent < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Completitud del perfil</span>
            <span>{completionPercent}%</span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden ${currentColors.progressBg}`}>
            <div
              className={`h-full ${currentColors.progressBar} transition-all duration-500 ease-out`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Campos faltantes */}
      {missingFields.length > 0 && business.businessStatus === 'draft' && (
        <div className="bg-white/60 rounded-lg p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">
            Completa estos campos:
          </p>
          <ul className="space-y-1.5">
            {missingFields.map((field, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-amber-600 font-bold">•</span>
                <span className="capitalize">{field}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notas del admin (si hay) */}
      {business.adminNotes && (
        <div className="bg-blue-50/80 border border-blue-300 rounded-lg p-4">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
            📋 Observaciones del administrador:
          </p>
          <p className="text-sm text-blue-900">{business.adminNotes}</p>
        </div>
      )}

      {/* Motivo de rechazo */}
      {business.rejectionReason && business.applicationStatus === 'rejected' && (
        <div className="bg-red-50/80 border border-red-300 rounded-lg p-4">
          <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
            ❌ Motivo del rechazo:
          </p>
          <p className="text-sm text-red-900">{business.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
