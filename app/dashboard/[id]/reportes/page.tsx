'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, app } from '../../../../firebaseConfig';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import BusinessAnalytics from '../../../../components/BusinessAnalytics';
import Link from 'next/link';

const db = getFirestore(app);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ReportesPage({ params }: PageProps) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const resolvedParams = await params;
        const id = decodeURIComponent(resolvedParams.id);
        setBusinessId(id);

        // Verificar autenticación
        const user = auth.currentUser;
        if (!user) {
          router.push('/');
          return;
        }

        // Verificar que el usuario es dueño del negocio
        const businessDoc = await getDoc(doc(db, 'businesses', id));
        if (!businessDoc.exists()) {
          setError('Negocio no encontrado');
          setLoading(false);
          return;
        }

        const businessData = businessDoc.data();
        setBusinessName(businessData.name || 'Negocio');

        if (businessData.ownerId !== user.uid) {
          setError('No tienes permiso para ver estas estadísticas');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing page:', err);
        setError(err.message || 'Error al cargar la página');
        setLoading(false);
      }
    }

    init();
  }, [params, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38761D] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/negocios"
            className="inline-block px-4 py-2 bg-[#38761D] text-white rounded-lg hover:bg-[#2d5a15] transition"
          >
            Volver a Negocios
          </Link>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con navegación */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/dashboard/${businessId}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
              <p className="text-gray-600 mt-1">{businessName}</p>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-2 border-b border-gray-200">
            <Link
              href={`/dashboard/${businessId}`}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-900 transition"
            >
              Editor
            </Link>
            <Link
              href={`/dashboard/${businessId}/reportes`}
              className="px-4 py-2 text-[#38761D] border-b-2 border-[#38761D] font-medium"
            >
              Reportes
            </Link>
          </div>
        </div>

        {/* Componente de Analytics */}
        <BusinessAnalytics businessId={businessId} />
      </div>
    </div>
  );
}
