'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createAssistedBusiness } from '@/app/actions/adminBusinessActions';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/categoriesCatalog';
import { getStoragePlanForVisibleTier, type VisibleBusinessTier } from '@/lib/businessPlanVisibility';

type SourceChannel = 'whatsapp' | 'messenger' | 'visita' | 'telefono' | 'otro';
type PlanType = VisibleBusinessTier;
type WizardStep = 1 | 2 | 3;

const STEPS: Array<{ id: WizardStep; label: string; description: string }> = [
  { id: 1, label: 'Negocio', description: 'Nombre y contacto' },
  { id: 2, label: 'Categoria', description: 'Tipo y zona' },
  { id: 3, label: 'Operacion', description: 'Origen y plan' },
];

export default function AltaAsistidaForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);

  const [formData, setFormData] = useState({
    nombreNegocio: '',
    telefonoWhatsApp: '',
    categoryGroupId: '',
    categoryId: '',
    colonia: '',
    sourceChannel: 'whatsapp' as SourceChannel,
    planInicial: 'free' as PlanType,
    internalNote: '',
  });

  const filteredCategories = useMemo(
    () => (formData.categoryGroupId ? CATEGORIES.filter((cat) => cat.groupId === formData.categoryGroupId) : []),
    [formData.categoryGroupId]
  );

  const stepIsValid = (currentStep: WizardStep) => {
    if (currentStep === 1) return Boolean(formData.nombreNegocio.trim() && formData.telefonoWhatsApp.trim());
    if (currentStep === 2) return Boolean(formData.categoryGroupId && formData.categoryId);
    return true;
  };

  const goNext = () => {
    if (!stepIsValid(step)) {
      alert('Completa los campos clave antes de continuar.');
      return;
    }

    setStep((current) => (current < 3 ? ((current + 1) as WizardStep) : current));
  };

  const goBack = () => setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      alert('No estas autenticado');
      return;
    }

    if (!formData.nombreNegocio || !formData.telefonoWhatsApp || !formData.categoryId) {
      alert('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken(true);
      const result = await createAssistedBusiness(
        {
          name: formData.nombreNegocio,
          phone: formData.telefonoWhatsApp,
          WhatsApp: formData.telefonoWhatsApp,
          categoryId: formData.categoryId,
          colonia: formData.colonia || undefined,
          neighborhood: formData.colonia || undefined,
          sourceChannel: formData.sourceChannel,
          plan: getStoragePlanForVisibleTier(formData.planInicial),
          internalNote: formData.internalNote || undefined,
        },
        token
      );

      if (result.success && result.businessId) {
        alert(`Alta asistida creada: ${formData.nombreNegocio}`);
        router.push(`/dashboard/${result.businessId}`);
      } else {
        alert(`Error: ${result.error || 'No se pudo crear el negocio'}`);
      }
    } catch (error) {
      console.error('Error al crear alta asistida:', error);
      alert('Error al crear el negocio');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    'w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        {STEPS.map((item) => {
          const isActive = step === item.id;
          const isDone = step > item.id;

          return (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? 'bg-emerald-600 text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {item.id}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Datos base</h3>
            <p className="mt-1 text-sm text-gray-600">Solo lo minimo para crear el negocio y seguir rapido.</p>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Nombre del negocio
            <input
              type="text"
              required
              value={formData.nombreNegocio}
              onChange={(event) => setFormData({ ...formData, nombreNegocio: event.target.value })}
              className={`${fieldClass} mt-1`}
              placeholder="Ej: Tacos El Guero"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            WhatsApp
            <input
              type="tel"
              required
              value={formData.telefonoWhatsApp}
              onChange={(event) => setFormData({ ...formData, telefonoWhatsApp: event.target.value })}
              className={`${fieldClass} mt-1`}
              placeholder="9191234567"
            />
          </label>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Clasificacion rapida</h3>
            <p className="mt-1 text-sm text-gray-600">Define tipo de negocio y zona para no crear ruido operativo.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de negocio
              <select
                required
                value={formData.categoryGroupId}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    categoryGroupId: event.target.value,
                    categoryId: '',
                  })
                }
                className={`${fieldClass} mt-1`}
              >
                <option value="">Selecciona tipo</option>
                {CATEGORY_GROUPS.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.icon} {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Categoria especifica
              <select
                required
                value={formData.categoryId}
                onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })}
                disabled={!formData.categoryGroupId}
                className={`${fieldClass} mt-1 disabled:cursor-not-allowed disabled:bg-gray-100`}
              >
                <option value="">Selecciona categoria</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Colonia o zona
            <input
              type="text"
              value={formData.colonia}
              onChange={(event) => setFormData({ ...formData, colonia: event.target.value })}
              className={`${fieldClass} mt-1`}
              placeholder="Ej: Centro, San Martin"
            />
          </label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Operacion</h3>
            <p className="mt-1 text-sm text-gray-600">Canal de origen, plan inicial y nota corta si hace falta.</p>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Canal de contacto
            <select
              value={formData.sourceChannel}
              onChange={(event) => setFormData({ ...formData, sourceChannel: event.target.value as SourceChannel })}
              className={`${fieldClass} mt-1`}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="messenger">Messenger</option>
              <option value="visita">Visita directa</option>
              <option value="telefono">Telefono</option>
              <option value="otro">Otro</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Plan inicial
            <select
              value={formData.planInicial}
              onChange={(event) => setFormData({ ...formData, planInicial: event.target.value as PlanType })}
              className={`${fieldClass} mt-1`}
            >
              <option value="free">Perfil base</option>
              <option value="premium">Premium</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-gray-700">
            Nota interna
            <textarea
              rows={3}
              value={formData.internalNote}
              onChange={(event) => setFormData({ ...formData, internalNote: event.target.value })}
              className={`${fieldClass} mt-1 resize-none`}
              placeholder="Solo si aporta algo para la operacion."
            />
          </label>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Al guardar, el negocio se crea y te manda directo al dashboard para completar datos.
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={step === 1 ? () => router.back() : goBack}
          className="rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {step === 1 ? 'Cancelar' : 'Atras'}
        </button>

        <div className="flex gap-3">
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {loading ? 'Creando...' : 'Crear alta asistida'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
