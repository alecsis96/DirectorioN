/**
 * Dashboard para editar negocios
 * Optimizado con hook personalizado useAuth
 * Incluye banner para negocios en estado 'draft' y botón para enviar a revisión
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db, signInWithGoogle } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ImageUploader from '../../components/ImageUploader';
import AddressPicker from '../../components/AddressPicker';
import { useAuth, canEditBusiness } from '../../hooks/useAuth';
import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UpdateResponse {
  ok: boolean;
}

// Helper para parsear horarios del formato "HH:MM - HH:MM"
function parseHours(value?: string) {
  if (!value) return { openTime: '', closeTime: '' };
  const matches = value.match(/([0-2][0-9]:[0-5][0-9])/g);
  if (!matches) return { openTime: '', closeTime: '' };
  const start = matches[0] || '';
  const end = matches.length > 1 ? matches[1] : '';
  return { openTime: start, closeTime: end };
}

export default function EditBusiness() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  
  // Hook personalizado para autenticación
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [addr, setAddr] = useState<{ address: string; lat: number; lng: number }>({
    address: '',
    lat: 0,
    lng: 0,
  });
  
  const [biz, setBiz] = useState<any>(null);
  const [form, setForm] = useState<any>({ openTime: '', closeTime: '' });
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Cargar datos del negocio
  useEffect(() => {
    (async () => {
      if (!id) return;
      
      try {
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
            plan: data.plan || 'free', // Plan por defecto: free
          });

          setAddr({
            address: data.address || '',
            lat: data.lat || 0,
            lng: data.lng || 0,
          });
        }
      } catch (error) {
        console.error('Error al cargar negocio:', error);
        setMsg('Error al cargar los datos del negocio');
      }
    })();
  }, [id]);

  // Verificar permisos de edición
  const userCanEdit = canEditBusiness(user, isAdmin, biz);

  // Handler para cambios de dirección
  const handleAddressChange = useCallback((value: { address: string; lat: number; lng: number }) => {
    setAddr(value);
    setForm((prev: any) => ({
      ...prev,
      address: value.address ?? '',
    }));
  }, []);

  // Guardar cambios del negocio
  async function save() {
    if (!id || !userCanEdit) return;
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
      
      const token = await user!.getIdToken();
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
      
      setMsg('✅ Guardado correctamente');
      
      // Recargar datos actualizados
      const snap = await getDoc(doc(db, 'businesses', id));
      if (snap.exists()) {
        setBiz({ id: snap.id, ...(snap.data() as any) });
      }
      
    } catch (error) {
      console.error('Error al guardar:', error);
      setMsg('❌ No pudimos guardar los cambios. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  // Enviar negocio a revisión (cambiar status de draft/rejected a pending)
  async function submitForReview() {
    if (!id || !userCanEdit || !biz) return;
    
    // Solo permitir desde draft o rejected
    if (biz.status !== 'draft' && biz.status !== 'rejected') {
      setMsg('❌ Este negocio ya está en revisión o publicado');
      return;
    }
    
    // Validar campos mínimos antes de enviar
    if (!form.name?.trim() || !form.description?.trim() || !form.phone?.trim()) {
      setMsg('❌ Completa al menos: Nombre, Descripción y Teléfono antes de enviar');
      return;
    }

    setSubmitting(true);
    setMsg('Enviando a revisión...');
    
    try {
      // Preservar ownerId y ownerEmail que las reglas requieren
      await updateDoc(doc(db, 'businesses', id), {
        status: 'pending',
        submittedAt: new Date(),
        ownerId: biz.ownerId,
        ownerEmail: biz.ownerEmail,
      });
      
      // Actualizar estado local
      setBiz((prev: any) => ({ ...prev, status: 'pending' }));
      setMsg('✅ ¡Negocio enviado a revisión! Te notificaremos cuando sea aprobado.');
      
    } catch (error) {
      console.error('Error al enviar a revisión:', error);
      setMsg('❌ Error al enviar. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // Iniciar proceso de pago con Stripe
  async function handleUpgradePlan(selectedPlan: 'featured' | 'sponsor') {
    if (!id || !biz) return;

    setBusy(true);
    setMsg('Redirigiendo a checkout...');

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          businessId: id,
          businessName: biz.name || form.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear sesión de pago');
      }

      // Redirigir a Stripe Checkout
      const stripe = await stripePromise;
      if (stripe && data.sessionId) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId
        });

        if (error) {
          throw new Error(error.message);
        }
      }
    } catch (error: any) {
      console.error('Error al iniciar pago:', error);
      setMsg(`❌ Error: ${error.message}`);
      setBusy(false);
    }
  }

  // Estados de carga
  if (authLoading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Editar negocio</h1>
      
      {/* Header con usuario y navegación */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {!user ? (
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded"
              onClick={() => signInWithGoogle()}
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

      {/* Estados de carga y permisos */}
      {!biz ? (
        <p className="text-gray-500">Cargando...</p>
      ) : !userCanEdit ? (
        <p className="text-red-600">No tienes permisos para editar este negocio.</p>
      ) : (
        <div className="space-y-4">
          {/* 🔥 BANNER PARA NEGOCIOS EN DRAFT */}
          {biz.status === 'draft' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Tu negocio está en borrador
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Completa toda la información de tu negocio y envíalo a revisión para que aparezca en el directorio público.</p>
                    <p className="mt-2">✓ Elige tu plan de suscripción<br/>✓ Agrega información completa<br/>✓ Sube al menos una imagen</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={submitForReview}
                      disabled={submitting}
                      className={`px-4 py-2 rounded font-medium ${
                        submitting
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                    >
                      {submitting ? 'Enviando...' : '📤 Enviar a revisión'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banner para negocios pendientes de aprobación */}
          {biz.status === 'pending' && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    🕐 Tu negocio está en revisión
                  </h3>
                  <p className="mt-2 text-sm text-blue-700">
                    Nuestro equipo está revisando tu negocio. Te notificaremos cuando sea aprobado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Banner para negocios aprobados */}
          {biz.status === 'approved' && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    ✅ Tu negocio está publicado
                  </h3>
                  <p className="mt-2 text-sm text-green-700">
                    Tu negocio está visible en el directorio público. Puedes seguir editando la información cuando quieras.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Banner para negocios rechazados */}
          {biz.status === 'rejected' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    ❌ Tu negocio fue rechazado
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    Por favor, revisa la información y corrígela. Luego podrás enviarlo nuevamente a revisión.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={submitForReview}
                      disabled={submitting}
                      className={`px-4 py-2 rounded font-medium ${
                        submitting
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {submitting ? 'Enviando...' : '🔄 Reenviar a revisión'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de edición */}
  {/* Formulario de edición */}
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

            {/* Selector de Plan */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan de Suscripción
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, plan: 'free' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    form.plan === 'free'
                      ? 'border-[#38761D] bg-[#38761D]/10'
                      : 'border-gray-300 hover:border-[#38761D]/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#38761D]">Gratuito</div>
                    <div className="text-sm text-gray-600 mt-1">$0 / mes</div>
                    <div className="text-xs text-gray-500 mt-2">
                      • Listado básico<br />
                      • Información de contacto<br />
                      • Ubicación en mapa
                    </div>
                  </div>
                </button>
                
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    biz?.plan === 'featured'
                      ? 'border-[#38761D] bg-[#38761D]/10'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#38761D]">Destacado</div>
                    <div className="text-sm text-gray-600 mt-1">$299 / mes</div>
                    <div className="text-xs text-gray-500 mt-2">
                      • Todo lo de Gratuito<br />
                      • Posición preferente<br />
                      • Badge destacado<br />
                      • Galería de fotos
                    </div>
                    {biz?.plan === 'featured' ? (
                      <div className="mt-3 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full inline-block">
                        ✓ Plan Activo
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgradePlan('featured')}
                        disabled={busy}
                        className="mt-3 w-full px-3 py-2 bg-[#38761D] text-white text-sm font-semibold rounded hover:bg-[#2d5418] disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                      >
                        {busy ? 'Procesando...' : 'Mejorar a este plan'}
                      </button>
                    )}
                  </div>
                </div>
                
                <div
                  className={`p-4 rounded-lg border-2 transition-all ${
                    biz?.plan === 'sponsor'
                      ? 'border-[#38761D] bg-[#38761D]/10'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#38761D]">Patrocinado</div>
                    <div className="text-sm text-gray-600 mt-1">$599 / mes</div>
                    <div className="text-xs text-gray-500 mt-2">
                      • Todo lo de Destacado<br />
                      • Banner en homepage<br />
                      • Redes sociales<br />
                      • Estadísticas
                    </div>
                    {biz?.plan === 'sponsor' ? (
                      <div className="mt-3 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full inline-block">
                        ✓ Plan Activo
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgradePlan('sponsor')}
                        disabled={busy}
                        className="mt-3 w-full px-3 py-2 bg-[#38761D] text-white text-sm font-semibold rounded hover:bg-[#2d5418] disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                      >
                        {busy ? 'Procesando...' : 'Mejorar a este plan'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Puedes cambiar tu plan en cualquier momento
              </p>
            </div>

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

