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
  
  // Plan DESTACADO: máximo 2 fotos para mantener diseño limpio
  // Plan PATROCINADO: hasta 10 fotos para máxima exhibición
  const maxImages = plan === 'featured' ? 2 : plan === 'sponsor' ? 10 : 0;
  const currentCount = images?.length || 0;
  const canAddMore = currentCount < maxImages;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file || !businessId) return;
    
    // Validar límite de fotos según plan
    if (!canAddMore) {
      setMsg(`❌ Límite de ${maxImages} fotos alcanzado para plan ${plan === 'featured' ? 'Destacado' : 'Patrocinado'}`);
      setTimeout(() => setMsg(''), 4000);
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setMsg('❌ Solo se permiten imágenes (JPG, PNG, WEBP, GIF)');
      return;
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      setMsg('❌ La imagen no debe superar 5MB');
      return;
    }

    setBusy(true);
    try {
      // Cloudinary config - usar valores directos
      const cloud = 'ddz9ez9wp';
      const preset = 'unsigned';
      
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
      {/* Contador de fotos según plan */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Fotos ({currentCount}/{maxImages})
          </span>
          {plan === 'featured' && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-300">
              Plan Destacado
            </span>
          )}
          {plan === 'sponsor' && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-300">
              Plan Patrocinado
            </span>
          )}
        </div>
        {!canAddMore && (
          <span className="text-xs text-orange-600 font-medium">
            Límite alcanzado
          </span>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFile} 
          disabled={busy || !canAddMore}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {!canAddMore && (
          <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg p-2">
            ⚠️ Límite de {maxImages} fotos alcanzado para plan {plan === 'featured' ? 'Destacado' : 'Patrocinado'}
          </p>
        )}
        {msg && (
          <span className={`text-sm ${msg.includes('✅') ? 'text-green-600' : msg.includes('❌') ? 'text-red-600' : 'text-gray-600'}`}>
            {busy ? 'Procesando...' : msg}
          </span>
        )}
      </div>
      
      {images?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.publicId} className="border rounded-lg p-2 bg-white shadow-sm hover:shadow-md transition-shadow">
              <img src={img.url} className="w-full h-40 object-cover rounded" alt="img" />
              <button 
                type="button" 
                className="mt-2 px-2 py-1 text-xs bg-red-500 text-white rounded w-full hover:bg-red-600 transition-colors disabled:opacity-50" 
                onClick={() => handleDelete(img.publicId)}
                disabled={busy}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">📷 Sin imágenes aún</p>
          <p className="text-gray-400 text-xs mt-1">Sube hasta {maxImages} fotos de tu negocio</p>
        </div>
      )}
    </div>
  );
}










