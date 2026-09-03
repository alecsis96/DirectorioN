'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  adminArchiveBusiness,
  adminDeleteBusiness,
  adminMarkDuplicate,
  approveApplicationV2,
  approveBusiness,
  getAllBusinesses,
  getNewSubmissions,
  getNewApplicationV2Submissions,
  getPendingBusinesses,
  getPublishedBusinesses,
  getReadyForReview,
  getRejectedBusinesses,
  rejectBusiness,
  resendOwnershipInvitationV2,
  requestMoreInfo,
} from '../app/actions/adminBusinessActions';
import { useAuth } from '../hooks/useAuth';
import { buildApprovedApplicationWhatsAppUrl } from '../lib/adminApplicationContact';
import { getEffectivePlan, getPlanBadgeClasses, getPlanDisplayName } from '../lib/businessHelpers';
import type { Business } from '../types/business';

type TabType = 'nuevas' | 'pendientes' | 'listas' | 'publicados' | 'rechazados' | 'todos';
type CardVariant = 'review' | 'published' | 'incomplete';
type ApplicationRiskFilter = 'all' | 'flagged' | 'high' | 'pending';

type BusinessWithCompletion = Business & {
  completionPercent?: number;
  isPublishReady?: boolean;
  missingFields?: string[];
  businessStatus?: 'draft' | 'in_review' | 'published';
  applicationStatus?: 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
};

type ApplicationV2Submission = {
  id: string;
  applicationId: string;
  schemaVersion: 2;
  status: 'submitted' | 'approved';
  businessId?: string | null;
  ownershipInvitationStatus?: 'pending' | 'delivered' | 'failed';
  publicReference?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  business: {
    businessName: string;
    category?: string;
    phone?: string;
    whatsapp?: string;
  };
  riskAssessment?: {
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
    signals: Array<{
      code: 'contact_match' | 'name_category_match' | 'email_match';
      candidateType: 'application' | 'business';
      candidateId: string;
    }>;
  } | null;
};

const TAB_CONFIG: Array<{ id: TabType; label: string }> = [
  { id: 'nuevas', label: 'Nuevas' },
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'listas', label: 'Listas' },
  { id: 'publicados', label: 'Publicados' },
  { id: 'rechazados', label: 'Rechazados' },
  { id: 'todos', label: 'Todos' },
];

