'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { BsEye, BsPhone, BsWhatsapp, BsStar, BsArrowRight, BsPencilSquare, BsGraphUp } from 'react-icons/bs';
import { auth, db } from '../firebaseConfig';
import type { OwnerMetrics, BusinessWithMetrics } from '../lib/server/ownerMetrics';

export type DashboardApplicationStatus = 'pending' | 'approved' | 'rejected' | null;

type DashboardBusinessListProps = {
  ownerId: string;
  ownerEmail?: string | null;
  initialBusinesses: BusinessWithMetrics[];
  initialStatus: DashboardApplicationStatus;
  aggregatedMetrics: OwnerMetrics;
};

export default function DashboardBusinessList({
  ownerId,
  ownerEmail,
  initialBusinesses,
  initialStatus,
  aggregatedMetrics,
}: DashboardBusinessListProps) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [items, setItems] = useState<BusinessWithMetrics[]>(initialBusinesses);
  const [appStatus, setAppStatus] = useState<DashboardApplicationStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const metrics = aggregatedMetrics;
  const displayEmail = user?.email ?? ownerEmail ?? '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(collection(db, 'businesses'), where('ownerId', '==', user.uid), limit(100));
        const snap = await getDocs(q);
        if (!cancelled) {
          setItems(snap.docs.map((doc) => ({ 
            id: doc.id, 
            ...(doc.data() as Record<string, unknown>) 
          })) as BusinessWithMetrics[]);
        }
        const appDoc = await getDoc(doc(db, 'applications', user.uid));
        if (!cancelled) {
          setAppStatus(appDoc.exists() ? ((appDoc.data() as any).status ?? 'pending') : null);
        }
      } catch (error) {
        console.error('[dashboard] refresh data error', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const needsApproval = appStatus !== 'approved';
  const existingBusiness = items.length > 0;

  const handleCreate = useCallback(async () => {
    const activeUid = user?.uid ?? ownerId;
    if (!activeUid || needsApproval) return;
    setBusy(true);
    try {
      const ref = doc(db, 'businesses', activeUid);
      const current = await getDoc(ref);
      if (current.exists()) {
        window.location.href = `/dashboard/${activeUid}`;
        return;
      }

      await setDoc(ref, {
        name: 'Nuevo negocio',
        businessName: 'Nuevo negocio',
        category: '',
        address: '',
        description: '',
        phone: '',
        WhatsApp: '',
        Facebook: '',
        hours: '',
        price: '',
        ownerId: activeUid,
        ...(user?.email ? { ownerEmail: user.email } : {}),
        businessStatus: 'draft',
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      window.location.href = `/dashboard/${activeUid}`;
    } catch (error) {
      console.error('[dashboard] handleCreate error', error);
    } finally {
      setBusy(false);
    }
  }, [user?.uid, user?.email, ownerId, needsApproval]);

  const handleSignOut = useCallback(() => {
    signOut(auth).catch((error) => {
      console.error('[dashboard] signOut error', error);
    });
  }, []);

  // Función para obtener color del badge de estado
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'published':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✅ Publicado</span>;
      case 'review':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">🔍 En Revisión</span>;
      case 'draft':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">📝 Borrador</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">❌ Rechazado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">⏳ Pendiente</span>;
    }
  };

  // Función para obtener color del badge de plan
  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'sponsor':
        return { bg: 'bg-gradient-to-r from-purple-600 to-pink-600', text: '⭐ Plan Patrocinado', textColor: 'text-white' };
      case 'featured':
        return { bg: 'bg-gradient-to-r from-blue-600 to-cyan-600', text: '💎 Plan Destacado', textColor: 'text-white' };
      default:
        return { bg: 'bg-gradient-to-r from-gray-600 to-gray-700', text: '🆓 Plan Gratuito', textColor: 'text-white' };
    }
  };

  // Verificar si el plan está por expirar
  const isPlanExpiring = (planExpiresAt: any) => {
    if (!planExpiresAt) return false;
    const expiryDate = planExpiresAt.toDate ? planExpiresAt.toDate() : new Date(planExpiresAt);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
              <p className="text-sm text-gray-600 mt-1">{displayEmail || 'Sesión iniciada'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Resumen de Rendimiento (últimos 30 días)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vistas */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <BsEye className="text-blue-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vistas de perfil</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Llamadas */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <BsPhone className="text-green-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Clicks en Llamar</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalPhoneClicks.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <BsWhatsapp className="text-emerald-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Clicks en WhatsApp</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalWhatsappClicks.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Reseñas */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <BsStar className="text-amber-600 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reseñas totales</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalReviews.toLocaleString()}</p>
                  {metrics.avgRating > 0 && (
                    <p className="text-xs text-gray-500">⭐ {metrics.avgRating.toFixed(1)} promedio</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business List Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">🏪 Mis Negocios</h2>
            {!existingBusiness && !needsApproval && (
              <button
                onClick={handleCreate}
                disabled={busy}
                className="px-4 py-2 bg-[#38761D] hover:bg-[#2d5a15] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                ➕ Crear Negocio
              </button>
            )}
          </div>

          {needsApproval && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⏳</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">Solicitud Pendiente</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Tu solicitud está {appStatus === 'pending' ? 'pendiente de revisión' : appStatus === 'rejected' ? 'rechazada' : 'en proceso'}.
                  </p>
                  <Link
                    href="/registro-negocio"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    {appStatus === 'rejected' ? 'Enviar Nueva Solicitud' : 'Ver Mi Solicitud'}
                    <BsArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aún no tienes negocios</h3>
              <p className="text-gray-600 mb-6">
                {needsApproval
                  ? 'Primero debes completar y enviar tu solicitud de registro'
                  : 'Comienza creando tu primer negocio en el directorio'}
              </p>
              {!needsApproval && (
                <button
                  onClick={handleCreate}
                  disabled={busy}
                  className="px-6 py-3 bg-[#38761D] hover:bg-[#2d5a15] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  ➕ Crear Mi Primer Negocio
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((business) => {
                const planInfo = getPlanBadge(business.plan);
                const isExpiring = isPlanExpiring(business.planExpiresAt);
                const businessName = business.name || business.businessName || 'Sin nombre';
                const isPremium = business.plan === 'featured' || business.plan === 'sponsor';
                const imageUrl = business.logoUrl || business.image1 || business.coverUrl || (isPremium ? '/images/default-premium-cover.svg' : undefined);

                return (
                  <div
                    key={business.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
                  >
                    {/* Image Header */}
                    <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={businessName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-6xl">
                          🏪
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(business.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Business Name */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
                        {businessName}
                      </h3>

                      {/* Category & Address */}
                      <div className="space-y-1 mb-4">
                        {business.category && (
                          <p className="text-sm text-gray-600">📂 {business.category}</p>
                        )}
                        {business.address && (
                          <p className="text-sm text-gray-500 truncate">📍 {business.address}</p>
                        )}
                      </div>

                      {/* Plan Banner */}
                      <div className={`${planInfo.bg} ${planInfo.textColor} rounded-lg p-3 mb-4`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{planInfo.text}</span>
                        </div>
                        {business.planExpiresAt && business.plan !== 'free' && (
                          <p className={`text-xs mt-1 ${isExpiring ? 'font-bold' : 'opacity-90'}`}>
                            {isExpiring ? '⚠️ ' : ''}
                            Vence: {new Date(business.planExpiresAt.toDate ? business.planExpiresAt.toDate() : business.planExpiresAt).toLocaleDateString('es-MX')}
                          </p>
                        )}
                      </div>

                      {/* Quick Metrics */}
                      {business.metrics && (
                        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Vistas</p>
                            <p className="text-sm font-bold text-gray-900">{business.metrics.views}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Llamadas</p>
                            <p className="text-sm font-bold text-gray-900">{business.metrics.phoneClicks}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">WhatsApp</p>
                            <p className="text-sm font-bold text-gray-900">{business.metrics.whatsappClicks}</p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/${business.id}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#38761D] hover:bg-[#2d5a15] text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          <BsPencilSquare />
                          Gestionar
                        </Link>
                        {business.status === 'published' && (
                          <Link
                            href={`/dashboard/${business.id}/reportes`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-sm"
                            title="Ver analíticas"
                          >
                            <BsGraphUp />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
