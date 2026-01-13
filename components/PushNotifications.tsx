'use client';

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export default function PushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasVapidKey, setHasVapidKey] = useState(false);

  useEffect(() => {
    // Verificar si las notificaciones son soportadas
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Verificar si VAPID key está configurada
      const vapidConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      setHasVapidKey(vapidConfigured);
      
      // Solo mostrar prompt si Firebase está configurado
      if (Notification.permission === 'default' && vapidConfigured) {
        // Esperar 10 segundos antes de mostrar el prompt
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !user || !hasVapidKey) return;

    // Inicializar Firebase Messaging
    const initMessaging = async () => {
      try {
        const messaging = getMessaging();
        
        // Obtener token FCM
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
          console.log('FCM Token:', currentToken);
          setToken(currentToken);
          
          // Guardar token en Firestore
          const db = getFirestore();
          await setDoc(
            doc(db, 'users', user.uid),
            {
              fcmToken: currentToken,
              fcmTokenUpdated: serverTimestamp(),
              notificationsEnabled: true,
            },
            { merge: true }
          );
        } else {
          console.log('No registration token available.');
        }

        // Escuchar mensajes en primer plano
        onMessage(messaging, (payload) => {
          console.log('Message received in foreground:', payload);
          
          // Mostrar notificación personalizada
          if (payload.notification) {
            new Notification(payload.notification.title || 'YajaGon', {
              body: payload.notification.body,
              icon: payload.notification.icon || '/images/icon-192.png',
              badge: '/images/badge-72.png',
              tag: 'directorio-notification',
            });
          }
        });
      } catch (error) {
        // Silenciar errores de push service cuando no está configurado
        if (error instanceof Error) {
          if (error.message.includes('push service error') || 
              error.message.includes('Registration failed') ||
              error.name === 'AbortError') {
            // Silenciar estos errores comunes cuando push no está disponible
            return;
          }
          console.error('Error initializing messaging:', error);
        }
      }
    };

    initMessaging();
  }, [isSupported, permission, user, hasVapidKey]);

  const requestPermission = async () => {
    if (!isSupported) {
      alert('Tu navegador no soporta notificaciones push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      setShowPrompt(false);

      if (permission === 'granted') {
        console.log('Notification permission granted.');
      } else {
        console.log('Notification permission denied.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    // Guardar en localStorage que se rechazó para no volver a mostrar por un tiempo
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  };

  if (!isSupported) {
    return null;
  }

  // Prompt para solicitar permiso
  if (showPrompt && permission === 'default') {
    return (
      <div className="fixed bottom-4 right-4 max-w-md bg-white rounded-lg shadow-2xl border-2 border-[#38761D] p-6 z-50 animate-slideInRight">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="w-12 h-12 text-[#38761D]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              ¿Recibir Notificaciones?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Te avisaremos sobre nuevas reseñas, respuestas y promociones de tus negocios favoritos.
            </p>
            <div className="flex gap-2">
              <button
                onClick={requestPermission}
                className="flex-1 px-4 py-2 bg-[#38761D] text-white rounded-lg font-semibold hover:bg-[#2f5a1a] transition"
              >
                Activar
              </button>
              <button
                onClick={dismissPrompt}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={dismissPrompt}
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

  // Indicador de estado de notificaciones
  if (user && permission === 'granted') {
    return (
      <div className="fixed bottom-4 left-4 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-green-300 z-40 flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        Notificaciones activas
      </div>
    );
  }

  return null;
}
