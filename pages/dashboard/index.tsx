import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, db, googleProvider } from '../../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

export default function DashboardHome(){
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [appStatus, setAppStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { (async () => {
    if(!user?.uid) return;
    const q = query(collection(db,'businesses'), where('ownerId','==', user.uid));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d=>({ id:d.id, ...(d.data() as any)})));
    // Leer solicitud
    const app = await getDoc(doc(db,'applications', user.uid));
    setAppStatus(app.exists() ? ((app.data() as any).status || 'pending') : null);
  })(); }, [user?.uid]);

  async function handleCreate(){
    if(!user?.uid) return;
    setBusy(true);
    // Limitar a 1 negocio por cuenta: usa uid como ID del documento
    const id = user.uid;
    const ref = doc(db, 'businesses', id);
    const exists = await getDoc(ref);
    if (exists.exists()) {
      location.href = `/dashboard/${id}`;
      return;
    }
    await setDoc(ref, {
      name:'Nuevo negocio', category:'', address:'', description:'', phone:'', WhatsApp:'', Facebook:'', hours:'', price:'',
      ownerId:user.uid, status:'pending', featured:false, images:[], createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    location.href = `/dashboard/${id}`;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Tu panel de negocios</h1>
      <div className="mb-4 flex items-center gap-2">
        {!user ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>signInWithPopup(auth, googleProvider)}>Iniciar sesión</button>
        ) : (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={()=>signOut(auth)}>Cerrar sesión</button>
          </>
        )}
      </div>

      {user && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <button
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              onClick={handleCreate}
              disabled={busy || items.length > 0 || appStatus !== 'approved'}
              title={items.length>0? 'Ya tienes un negocio creado' : (appStatus==='approved' ? 'Crear negocio' : 'Aún no aprobado')}
            >
              {items.length>0? 'Ya tienes un negocio' : 'Crear negocio'}
            </button>
            {appStatus !== 'approved' && (
              <span className="text-sm text-gray-600">Tu solicitud: {appStatus ?? 'sin solicitud'}. {appStatus!== 'approved' && <a className="text-blue-600 underline" href="/business/register">Enviar solicitud</a>}</span>
            )}
          </div>
          <ul className="space-y-3">
            {items.map((b)=> (
              <li key={b.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{b.name || b.id}</div>
                  <div className="text-sm text-gray-500">{b.address}</div>
                </div>
                <Link href={`/dashboard/${b.id}`} className="px-3 py-1 bg-blue-600 text-white rounded">Editar</Link>
              </li>
            ))}
            {items.length===0 && <p className="text-gray-500">Aún no tienes negocios.</p>}
          </ul>
        </>
      )}
    </main>
  );
}
