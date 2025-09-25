import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db, googleProvider } from '../../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import ImageUploader from '../../components/ImageUploader';

export default function EditBusiness(){
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [user, setUser] = useState<any>(null);
  const [biz, setBiz] = useState<any>(null);
  const [form, setForm] = useState<any>({ openTime: '', closeTime: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function parseHours(value?: string) {
    if (!value) return { openTime: "", closeTime: "" };
    const matches = value.match(/([0-2][0-9]:[0-5][0-9])/g);
    if (!matches) return { openTime: "", closeTime: "" };
    const start = matches[0] || "";
    const end = matches.length > 1 ? matches[1] : "";
    return { openTime: start, closeTime: end };
  }


  useEffect(()=> onAuthStateChanged(auth, setUser), []);
  useEffect(()=>{ (async ()=>{
    if(!id) return;
    const snap = await getDoc(doc(db,'businesses', id));
    if(snap.exists()){
      const data = { id: snap.id, ...(snap.data() as any)};
      const { openTime, closeTime } = parseHours(data.hours);
      setBiz(data); setForm({
        name: data.name || '',
        category: data.category || '',
        address: data.address || '',
        description: data.description || '',
        phone: data.phone || '',
        WhatsApp: data.WhatsApp || '',
        Facebook: data.Facebook || '',
        hours: data.hours || '',
        price: data.price || '',
        openTime,
        closeTime
      });
    }
  })(); }, [id]);

  const canEdit = !!(user?.uid && biz?.ownerId && user.uid === biz.ownerId);

  async function save(){
    if(!id || !canEdit) return;
    const derivedHours = form.openTime || form.closeTime
      ? `${form.openTime || '00:00'} - ${form.closeTime || '00:00'}`
      : form.hours || '';
    const { openTime, closeTime, hours, ...rest } = form;
    await updateDoc(doc(db,'businesses', id), {
      ...rest,
      hours: derivedHours,
      updatedAt: serverTimestamp(),
    });
    setBusy(false); setMsg('Guardado');
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Editar negocio</h1>
      <div className="mb-4 flex items-center gap-2">
        {!user ? (
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>signInWithPopup(auth, googleProvider)}>Iniciar sesin</button>
        ) : (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={()=>signOut(auth)}>Cerrar sesin</button>
          </>
        )}
      </div>

      {!biz ? (
        <p className="text-gray-500">Cargando...</p>
      ) : !canEdit ? (
        <p className="text-red-600">No tienes permisos para editar este negocio.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Nombre" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <input className="border rounded px-3 py-2" placeholder="Categora" value={form.category} onChange={e=>setForm({...form, category:e.target.value})} />
            <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Direccin" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
            <input className="border rounded px-3 py-2" placeholder="Telfono" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
            <input className="border rounded px-3 py-2" placeholder="WhatsApp" value={form.WhatsApp} onChange={e=>setForm({...form, WhatsApp:e.target.value})} />
            <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Facebook (URL)" value={form.Facebook} onChange={e=>setForm({...form, Facebook:e.target.value})} />
            <div className="flex gap-2">
              <input type="time" className="border rounded px-3 py-2 flex-1" value={form.openTime || ''} onChange={e=>setForm({...form, openTime:e.target.value})} />
              <input type="time" className="border rounded px-3 py-2 flex-1" value={form.closeTime || ''} onChange={e=>setForm({...form, closeTime:e.target.value})} />
            </div>
            <input className="border rounded px-3 py-2" placeholder="Precio" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
            <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Descripcin" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
          </div>
          <button className="px-4 py-2 bg-[#38761D] text-white rounded" onClick={save} disabled={busy}>{busy? 'Guardando...' : 'Guardar'}</button>
          <span className="text-sm text-gray-500 ml-2">{msg}</span>

          <h2 className="text-xl font-semibold mt-6">Imgenes</h2>
          <ImageUploader businessId={id!} images={biz.images || []} onChange={(imgs)=> setBiz((b:any)=> ({...b, images: imgs}))} />
        </div>
      )}
    </main>
  );
}

