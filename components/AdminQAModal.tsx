'use client';

import { useMemo, useState } from 'react';

import { approveApplication, deleteApplication, manageBusiness } from '../app/actions/admin';
import type { AdminApplication } from './AdminApplicationsList';

type Props = {
  application: AdminApplication;
  onClose: () => void;
  onApproved?: (id: string) => void;
  onDeleted?: (id: string) => void;
  getToken: () => Promise<string>;
};

const fieldConfig: Array<{ key: string; label: string; type?: 'textarea' }> = [
  { key: 'businessName', label: 'Nombre del negocio' },
  { key: 'description', label: 'Descripción', type: 'textarea' },
  { key: 'category', label: 'Categoría' },
  { key: 'ownerName', label: 'Nombre del propietario' },
  { key: 'ownerEmail', label: 'Correo del propietario' },
  { key: 'ownerPhone', label: 'Teléfono del propietario' },
  { key: 'address', label: 'Dirección' },
  { key: 'colonia', label: 'Colonia/Barrio' },
  { key: 'municipio', label: 'Municipio' },
  { key: 'phone', label: 'Teléfono del negocio' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'plan', label: 'Plan' },
  { key: 'notes', label: 'Notas internas', type: 'textarea' },
];

export default function AdminQAModal({ application, onClose, onApproved, onDeleted, getToken }: Props) {
  const initialValues = useMemo(() => {
    return {
      businessName: application.formData?.businessName ?? application.businessName ?? '',
      description: application.formData?.description ?? '',
      category: application.formData?.category ?? '',
      ownerName: application.formData?.ownerName ?? application.ownerName ?? '',
      ownerEmail: application.formData?.ownerEmail ?? application.email ?? '',
      ownerPhone: application.formData?.ownerPhone ?? application.phone ?? '',
      address: application.formData?.address ?? '',
      colonia: application.formData?.colonia ?? '',
      municipio: application.formData?.municipio ?? '',
      phone: application.formData?.phone ?? '',
      whatsapp: application.formData?.whatsapp ?? '',
      plan: application.formData?.plan ?? application.plan ?? 'free',
      notes: application.formData?.notes ?? application.notes ?? '',
    };
  }, [application]);

  const [draft, setDraft] = useState(initialValues);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const galleryItems = useMemo(() => {
    const gallery = application.formData?.gallery;
    if (Array.isArray(gallery)) return gallery.filter(Boolean);
    if (typeof gallery === 'string') {
      return gallery
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    const images = application.formData?.images;
    if (Array.isArray(images)) {
      return images.map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean);
    }
    return [];
  }, [application.formData]);

  const handleChange = (key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const runAction = async (action: () => Promise<void>, tag: string) => {
    setBusy(tag);
    setError(null);
    setFeedback(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acción no completada.');
    } finally {
      setBusy(null);
    }
  };

  const handleTempSave = () =>
    runAction(async () => {
      const token = await getToken();
      await manageBusiness(token, application.uid, draft);
      setFeedback('Cambios guardados temporalmente.');
    }, 'temp');

  const handleApprove = () =>
    runAction(async () => {
      const token = await getToken();
      await approveApplication(token, application.uid, draft);
      setFeedback('Solicitud aprobada.');
      onApproved?.(application.uid);
    }, 'approve');

  const handleDelete = () =>
    runAction(async () => {
      const token = await getToken();
      await deleteApplication(token, application.uid);
      setFeedback('Solicitud eliminada.');
      onDeleted?.(application.uid);
    }, 'delete');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">Revisión QA</p>
            <h2 className="text-2xl font-semibold text-gray-900">{application.businessName}</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {feedback && (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedback}
            </p>
          )}

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ficha editable</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {fieldConfig.map(({ key, label, type }) => (
                <label key={key} className="text-sm font-semibold text-gray-700">
                  {label}
                  {type === 'textarea' ? (
                    <textarea
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={(draft as any)[key] ?? ''}
                      onChange={(event) => handleChange(key, event.target.value)}
                      rows={3}
                    />
                  ) : (
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      value={(draft as any)[key] ?? ''}
                      onChange={(event) => handleChange(key, event.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Galería de imágenes</h3>
              <p className="text-xs text-gray-500">Fuente: formulario enviado</p>
            </div>
            {galleryItems.length ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {galleryItems.map((url, index) => (
                  <div key={`${url}-${index}`} className="overflow-hidden rounded-lg border">
                    <img src={url} alt={`gallery-${index}`} className="h-48 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Esta solicitud no incluyó imágenes.</p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Acciones finales</h3>
            <div className="flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                onClick={handleTempSave}
                disabled={busy !== null}
              >
                {busy === 'temp' ? 'Guardando...' : 'Guardar cambios temporales'}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={busy !== null}
              >
                {busy === 'approve' ? 'Aprobando...' : 'Aprobar'}
              </button>
              <button
                type="button"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-200"
                onClick={handleDelete}
                disabled={busy !== null}
              >
                {busy === 'delete' ? 'Eliminando...' : 'Rechazar / Eliminar'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
