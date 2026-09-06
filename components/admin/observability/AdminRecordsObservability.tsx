'use client';

import { useMemo, useState } from 'react';
import {
  ATTENTION_LABELS,
  matchesApplicationFilter,
  matchesBusinessFilter,
  type AdminApplicationObservation,
  type AdminBusinessObservation,
  type ApplicationFilter,
  type BusinessFilter,
} from '../../../lib/adminObservability';

const applicationFilters: Array<[ApplicationFilter, string]> = [
  ['all', 'Todas'], ['new', 'Nuevas'], ['approved', 'Aprobadas'], ['needs_info', 'Necesita información'],
  ['rejected', 'Rechazadas'], ['deleted', 'Eliminadas'], ['attention', 'Requiere atención'],
];
const businessFilters: Array<[BusinessFilter, string]> = [
  ['all', 'Todos'], ['published', 'Publicados'], ['in_review', 'En revisión'], ['draft', 'Borradores'],
  ['hidden', 'Ocultos'], ['deleted', 'Eliminados'], ['ownerless', 'Sin propietario'], ['attention', 'Requiere atención'],
];

function Filters<T extends string>({ options, value, onChange }: {
  options: Array<[T, string]>; value: T; onChange: (value: T) => void;
}) {
  return <div className="flex flex-wrap gap-2" role="group">
    {options.map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)}
      aria-pressed={value === key}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${value === key ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
      {label}
    </button>)}
  </div>;
}

function Attention({ reasons }: { reasons: AdminApplicationObservation['attention'] }) {
  if (!reasons.length) return null;
  return <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
    {reasons.map(reason => <li key={reason}>• {ATTENTION_LABELS[reason]}</li>)}
  </ul>;
}

const includes = (values: Array<string | null>, search: string) =>
  !search || values.some(value => value?.toLowerCase().includes(search));

export default function AdminRecordsObservability({ applications, businesses }: {
  applications: AdminApplicationObservation[];
  businesses: AdminBusinessObservation[];
}) {
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all');
  const [businessFilter, setBusinessFilter] = useState<BusinessFilter>('all');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [businessSearch, setBusinessSearch] = useState('');
  const visibleApplications = useMemo(() => {
    const search = applicationSearch.trim().toLowerCase();
    return applications.filter(application => matchesApplicationFilter(application, applicationFilter) &&
      includes([application.id, application.businessName, application.email, application.businessId], search));
  }, [applicationFilter, applicationSearch, applications]);
  const visibleBusinesses = useMemo(() => {
    const search = businessSearch.trim().toLowerCase();
    return businesses.filter(business => matchesBusinessFilter(business, businessFilter) &&
      includes([business.id, business.businessName, business.email, business.sourceApplicationId], search));
  }, [businessFilter, businessSearch, businesses]);

  return <main className="space-y-10">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Diagnóstico de sólo lectura</p>
      <h1 className="mt-2 text-3xl font-bold text-[#38761D]">Observabilidad de registros</h1>
      <p className="mt-2 text-sm text-gray-600">Localiza todos los estados y relaciones sin cambiar Firestore.</p>
    </header>

    <section aria-labelledby="applications-title" className="space-y-4">
      <div>
        <h2 id="applications-title" className="text-2xl font-bold text-gray-900">Applications</h2>
        <p className="text-sm text-gray-500">{visibleApplications.length} de {applications.length} registros</p>
      </div>
      <Filters<ApplicationFilter> options={applicationFilters} value={applicationFilter} onChange={setApplicationFilter} />
      <input aria-label="Buscar applications" value={applicationSearch} onChange={event => setApplicationSearch(event.target.value)}
        placeholder="Buscar por ID, negocio o correo" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
      <div className="space-y-3">
        {visibleApplications.map(application => <article key={application.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{application.businessName}</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{application.status}</span>
          </div>
          <p className="mt-1 break-all font-mono text-xs text-gray-500">applications/{application.id}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-gray-500">Correo</dt><dd>{application.email || '—'}</dd></div>
            <div><dt className="text-gray-500">Business ID</dt><dd className="break-all">{application.businessId || '—'}</dd></div>
            <div><dt className="text-gray-500">Admin status</dt><dd>{application.adminStatus || '—'}</dd></div>
            <div><dt className="text-gray-500">Actualización</dt><dd>{application.updatedAt || application.createdAt || '—'}</dd></div>
          </dl>
          <Attention reasons={application.attention} />
        </article>)}
        {!visibleApplications.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No hay applications para este filtro.</p>}
      </div>
    </section>

    <section aria-labelledby="businesses-title" className="space-y-4">
      <div>
        <h2 id="businesses-title" className="text-2xl font-bold text-gray-900">Businesses</h2>
        <p className="text-sm text-gray-500">{visibleBusinesses.length} de {businesses.length} registros</p>
      </div>
      <Filters<BusinessFilter> options={businessFilters} value={businessFilter} onChange={setBusinessFilter} />
      <input aria-label="Buscar businesses" value={businessSearch} onChange={event => setBusinessSearch(event.target.value)}
        placeholder="Buscar por ID, negocio, correo o application" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm" />
      <div className="space-y-3">
        {visibleBusinesses.map(business => {
          const showLegacy = Boolean(business.legacyStatus && business.legacyStatus !== business.businessStatus);
          return <article key={business.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900">{business.businessName}</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{business.businessStatus}</span>
              {showLegacy && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">legacy: {business.legacyStatus}</span>}
              {!business.ownerPresent && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">Sin propietario</span>}
            </div>
            <p className="mt-1 break-all font-mono text-xs text-gray-500">businesses/{business.id}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-gray-500">Correo</dt><dd>{business.email || '—'}</dd></div>
              <div><dt className="text-gray-500">Visibility</dt><dd>{business.visibility || '—'}</dd></div>
              <div><dt className="text-gray-500">Source application</dt><dd className="break-all">{business.sourceApplicationId || '—'}</dd></div>
              <div><dt className="text-gray-500">Application status</dt><dd>{business.relatedApplicationStatus || '—'}</dd></div>
            </dl>
            <Attention reasons={business.attention} />
          </article>;
        })}
        {!visibleBusinesses.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No hay businesses para este filtro.</p>}
      </div>
    </section>
  </main>;
}
