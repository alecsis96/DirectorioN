import React, { useState } from 'react';
import { auth } from '../firebaseConfig';

interface UpdateResponse {
  ok: boolean;
}

type ImageItem = { url: string; publicId: string };

export default function ImageUploader({ businessId, images, onChange, plan }:{ businessId: string; images: ImageItem[]; onChange: (imgs: ImageItem[]) => void; plan?: string; }){
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  
  const canUploadImages = plan === 'featured' || plan === 'sponsor';

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
      if (!json?.secure_url || !json?.public_id) throw new Error('Upload fallÃ³');
      const item: ImageItem = { url: json.secure_url, publicId: json.public_id };
      const nextImages = [...(images || []), item];
      await saveImages(nextImages);
      onChange(nextImages);
      setMsg('Imagen subida');
    } catch (err: any) {
      setMsg(err?.message || 'Error al subir');
    } finally {
      setBusy(false);
    }
  }

  async function saveImages(next: ImageItem[]) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Debes iniciar sesion');
    const response = await fetch('/api/businesses/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessId,
        updates: { images: next },
      }),
    });
    const result: UpdateResponse | null = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error((result as any)?.error || 'No se pudo actualizar la galeria');
    }
  }
  async function handleDelete(publicId: string){
    try {
      setBusy(true);
      setMsg('Eliminando...');
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/cloudinary/delete', { 
        method:'POST', 
        headers:{ 
          'Content-Type':'application/json', 
          Authorization:`Bearer ${token}` 
        }, 
        body: JSON.stringify({ publicId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar imagen');
      }
      
      const next = (images || []).filter(i => i.publicId !== publicId);
      await saveImages(next);
      onChange(next);
      setMsg('✅ Imagen eliminada');
    } catch(e:any){
      setMsg(`❌ ${e?.message || 'Error al eliminar'}`);
    } finally { 
      setBusy(false); 
    }
  }

  if (!canUploadImages) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
        <p className="text-lg font-semibold text-gray-800 mb-2">🖼️ Galería de fotos</p>
        <p className="text-sm text-gray-600 mb-4">
          La subida de imágenes está disponible solo para planes <span className="font-bold text-orange-600">Destacado</span> o <span className="font-bold text-purple-600">Patrocinado</span>.
        </p>
        <p className="text-xs text-gray-500">
          Plan actual: <span className="font-semibold">{plan || 'Gratuito'}</span>
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input type="file" accept="image/*" onChange={handleFile} disabled={busy} />
        <span className="text-sm text-gray-500">{busy ? 'Procesando...' : msg}</span>
      </div>
      {images?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-20 md:pb-0">
          {images.map((img) => (
            <div key={img.publicId} className="border rounded p-2">
              <img src={img.url} className="w-full h-40 object-cover rounded" alt="img" />
              <button type="button" className="mt-2 px-2 py-1 text-xs bg-red-500 text-white rounded w-full" onClick={() => handleDelete(img.publicId)}>
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










