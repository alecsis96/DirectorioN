'use client';

import { useState, useEffect, useRef } from 'react';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { authService } from '../lib/authService';

interface PhoneAuthWhatsAppLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type Step = 'phone' | 'code';

export default function PhoneAuthWhatsAppLogin({
  onSuccess,
  onCancel,
}: PhoneAuthWhatsAppLoginProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('+52');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Inicializar reCAPTCHA una sola vez
  useEffect(() => {
    // Limpiar contenedor antes de crear nuevo verifier
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
    
    // Solo crear si no existe
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = authService.createRecaptchaVerifier('recaptcha-container');
      } catch (err) {
        console.error('Error al inicializar reCAPTCHA:', err);
        setError('Error al inicializar el sistema de verificación');
      }
    }

    // Cleanup al desmontar
    return () => {
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        if (recaptchaContainerRef.current) {
          recaptchaContainerRef.current.innerHTML = '';
        }
      } catch (err) {
        console.error('Error al limpiar reCAPTCHA:', err);
      }
    };
  }, []);

  const handleSendCode = async () => {
    setError('');
    
    // Validar formato de teléfono
    if (!phoneNumber || phoneNumber.length < 12) {
      setError('Por favor ingresa un número de teléfono válido (10 dígitos)');
      return;
    }

    if (!recaptchaVerifierRef.current) {
      setError('Sistema de verificación no inicializado. Recarga la página.');
      return;
    }

    setLoading(true);

    try {
      console.log('📱 Enviando código a:', phoneNumber);
      const result = await authService.startPhoneLogin(
        phoneNumber,
        recaptchaVerifierRef.current
      );
      console.log('✅ Código enviado exitosamente');
      setConfirmationResult(result);
      setStep('code');
      setError('');
    } catch (err: any) {
      console.error('❌ Error al enviar código:', err);
      setError(err.message || 'Error al enviar código');
      // No reinicializar reCAPTCHA aquí, el useEffect lo maneja
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');

    if (!code || code.length !== 6) {
      setError('Por favor ingresa el código de 6 dígitos');
      return;
    }

    if (!confirmationResult) {
      setError('Sesión expirada. Solicita un nuevo código.');
      setStep('phone');
      return;
    }

    setLoading(true);

    try {
      await authService.confirmPhoneCode(confirmationResult, code);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Asegurar que siempre empiece con +52
    if (!value.startsWith('+52')) {
      value = '+52';
    }
    
    // Remover caracteres no numéricos excepto el +
    value = '+52' + value.slice(3).replace(/\D/g, '');
    
    // Limitar a +52 + 10 dígitos
    if (value.length > 13) {
      value = value.slice(0, 13);
    }
    
    setPhoneNumber(value);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
    setConfirmationResult(null);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Continuar con WhatsApp
        </h2>
        <p className="text-sm text-gray-600">
          {step === 'phone' 
            ? 'Ingresa tu número y te enviaremos un código de verificación'
            : 'Ingresa el código que recibiste por SMS'
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

      {/* Step: Phone Number */}
      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Número de teléfono
            </label>
            <input
              type="tel"
              id="phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="+52 1234567890"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-lg"
              disabled={loading}
              autoComplete="tel"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ejemplo: +52 5512345678 (10 dígitos)
            </p>
          </div>

          <button
            onClick={handleSendCode}
            disabled={loading || phoneNumber.length < 12}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-base hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </span>
            ) : (
              'Enviar código'
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full text-gray-600 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Step: Verification Code */}
      {step === 'code' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
              Código de verificación
            </label>
            <input
              type="text"
              inputMode="numeric"
              id="code"
              value={code}
              onChange={handleCodeChange}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition text-lg text-center tracking-widest font-mono"
              disabled={loading}
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Ingresa el código de 6 dígitos enviado a {phoneNumber}
            </p>
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-base hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </span>
            ) : (
              'Verificar y entrar'
            )}
          </button>

          <button
            onClick={handleBackToPhone}
            disabled={loading}
            className="w-full text-gray-600 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition"
          >
            ← Cambiar número
          </button>
        </div>
      )}

      {/* reCAPTCHA Container (invisible) */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </div>
  );
}
