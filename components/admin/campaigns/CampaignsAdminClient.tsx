'use client';

import { useMemo, useState, useTransition } from 'react';
import { BsCopy, BsMegaphone, BsPauseCircle, BsPencilSquare, BsPlayCircle, BsPlus } from 'react-icons/bs';

import {
  createCampaignAction,
  duplicateCampaignAction,
  toggleCampaignActiveAction,
  updateCampaignAction,
} from '../../../app/actions/campaignAdminActions';
import type { CampaignInput, CampaignRecord } from '../../../types/campaign';
import type { BusinessPreview } from '../../../types/business';
import CampaignForm from './CampaignForm';
import CampaignPreview from './CampaignPreview';
import CampaignStatusBadge from './CampaignStatusBadge';
import EmptyState from '../shared/EmptyState';

type Props = {
  initialCampaigns: CampaignRecord[];
  businesses: BusinessPreview[];
};

function sortCampaigns(list: CampaignRecord[]) {
  return [...list].sort((left, right) => {
    if (left.priority !== right.priority) return right.priority - left.priority;
    const leftUpdated = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightUpdated = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightUpdated - leftUpdated;
  });
}

function getCampaignStatus(campaign: CampaignRecord) {
  const now = Date.now();
  if (!campaign.isActive) return 'paused' as const;

  const startsAt = campaign.startsAt ? Date.parse(campaign.startsAt) : NaN;
  const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : NaN;

  if (Number.isFinite(startsAt) && now < startsAt) return 'scheduled' as const;
  if (Number.isFinite(endsAt) && now > endsAt) return 'expired' as const;
  return 'active' as const;
}

