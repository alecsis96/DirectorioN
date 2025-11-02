import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db, signInWithGoogle } from '../../firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ImageUploader from '../../components/ImageUploader';
import AddressPicker from '../../components/AddressPicker';

interface UpdateResponse {
  ok: boolean;
}

export default function EditBusiness() {
    const [addr, setAddr] = useState<{ address: string; lat: number; lng: number }>({
    address: '',
    lat: 0,
    lng: 0,
  });
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
          address: data.address || '',      // seguir� existiendo para compatibilidad
          description: data.description || '',
          phone: data.phone || '',
          WhatsApp: data.WhatsApp || '',
          Facebook: data.Facebook || '',
          hours: data.hours || '',
          openTime,
          closeTime,
        });

        // inicializa el picker con lo que tengas guardado
        setAddr({
          address: data.address || '',
          lat: data.lat || 0,
          lng: data.lng || 0,
        });
      }
    })();
  }, [id]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    let active = true;
    async function detectAdmin() {
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        if (active) setIsAdmin(tokenResult.claims?.admin === true);
      } catch (error) {
        if (active) setIsAdmin(false);
      }
    }
    detectAdmin();
    return () => {
      active = false;
    };
  }, [user]);
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
          openTime,
          closeTime,
        });
      }
    })();
  }, [id]);

  const canEdit = Boolean(user?.uid) && (isAdmin || (!!biz?.ownerId && user.uid === biz.ownerId));

  const handleAddressChange = useCallback((value: { address: string; lat: number; lng: number }) => {
    setAddr(value);
    setForm((prev: any) => ({
      ...prev,
      address: value.address ?? '',
    }));
  }, []);

  async function save() {
    if (!id || !canEdit) return;
    setBusy(true);
    setMsg('Guardando...');
    try {
      const derivedHours = form.openTime || form.closeTime
        ? `${form.openTime || '00:00'} - ${form.closeTime || '00:00'}`
        : form.hours || '';
      const { openTime, closeTime, hours, ...rest } = form;
      const hasCoords =
        Number.isFinite(addr.lat) &&
        Number.isFinite(addr.lng) &&
        !(addr.lat === 0 && addr.lng === 0);
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
            address: addr.address || rest.address || '',
            hours: derivedHours,
            ...(hasCoords ? { lat: addr.lat, lng: addr.lng } : {}),
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
              onClick={() => signInWithGoogle()}
            >
              Iniciar sesi�n
            </button>
          ) : (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => signOut(auth)}>
                Cerrar sesi�n
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
              <option value="">Selecciona una categor�a</option>
              <option value="Restaurante">Restaurante</option>
              <option value="Cafeteria">Cafeter�a</option>
              <option value="Comida rapida">Comida r�pida</option>
              <option value="Bar">Bar</option>
              <option value="Gimnasio">Gimnasio</option>
              <option value="Spa">Spa</option>
              <option value="Salon de belleza">Sal�n de belleza</option>
              <option value="Ferreteria">Ferreter�a</option>
              <option value="Supermercado">Supermercado</option>
              <option value="Papeleria">Papeler�a</option>
              <option value="Boutique">Boutique</option>
              <option value="Farmacia">Farmacia</option>
              <option value="Servicios profesionales">Servicios profesionales</option>
              <option value="Tecnologia">Tecnolog�a</option>
              <option value="Automotriz">Automotriz</option>
              <option value="Educacion">Educaci�n</option>
              <option value="Entretenimiento">Entretenimiento</option>
              <option value="Salud">Salud</option>
              <option value="Turismo">Turismo</option>
              <option value="Otros">Otros</option>
            </select>
            <AddressPicker value={addr} onChange={handleAddressChange} />

            <input
              className="border rounded px-3 py-2"
              placeholder="Tel�fono"
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horario de apertura y cierre
              </label>
            </div>
            <div className="flex gap-2">              
              <input
                type="time"
                className="border rounded px-3 py-2 flex-1"
                //placeholder='Hora de apertura'
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
            
            <textarea
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Descripci�n"
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

          <h2 className="mt-6 text-xl font-semibold">Im�genes</h2>
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