function resolvePrimaryStatus(business: BusinessWithCompletion) {
  if (business.applicationStatus === 'ready_for_review') {
    return { label: 'Listo para revisar', className: 'bg-blue-100 text-blue-700' };
  }
  if (business.applicationStatus === 'needs_info') {
    return { label: 'Necesita info', className: 'bg-orange-100 text-orange-700' };
  }
  if (business.businessStatus === 'published') {
    return { label: 'Publicado', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (business.applicationStatus === 'approved') {
    return { label: 'Aprobado · no publicado', className: 'bg-violet-100 text-violet-700' };
  }
  if (business.applicationStatus === 'rejected') {
    return { label: 'Rechazado', className: 'bg-red-100 text-red-700' };
  }
  if (business.businessStatus === 'in_review') {
    return { label: 'En revision', className: 'bg-sky-100 text-sky-700' };
  }
  return { label: 'Borrador', className: 'bg-gray-100 text-gray-700' };
}

function resolveCardVariant(tab: TabType, business: BusinessWithCompletion): CardVariant {
  if (tab === 'publicados' || business.businessStatus === 'published') {
    return 'published';
  }

  if (
    tab === 'rechazados' ||
    business.applicationStatus === 'needs_info' ||
    business.applicationStatus === 'rejected' ||
    ((business.missingFields?.length ?? 0) > 0 && !business.isPublishReady)
  ) {
    return 'incomplete';
  }

  return 'review';
}

function resolveContextLine(business: BusinessWithCompletion, variant: CardVariant) {
  if (variant === 'published') {
    return business.category || 'Negocio publicado';
  }

  if (variant === 'incomplete') {
    if (business.rejectionReason) return business.rejectionReason;
    if (business.missingFields?.length) return `Faltan ${business.missingFields.length} campos para publicarlo`;
    if (business.adminNotes) return business.adminNotes;
    return 'Hace falta ajustar informacion antes de seguir';
  }

  if (business.isPublishReady) return 'Listo para decision';
  if (business.category) return business.category;
  return `${business.completionPercent || 0}% completo`;
}

export default function AdminBusinessPanel() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('nuevas');
  const [businesses, setBusinesses] = useState<BusinessWithCompletion[]>([]);
  const [v2Applications, setV2Applications] = useState<ApplicationV2Submission[]>([]);
  const [riskFilter, setRiskFilter] = useState<ApplicationRiskFilter>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'reject' | 'info' | null;
    businessId: string | null;
    businessName: string;
  }>({
    type: null,
    businessId: null,
    businessName: '',
  });
  const [modalInput, setModalInput] = useState('');

  const loadBusinesses = useCallback(async () => {
    if (!isAdmin || !user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();
      let data: BusinessWithCompletion[] = [];

      switch (activeTab) {
        case 'nuevas':
          {
            const [legacy, applicationsV2] = await Promise.all([
              getNewSubmissions(token),
              getNewApplicationV2Submissions(token),
            ]);
            data = legacy;
            setV2Applications(applicationsV2 as ApplicationV2Submission[]);
          }
          break;
        case 'pendientes':
          data = await getPendingBusinesses(token);
          break;
        case 'listas':
          data = await getReadyForReview(token);
          break;
        case 'publicados':
          data = await getPublishedBusinesses(token);
          break;
        case 'rechazados':
          data = await getRejectedBusinesses(token);
          break;
        case 'todos':
          data = await getAllBusinesses(token);
          break;
      }

      if (activeTab !== 'nuevas') setV2Applications([]);

      setBusinesses(data);
    } catch (error) {
      console.error('Error al cargar negocios:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin, user]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
      return;
    }

    if (isAdmin) {
      loadBusinesses();
    }
  }, [authLoading, isAdmin, loadBusinesses, router]);

  const summary = useMemo(() => {
    const total = businesses.length + v2Applications.length;
    const ready = businesses.filter((business) => business.isPublishReady).length;
    return { total, ready };
  }, [businesses, v2Applications]);

  const filteredV2Applications = useMemo(() => {
    if (riskFilter === 'all') return v2Applications;
    if (riskFilter === 'pending') return v2Applications.filter((application) => !application.riskAssessment);
    if (riskFilter === 'high') {
      return v2Applications.filter((application) => application.riskAssessment?.riskLevel === 'high');
    }
    return v2Applications.filter((application) => (application.riskAssessment?.signals.length || 0) > 0);
  }, [riskFilter, v2Applications]);

  const handleApprove = async (businessId: string, businessName: string) => {
    if (!confirm(`Aprobar y publicar "${businessName}"?`)) return;

    setActionLoading(businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      await approveBusiness(businessId, token);
      await loadBusinesses();
    } catch (error) {
      console.error('Error al aprobar:', error);
      alert('No se pudo aprobar el negocio');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveV2 = async (application: ApplicationV2Submission) => {
    if (!confirm(`Aprobar "${application.business.businessName}" sin publicarlo todavía?`)) return;

    setActionLoading(application.applicationId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      const result = await approveApplicationV2(application.applicationId, token);
      setV2Applications((current) => current.map((item) =>
        item.applicationId === application.applicationId
          ? {
              ...item,
              status: 'approved',
              businessId: result.businessId,
              ownershipInvitationStatus: result.invitationStatus,
            }
          : item,
      ));
    } catch (error) {
      console.error('Error al aprobar solicitud v2:', error);
      alert(error instanceof Error ? error.message : 'No se pudo aprobar la solicitud');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvitationV2 = async (application: ApplicationV2Submission) => {
    if (!confirm(`Reemitir la invitación para "${application.business.businessName}"?`)) return;

    setActionLoading(application.applicationId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      const result = await resendOwnershipInvitationV2(application.applicationId, token);
      setV2Applications((current) => current.map((item) =>
        item.applicationId === application.applicationId
          ? { ...item, ownershipInvitationStatus: result.invitationStatus }
          : item,
      ));
    } catch (error) {
      console.error('Error al reenviar invitación v2:', error);
      alert(error instanceof Error ? error.message : 'No se pudo reenviar la invitación');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!modalState.businessId || modalInput.trim().length < 10) {
      alert('Escribe un motivo claro de al menos 10 caracteres.');
      return;
    }

    setActionLoading(modalState.businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      await rejectBusiness(modalState.businessId, modalInput.trim(), token);
      setModalState({ type: null, businessId: null, businessName: '' });
      setModalInput('');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al rechazar:', error);
      alert(error instanceof Error ? error.message : 'No se pudo rechazar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestInfo = async () => {
    if (!modalState.businessId || !modalInput.trim()) {
      alert('Escribe la nota para el negocio.');
      return;
    }

    setActionLoading(modalState.businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      await requestMoreInfo(modalState.businessId, modalInput.trim(), token);
      setModalState({ type: null, businessId: null, businessName: '' });
      setModalInput('');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al solicitar info:', error);
      alert('No se pudo solicitar informacion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (businessId: string, businessName: string) => {
    const reason = prompt(`Motivo para archivar "${businessName}"`, 'Accion administrativa');
    if (reason === null) return;

    setActionLoading(businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      const result = await adminArchiveBusiness(businessId, token, reason || undefined);
      if (!result.success) throw new Error(result.error || 'No se pudo archivar');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al archivar:', error);
      alert(error instanceof Error ? error.message : 'No se pudo archivar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkDuplicate = async (businessId: string, businessName: string) => {
    const canonicalId = prompt(`ID del negocio original para marcar "${businessName}" como duplicado`);
    if (!canonicalId?.trim()) return;

    setActionLoading(businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      const result = await adminMarkDuplicate(businessId, canonicalId.trim(), token);
      if (!result.success) throw new Error(result.error || 'No se pudo marcar duplicado');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al marcar duplicado:', error);
      alert(error instanceof Error ? error.message : 'No se pudo marcar duplicado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (businessId: string, businessName: string) => {
    const confirmText = prompt(`Para eliminar "${businessName}" escribe ELIMINAR`);
    if (confirmText !== 'ELIMINAR') return;

    setActionLoading(businessId);
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const token = await user.getIdToken();
      const result = await adminDeleteBusiness(businessId, token, 'Eliminado por admin desde solicitudes');
      if (!result.success) throw new Error(result.error || 'No se pudo eliminar');
      await loadBusinesses();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert(error instanceof Error ? error.message : 'No se pudo eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (!isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-red-600">Acceso denegado</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-gray-500">Operacion</p>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">Solicitudes</h1>
          <p className="text-sm text-gray-600">Revisa, corrige o publica en menos pasos. Cada tarjeta ya muestra solo la accion que toca.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-500">
            {summary.total} elementos
            {activeTab !== 'publicados' ? ` / ${summary.ready} listos para aprobar` : ''}
          </div>
        </div>

        {activeTab === 'nuevas' && v2Applications.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtrar solicitudes v2 por señales">
            {([
              ['all', 'Todas v2'],
              ['flagged', 'Con señales'],
              ['high', 'Riesgo alto'],
              ['pending', 'Análisis pendiente'],
            ] as Array<[ApplicationRiskFilter, string]>).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setRiskFilter(filter)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  riskFilter === filter
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="py-12 text-center text-gray-500">Cargando solicitudes...</div>
        ) : businesses.length === 0 && v2Applications.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-gray-700">No hay elementos en esta bandeja.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeTab === 'nuevas' && filteredV2Applications.length === 0 && businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 lg:col-span-2">
                No hay solicitudes v2 que coincidan con este filtro.
              </div>
            ) : null}
            {filteredV2Applications.map((application) => (
              <ApplicationV2Card
                key={application.applicationId}
                application={application}
                loading={actionLoading === application.applicationId}
                onApprove={() => handleApproveV2(application)}
                onResend={() => handleResendInvitationV2(application)}
              />
            ))}
            {businesses.map((business) => {
              const variant = resolveCardVariant(activeTab, business);
              const commonProps = {
                business,
                status: resolvePrimaryStatus(business),
                planClassName: getPlanBadgeClasses(getEffectivePlan(business)),
                planLabel: getPlanDisplayName(getEffectivePlan(business)),
                contextLine: resolveContextLine(business, variant),
                loading: actionLoading === business.id,
                onOpenDashboard: () => window.open(`/dashboard/${business.id}`, '_blank'),
                onApprove: () => handleApprove(business.id!, business.name || 'Negocio'),
                onReject: () => setModalState({ type: 'reject', businessId: business.id!, businessName: business.name || 'Negocio' }),
                onRequestInfo: () =>
                  setModalState({ type: 'info', businessId: business.id!, businessName: business.name || 'Negocio' }),
                onArchive: () => handleArchive(business.id!, business.name || 'Negocio'),
                onDuplicate: () => handleMarkDuplicate(business.id!, business.name || 'Negocio'),
                onDelete: () => handleDelete(business.id!, business.name || 'Negocio'),
              };

              if (variant === 'published') {
                return <PublishedCard key={business.id} {...commonProps} />;
              }

              if (variant === 'incomplete') {
                return <IncompleteCard key={business.id} {...commonProps} activeTab={activeTab} />;
              }

              return <ReviewCard key={business.id} {...commonProps} />;
            })}
          </div>
        )}
      </div>

      {modalState.type ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">
              {modalState.type === 'reject' ? 'Rechazar negocio' : 'Solicitar mas informacion'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{modalState.businessName}</p>

            <textarea
              value={modalInput}
              onChange={(event) => setModalInput(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder={modalState.type === 'reject' ? 'Motivo del rechazo' : 'Que necesita corregir o completar'}
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalState({ type: null, businessId: null, businessName: '' });
                  setModalInput('');
                }}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={modalState.type === 'reject' ? handleReject : handleRequestInfo}
                disabled={!modalInput.trim() || (modalState.type === 'reject' && modalInput.trim().length < 10)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white ${
                  modalState.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApplicationV2Card({
  application,
  loading,
  onApprove,
  onResend,
}: {
  application: ApplicationV2Submission;
  loading: boolean;
  onApprove: () => void;
  onResend: () => void;
}) {
  const business = application.business;
  const approved = application.status === 'approved' && Boolean(application.businessId);
  const whatsappUrl = approved ? buildApprovedApplicationWhatsAppUrl(application) : null;
  const risk = application.riskAssessment;
  const riskLabel = !risk
    ? 'Análisis pendiente'
    : risk.riskLevel === 'high'
      ? 'Riesgo alto · revisar duplicado'
      : risk.riskLevel === 'medium'
        ? 'Posible duplicado · revisar'
        : 'Sin coincidencias relevantes';
  const riskClassName = !risk
    ? 'bg-gray-100 text-gray-700'
    : risk.riskLevel === 'high'
      ? 'bg-red-100 text-red-800'
      : risk.riskLevel === 'medium'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-800';
  const invitationLabel = application.ownershipInvitationStatus === 'delivered'
    ? 'Invitación entregada'
    : application.ownershipInvitationStatus === 'failed'
      ? 'Invitación fallida'
      : 'Invitación pendiente';
  return (
    <article data-testid="application-v2-card" className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{business.businessName}</h3>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              {approved ? 'Solicitud v2 · Aprobada' : 'Solicitud v2 · Nueva'}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskClassName}`}>
              {riskLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{business.category || 'Sin categoría'}</p>
        </div>
        <span className="font-mono text-xs font-semibold text-gray-600">
          {application.publicReference || 'Sin folio'}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-gray-500">Responsable</dt>
          <dd className="font-semibold text-gray-900">{application.ownerName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Correo</dt>
          <dd className="break-all text-gray-800">{application.ownerEmail}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Teléfono responsable</dt>
          <dd className="text-gray-800">{application.ownerPhone}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">Negocio / WhatsApp</dt>
          <dd className="text-gray-800">{business.phone || business.whatsapp || 'No indicado'}</dd>
        </div>
      </dl>

      {risk?.signals.length ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Señales para revisión humana</p>
          <ul className="mt-1 space-y-1">
            {risk.signals.slice(0, 4).map((signal, index) => (
              <li key={`${signal.candidateType}-${signal.candidateId}-${signal.code}-${index}`}>
                {signal.code === 'contact_match'
                  ? 'Coincide un teléfono o WhatsApp'
                  : signal.code === 'name_category_match'
                    ? 'Coinciden nombre y categoría'
                    : 'Coincide el correo de contacto'}
                {' · '}
                {signal.candidateType === 'business' ? (
                  <a
                    href={`/dashboard/${signal.candidateId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                  >
                    Ver negocio candidato
                  </a>
                ) : (
                  <span>otra solicitud</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2">Estas señales no bloquean la aprobación ni prueban fraude.</p>
        </div>
      ) : null}

      {approved ? (
        <div className="mt-4 space-y-3">
          <div className={`rounded-xl border px-3 py-2 text-sm font-medium ${
            application.ownershipInvitationStatus === 'delivered'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : application.ownershipInvitationStatus === 'failed'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {invitationLabel}. El negocio sigue ownerless y oculto.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => window.open(`/dashboard/${application.businessId}`, '_blank')}
              className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Gestionar negocio
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={loading}
              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
            >
              {loading ? 'Procesando…' : 'Reenviar invitación'}
            </button>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Contactar por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Aprobar crea un negocio ownerless y oculto. Publicarlo será una decisión posterior.
          </div>
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Aprobando…' : 'Aprobar solicitud'}
          </button>
        </div>
      )}
    </article>
  );
}

type CardCommonProps = {
  business: BusinessWithCompletion;
  status: { label: string; className: string };
  planClassName: string;
  planLabel: string;
  contextLine: string;
  loading: boolean;
  onOpenDashboard: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function CardFrame({
  business,
  status,
  planClassName,
  planLabel,
  contextLine,
  tone,
  children,
  menu,
  note,
  dashboardLabel = 'Dashboard',
  onOpenDashboard,
}: CardCommonProps & {
  tone: 'review' | 'published' | 'incomplete';
  children: React.ReactNode;
  menu: React.ReactNode;
  note?: React.ReactNode;
  dashboardLabel?: string;
}) {
  const toneClass =
    tone === 'published'
      ? 'border-emerald-200 bg-emerald-50/30'
      : tone === 'incomplete'
        ? 'border-orange-200 bg-orange-50/30'
        : 'border-gray-200 bg-white';

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{business.name || 'Sin nombre'}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${planClassName}`}>{planLabel}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{contextLine}</p>
          {note ? <div className="mt-3">{note}</div> : null}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onOpenDashboard}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {dashboardLabel}
          </button>
          {menu}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </article>
  );
}

function ReviewCard(props: CardCommonProps) {
  return (
    <CardFrame
      {...props}
      tone="review"
      note={
        props.business.isPublishReady ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Listo para publicar</span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {props.business.completionPercent || 0}% completo
          </span>
        )
      }
      menu={<RequestMenu disabled={props.loading} onArchive={props.onArchive} onDuplicate={props.onDuplicate} onDelete={props.onDelete} />}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={props.onApprove}
          disabled={props.loading || !props.business.isPublishReady}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={props.onRequestInfo}
          disabled={props.loading}
          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          Pedir info
        </button>
        <button
          type="button"
          onClick={props.onReject}
          disabled={props.loading}
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </CardFrame>
  );
}

function PublishedCard(props: CardCommonProps) {
  return (
    <CardFrame
      {...props}
      tone="published"
      note={<span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Ya visible en la app</span>}
      dashboardLabel="Editar"
      menu={<RequestMenu disabled={props.loading} onArchive={props.onArchive} onDuplicate={props.onDuplicate} onDelete={props.onDelete} />}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={props.onOpenDashboard}
          disabled={props.loading}
          className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          Abrir dashboard
        </button>
        <button
          type="button"
          onClick={() => window.open(`/negocios/${props.business.id}`, '_blank')}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Ver publico
        </button>
      </div>
    </CardFrame>
  );
}

function IncompleteCard(props: CardCommonProps & { activeTab: TabType }) {
  const missingFields = props.business.missingFields || [];
  const note =
    missingFields.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {missingFields.slice(0, 3).map((field) => (
          <span key={field} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
            {field}
          </span>
        ))}
        {missingFields.length > 3 ? (
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">+{missingFields.length - 3} mas</span>
        ) : null}
      </div>
    ) : (
      <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
        Requiere seguimiento
      </span>
    );

  return (
    <CardFrame
      {...props}
      tone="incomplete"
      note={note}
      menu={<RequestMenu disabled={props.loading} onArchive={props.onArchive} onDuplicate={props.onDuplicate} onDelete={props.onDelete} />}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={props.onRequestInfo}
          disabled={props.loading}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Pedir info
        </button>
        {props.activeTab === 'rechazados' ? (
          <button
            type="button"
            onClick={props.onArchive}
            disabled={props.loading}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Archivar
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onReject}
            disabled={props.loading}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            Rechazar
          </button>
        )}
      </div>
    </CardFrame>
  );
}

function RequestMenu({
  disabled,
  onArchive,
  onDuplicate,
  onDelete,
}: {
  disabled: boolean;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        Mas
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
              className="w-full px-4 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
            >
              Marcar duplicado
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="w-full px-4 py-2 text-left text-sm text-orange-700 hover:bg-orange-50"
            >
              Archivar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