function toDateInput(daysFromNow = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toIsoOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function createEmptyCampaignDraft(): CampaignInput {
  return {
    businessId: undefined,
    title: '',
    subtitle: '',
    description: '',
    badge: 'HOY',
    promoCode: '',
    imageUrl: '',
    mobileImageUrl: '',
    ctaLabel: 'Enviar WhatsApp',
    ctaType: 'whatsapp',
    ctaValue: '',
    startsAt: toIsoOrUndefined(toDateInput(0)),
    endsAt: toIsoOrUndefined(toDateInput(7)),
    isActive: true,
    priority: 100,
    placement: 'hero_banner',
    audience: 'all',
    backgroundStyle: '',
  };
}

function campaignToDraft(campaign: CampaignRecord): CampaignInput {
  return {
    businessId: campaign.businessId,
    title: campaign.title,
    subtitle: campaign.subtitle || '',
    description: campaign.description || '',
    badge: campaign.badge || '',
    promoCode: campaign.promoCode || '',
    imageUrl: campaign.imageUrl || '',
    mobileImageUrl: campaign.mobileImageUrl || '',
    ctaLabel: campaign.ctaLabel,
    ctaType: campaign.ctaType,
    ctaValue: campaign.ctaValue || '',
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    isActive: campaign.isActive,
    priority: campaign.priority,
    placement: campaign.placement,
    audience: campaign.audience,
    backgroundStyle: campaign.backgroundStyle || '',
  };
}

export default function CampaignsAdminClient({ initialCampaigns, businesses }: Props) {
  const [campaigns, setCampaigns] = useState(() => sortCampaigns(initialCampaigns));
  const [query, setQuery] = useState('');
  const [placementFilter, setPlacementFilter] = useState<'all' | CampaignRecord['placement']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnType<typeof getCampaignStatus>>('all');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CampaignInput>(() => createEmptyCampaignDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const businessesById = useMemo(() => {
    const map = new Map<string, BusinessPreview>();
    for (const business of businesses) {
      map.set(business.id, business);
    }
    return map;
  }, [businesses]);

  const currentCampaign =
    editingCampaignId ? campaigns.find((campaign) => campaign.id === editingCampaignId) ?? null : null;

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortCampaigns(
      campaigns.filter((campaign) => {
        if (placementFilter !== 'all' && campaign.placement !== placementFilter) return false;

        const status = getCampaignStatus(campaign);
        if (statusFilter !== 'all' && status !== statusFilter) return false;

        if (!normalizedQuery) return true;

        const businessName = campaign.businessId ? businessesById.get(campaign.businessId)?.name || '' : '';
        const haystack = [
          campaign.title,
          campaign.subtitle,
          campaign.badge,
          campaign.promoCode,
          campaign.ctaLabel,
          businessName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
    );
  }, [businessesById, campaigns, placementFilter, query, statusFilter]);

  const stats = useMemo(() => {
    const base = {
      total: campaigns.length,
      active: 0,
      scheduled: 0,
      paused: 0,
      expired: 0,
    };

    for (const campaign of campaigns) {
      base[getCampaignStatus(campaign)] += 1;
    }

    return base;
  }, [campaigns]);

  const selectedBusiness = draft.businessId ? businessesById.get(draft.businessId) : undefined;

  const resetToCreate = () => {
    setEditorMode('create');
    setEditingCampaignId(null);
    setDraft(createEmptyCampaignDraft());
    setFormError(null);
  };

  const openEdit = (campaign: CampaignRecord) => {
    setEditorMode('edit');
    setEditingCampaignId(campaign.id);
    setDraft(campaignToDraft(campaign));
    setFormError(null);
  };

  const upsertCampaign = (campaign: CampaignRecord) => {
    setCampaigns((current) => {
      const withoutCurrent = current.filter((item) => item.id !== campaign.id);
      return sortCampaigns([campaign, ...withoutCurrent]);
    });
  };

  const validateDraft = (input: CampaignInput) => {
    if (!input.title.trim()) return 'El titulo es obligatorio.';
    if (!input.ctaLabel.trim()) return 'El CTA principal es obligatorio.';

    const startsAt = input.startsAt ? Date.parse(input.startsAt) : NaN;
    const endsAt = input.endsAt ? Date.parse(input.endsAt) : NaN;

    if (input.startsAt && !Number.isFinite(startsAt)) return 'La fecha de inicio no es valida.';
    if (input.endsAt && !Number.isFinite(endsAt)) return 'La fecha de fin no es valida.';
    if (Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt > endsAt) {
      return 'La fecha de inicio no puede ser mayor que la fecha de fin.';
    }
    if ((input.ctaType === 'whatsapp' || input.ctaType === 'business') && !input.businessId) {
      return 'Selecciona un negocio para este tipo de CTA.';
    }
    if ((input.ctaType === 'internal' || input.ctaType === 'external') && !input.ctaValue?.trim()) {
      return 'Ese CTA necesita un valor valido.';
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    startTransition(async () => {
      const result =
        editorMode === 'create'
          ? await createCampaignAction(draft)
          : await updateCampaignAction(editingCampaignId || '', draft);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      upsertCampaign(result.campaign);
      setEditorMode('edit');
      setEditingCampaignId(result.campaign.id);
      setDraft(campaignToDraft(result.campaign));
    });
  };

  const handleToggleActive = (campaign: CampaignRecord) => {
    startTransition(async () => {
      const result = await toggleCampaignActiveAction(campaign.id, !campaign.isActive);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      upsertCampaign(result.campaign);
      if (editingCampaignId === campaign.id) {
        setDraft(campaignToDraft(result.campaign));
      }
    });
  };

  const handleDuplicate = (campaign: CampaignRecord) => {
    startTransition(async () => {
      const result = await duplicateCampaignAction(campaign.id);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      upsertCampaign(result.campaign);
      openEdit(result.campaign);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Operacion</p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <BsMegaphone className="text-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                <p className="text-sm text-gray-600">Crea, pausa y programa hero y ofertas sin tocar el sitio manualmente.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={resetToCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(5,150,105,0.16)] transition hover:bg-emerald-700"
          >
            <BsPlus className="text-lg" />
            Nueva campana
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <div className="space-y-4">
          <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">Total {stats.total}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Activas {stats.active}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Programadas {stats.scheduled}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">Vencidas {stats.expired}</span>
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">Pausadas {stats.paused}</span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_220px_220px]">
                <label className="grid gap-2 text-sm font-medium text-gray-700">
                  Buscar
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Titulo, negocio o codigo"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-gray-700">
                  Placement
                  <select
                    value={placementFilter}
                    onChange={(event) =>
                      setPlacementFilter(event.target.value as 'all' | CampaignRecord['placement'])
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="all">Todos</option>
                    <option value="hero_banner">Hero banner</option>
                    <option value="offers_carousel">Offers carousel</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-gray-700">
                  Estado
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as 'all' | ReturnType<typeof getCampaignStatus>)
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activa</option>
                    <option value="scheduled">Programada</option>
                    <option value="paused">Pausada</option>
                    <option value="expired">Vencida</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {filteredCampaigns.length === 0 ? (
            <EmptyState
              icon="C"
              title="No hay campanas con esos filtros"
              description="Crea una campana nueva o ajusta placement, estado y busqueda."
            />
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((campaign) => {
                const status = getCampaignStatus(campaign);
                const businessName = campaign.businessId ? businessesById.get(campaign.businessId)?.name : undefined;

                return (
                  <article
                    key={campaign.id}
                    className={`rounded-[26px] border bg-white p-4 shadow-sm transition ${
                      editingCampaignId === campaign.id ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">{campaign.title}</h3>
                          <CampaignStatusBadge status={status} />
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {campaign.placement === 'hero_banner' ? 'Hero banner' : 'Offers carousel'}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          {businessName ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{businessName}</span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">Sin negocio</span>
                          )}
                          {campaign.promoCode ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Codigo {campaign.promoCode}</span>
                          ) : null}
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">CTA {campaign.ctaLabel}</span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">Prioridad {campaign.priority}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 sm:text-sm">
                          <span>
                            <strong className="font-semibold text-gray-700">Vigencia:</strong>{' '}
                            {campaign.startsAt ? new Date(campaign.startsAt).toLocaleString('es-MX') : 'Sin inicio'}
                            {' / '}
                            {campaign.endsAt ? new Date(campaign.endsAt).toLocaleString('es-MX') : 'Sin fin'}
                          </span>
                          <span>
                            <strong className="font-semibold text-gray-700">Config:</strong>{' '}
                            {campaign.audience === 'all' ? 'Todos' : campaign.audience}
                            {' / '}
                            {campaign.ctaType}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:max-w-[240px] sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(campaign)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                        >
                          <BsPencilSquare />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(campaign)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                        >
                          {campaign.isActive ? <BsPauseCircle /> : <BsPlayCircle />}
                          {campaign.isActive ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(campaign)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                        >
                          <BsCopy />
                          Duplicar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <CampaignForm
            mode={editorMode}
            value={draft}
            businesses={businesses}
            currentCampaign={currentCampaign}
            isSaving={isPending}
            error={formError}
            onChange={setDraft}
            onSubmit={handleSave}
            onCancel={resetToCreate}
          />
          <CampaignPreview draft={draft} business={selectedBusiness} />
        </div>
      </div>
    </div>
  );
}
