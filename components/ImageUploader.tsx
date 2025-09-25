import React, { useState } from 'react';
import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

type ImageItem = { url: string; publicId: string };

export default function ImageUploader({ businessId, images, onChange }:{ businessId: string; images: ImageItem[]; onChange: (imgs: ImageItem[]) => void; }){
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file || !businessId) return;
    setBusy(true);
    try {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD as string;
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string;
      if (!cloud || !preset) throw new Error('Config de Cloudinary faltante');
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', preset);
      form.append('folder', `businesses/${businessId}`);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
      const json = await r.json();
      if (!json?.secure_url || !json?.public_id) throw new Error('Upload falló');
      const item: ImageItem = { url: json.secure_url, publicId: json.public_id };
      await updateDoc(doc(db, 'businesses', businessId), { images: arrayUnion(item), updatedAt: serverTimestamp() });
      onChange([...(images||[]), item]);
      setMsg('Imagen subida');
    } catch (err: any) {
      setMsg(err?.message || 'Error al subir');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(publicId: string){
    try {
      setBusy(true);
      setMsg('Eliminando...');
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/cloudinary/delete', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ businessId, publicId })});
      const next = (images||[]).filter(i => i.publicId !== publicId);
      await updateDoc(doc(db, 'businesses', businessId), { images: next, updatedAt: serverTimestamp() });
      onChange(next);
      setMsg('Imagen eliminada');
    } catch(e:any){
      setMsg(e?.message || 'Error al eliminar');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input type="file" accept="image/*" onChange={handleFile} disabled={busy} />
        <span className="text-sm text-gray-500">{busy ? 'Procesando...' : msg}</span>
      </div>
      {images?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.publicId} className="border rounded p-2">
              <img src={img.url} className="w-full h-40 object-cover rounded" alt="img" />
              <button type="button" className="mt-2 px-2 py-1 text-xs bg-red-500 text-white rounded" onClick={() => handleDelete(img.publicId)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Sin imágenes</p>
      )}
    </div>
  );
}

