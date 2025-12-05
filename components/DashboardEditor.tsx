'use client';
/**
 * Dashboard para editar negocios
 * Solo pago por transferencia/sucursal (stripe oculto)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../firebaseConfig';
import ImageUploader from './ImageUploader';
import LogoUploader from './LogoUploader';
import CoverUploader from './CoverUploader';
import AddressPicker from './AddressPicker';
import PaymentInfo from './PaymentInfo';
import { BsBank, BsUpload } from 'react-icons/bs';
import { useAuth, canEditBusiness } from '../hooks/useAuth';
import { updateBusinessDetails } from '../app/actions/businesses';

type DaySchedule = { open: boolean; start: string; end: string };
type WeeklySchedule = Record<string, DaySchedule>;

const createDefaultSchedule = (): WeeklySchedule => ({
  lunes: { open: true, start: '09:00', end: '18:00' },
  martes: { open: true, start: '09:00', end: '18:00' },
  miercoles: { open: true, start: '09:00', end: '18:00' },
  jueves: { open: true, start: '09:00', end: '18:00' },
  viernes: { open: true, start: '09:00', end: '18:00' },
  sabado: { open: true, start: '09:00', end: '14:00' },
  domingo: { open: false, start: '09:00', end: '18:00' },
});

function parseHours(value?: string) {
  if (!value) return { openTime: '', closeTime: '' };
  const matches = value.match(/([0-2][0-9]:[0-5][0-9])/g);
  if (!matches) return { openTime: '', closeTime: '' };
  const start = matches[0] || '';
  const end = matches.length > 1 ? matches[1] : '';
  return { openTime: start, closeTime: end };
}

const defaultFormState = {
  name: '',
  category: '',
  address: '',
  colonia: '',
  description: '',
  phone: '',
  WhatsApp: '',
  Facebook: '',
  hours: '',
  openTime: '',
  closeTime: '',
  plan: 'free',
  hasDelivery: false,
  featured: false,
};

function mapToFormState(data?: Record<string, any>) {
  if (!data) return { ...defaultFormState };
  const { openTime, closeTime } = parseHours(typeof data.hours === 'string' ? data.hours : undefined);
  return {
    ...defaultFormState,
    name: data.name ?? '',
    category: data.category ?? '',
    address: data.address ?? '',
    colonia: data.colonia ?? '',
    description: data.description ?? '',
    phone: data.phone ?? '',
    WhatsApp: data.WhatsApp ?? '',
    Facebook: data.Facebook ?? '',
    hours: data.hours ?? '',
    openTime,
    closeTime,
    plan: data.plan ?? 'free',
    hasDelivery: data.hasDelivery === true,
    featured: data.featured === true || data.featured === 'true',
  };
}

function mapToAddressState(data?: Record<string, any>) {
  return {
    address: data?.address ?? '',
    lat: typeof data?.lat === 'number' ? data.lat : 0,
    lng: typeof data?.lng === 'number' ? data.lng : 0,
  };
}

function mapToScheduleState(data?: Record<string, any>): WeeklySchedule {
  const base = createDefaultSchedule();
  if (!data?.horarios || typeof data.horarios !== 'object') {
    return base;
  }
  const loaded: WeeklySchedule = { ...base };
  Object.entries(base).forEach(([day, fallback]) => {
    const source = (data.horarios as Record<string, any>)[day];
    if (!source) return;
    loaded[day] = {
      open: source.abierto !== false,
      start: source.desde || fallback.start,
      end: source.hasta || fallback.end,
    };
  });
  return loaded;
}

type DashboardEditorProps = {
  businessId?: string;
  initialBusiness?: Record<string, unknown> | null;
};

export default function EditBusiness({ businessId, initialBusiness }: DashboardEditorProps) {
  const router = useRouter();
  const id = businessId;
  const { user, isAdmin, loading: authLoading } = useAuth();

  const normalizedInitial = (initialBusiness ?? undefined) as Record<string, any> | undefined;

  const [addr, setAddr] = useState<{ address: string; lat: number; lng: number }>(() =>
    mapToAddressState(normalizedInitial),
  );
  const [biz, setBiz] = useState<any>(normalizedInitial ?? null);
  const [form, setForm] = useState<any>(() => mapToFormState(normalizedInitial));
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => mapToScheduleState(normalizedInitial));
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptPlan, setReceiptPlan] = useState<'featured' | 'sponsor'>('sponsor');

  const applyBusinessData = useCallback((data: Record<string, any>) => {
    setBiz(data);
    setForm(mapToFormState(data));
    setAddr(mapToAddressState(data));
    setSchedule(mapToScheduleState(data));
  }, []);

  useEffect(() => {
    if (initialBusiness) {
      applyBusinessData(initialBusiness as Record<string, any>);
    }
  }, [initialBusiness, applyBusinessData]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'businesses', id));
        if (snap.exists()) {
          const data = { id: snap.id, ...(snap.data() as any) };
          applyBusinessData(data);
        } else {
          setMsg('No encontramos datos para este negocio.');
        }
      } catch (error) {
        console.error('Error al cargar negocio:', error);
        setMsg('Error al cargar los datos del negocio');
      }
    })();
  }, [id, applyBusinessData]);

  const userCanEdit = canEditBusiness(user, isAdmin, biz);

  const handleAddressChange = useCallback((value: { address: string; lat: number; lng: number }) => {
    setAddr(value);
    setForm((prev: any) => ({
      ...prev,
      address: value.address ?? '',
    }));
  }, []);

  async function save() {
    if (!id) return;
    if (!userCanEdit || !user) {
      setMsg('Necesitas permisos para editar este negocio.');
      return;
    }

    setBusy(true);
    setMsg('Guardando...');
    try {
      const horarios: Record<string, { abierto: boolean; desde: string; hasta: string }> = {};
      Object.entries(schedule).forEach(([day, hours]) => {
        horarios[day] = {
          abierto: hours.open,
          desde: hours.start,
          hasta: hours.end,
        };
      });

      const hoursArray: string[] = [];
      Object.entries(schedule).forEach(([day, hours]) => {
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3);
        if (hours.open) {
          hoursArray.push(`${dayLabel} ${hours.start}-${hours.end}`);
        }
      });
      const derivedHours = hoursArray.join('; ');

      const { openTime: _openTime, closeTime: _closeTime, hours: _hours, ...rest } = form;
      const hasCoords = Number.isFinite(addr.lat) && Number.isFinite(addr.lng) && !(addr.lat === 0 && addr.lng === 0);

      const token = await user.getIdToken();
      const payload = {
        ...rest,
        hasDelivery: form.hasDelivery,
        address: addr.address || rest.address || '',
        hours: derivedHours,
        horarios,
        ...(hasCoords ? { lat: addr.lat, lng: addr.lng } : {}),
      };

      const formData = new FormData();
      formData.append('token', token);
      formData.append('updates', JSON.stringify(payload));
      await updateBusinessDetails(id, formData);

      setMsg('Guardado correctamente.');

      const snap = await getDoc(doc(db, 'businesses', id));
      if (snap.exists()) {
        const updatedData = { id: snap.id, ...(snap.data() as any) };
        applyBusinessData(updatedData);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMsg(error instanceof Error ? error.message : 'No pudimos guardar los cambios. Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    if (!id || !userCanEdit || !biz) return;
    if (biz.status !== 'draft' && biz.status !== 'rejected') {
      setMsg('Este negocio ya esta en revision o publicado.');
      return;
    }
    if (!form.name?.trim() || !form.description?.trim() || !form.phone?.trim()) {
      setMsg('Completa al menos: Nombre, Descripcion y Telefono antes de enviar.');
      return;
    }

    setSubmitting(true);
    setMsg('Enviando a revision...');
    try {
      await updateDoc(doc(db, 'businesses', id), {
        status: 'review',
        submittedAt: new Date(),
        ownerId: biz.ownerId,
        ownerEmail: biz.ownerEmail,
      });

      try {
        const token = await user?.getIdToken();
        if (token) {
          await fetch('/api/notify-business-review', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              businessId: id,
              businessName: form.name || biz.name,
            }),
          });
        }
      } catch (notifyError) {
        console.warn('Error al notificar al admin:', notifyError);
      }

      setBiz((prev: any) => ({ ...prev, status: 'review' }));
      setMsg('Negocio enviado a revision. Te notificaremos cuando sea aprobado.');
    } catch (error) {
      console.error('Error al enviar a revision:', error);
      setMsg('Error al enviar. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpgradeByTransfer(targetPlan: 'featured' | 'sponsor' = 'sponsor') {
    if (!id || !biz || !user) return;
    if (!receiptFile) {
      setMsg('Adjunta tu comprobante de pago.');
      return;
    }
    setUpgradeBusy(true);
    setMsg('Enviando comprobante de transferencia...');
    try {
      const buffer = await receiptFile.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const token = await user.getIdToken();
      const res = await fetch('/api/businesses/upload-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: id,
          plan: targetPlan,
          paymentMethod: 'transfer',
          notes: receiptNotes,
          fileName: receiptFile.name,
          fileType: receiptFile.type || 'application/octet-stream',
          fileData: base64Data,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No pudimos subir el comprobante');
      }

      setBiz((prev: any) => ({
        ...prev,
        planPaymentMethod: 'transfer',
        paymentStatus: prev.paymentStatus || 'pending_transfer',
      }));
      setReceiptFile(null);
      setReceiptNotes('');
      setMsg('Comprobante enviado. Validaremos el pago y activaremos tu plan.');
    } catch (error: any) {
      console.error('transfer upload error', error);
      setMsg(error?.message || 'No pudimos registrar tu comprobante');
    } finally {
      setUpgradeBusy(false);
    }
  }

  if (authLoading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {!biz ? (
        <p className="text-gray-500">Cargando...</p>
      ) : !userCanEdit ? (
        <p className="text-red-600">No tienes permisos para editar este negocio.</p>
      ) : (
        <>
          {/* Hero */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Editor de negocio</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{form.name || 'Sin nombre'}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {biz.plan ? biz.plan.toUpperCase() : 'FREE'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Estado: {biz.status || 'draft'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{user?.email || biz.ownerEmail || 'Sesion iniciada'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/negocios')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                Ver publicado
              </button>
              {(biz.status === 'draft' || biz.status === 'rejected') && (
                <button
                  onClick={submitForReview}
                  disabled={submitting}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Enviar a revision'}
                </button>
              )}
              <button
                onClick={save}
                disabled={busy}
                className="px-4 py-2 bg-[#38761D] text-white rounded-lg hover:bg-[#2d5a15] transition text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Principal */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Informacion basica</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Nombre del negocio"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Categoria"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 md:col-span-2"
                    placeholder="Direccion"
                    value={addr.address}
                    onChange={(e) => setAddr({ ...addr, address: e.target.value })}
                  />
                </div>
                <textarea
                  className="border rounded-lg px-3 py-2 w-full"
                  rows={3}
                  placeholder="Descripcion breve"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Contacto y redes</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="Telefono"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <input
                    className="border rounded-lg px-3 py-2"
                    placeholder="WhatsApp"
                    value={form.WhatsApp}
                    onChange={(e) => setForm({ ...form, WhatsApp: e.target.value })}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 md:col-span-2"
                    placeholder="Facebook (URL)"
                    value={form.Facebook}
                    onChange={(e) => setForm({ ...form, Facebook: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Ubicacion</h2>
                </div>
                <AddressPicker value={addr} onChange={handleAddressChange} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Horarios</h2>
                <div className="overflow-x-auto">
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 min-w-[500px] md:min-w-0">
                    {Object.entries(schedule).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-3">
                        <div className="w-24 flex-shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hours.open}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, open: e.target.checked },
                                })
                              }
                              className="w-4 h-4 text-[#38761D] rounded focus:ring-[#38761D]"
                            />
                            <span className="text-sm font-medium capitalize">{day}</span>
                          </label>
                        </div>

                        {hours.open ? (
                          <div className="flex gap-2 flex-1">
                            <input
                              type="time"
                              value={hours.start}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, start: e.target.value },
                                })
                              }
                              className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
                            />
                            <span className="text-gray-500 self-center">-</span>
                            <input
                              type="time"
                              value={hours.end}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, end: e.target.value },
                                })
                              }
                              className="border rounded px-2 py-1 text-sm flex-1 min-w-[100px]"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Cerrado</span>
                        )}
                      </div>
                    ))}
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                      Desmarca los dias que permaneces cerrado.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Destacado</h2>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <div>
                    <span className="text-base font-bold text-yellow-900">Marcar como Destacado del mes</span>
                    <p className="text-sm text-yellow-700 mt-1">
                      Seccion premium de la pagina principal. Disponible para planes de pago.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Medios</h2>
                {biz.plan === 'sponsor' || biz.plan === 'featured' ? (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Imagen de portada (planes premium)</p>
                      <CoverUploader
                        businessId={id!}
                        coverUrl={biz.coverUrl || null}
                        coverPublicId={biz.coverPublicId || null}
                        onChange={(url, publicId) => setBiz((b: any) => ({ ...b, coverUrl: url, coverPublicId: publicId }))}
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Logo</p>
                      <LogoUploader
                        businessId={id!}
                        logoUrl={biz.logoUrl || null}
                        logoPublicId={biz.logoPublicId || null}
                        onChange={(url, publicId) => setBiz((b: any) => ({ ...b, logoUrl: url, logoPublicId: publicId }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Funciones premium disponibles por transferencia o pago en sucursal.
                    </p>
                    <p className="text-xs text-gray-600">Sube tu comprobante para activar tu plan.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpgradeByTransfer('sponsor')}
                        disabled={upgradeBusy}
                        className="px-3 py-2 border border-gray-300 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                      >
                        Enviar comprobante (premium)
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Galeria de imagenes</p>
                  <ImageUploader
                    businessId={id!}
                    images={biz.images || []}
                    onChange={(imgs) => setBiz((b: any) => ({ ...b, images: imgs }))}
                    plan={biz.plan}
                  />
                </div>
              </div>
            </div>

            {/* Lateral */}
            <div className="space-y-4">
              {biz.status === 'draft' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-yellow-900">Borrador</h3>
                  <p className="text-sm text-yellow-800">Completa la informacion y envia a revision para publicar.</p>
                  <button
                    onClick={submitForReview}
                    disabled={submitting}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold disabled:opacity-60"
                  >
                    {submitting ? 'Enviando...' : 'Enviar a revision'}
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Plan y pagos</h3>
                <PaymentInfo
                  businessId={id!}
                  plan={biz.plan}
                  nextPaymentDate={biz.nextPaymentDate}
                  lastPaymentDate={biz.lastPaymentDate}
                  paymentStatus={biz.paymentStatus}
                  isActive={biz.isActive}
                  disabledReason={biz.disabledReason}
                />

                <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap inline-block w-fit">
                      Pago por transferencia o sucursal
                    </span>
                    <p className="text-sm text-gray-700">Envia tu comprobante y activaremos el plan al validarlo.</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Plan a activar
                      <select
                        value={receiptPlan}
                        onChange={(e) => setReceiptPlan(e.target.value as 'featured' | 'sponsor')}
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="featured">Featured (Destacado)</option>
                        <option value="sponsor">Premium (Patrocinado)</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-gray-700">
                      Comprobante (PDF/JPG/PNG, max 3MB)
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="text-xs sm:text-sm w-full"
                        />
                        {receiptFile && <span className="text-xs text-gray-600 truncate max-w-full sm:max-w-[160px]">{receiptFile.name}</span>}
                      </div>
                    </label>

                    <textarea
                      className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      rows={2}
                      placeholder="Notas adicionales (opcional)"
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                    />

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        onClick={() => handleUpgradeByTransfer(receiptPlan)}
                        disabled={upgradeBusy}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-800 rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-60 w-full sm:w-auto"
                      >
                        <BsBank className="flex-shrink-0" />
                        <span className="hidden sm:inline">Enviar comprobante (transferencia/sucursal)</span>
                        <span className="sm:hidden">Enviar comprobante</span>
                      </button>
                      {receiptFile && (
                        <div className="inline-flex items-center gap-2 text-xs text-gray-600 px-2 py-1 bg-gray-50 border border-dashed border-gray-200 rounded w-full sm:w-auto">
                          <BsUpload className="flex-shrink-0" />
                          <span className="truncate">{receiptFile.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 break-words">
                      <p className="font-semibold text-gray-800 mb-1">Datos para transferencia:</p>
                      <p>Banco: BBVA</p>
                      <p className="break-all">Cuenta/CLABE: 012345678901234567</p>
                      <p>Beneficiario: Directorio Yajalon</p>
                      <p className="mt-1 break-words">Envia tu comprobante a <span className="break-all">pagos@directorioyajalon.com</span> o por WhatsApp al <span className="whitespace-nowrap">+52 1 999 000 0000</span>. Activaremos tu plan al validar el pago.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Estado</h3>
                <p className="text-sm text-gray-600">Propietario: {biz.ownerEmail || user?.email || 'Sesion'}</p>
                <p className="text-sm text-gray-600">ID: {biz.id}</p>
                <p className="text-xs text-gray-500">Mensaje: {msg || 'Sin mensajes'}</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => signOut(auth)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Cerrar sesion
                  </button>
                  {(form.plan === 'featured' || form.plan === 'sponsor') && (
                    <button
                      onClick={() => router.push(`/dashboard/${id}/reportes`)}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      Ver reportes
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
