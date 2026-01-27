'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Solo renderizar en el cliente
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    
    return () => {
      document.body.style.overflow = 'unset';
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

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-start md:items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-4 md:py-0"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-auto overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Posición absoluta sobre el modal */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-[100000] w-9 h-9 flex items-center justify-center rounded-full bg-gray-400/70 hover:bg-gray-500/80 transition-all shadow-md ${
            isGalleryOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Cerrar"
          disabled={isGalleryOpen}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
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
            <BusinessDetailView business={fullBusiness} onGalleryStateChange={setIsGalleryOpen} />
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-600">No se pudo cargar la información del negocio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Renderizar usando portal directamente bajo body
  return createPortal(modalContent, document.body);
}
