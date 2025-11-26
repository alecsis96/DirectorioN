import { redirect } from 'next/navigation';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

async function getDebugInfo(email: string) {
  try {
    const auth = getAdminAuth();
    const db = getAdminFirestore();
    
    // Buscar usuario
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      return { error: 'Usuario no encontrado en Firebase Auth' };
    }
    
    // Buscar en applications
    const appDoc = await db.collection('applications').doc(userRecord.uid).get();
    const appData = appDoc.exists ? appDoc.data() : null;
    
    // Buscar en businesses
    const businessesSnapshot = await db.collection('businesses')
      .where('ownerId', '==', userRecord.uid)
      .get();
    
    const businesses = businessesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      application: appData ? {
        id: appDoc.id,
        ownerId: appData.ownerId,
        ownerUid: appData.ownerUid,
        ownerEmail: appData.ownerEmail,
        businessName: appData.businessName,
        status: appData.status,
        plan: appData.plan,
      } : null,
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        ownerId: b.ownerId,
        ownerEmail: b.ownerEmail,
        status: b.status,
        plan: b.plan,
      })),
    };
  } catch (error) {
    return { error: String(error) };
  }
}

export default async function AdminDebugPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  // Verificar admin (simplificado para debugging)
  const db = getAdminFirestore();
  
  const email = searchParams.email || '';
  let debugInfo = null;
  
  if (email) {
    debugInfo = await getDebugInfo(email);
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug de Usuario</h1>
        
        <form className="mb-8 bg-white p-6 rounded-lg shadow">
          <label className="block mb-2 font-semibold">Email del usuario:</label>
          <div className="flex gap-2">
            <input
              type="email"
              name="email"
              defaultValue={email}
              placeholder="usuario@gmail.com"
              className="flex-1 px-4 py-2 border rounded"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Buscar
            </button>
          </div>
        </form>
        
        {debugInfo && (
          <div className="space-y-6">
            {debugInfo.error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded">
                <p className="text-red-700 font-semibold">❌ Error:</p>
                <p className="text-red-600">{debugInfo.error}</p>
              </div>
            )}
            
            {debugInfo.user && (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">👤 Usuario en Firebase Auth</h2>
                  <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                    {JSON.stringify(debugInfo.user, null, 2)}
                  </pre>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">📝 Solicitud en applications/{debugInfo.user.uid}</h2>
                  {debugInfo.application ? (
                    <>
                      <pre className="bg-gray-100 p-4 rounded overflow-x-auto mb-4">
                        {JSON.stringify(debugInfo.application, null, 2)}
                      </pre>
                      {debugInfo.application.ownerId !== debugInfo.user.uid && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                          <p className="text-yellow-800 font-semibold">⚠️ PROBLEMA DETECTADO:</p>
                          <p className="text-yellow-700">
                            El campo ownerId ({debugInfo.application.ownerId}) NO coincide con el UID del usuario ({debugInfo.user.uid})
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No se encontró solicitud pendiente</p>
                  )}
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-4">🏪 Negocios en businesses</h2>
                  {debugInfo.businesses.length > 0 ? (
                    <div className="space-y-4">
                      {debugInfo.businesses.map((business: any) => (
                        <div key={business.id} className="border p-4 rounded">
                          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
                            {JSON.stringify(business, null, 2)}
                          </pre>
                          {business.ownerId !== debugInfo.user.uid && (
                            <div className="mt-2 bg-red-50 border border-red-200 p-3 rounded">
                              <p className="text-red-800 font-semibold">❌ PROBLEMA:</p>
                              <p className="text-red-700">
                                El ownerId ({business.ownerId}) NO coincide con el UID ({debugInfo.user.uid})
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No se encontraron negocios aprobados</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
