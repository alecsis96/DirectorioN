'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReceiptActionsClient from './ReceiptActionsClient';

type TransferReceipt = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail?: string | null;
  plan: string;
  fileName: string;
  fileType: string;
  fileData?: string; // Legacy - base64
  fileUrl?: string;  // Nueva - URL de Storage
  status: string;
  createdAt?: string;
};

interface ReceiptListClientProps {
  initialReceipts: TransferReceipt[];
}

export default function ReceiptListClient({ initialReceipts }: ReceiptListClientProps) {
  const router = useRouter();
  const [receipts] = useState(initialReceipts);

  const handleActionComplete = () => {
    // Recargar la página para obtener datos actualizados
    router.refresh();
  };

  return (
    <section className="mt-10 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">📄 Comprobantes de transferencia</h2>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Últimos envíos de dueños para validar pago.</p>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full font-semibold">
          {receipts.length} pendientes
        </span>
      </div>
      {receipts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">✅ No hay comprobantes pendientes de validación.</p>
        </div>
      ) : (
        <>
          {/* Vista de tabla para desktop (oculta en móvil) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Negocio</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Propietario</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Archivo</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((r) => {
                  const fileLink = r.fileUrl || (r.fileData ? `data:${r.fileType};base64,${r.fileData}` : null);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-900">{r.businessName}</div>
                        <div className="text-xs text-gray-500">{r.businessId}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{r.ownerEmail || 'Sin correo'}</td>
                      <td className="px-4 py-2">
                        <span className="capitalize px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {r.plan}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {fileLink ? (
                          <a
                            href={fileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={r.fileName}
                            className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <span>{r.fileName}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-4 py-2">
                        <ReceiptActionsClient 
                          receiptId={r.id}
                          businessName={r.businessName}
                          onActionComplete={handleActionComplete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista de cards para móvil (oculta en desktop) - Compacta mobile-first */}
          <div className="md:hidden space-y-2">
            {receipts.map((r) => {
              const fileLink = r.fileUrl || (r.fileData ? `data:${r.fileType};base64,${r.fileData}` : null);
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  {/* Header compacto */}
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{r.businessName}</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{r.ownerEmail || 'Sin correo'}</p>
                    </div>
                    <span className="capitalize px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex-shrink-0">
                      {r.plan}
                    </span>
                  </div>

                  {/* Info compacta */}
                  <div className="space-y-1 text-[11px] text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      📅
                      <span className="truncate">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </div>
                    
                    {r.fileName && (
                      <div className="flex items-center gap-1">
                        📄
                        <span className="truncate">{r.fileName}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones en grid 2 columnas */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    {fileLink && (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={r.fileName}
                        className="h-9 px-3 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-1.5 font-medium"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                        </svg>
                        <span>Ver</span>
                      </a>
                    )}
                    <div className={fileLink ? '' : 'col-span-2'}>
                      <ReceiptActionsClient 
                        receiptId={r.id}
                        businessName={r.businessName}
                        onActionComplete={handleActionComplete}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
