import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db, googleProvider } from '../../firebaseConfig';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ImageUploader from '../../components/ImageUploader';

interface UpdateResponse {
  ok: boolean;
}

export default function EditBusiness() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [user, setUser] = useState<any>(null);
  const [biz, setBiz] = useState<any>(null);
  const [form, setForm] = useState<any>({ openTime: '', closeTime: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function parseHours(value?: string) {
    if (!value) return { openTime: '', closeTime: '' };
    const matches = value.match(/([0-2][0-9]:[0-5][0-9])/g);
    if (!matches) return { openTime: '', closeTime: '' };
    const start = matches[0] || '';
    const end = matches.length > 1 ? matches[1] : '';
    return { openTime: start, closeTime: end };
  }

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    (async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'businesses', id));
      if (snap.exists()) {
        const data = { id: snap.id, ...(snap.data() as any) };
        const { openTime, closeTime } = parseHours(data.hours);
        setBiz(data);
        setForm({
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
          closeTime,
        });
      }
    })();
  }, [id]);

  const canEdit = !!(user?.uid && biz?.ownerId && user.uid === biz.ownerId);

  async function save() {
    if (!id || !canEdit) return;
    setBusy(true);
    setMsg('Guardando...');
    try {
      const derivedHours = form.openTime || form.closeTime
        ? `${form.openTime || '00:00'} - ${form.closeTime || '00:00'}`
        : form.hours || '';
      const { openTime, closeTime, hours, ...rest } = form;
      const token = await user.getIdToken();
      const response = await fetch('/api/businesses/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: id,
          updates: {
            ...rest,
            hours: derivedHours,
          },
        }),
      });
      const result: UpdateResponse | null = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error((result as any)?.error || 'Error al guardar');
      }
      setMsg('Guardado');
    } catch (error) {
      console.error('dashboard save error', error);
      setMsg('No pudimos guardar los cambios. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Editar negocio</h1>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {!user ? (
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded"
              onClick={() => signInWithPopup(auth, googleProvider)}
            >
              Iniciar sesión
            </button>
          ) : (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => signOut(auth)}>
                Cerrar sesión
              </button>
            </>
          )}
        </div>
        <button
          className="px-3 py-2 bg-emerald-600 text-white rounded"
          onClick={() => router.push('/negocios')}
        >
          Ver negocios
        </button>
      </div>

      {!biz ? (
        <p className="text-gray-500">Cargando...</p>
      ) : !canEdit ? (
        <p className="text-red-600">No tienes permisos para editar este negocio.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="border rounded px-3 py-2"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="border rounded px-3 py-2"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Selecciona una categoría</option>
              <option value="Restaurante">Restaurante</option>
              <option value="Cafeteria">Cafetería</option>
              <option value="Comida rapida">Comida rápida</option>
              <option value="Bar">Bar</option>
              <option value="Gimnasio">Gimnasio</option>
              <option value="Spa">Spa</option>
              <option value="Salon de belleza">Salón de belleza</option>
              <option value="Ferreteria">Ferretería</option>
              <option value="Supermercado">Supermercado</option>
              <option value="Papeleria">Papelería</option>
              <option value="Boutique">Boutique</option>
              <option value="Farmacia">Farmacia</option>
              <option value="Servicios profesionales">Servicios profesionales</option>
              <option value="Tecnologia">Tecnología</option>
              <option value="Automotriz">Automotriz</option>
              <option value="Educacion">Educación</option>
              <option value="Entretenimiento">Entretenimiento</option>
              <option value="Salud">Salud</option>
              <option value="Turismo">Turismo</option>
              <option value="Otros">Otros</option>
            </select>
            <input
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Dirección"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="WhatsApp"
              value={form.WhatsApp}
              onChange={(e) => setForm({ ...form, WhatsApp: e.target.value })}
            />
            <input
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Facebook (URL)"
              value={form.Facebook}
              onChange={(e) => setForm({ ...form, Facebook: e.target.value })}
            />
            <div className="flex gap-2">
              <input
                type="time"
                className="border rounded px-3 py-2 flex-1"
                value={form.openTime || ''}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
              />
              <input
                type="time"
                className="border rounded px-3 py-2 flex-1"
                value={form.closeTime || ''}
                onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              />
            </div>
            <input
              className="border rounded px-3 py-2"
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <textarea
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <button
            className="px-4 py-2 rounded bg-[#38761D] text-white"
            onClick={save}
            disabled={busy}
          >
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
          <span className="ml-2 text-sm text-gray-500">{msg}</span>

          <h2 className="mt-6 text-xl font-semibold">Imágenes</h2>
          <ImageUploader
            businessId={id!}
            images={biz.images || []}
            onChange={(imgs) => setBiz((b: any) => ({ ...b, images: imgs }))}
          />
        </div>
      )}
    </main>
  );
}
