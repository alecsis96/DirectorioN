import Link from 'next/link';
import { useRouter } from 'next/router';

export default function PaymentCancelled() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
            <svg className="h-10 w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pago Cancelado
        </h1>

        <p className="text-gray-600 mb-6">
          El proceso de pago fue cancelado. No se ha realizado ningún cargo a tu tarjeta.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>💡 ¿Necesitas ayuda?</strong>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Si tuviste problemas con el pago, contáctanos y te asistiremos.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Intentar de nuevo
          </button>
          
          <Link
            href="/dashboard"
            className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            Volver al dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Puedes actualizar tu plan en cualquier momento desde tu dashboard.
        </p>
      </div>
    </div>
  );
}
