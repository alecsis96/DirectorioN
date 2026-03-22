'use client';

import { useState } from 'react';

import { auth } from '../firebaseConfig';

type Props = {
  businessId: string;
  coverUrl: string | null;
  coverPublicId: string | null;
  onChange: (url: string | null, publicId: string | null) => void;
};

export default function CoverUploader({
  businessId,
  coverUrl,
  coverPublicId,
  onChange,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen de portada no debe superar 10 MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imagenes JPG, PNG o WebP.');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      if (coverPublicId) {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ publicId: coverPublicId }),
          });
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'unsigned');
      formData.append('folder', `businesses/${businessId}/cover`);

      const cloudinaryResponse = await fetch(
        'https://api.cloudinary.com/v1_1/ddz9ez9wp/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        throw new Error('Error al subir la imagen de portada a Cloudinary.');
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const newCoverUrl = cloudinaryData.secure_url;
      const newCoverPublicId = cloudinaryData.public_id;

      const user = auth.currentUser;
      if (!user) {
        throw new Error('Debes iniciar sesion.');
      }

      const token = await user.getIdToken();
      const updateResponse = await fetch('/api/businesses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          updates: {
            coverUrl: newCoverUrl,
            coverPublicId: newCoverPublicId,
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Error al guardar la portada.');
      }

      onChange(newCoverUrl, newCoverPublicId);
      setSuccess('Portada actualizada exitosamente.');
    } catch (err: any) {
      console.error('Error uploading cover:', err);
      setError(err?.message || 'Error al subir la portada.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!coverPublicId) return;

    const confirmed = window.confirm('Estas seguro de eliminar la imagen de portada?');
    if (!confirmed) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ publicId: coverPublicId }),
        });
      }

      const user2 = auth.currentUser;
      if (!user2) {
        throw new Error('Debes iniciar sesion.');
      }

      const token = await user2.getIdToken();
      const updateResponse = await fetch('/api/businesses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          updates: {
            coverUrl: null,
            coverPublicId: null,
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error al eliminar la portada.');
      }

      onChange(null, null);
      setSuccess('Portada eliminada exitosamente.');
    } catch (err: any) {
      console.error('Error removing cover:', err);
      setError(err?.message || 'Error al eliminar la portada.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-sm">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Portada del negocio"
              className="h-40 w-full rounded-2xl border border-purple-200 object-cover shadow-sm sm:h-44"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-purple-200 bg-white px-4 text-center text-sm text-gray-500 sm:h-44">
              Sin portada
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label
              htmlFor="cover-upload"
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 sm:w-auto"
            >
              {uploading ? 'Subiendo...' : coverUrl ? 'Cambiar portada' : 'Subir portada'}
            </label>
            <input
              id="cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />

            {coverUrl && (
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50 sm:w-auto"
              >
                Eliminar portada
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white/80 p-4">
            <p className="text-sm font-semibold text-gray-900">Recomendaciones de imagen</p>
            <p className="mt-2 break-words text-sm leading-relaxed text-gray-600">
              Usa una portada horizontal para que tu negocio se vea mejor en el perfil.
              Recomendado: 1200 x 400 px, proporcion 3:1, maximo 10 MB.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-purple-700">
              Formatos permitidos: JPG, PNG y WebP
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
