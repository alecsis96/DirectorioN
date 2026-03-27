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
  fileData?: string;
  fileUrl?: string;
  status: string;
  createdAt?: string;
};

interface ReceiptListClientProps {
  initialReceipts: TransferReceipt[];
}

function formatReceiptDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceiptListClient({ initialReceipts }: ReceiptListClientProps) {
  const router = useRouter();
  const [receipts] = useState(initialReceipts);

  const handleActionComplete = () => {
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Comprobantes de transferencia</h2>
          <p className="mt-1 text-sm text-gray-600">Validacion rapida de pagos enviados por negocios.</p>
        </div>
        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
          {receipts.length} pendientes
        </span>
      </div>

      {receipts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No hay comprobantes pendientes.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Negocio</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Contacto</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Archivo</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((receipt) => {
                  const fileLink = receipt.fileUrl || (receipt.fileData ? `data:${receipt.fileType};base64,${receipt.fileData}` : null);
                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-900">{receipt.businessName}</div>
                        <div className="text-xs text-gray-500">{receipt.businessId}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{receipt.ownerEmail || 'Sin correo'}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium capitalize text-purple-700">
                          {receipt.plan}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {fileLink ? (
                          <a
                            href={fileLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={receipt.fileName}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                          >
                            <span>{receipt.fileName}</span>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{formatReceiptDate(receipt.createdAt)}</td>
                      <td className="px-4 py-2">
                        <ReceiptActionsClient
                          receiptId={receipt.id}
                          businessName={receipt.businessName}
                          onActionComplete={handleActionComplete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {receipts.map((receipt) => {
              const fileLink = receipt.fileUrl || (receipt.fileData ? `data:${receipt.fileType};base64,${receipt.fileData}` : null);
              return (
                <div key={receipt.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{receipt.businessName}</h3>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">{receipt.ownerEmail || 'Sin correo'}</p>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium capitalize text-purple-700">
                      {receipt.plan}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                    <p>{formatReceiptDate(receipt.createdAt)}</p>
                    {receipt.fileName ? <p className="truncate">{receipt.fileName}</p> : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                    {fileLink ? (
                      <a
                        href={fileLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={receipt.fileName}
                        className="flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Ver archivo
                      </a>
                    ) : null}
                    <div className={fileLink ? '' : 'col-span-2'}>
                      <ReceiptActionsClient
                        receiptId={receipt.id}
                        businessName={receipt.businessName}
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
