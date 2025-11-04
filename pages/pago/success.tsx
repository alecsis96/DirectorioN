import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session_id) {
      // Aquí podrías validar la sesión si necesitas
      setTimeout(() => setLoading(false), 1000);
    }
  }, [session_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Procesando pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ¡Pago Exitoso! 🎉
        </h1>

        <p className="text-gray-600 mb-6">
          Tu plan ha sido activado correctamente. Tu negocio ahora está destacado y recibirá más visibilidad.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            <strong>✅ Plan activo por 30 días</strong>
          </p>
          <p className="text-xs text-green-600 mt-2">
            ID de sesión: {session_id}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/negocios"
            className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Ver mi negocio en el directorio
          </Link>
          
          <Link
            href="/dashboard"
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            Volver al dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Recibirás un correo de confirmación con los detalles de tu compra.
        </p>
      </div>
    </div>
  );
}
