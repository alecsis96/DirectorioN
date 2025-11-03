import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function MisSolicitudes() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    // Redirigir a la página de estado
    const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
    router.push(`/solicitud/${encodedEmail}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <span className="text-4xl">🏪</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Buscar mis solicitudes
          </h1>
          <p className="text-gray-600">
            Ingresa tu email para ver el estado de tus registros
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email de registro
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
            >
              Buscar mis solicitudes
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">
              ¿Qué puedo hacer aquí?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Ver el estado de tus solicitudes (En revisión, Aprobada, Rechazada)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Acceder al dashboard si tu solicitud fue aprobada</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Completar los datos de tu negocio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>Ver tus negocios publicados</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-2">
            ¿Aún no registraste tu negocio?
          </p>
          <Link
            href="/para-negocios"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Registrar ahora →
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>Consejo</span>
          </h3>
          <p className="text-sm text-gray-600">
            Guarda esta página en tus favoritos para consultar el estado de tus solicitudes en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
}
