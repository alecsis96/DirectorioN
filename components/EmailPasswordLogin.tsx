'use client';

import { useState } from 'react';
import { authService } from '../lib/authService';

interface EmailPasswordLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type Mode = 'login' | 'register';

export default function EmailPasswordLogin({
  onSuccess,
  onCancel,
}: EmailPasswordLoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    setError('');

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return false;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return false;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return false;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await authService.signInWithEmail(email, password);
      } else {
        await authService.createAccountWithEmail(email, password);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="text-sm text-gray-600">
          {mode === 'login' 
            ? 'Ingresa con tu correo y contraseña'
            : 'Regístrate con tu correo electrónico'
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@ejemplo.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}
            </>
          ) : (
            mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
          )}
        </button>
      </form>

      {/* Toggle Mode */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          {' '}
          <button
            type="button"
            onClick={toggleMode}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline disabled:opacity-50"
          >
            {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </p>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
