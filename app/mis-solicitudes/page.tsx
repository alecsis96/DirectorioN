'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MisSolicitudesPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
    router.push(`/solicitud/${encodedEmail}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-block">
            <span className="text-4xl">🏪</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Buscar mis solicitudes</h1>
          <p className="mt-2 text-gray-600">Ingresa tu email para ver el estado de tus registros</p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email de registro
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                }}
                placeholder="tu@email.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 py-3 px-6 text-lg font-semibold text-white transition hover:bg-blue-700"
            >
              Buscar mis solicitudes
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="mb-3 font-semibold text-gray-900">¿Qué puedo hacer aquí?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Ver el estado de tus solicitudes (En revisión, Aprobada, Rechazada)',
                'Acceder al dashboard si tu solicitud fue aprobada',
                'Completar los datos de tu negocio',
                'Ver tus negocios publicados',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">¿Aún no registraste tu negocio?</p>
          <Link href="/para-negocios" className="font-semibold text-blue-600 hover:text-blue-700">
            Registrar ahora →
          </Link>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
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
