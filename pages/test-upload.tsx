import React, { useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

type Biz = {
  id: string;
  name: string;
  images?: { url: string; objectPath?: string; publicId?: string }[];
};

export default function TestUpload() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>('Listo');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function load() {
      if (!user?.uid) return;
      const q = query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      const list: Biz[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setBusinesses(list);
      if (!businessId && list[0]?.id) setBusinessId(list[0].id);
    }
    load();
  }, [user?.uid]);

  const selectedBiz = useMemo(() => businesses.find((b) => b.id === businessId), [businesses, businessId]);

  async function handleCreateBusiness() {
    if (!user?.uid) return;
    setBusy(true);
    setLog('Creando negocio de prueba...');
    try {
      // Uno por cuenta: usa uid como ID
      const bizId = user.uid as string;
      const ref = doc(db, 'businesses', bizId);
      const exists = await getDoc(ref);
      if (exists.exists()) {
        setLog('Ya tienes un negocio creado');
        setBusinessId(bizId);
        return;
      }
      await setDoc(ref, {
        name: 'Negocio de prueba',
        category: 'Demo',
        address: 'Calle s/n',
        description: '',
        phone: '',
        WhatsApp: '',
        Facebook: '',
        hours: '',
        price: '',
        ownerId: user.uid,
        status: 'pending',
        featured: false,
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setLog('Negocio creado');
      setBusinessId(bizId);
      setBusinesses((prev) => [{ id: bizId, name: 'Negocio de prueba', images: [] }, ...prev]);
    } catch (e: any) {
      console.error(e);
      setLog('Error creando negocio');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file || !businessId || !user?.uid) return;
    setBusy(true);
    try {
      // Cloudinary unsigned upload
      setLog('Subiendo a Cloudinary...');
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD as string;
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string;
      if (!cloud || !preset) throw new Error('Faltan vars de Cloudinary');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', preset);
      formData.append('folder', `businesses/${businessId}`);
      const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await resp.json();
      if (!json?.secure_url || !json?.public_id) throw new Error('Upload falló');
      setLog('Guardando en Firestore...');
      await updateDoc(doc(db, 'businesses', businessId), {
        images: arrayUnion({ url: json.secure_url as string, publicId: json.public_id as string }),
        updatedAt: serverTimestamp(),
      });
      // Refresh local state
      const fresh = await getDoc(doc(db, 'businesses', businessId));
      const bizData = fresh.data() as any;
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { id: businessId, ...bizData } : b)));
      setLog('Imagen subida y guardada');
    } catch (e: any) {
      console.error(e);
      setLog(`Error: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(publicId?: string, objectPath?: string) {
    if (!user?.uid || !businessId) return;
    setBusy(true);
    try {
      if (!publicId) throw new Error('Falta publicId');
      setLog('Borrando en Cloudinary...');
      const idToken = await user.getIdToken();
      await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ businessId, publicId }),
      });
      setLog('Actualizando Firestore...');
      const snap = await getDoc(doc(db, 'businesses', businessId));
      const data = snap.data() as any;
      const images = (data?.images || []).filter((i: any) => i.publicId !== publicId);
      await updateDoc(doc(db, 'businesses', businessId), { images, updatedAt: serverTimestamp() });
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, images } : b)));
      setLog('Imagen eliminada');
    } catch (e: any) {
      console.error(e);
      setLog(`Error: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Prueba de subida a GCS (Signed URL)</h1>
      <div className="mb-4 flex items-center gap-2">
        {!user ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => signInWithPopup(auth, googleProvider)}>Iniciar sesión</button>
        ) : (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => signOut(auth)}>Cerrar sesión</button>
          </>
        )}
      </div>

      {user && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label className="font-semibold">Negocio:</label>
            <select className="border rounded px-2 py-1" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name || b.id}</option>
              ))}
            </select>
            <button className="px-3 py-2 bg-green-600 text-white rounded" disabled={busy} onClick={handleCreateBusiness}>Crear negocio de prueba</button>
          </div>

          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={handleFile} disabled={busy || !businessId} />
            <span className="text-sm text-gray-500">{busy ? 'Procesando...' : log}</span>
          </div>

          {selectedBiz?.images?.length ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedBiz.images.map((img) => (
                <div key={img.publicId || img.objectPath || img.url} className="border rounded p-2">
                  <img src={img.url} alt="preview" className="w-full h-40 object-cover rounded" />
                  <button className="mt-2 px-2 py-1 text-sm bg-red-500 text-white rounded" onClick={() => handleDelete(img.publicId, img.objectPath)}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Este negocio todavía no tiene imágenes.</p>
          )}
        </div>
      )}
    </main>
  );
}
