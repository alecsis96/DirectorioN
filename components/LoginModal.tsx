'use client';

import { useState } from 'react';
import { authService } from '../lib/authService';
import EmailPasswordLogin from './EmailPasswordLogin';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type LoginMethod = 'select' | 'google' | 'email';

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [method, setMethod] = useState<LoginMethod>('select');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await authService.signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const handleBack = () => {
    setMethod('select');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition z-10"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Contenido del modal */}
        {method === 'select' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-sm text-gray-600">
                Elige tu método preferido de autenticación
              </p>
            </div>

            {/* Opciones de login */}
            <div className="space-y-3">
              {/* Email/Password */}
              <button
                onClick={() => setMethod('email')}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Continuar con correo</span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">o</span>
                </div>
              </div>

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>Continuar con Google</span>
              </button>
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-center text-gray-500">
              Al continuar, aceptas nuestros términos de servicio y política de privacidad
            </p>
          </div>
        )}

        {/* Email/Password Component */}
        {method === 'email' && (
          <EmailPasswordLogin 
            onSuccess={handleEmailSuccess}
            onCancel={handleBack}
          />
        )}
      </div>
    </div>
  );
}
