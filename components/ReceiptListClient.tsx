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
  fileData: string;
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Comprobantes de transferencia</h2>
          <p className="text-sm text-gray-600">Últimos envíos de dueños para validar pago.</p>
        </div>
        <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
          {receipts.length} pendientes
        </span>
      </div>
      {receipts.length === 0 ? (
        <p className="text-sm text-gray-500">No hay comprobantes pendientes.</p>
      ) : (
        <div className="overflow-x-auto">
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
                const dataUrl = r.fileData ? `data:${r.fileType};base64,${r.fileData}` : null;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-semibold text-gray-900">{r.businessName}</div>
                      <div className="text-xs text-gray-500">{r.businessId}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.ownerEmail || 'Sin correo'}</td>
                    <td className="px-4 py-2 capitalize">{r.plan}</td>
                    <td className="px-4 py-2">
                      {dataUrl ? (
                        <a
                          href={dataUrl}
                          download={r.fileName}
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          {r.fileName}
                        </a>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('es-MX') : 'N/A'}
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
      )}
    </section>
  );
}
