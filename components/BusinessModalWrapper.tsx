'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Business, BusinessPreview } from '../types/business';
import BusinessDetailView from './BusinessDetailView';

type Props = {
  businessPreview: BusinessPreview | Business;
  onClose: () => void;
};

export default function BusinessModalWrapper({ businessPreview, onClose }: Props) {
  const [fullBusiness, setFullBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si ya es un Business completo, usarlo directamente
    if ('description' in businessPreview && businessPreview.description !== undefined) {
      setFullBusiness(businessPreview as Business);
      setIsLoading(false);
      return;
    }

    // Si no, cargar el documento completo desde Firestore
    const fetchFullBusiness = async () => {
      if (!businessPreview.id) {
        setIsLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'businesses', businessPreview.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setFullBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
        }
      } catch (error) {
        console.error('Error fetching business:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullBusiness();
  }, [businessPreview]);

  useEffect(() => {
    // Bloquear scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-4 md:py-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-auto"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky con botón cerrar */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 rounded-t-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 pr-4 truncate">
            {fullBusiness?.name || 'Detalles del negocio'}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content with scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
              </div>
            ) : fullBusiness ? (
              <BusinessDetailView business={fullBusiness} />
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-600">No se pudo cargar la información del negocio</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
