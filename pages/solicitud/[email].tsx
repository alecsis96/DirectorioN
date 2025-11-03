import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Link from 'next/link';

interface Application {
  id: string;
  businessName: string;
  status: string;
  createdAt: any;
  type: 'application';
}

interface Business {
  id: string;
  businessName: string;
  status: string;
  createdAt: any;
  type: 'business';
}

type Item = Application | Business;

export default function SolicitudPorEmail() {
  const router = useRouter();
  const { email } = router.query;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email || typeof email !== 'string') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const normalizedEmail = email.toLowerCase().trim();
        
        console.log('🔍 Buscando solicitudes para:', normalizedEmail);

        let apps: Application[] = [];
        let businesses: Business[] = [];

        // Intentar con índices primero (más rápido)
        try {
          const appsQuery = query(
            collection(db, 'applications'),
            where('ownerEmail', '==', normalizedEmail),
            orderBy('createdAt', 'desc')
          );
          const appsSnapshot = await getDocs(appsQuery);
          console.log(`✅ Applications encontradas: ${appsSnapshot.size}`);
          apps = appsSnapshot.docs.map(doc => {
            console.log('📄 Application:', doc.id, doc.data());
            return {
              id: doc.id,
              businessName: doc.data().businessName || 'Sin nombre',
              status: doc.data().status || 'pending',
              createdAt: doc.data().createdAt,
              type: 'application'
            };
          });
        } catch (indexError: any) {
          // Si falla por índice, buscar sin orderBy
          console.log('⚠️ Usando query sin índice para applications');
          const appsQuery = query(
            collection(db, 'applications'),
            where('ownerEmail', '==', normalizedEmail)
          );
          const appsSnapshot = await getDocs(appsQuery);
          console.log(`✅ Applications encontradas (sin índice): ${appsSnapshot.size}`);
          apps = appsSnapshot.docs.map(doc => {
            console.log('📄 Application:', doc.id, doc.data());
            return {
              id: doc.id,
              businessName: doc.data().businessName || 'Sin nombre',
              status: doc.data().status || 'pending',
              createdAt: doc.data().createdAt,
              type: 'application'
            };
          });
        }

        // Buscar businesses
        try {
          const businessQuery = query(
            collection(db, 'businesses'),
            where('ownerEmail', '==', normalizedEmail),
            orderBy('createdAt', 'desc')
          );
          const businessSnapshot = await getDocs(businessQuery);
          console.log(`✅ Businesses encontrados: ${businessSnapshot.size}`);
          businesses = businessSnapshot.docs.map(doc => {
            console.log('🏢 Business:', doc.id, doc.data());
            return {
              id: doc.id,
              businessName: doc.data().businessName || 'Sin nombre',
              status: doc.data().status || 'draft',
              createdAt: doc.data().createdAt,
              type: 'business'
            };
          });
        } catch (indexError: any) {
          // Si falla por índice, buscar sin orderBy
          console.log('⚠️ Usando query sin índice para businesses');
          const businessQuery = query(
            collection(db, 'businesses'),
            where('ownerEmail', '==', normalizedEmail)
          );
          const businessSnapshot = await getDocs(businessQuery);
          console.log(`✅ Businesses encontrados (sin índice): ${businessSnapshot.size}`);
          businesses = businessSnapshot.docs.map(doc => {
            console.log('🏢 Business:', doc.id, doc.data());
            return {
              id: doc.id,
              businessName: doc.data().businessName || 'Sin nombre',
              status: doc.data().status || 'draft',
              createdAt: doc.data().createdAt,
              type: 'business'
            };
          });
          
          // Ordenar manualmente
          businesses.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(0);
            const timeB = b.createdAt?.toDate?.() || new Date(0);
            return timeB.getTime() - timeA.getTime();
          });
        }

        // Ordenar apps también si usó query sin índice
        apps.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0);
          const timeB = b.createdAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });

        // Combinar y ordenar por fecha
        const allItems = [...apps, ...businesses].sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0);
          const timeB = b.createdAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });

        console.log(`📊 Total items encontrados: ${allItems.length}`);
        
        if (allItems.length === 0) {
          console.warn('⚠️ No se encontraron solicitudes para este email');
          console.log('💡 Verifica que el email usado en el wizard coincida exactamente');
        }
        
        setItems(allItems);
        setError('');
      } catch (err: any) {
        console.error('❌ Error fetching data:', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        
        // Si el error es por índice faltante, mostrar mensaje específico
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setError('Los índices de búsqueda se están configurando. Intenta de nuevo en 1-2 minutos.');
        } else {
          setError('Error al buscar solicitudes. Verifica tu email o intenta más tarde.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email]);

  const getStatusInfo = (status: string, type: string) => {
    if (type === 'application') {
      switch (status) {
        case 'pending':
          return {
            label: 'En revisión',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            icon: '⏳',
            message: 'Tu solicitud está siendo revisada por nuestro equipo.'
          };
        case 'approved':
          return {
            label: 'Aprobada',
            color: 'bg-green-100 text-green-800 border-green-300',
            icon: '✅',
            message: 'Tu solicitud fue aprobada. Ya puedes completar los datos de tu negocio.'
          };
        case 'rejected':
          return {
            label: 'Rechazada',
            color: 'bg-red-100 text-red-800 border-red-300',
            icon: '❌',
            message: 'Tu solicitud fue rechazada. Puedes enviar una nueva.'
          };
        default:
          return {
            label: status,
            color: 'bg-gray-100 text-gray-800 border-gray-300',
            icon: '❓',
            message: ''
          };
      }
    } else {
      switch (status) {
        case 'draft':
          return {
            label: 'Borrador - Completar datos',
            color: 'bg-blue-100 text-blue-800 border-blue-300',
            icon: '📝',
            message: 'Completa la información de tu negocio para enviarlo a revisión final.'
          };
        case 'pending':
          return {
            label: 'En revisión final',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            icon: '⏳',
            message: 'Tu negocio está en revisión final antes de ser publicado.'
          };
        case 'approved':
          return {
            label: '🎉 Publicado',
            color: 'bg-green-100 text-green-800 border-green-300',
            icon: '🎉',
            message: '¡Tu negocio está publicado y visible para todos!'
          };
        case 'rejected':
          return {
            label: 'Requiere cambios',
            color: 'bg-orange-100 text-orange-800 border-orange-300',
            icon: '⚠️',
            message: 'Necesitamos que realices algunos cambios antes de publicar.'
          };
        default:
          return {
            label: status,
            color: 'bg-gray-100 text-gray-800 border-gray-300',
            icon: '❓',
            message: ''
          };
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Buscando tus solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estado de tus solicitudes
          </h1>
          <p className="text-gray-600">
            📧 Buscando para: <span className="font-semibold">{email}</span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* No results */}
        {!error && items.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No encontramos solicitudes
            </h2>
            <p className="text-gray-600 mb-6">
              No hay solicitudes registradas con el email <span className="font-semibold">{email}</span>
            </p>
            <Link
              href="/para-negocios"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Registrar mi negocio
            </Link>
          </div>
        )}

        {/* Results */}
        {items.length > 0 && (
          <div className="space-y-6">
            {items.map((item) => {
              const statusInfo = getStatusInfo(item.status, item.type);
              const showDashboardButton = item.type === 'business' && 
                (item.status === 'draft' || item.status === 'rejected');

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white rounded-lg shadow-lg overflow-hidden"
                >
                  <div className={`border-l-4 p-6 ${statusInfo.color}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{statusInfo.icon}</span>
                          <h3 className="text-xl font-bold text-gray-900">
                            {item.businessName}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {item.type === 'application' ? 'Solicitud inicial' : 'Negocio'}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color} border`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {item.createdAt && (
                        <div className="text-right text-sm text-gray-500">
                          {item.createdAt.toDate().toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    {statusInfo.message && (
                      <p className="text-gray-700 mb-4">{statusInfo.message}</p>
                    )}

                    {showDashboardButton && (
                      <Link
                        href={`/dashboard/${item.id}`}
                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                      >
                        {item.status === 'draft' ? 'Completar datos' : 'Editar y reenviar'}
                      </Link>
                    )}

                    {item.type === 'business' && item.status === 'approved' && (
                      <Link
                        href={`/negocios/${item.id}`}
                        className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                      >
                        Ver mi negocio publicado
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            ¿Necesitas ayuda o tienes preguntas?
          </p>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
