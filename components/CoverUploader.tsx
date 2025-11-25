'use client';

import { useState } from 'react';
import { auth } from '../firebaseConfig';

type Props = {
  businessId: string;
  coverUrl: string | null;
  coverPublicId: string | null;
  onChange: (url: string | null, publicId: string | null) => void;
};

export default function CoverUploader({ businessId, coverUrl, coverPublicId, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen de portada no debe superar 10MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      // 1. Eliminar imagen anterior si existe
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

      // 2. Subir nueva imagen de portada
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
        throw new Error('Error al subir la imagen de portada a Cloudinary');
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const newCoverUrl = cloudinaryData.secure_url;
      const newCoverPublicId = cloudinaryData.public_id;

      // 3. Guardar en Firestore
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Debes iniciar sesión');
      }

      const token = await user.getIdToken();
      const updateResponse = await fetch('/api/businesses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: businessId,
          updates: {
            coverUrl: newCoverUrl,
            coverPublicId: newCoverPublicId,
          },
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Error al guardar la portada');
      }

      onChange(newCoverUrl, newCoverPublicId);
      setSuccess('Portada actualizada exitosamente');
    } catch (err: any) {
      console.error('Error uploading cover:', err);
      setError(err.message || 'Error al subir la portada');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!coverPublicId) return;

    const confirmed = confirm('¿Estás seguro de eliminar la imagen de portada?');
    if (!confirmed) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Eliminar de Cloudinary
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

      // 2. Actualizar Firestore
      const user2 = auth.currentUser;
      if (!user2) throw new Error('Debes iniciar sesión');

      const token = await user2.getIdToken();
      const updateResponse = await fetch('/api/businesses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: businessId,
          updates: {
            coverUrl: null,
            coverPublicId: null,
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error al eliminar la portada');
      }

      onChange(null, null);
      setSuccess('Portada eliminada exitosamente');
    } catch (err: any) {
      console.error('Error removing cover:', err);
      setError(err.message || 'Error al eliminar la portada');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-md">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Portada del negocio"
              className="w-48 h-28 object-cover rounded-lg border-2 border-purple-300 shadow-sm"
            />
          ) : (
            <div className="w-48 h-28 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              Sin portada
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3">
          <div>
            <label
              htmlFor="cover-upload"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-medium cursor-pointer hover:bg-purple-700 transition shadow-sm"
            >
              {uploading ? 'Subiendo...' : coverUrl ? 'Cambiar Portada' : 'Subir Portada'}
            </label>
            <input
              id="cover-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </div>

          {coverUrl && (
            <button
              onClick={handleRemoveCover}
              disabled={uploading}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition disabled:opacity-50"
            >
              Eliminar Portada
            </button>
          )}

          <p className="text-xs text-purple-700">
            📐 Recomendado: 1200x400px (proporción 3:1) • Máx. 10MB • JPG, PNG o WebP
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              ⚠️ {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              ✓ {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
