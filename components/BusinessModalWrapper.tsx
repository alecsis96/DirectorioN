'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Prevenir ejecución múltiple
    if (hasLoaded) return;
    
    console.log('[BusinessModalWrapper] Loading business:', businessPreview.id);
    
    // Si ya es un Business completo, usarlo directamente
    if ('description' in businessPreview && businessPreview.description !== undefined) {
      console.log('[BusinessModalWrapper] Using full business directly');
      setFullBusiness(businessPreview as Business);
      setIsLoading(false);
      setHasLoaded(true);
      return;
    }

    // Si no, cargar el documento completo desde Firestore
    const fetchFullBusiness = async () => {
      if (!businessPreview.id) {
        console.log('[BusinessModalWrapper] No business ID');
        setIsLoading(false);
        setHasLoaded(true);
        return;
      }

      console.log('[BusinessModalWrapper] Fetching from Firestore:', businessPreview.id);
      
      try {
        const docRef = doc(db, 'businesses', businessPreview.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log('[BusinessModalWrapper] Business loaded successfully');
          setFullBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
        } else {
          console.log('[BusinessModalWrapper] Business not found');
        }
      } catch (error) {
        console.error('[BusinessModalWrapper] Error fetching business:', error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchFullBusiness();
  }, []); // Solo ejecutar una vez al montar

  useEffect(() => {
    // Bloquear scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Agregar estilos para ocultar navegación una sola vez
    const style = document.createElement('style');
    style.id = 'modal-navigation-hide';
    style.textContent = `
      body.modal-open nav,
      body.modal-open header,
      body.modal-open [role="navigation"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      const styleElement = document.getElementById('modal-navigation-hide');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []); // Solo ejecutar una vez

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
      className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-4 md:py-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-auto overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Posición absoluta sobre el modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[10000] w-14 h-14 flex items-center justify-center rounded-full bg-gray-900/95 hover:bg-gray-900 backdrop-blur-md transition-all shadow-2xl border-3 border-white/40 hover:scale-110 active:scale-95"
          aria-label="Cerrar"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content with scroll */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
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
  );
}
