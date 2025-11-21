'use client';

import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Registrar service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration);

            // Verificar actualizaciones cada hora
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }

    // Capturar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar banner después de 30 segundos si no está instalada
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar cuando se instala
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed');
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted PWA install');
    } else {
      console.log('❌ User dismissed PWA install');
    }
    
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Banner de instalación para iOS
  if (isIOS && !isInstalled && showInstallBanner) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-white border-2 border-[#38761D] rounded-lg shadow-2xl z-50 p-4 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <img src="/images/logo.png" alt="Logo" className="w-12 h-12 rounded-lg" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">
              Instalar Directorio Yajalón
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Instala la app para acceder más rápido y usarla sin conexión
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-semibold mb-2">📱 Para instalar en iOS:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Toca el botón <strong>Compartir</strong> {' '}
                  <svg className="inline w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                </li>
                <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                <li>Toca <strong>"Añadir"</strong></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner de instalación para Android/Desktop
  if (!isIOS && !isInstalled && showInstallBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-white border-2 border-[#38761D] rounded-lg shadow-2xl z-50 p-4 animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <img src="/images/logo.png" alt="Logo" className="w-12 h-12 rounded-lg" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">
              Instalar Directorio Yajalón
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Accede más rápido y úsala sin conexión. Solo ocupa ~2MB
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-[#38761D] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#2d5418] transition"
              >
                📥 Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
