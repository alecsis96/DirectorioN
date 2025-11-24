import React, { useState } from 'react';
import { auth } from '../firebaseConfig';

interface UpdateResponse {
  ok: boolean;
}

export default function LogoUploader({
  businessId,
  logoUrl,
  logoPublicId,
  onChange,
}: {
  businessId: string;
  logoUrl: string | null;
  logoPublicId: string | null;
  onChange: (url: string | null, publicId: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file || !businessId) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setMsg('❌ Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMsg('❌ El logo no debe superar 5MB');
      return;
    }

    setBusy(true);
    setMsg('Subiendo logo...');

    try {
      // Cloudinary config - usar valores directos
      const cloud = 'ddz9ez9wp';
      const preset = 'unsigned';

      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', preset);
      form.append('folder', `businesses/${businessId}/logo`);
      form.append('transformation', 'c_fill,w_200,h_200,g_face'); // Cuadrado 200x200

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST',
        body: form,
      });

      const json = await response.json();

      if (!json?.secure_url || !json?.public_id) {
        throw new Error('Error al subir el logo');
      }

      // Si había logo anterior, eliminarlo
      if (logoPublicId) {
        try {
          const token = await auth.currentUser?.getIdToken();
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ publicId: logoPublicId }),
          });
        } catch (err) {
          console.warn('No se pudo eliminar el logo anterior:', err);
        }
      }

      // Guardar en Firestore
      await saveLogo(json.secure_url, json.public_id);
      onChange(json.secure_url, json.public_id);
      setMsg('✅ Logo actualizado');
    } catch (err: any) {
      setMsg(`❌ ${err?.message || 'Error al subir el logo'}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveLogo(url: string | null, publicId: string | null) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Debes iniciar sesión');

    const response = await fetch('/api/businesses/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessId,
        updates: { logoUrl: url, logoPublicId: publicId },
      }),
    });

    const result: UpdateResponse | null = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error((result as any)?.error || 'No se pudo actualizar el logo');
    }
  }

  async function handleDelete() {
    if (!logoPublicId) return;

    try {
      setBusy(true);
      setMsg('Eliminando logo...');
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publicId: logoPublicId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar logo');
      }

      await saveLogo(null, null);
      onChange(null, null);
      setMsg('✅ Logo eliminado');
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Error al eliminar'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <div className="flex-shrink-0">
            <img
              src={logoUrl}
              alt="Logo del negocio"
              className="w-24 h-24 object-cover rounded-lg border-2 border-blue-300"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
            <span className="text-3xl">🏢</span>
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            📷 Logo de tu negocio (disponible para todos los planes)
          </p>
          <p className="text-xs text-blue-700 mb-3">
            El logo aparecerá en las tarjetas de la lista principal. Recomendado: imagen cuadrada,
            máximo 5MB.
          </p>

          <div className="flex gap-2 items-center">
            <label className="cursor-pointer px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                disabled={busy}
                className="hidden"
              />
            </label>

            {logoUrl && (
              <button
                type="button"
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                onClick={handleDelete}
                disabled={busy}
              >
                Eliminar
              </button>
            )}
          </div>

          {msg && <p className="text-xs mt-2">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
