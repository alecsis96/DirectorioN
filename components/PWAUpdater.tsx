'use client';

import { useState, useEffect } from 'react';

export default function PWAUpdater() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Registrar service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg);
        setRegistration(reg);

        // Verificar actualizaciones periódicamente
        setInterval(() => {
          reg.update();
        }, 60000); // Cada minuto

        // Escuchar por nuevas actualizaciones
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              console.log('[PWA] New version available!');
              setShowUpdatePrompt(true);
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    // Escuchar por cambios de estado del controller
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const updateApp = () => {
    if (!registration || !registration.waiting) {
      return;
    }

    // Enviar mensaje al service worker para que se active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdatePrompt(false);
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-6 z-50 animate-slideInDown">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="w-10 h-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            ¡Nueva Versión Disponible!
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Hay una nueva versión de Directorio Yajalón disponible con mejoras y correcciones.
          </p>
          <div className="flex gap-2">
            <button
              onClick={updateApp}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              Actualizar Ahora
            </button>
            <button
              onClick={dismissUpdate}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Después
            </button>
          </div>
        </div>
        <button
          onClick={dismissUpdate}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
