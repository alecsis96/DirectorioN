'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';

export type DashboardBusiness = {
  id: string;
  name?: string;
  address?: string;
  status?: string;
};

export type DashboardApplicationStatus = 'pending' | 'approved' | 'rejected' | null;

type DashboardBusinessListProps = {
  ownerId: string;
  ownerEmail?: string | null;
  initialBusinesses: DashboardBusiness[];
  initialStatus: DashboardApplicationStatus;
};

export default function DashboardBusinessList({
  ownerId,
  ownerEmail,
  initialBusinesses,
  initialStatus,
}: DashboardBusinessListProps) {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [items, setItems] = useState<DashboardBusiness[]>(initialBusinesses);
  const [appStatus, setAppStatus] = useState<DashboardApplicationStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
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
        const q = query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
        const snap = await getDocs(q);
        if (!cancelled) {
          setItems(snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })));
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
        category: '',
        address: '',
        description: '',
        phone: '',
        WhatsApp: '',
        Facebook: '',
        hours: '',
        price: '',
        ownerId: activeUid,
        ownerEmail: (user?.email ?? ownerEmail ?? null)?.toLowerCase() ?? null,
        status: 'pending',
        featured: false,
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
  }, [user?.uid, user?.email, ownerId, ownerEmail, needsApproval]);

  const handleSignOut = useCallback(() => {
    signOut(auth).catch((error) => {
      console.error('[dashboard] signOut error', error);
    });
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Tu panel de negocios</h1>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-600">{displayEmail || 'Sesión iniciada'}</span>
        <button className="px-3 py-2 bg-gray-200 rounded" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <button
          className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          onClick={handleCreate}
          disabled={busy || existingBusiness || needsApproval}
          title={
            existingBusiness
              ? 'Ya tienes un negocio creado'
              : needsApproval
              ? 'Tu solicitud debe ser aprobada antes de crear un negocio'
              : 'Crear negocio'
          }
        >
          {existingBusiness ? 'Ya tienes un negocio' : 'Crear negocio'}
        </button>
        {needsApproval && (
          <span className="text-sm text-gray-600">
            Tu solicitud: {appStatus ?? 'sin solicitud'}.{' '}
            <Link href="/registro-negocio" className="text-blue-600 underline">
              Enviar solicitud
            </Link>
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((business) => (
          <li key={business.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{business.name || business.id}</div>
              <div className="text-sm text-gray-500">{business.address}</div>
              {business.status && (
                <div className="text-xs text-gray-400 mt-1">Estado: {business.status}</div>
              )}
            </div>
            <Link href={`/dashboard/${business.id}`} className="px-3 py-1 bg-blue-600 text-white rounded">
              Editar
            </Link>
          </li>
        ))}
        {!items.length && (
          <li className="text-gray-500 border border-dashed rounded p-4 text-sm">Aún no tienes negocios.</li>
        )}
      </ul>
    </main>
  );
}
