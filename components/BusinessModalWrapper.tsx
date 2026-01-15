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
    // Ocultar appbar y navegación inferior
    document.body.classList.add('modal-open');
    
    // Función para ocultar elementos de navegación de forma agresiva
    const hideNavigationElements = () => {
      // Seleccionar todos los elementos de navegación posibles
      const selectors = [
        'nav',
        'header',
        '[role="navigation"]',
        '[class*="Navigation"]',
        '[class*="navigation"]',
        '[class*="nav-bar"]',
        '[class*="navbar"]',
        '[class*="bottom-menu"]',
        '[class*="app-bar"]',
        '[class*="appbar"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          (el as HTMLElement).style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;';
        });
      });
    };
    
    // Aplicar inmediatamente
    hideNavigationElements();
    
    // Aplicar de nuevo después de un pequeño delay para asegurar
    const timeoutId = setTimeout(hideNavigationElements, 10);
    
    // Observar cambios en el DOM por si se agregan nuevos elementos
    const observer = new MutationObserver(hideNavigationElements);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Agregar estilos dinámicos como backup
    const style = document.createElement('style');
    style.id = 'modal-navigation-hide';
    style.textContent = `
      body.modal-open nav,
      body.modal-open header,
      body.modal-open [role="navigation"],
      body.modal-open > div > nav,
      body.modal-open > div > header,
      body.modal-open nav[class*="Navigation"],
      body.modal-open [class*="navigation"],
      body.modal-open [class*="nav-bar"],
      body.modal-open [class*="navbar"],
      body.modal-open [class*="bottom-menu"],
      body.modal-open [class*="app-bar"],
      body.modal-open [class*="appbar"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transform: translateY(-100%) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      const styleElement = document.getElementById('modal-navigation-hide');
      if (styleElement) {
        styleElement.remove();
      }
      
      // Restaurar estilos de navegación
      const selectors = [
        'nav',
        'header',
        '[role="navigation"]',
        '[class*="Navigation"]',
        '[class*="navigation"]'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          (el as HTMLElement).style.cssText = '';
        });
      });
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
