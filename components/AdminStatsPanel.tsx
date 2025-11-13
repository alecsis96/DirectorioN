import React, { useEffect, useMemo, useRef, useState } from "react";

type SummaryResponse = {
  range: { from: string; to: string };
  pageviewsByPage: Record<"home" | "list" | "detail", number>;
  ctaCounts: Record<"call" | "wa" | "maps" | "fb", number>;
  manageOpens: number;
  reviews: { count: number; avgRating: number };
  conversions: { appApprovedCount: number };
  topBusinesses: {
    detail: { businessId: string; count: number }[];
    ctas: { businessId: string; count: number }[];
  };
};

const RANGE_OPTIONS: number[] = [7, 14, 30];

const readSaveDataPreference = () => {
  if (typeof navigator === "undefined") return false;
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  return Boolean(connection?.saveData);
};

const SkeletonBlock = () => (
  <div className="animate-pulse space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-4">
    <div className="h-4 w-32 rounded bg-gray-200" />
    <div className="h-3 w-full rounded bg-gray-200" />
    <div className="h-3 w-2/3 rounded bg-gray-200" />
  </div>
);

const barWidth = (value: number, max: number) => `${Math.min(100, max === 0 ? 0 : (value / max) * 100)}%`;

type StatBarProps = {
  label: string;
  value: number;
  max: number;
  color: string;
};

const StatBar = ({ label, value, max, color }: StatBarProps) => (
  <div>
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
    <div className="mt-1 h-2 rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: barWidth(value, max) }} aria-hidden="true" />
    </div>
  </div>
);

type TopListProps = {
  title: string;
  items: { businessId: string; count: number }[];
};

const TopList = ({ title, items }: TopListProps) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <span className="text-xs text-gray-400">Top 10</span>
    </div>
    {items.length === 0 ? (
      <p className="text-sm text-gray-500">Sin datos en el rango seleccionado.</p>
    ) : (
      <ol className="space-y-2 text-sm text-gray-700">
        {items.map((item, index) => (
          <li key={`${title}-${item.businessId}-${index}`} className="flex items-center justify-between">
            <span className="truncate">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                {index + 1}
              </span>
              {item.businessId}
            </span>
            <span className="font-semibold text-gray-900">{item.count}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export default function AdminStatsPanel() {
  const [rangeDays, setRangeDays] = useState<number>(RANGE_OPTIONS[0]);
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<number, SummaryResponse>>({});
  const [saveData, setSaveData] = useState(readSaveDataPreference);

  useEffect(() => {
    const connection =
      typeof navigator !== "undefined"
        ? (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
        : null;
    const updatePreference = () => setSaveData(readSaveDataPreference());
    if (connection?.addEventListener) {
      connection.addEventListener("change", updatePreference);
      return () => connection.removeEventListener("change", updatePreference);
    }
    return undefined;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = cacheRef.current[rangeDays];
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/telemetry/summary?range=${rangeDays}`, {
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error((detail as any)?.error || "No se pudo cargar el resumen");
        }
        return (res.json() as Promise<SummaryResponse>);
      })
      .then((payload) => {
        if (cancelled) return;
        cacheRef.current[rangeDays] = payload;
        setData(payload);
      })
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        setError(err.message || "Error al cargar resumen de telemetria");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rangeDays]);

  const pageviewEntries = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Home", value: data.pageviewsByPage.home, color: "bg-emerald-500" },
      { label: "Listado", value: data.pageviewsByPage.list, color: "bg-lime-500" },
      { label: "Detalle", value: data.pageviewsByPage.detail, color: "bg-teal-500" },
    ];
  }, [data]);

  const ctaEntries = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Llamar", value: data.ctaCounts.call, color: "bg-green-500" },
      { label: "WhatsApp", value: data.ctaCounts.wa, color: "bg-emerald-400" },
      { label: "Como llegar", value: data.ctaCounts.maps, color: "bg-sky-400" },
      { label: "Facebook", value: data.ctaCounts.fb, color: "bg-blue-500" },
    ];
  }, [data]);

  const maxPageviews = useMemo(() => Math.max(1, ...pageviewEntries.map((entry) => entry.value)), [pageviewEntries]);
  const maxCtas = useMemo(() => Math.max(1, ...ctaEntries.map((entry) => entry.value)), [ctaEntries]);

  return (
    <section className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Monitoreo ligero</p>
            <h2 className="text-2xl font-semibold text-gray-900">Estadisticas</h2>
            {data && (
              <p className="text-sm text-gray-500">
                Rango {data.range.from} → {data.range.to}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={`range-${option}`}
                type="button"
                aria-pressed={rangeDays === option}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  rangeDays === option ? "bg-[#38761D] text-white" : "bg-gray-100 text-gray-600"
                }`}
                onClick={() => setRangeDays(option)}
              >
                Ultimos {option}d
              </button>
            ))}
          </div>
        </div>
        {saveData && (
          <p className="text-xs text-amber-600">
            Modo ahorro de datos activo: el panel solo consulta al cambiar el rango seleccionado.
          </p>
        )}
      </header>

      {error && <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
      ) : (
        data && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800">Pageviews</h3>
                <div className="mt-4 space-y-3">
                  {pageviewEntries.map((entry) => (
                    <StatBar key={entry.label} label={entry.label} value={entry.value} max={maxPageviews} color={entry.color} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800">Clicks en CTA</h3>
                <div className="mt-4 space-y-3">
                  {ctaEntries.map((entry) => (
                    <StatBar key={entry.label} label={entry.label} value={entry.value} max={maxCtas} color={entry.color} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Gestionar negocio</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{data.manageOpens}</p>
                <p className="text-xs text-gray-500">Veces que dueños/admin abren el dashboard.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Reseñas</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{data.reviews.count}</p>
                <p className="text-xs text-gray-500">Promedio {data.reviews.avgRating.toFixed(1)} ★</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Solicitudes → Negocios</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{data.conversions.appApprovedCount}</p>
                <p className="text-xs text-gray-500">Conversiones aprobadas por administradores.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TopList title="Top detalle (PV)" items={data.topBusinesses.detail} />
              <TopList title="Top CTAs" items={data.topBusinesses.ctas} />
            </div>
          </div>
        )
      )}
    </section>
  );
}
