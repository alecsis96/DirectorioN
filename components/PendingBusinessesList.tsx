'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { PendingBusiness } from '../app/admin/pending-businesses/page';

interface Props {
  businesses: PendingBusiness[];
}

export default function PendingBusinessesList({ businesses: initialBusinesses }: Props) {
  const [businesses, setBusinesses] = useState<PendingBusiness[]>(initialBusinesses);
  const [selectedBusiness, setSelectedBusiness] = useState<PendingBusiness | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  async function handleAction(businessId: string, action: 'approve' | 'reject') {
    if (!user) {
      alert('Debes estar autenticado');
      return;
    }

    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/review-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          action,
          notes: action === 'reject' ? notes : undefined,
        }),
      });

      if (!res.ok) throw new Error('Error al procesar la acción');

      // Remover de la lista
      setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
      setModalOpen(false);
      setSelectedBusiness(null);
      setNotes('');
      alert(`Negocio ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`);
    } catch (error) {
      console.error('Error:', error);
      alert('Ocurrió un error al procesar la acción');
    } finally {
      setBusy(false);
    }
  }

  function openModal(business: PendingBusiness, action: 'approve' | 'reject') {
    setSelectedBusiness(business);
    setActionType(action);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedBusiness(null);
    setActionType(null);
    setNotes('');
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No hay negocios pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {businesses.map((business) => (
          <div
            key={business.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{business.name}</h3>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                    En revisión
                  </span>
                </div>
                
                {business.category && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Categoría:</span> {business.category}
                  </p>
                )}
                
                {business.ownerEmail && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Email:</span> {business.ownerEmail}
                  </p>
                )}
                
                {business.phone && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Teléfono:</span> {business.phone}
                  </p>
                )}
                
                {business.address && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Dirección:</span> {business.address}
                  </p>
                )}
                
                {business.updatedAt && (
                  <p className="text-xs text-gray-400 mt-2">
                    Enviado a revisión: {new Date(business.updatedAt).toLocaleString('es-MX')}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <a
                  href={`/dashboard/${business.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 text-center"
                >
                  👁️ Ver dashboard
                </a>
                
                <button
                  onClick={() => openModal(business, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700"
                >
                  ✅ Aprobar y publicar
                </button>
                
                <button
                  onClick={() => openModal(business, 'reject')}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700"
                >
                  ❌ Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmación */}
      {modalOpen && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {actionType === 'approve' ? '✅ Aprobar negocio' : '❌ Rechazar negocio'}
            </h3>
            
            <p className="text-gray-700 mb-4">
              ¿Estás seguro de {actionType === 'approve' ? 'aprobar y publicar' : 'rechazar'} el negocio{' '}
              <strong>{selectedBusiness.name}</strong>?
            </p>

            {actionType === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Motivo del rechazo (opcional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Explica por qué se rechaza la solicitud..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleAction(selectedBusiness.id, actionType!)}
                disabled={busy}
                className={`flex-1 px-4 py-2 rounded font-semibold text-white ${
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {busy ? 'Procesando...' : 'Confirmar'}
              </button>
              
              <button
                onClick={closeModal}
                disabled={busy}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
