'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CampaignInput, CampaignRecord } from '../../../types/campaign';
import type { BusinessPreview } from '../../../types/business';

export type CampaignBusinessOption = Pick<
  BusinessPreview,
  'id' | 'name' | 'category' | 'colonia' | 'plan' | 'WhatsApp' | 'coverUrl' | 'logoUrl' | 'image1'
>;

type Props = {
  mode: 'create' | 'edit';
  value: CampaignInput;
  businesses: CampaignBusinessOption[];
  currentCampaign?: CampaignRecord | null;
  isSaving?: boolean;
  error?: string | null;
  onChange: (next: CampaignInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function toDateTimeLocalValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoValue(value: string) {
  if (!value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export default function CampaignForm({
  mode,
  value,
  businesses,
  currentCampaign,
  isSaving = false,
  error,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const [businessSearch, setBusinessSearch] = useState('');
  const [startsAtValue, setStartsAtValue] = useState(toDateTimeLocalValue(value.startsAt));
  const [endsAtValue, setEndsAtValue] = useState(toDateTimeLocalValue(value.endsAt));

  useEffect(() => {
    setStartsAtValue(toDateTimeLocalValue(value.startsAt));
    setEndsAtValue(toDateTimeLocalValue(value.endsAt));
  }, [value.startsAt, value.endsAt, currentCampaign?.id, mode]);

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === value.businessId),
    [businesses, value.businessId]
  );

  useEffect(() => {
    if (selectedBusiness) {
      setBusinessSearch(selectedBusiness.name);
    } else if (!value.businessId) {
      setBusinessSearch('');
    }
  }, [selectedBusiness, value.businessId]);

  const filteredBusinesses = useMemo(() => {
    const query = normalizeText(businessSearch).toLowerCase();
    if (!query) return businesses.slice(0, 120);

    return businesses
      .filter((business) => {
        const haystack = [business.name, business.category, business.colonia].join(' ').toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 120);
  }, [businessSearch, businesses]);

  const fieldClass =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50';

  const disabledBusinessSelector = value.ctaType === 'internal' || value.ctaType === 'external';
  const requiresBusiness = value.ctaType === 'whatsapp' || value.ctaType === 'business';
  const requiresCtaValue = value.ctaType === 'internal' || value.ctaType === 'external';

  const handleFieldChange = <K extends keyof CampaignInput>(field: K, next: CampaignInput[K]) => {
    onChange({
      ...value,
      [field]: next,
    });
  };

  const handleDateChange = (field: 'startsAt' | 'endsAt', rawValue: string) => {
    const nextIso = toIsoValue(rawValue);
    if (field === 'startsAt') setStartsAtValue(rawValue);
    if (field === 'endsAt') setEndsAtValue(rawValue);
    handleFieldChange(field, nextIso as CampaignInput[typeof field]);
  };

  return (
    <div id="campaign-form" className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            {mode === 'create' ? 'Nueva campana' : 'Editar campana'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Configura una campana real' : currentCampaign?.title || 'Campana activa'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Define placement, vigencia, CTA y prioridad sin tocar el hero manualmente.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
        >
          Cerrar
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Titulo
            <input
              value={value.title}
              onChange={(event) => handleFieldChange('title', event.target.value)}
              className={fieldClass}
              placeholder="2x1 en tacos hoy"
              maxLength={120}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Badge
            <input
              value={value.badge || ''}
              onChange={(event) => handleFieldChange('badge', event.target.value)}
              className={fieldClass}
              placeholder="HOY"
              maxLength={24}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-gray-700">
          Subtitulo
          <input
            value={value.subtitle || ''}
            onChange={(event) => handleFieldChange('subtitle', event.target.value)}
            className={fieldClass}
            placeholder="Pide por WhatsApp y menciona YajaGon"
            maxLength={160}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-gray-700">
          Descripcion
          <textarea
            value={value.description || ''}
            onChange={(event) => handleFieldChange('description', event.target.value)}
            className={`${fieldClass} min-h-[92px] resize-y`}
            placeholder="Promocion breve o beneficio principal"
            maxLength={280}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Placement
            <select
              value={value.placement}
              onChange={(event) => handleFieldChange('placement', event.target.value as CampaignInput['placement'])}
              className={fieldClass}
            >
              <option value="hero_banner">Hero banner</option>
              <option value="offers_carousel">Offers carousel</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Audiencia
            <select
              value={value.audience}
              onChange={(event) => handleFieldChange('audience', event.target.value as CampaignInput['audience'])}
              className={fieldClass}
            >
              <option value="all">Todos</option>
              <option value="mobile">Solo movil</option>
              <option value="desktop">Solo desktop</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.4fr,0.8fr]">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Negocio asociado</label>
            <input
              value={businessSearch}
              onChange={(event) => setBusinessSearch(event.target.value)}
              className={fieldClass}
              placeholder={disabledBusinessSelector ? 'No requerido para este CTA' : 'Buscar negocio por nombre o zona'}
              disabled={disabledBusinessSelector}
            />
            <select
              value={value.businessId || ''}
              onChange={(event) => handleFieldChange('businessId', event.target.value || undefined)}
              className={fieldClass}
              disabled={disabledBusinessSelector}
            >
              <option value="">{disabledBusinessSelector ? 'Sin negocio asociado' : 'Selecciona un negocio'}</option>
              {filteredBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} · {business.category || 'Sin categoria'}{business.colonia ? ` · ${business.colonia}` : ''}
                </option>
              ))}
            </select>
            {requiresBusiness ? (
              <p className="text-xs text-gray-500">Este CTA necesita un negocio asociado para funcionar correctamente.</p>
            ) : (
              <p className="text-xs text-gray-500">Opcional si la campana apunta a una ruta o enlace externo.</p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">Codigo promo</label>
            <input
              value={value.promoCode || ''}
              onChange={(event) => handleFieldChange('promoCode', event.target.value)}
              className={fieldClass}
              placeholder="YAJA01"
              maxLength={24}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            CTA label
            <input
              value={value.ctaLabel}
              onChange={(event) => handleFieldChange('ctaLabel', event.target.value)}
              className={fieldClass}
              placeholder="Enviar WhatsApp"
              maxLength={60}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            CTA type
            <select
              value={value.ctaType}
              onChange={(event) => handleFieldChange('ctaType', event.target.value as CampaignInput['ctaType'])}
              className={fieldClass}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="business">Negocio</option>
              <option value="internal">Interno</option>
              <option value="external">Externo</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Prioridad
            <input
              type="number"
              min={0}
              max={9999}
              value={value.priority}
              onChange={(event) => handleFieldChange('priority', Number(event.target.value))}
              className={fieldClass}
            />
          </label>
        </div>

        {requiresCtaValue ? (
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            CTA value
            <input
              value={value.ctaValue || ''}
              onChange={(event) => handleFieldChange('ctaValue', event.target.value)}
              className={fieldClass}
              placeholder={value.ctaType === 'internal' ? '/negocios/promo' : 'https://...'}
            />
          </label>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Inicia
            <input
              type="datetime-local"
              value={startsAtValue}
              onChange={(event) => handleDateChange('startsAt', event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Termina
            <input
              type="datetime-local"
              value={endsAtValue}
              onChange={(event) => handleDateChange('endsAt', event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Imagen principal
            <input
              value={value.imageUrl || ''}
              onChange={(event) => handleFieldChange('imageUrl', event.target.value)}
              className={fieldClass}
              placeholder="https://..."
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Imagen movil
            <input
              value={value.mobileImageUrl || ''}
              onChange={(event) => handleFieldChange('mobileImageUrl', event.target.value)}
              className={fieldClass}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr,0.9fr]">
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            Background style
            <select
              value={value.backgroundStyle || ''}
              onChange={(event) => handleFieldChange('backgroundStyle', event.target.value || undefined)}
              className={fieldClass}
            >
              <option value="">Automatico</option>
              <option value="premium">Premium</option>
              <option value="emerald">Emerald</option>
              <option value="sunset">Sunset</option>
              <option value="neutral">Neutral</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            <span>Activa al guardar</span>
            <button
              type="button"
              onClick={() => handleFieldChange('isActive', !value.isActive)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                value.isActive ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
              aria-pressed={value.isActive}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  value.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-500">
          {selectedBusiness ? (
            <span>
              Asociada a <strong className="text-gray-700">{selectedBusiness.name}</strong>
            </span>
          ) : (
            <span>Sin negocio asociado aun.</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSaving}
            className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando...' : mode === 'create' ? 'Crear campana' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
