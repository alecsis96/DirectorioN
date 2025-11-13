
import { auth, signInWithGoogle } from "../../firebaseConfig";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import BusinessCard from "../../components/BusinessCard";
import Link from "next/link";
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBusinesses, toNumber } from "../../lib/server/businessData";
import type { BusinessPreview, Business } from "../../types/business";
import { pickBusinessPreview } from "../../types/business";
import { sendEvent } from "../../lib/telemetry";
import { sliceBusinesses } from "../../lib/pagination";

const PAGE_SIZE = 20;
type SortMode = "destacado" | "rating" | "az";
const DEFAULT_ORDER: SortMode = "destacado";

function normalizeColonia(input?: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^yajalon\s+/, "");
}

const YAJALON_COLONIAS_LABELS = [
  "12 de Diciembre","Agua Fria","Amado Nervo","Barranca Nabil","Belen Ajkabalna","Belisario Dominguez",
  "Callejon Lorena Shashijo","Calvario Bahuitz","Calvario Bahuitz Ojo de Agua","Chitaltic","Chul-Ha","Cueva Joctiul",
  "Efigenia Chapoy","El Azufre","El Bosque","El Campo","El Delirio","El Milagro","Flamboyan","Flores","Jardines",
  "Jonuta","Jose Maria Morelos y Pavon (Taquinja)","La Aldea","La Belleza","La Candelaria","La Laguna",
  "Lazaro Cardenas","Linda Vista 1a. Seccion","Loma Bonita","Los Tulipanes","Lucio Blanco","Majasil",
  "Nueva Creacion","Nueva Esperanza","Saclumil Rosario II","San Antonio","San Fernando","San Jose Bunslac",
  "San Jose el Mirador","San Jose Paraiso","San Luis","San Martin","San Miguel","San Miguel Ojo de Agua",
  "San Pedro Buenavista","San Vicente","Santa Barbara","Santa Candelaria","Santa Elena","Santa Teresita",
  "Shashijo","Tzitzaquil","Vista Alegre","Centro"
];

const COLONIAS_NORM = YAJALON_COLONIAS_LABELS.map((label) => ({
  label,
  norm: normalizeColonia(label),
}));

function inferColoniaFromAddress(address?: string): string {
  if (!address) return "";
  const cleaned = normalizeColonia(address);
  for (const { norm } of COLONIAS_NORM) {
    if (norm && cleaned.includes(norm)) return norm;
  }
  const parts = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return "";
}

const SkeletonCard = () => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 animate-pulse">
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="h-4 w-16 rounded bg-gray-200" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-5 w-20 rounded-full bg-gray-200" />
        <div className="h-5 w-24 rounded-full bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-4 w-2/3 rounded bg-gray-200" />
      <div className="h-10 w-28 rounded bg-gray-200" />
    </div>
  </div>
);

const SkeletonList = ({ count }: { count: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={`skeleton-${index}`} />
    ))}
  </div>
);

type Filters = {
  category: string;
  colonia: string;
  order: SortMode;
  page: number;
};

const DEFAULT_FILTER_STATE: Filters = {
  category: "",
  colonia: "",
  order: DEFAULT_ORDER,
  page: 1,
};

type PageProps = {
  businesses: BusinessPreview[];
  categories: string[];
  colonias: string[];
  filters: Filters;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ query }) => {
  const category = typeof query.c === "string" ? query.c : "";
  const coloniaRaw = typeof query.co === "string" ? query.co : "";
  const colonia = normalizeColonia(coloniaRaw);
  const orderParam = typeof query.o === "string" ? (query.o as SortMode) : DEFAULT_ORDER;
  const order: SortMode = ["destacado", "rating", "az"].includes(orderParam) ? orderParam : DEFAULT_ORDER;
  const pageParam = Number.parseInt(typeof query.p === "string" ? query.p : "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const allBusinesses = await fetchBusinesses();

  const labelByNorm = new Map<string, string>();
  for (const { label, norm } of COLONIAS_NORM) {
    if (norm && !labelByNorm.has(norm)) labelByNorm.set(norm, label);
  }
  for (const biz of allBusinesses) {
    const raw = biz.colonia || biz.neighborhood || "";
    const norm = normalizeColonia(raw);
    if (norm && !labelByNorm.has(norm)) labelByNorm.set(norm, raw);
  }

  const colonias = Array.from(labelByNorm.values()).sort((a, b) => a.localeCompare(b, "es"));
  const categories = Array.from(new Set(allBusinesses.map((b) => b.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));

  const businesses: BusinessPreview[] = allBusinesses.map((biz) => {
    const preview = pickBusinessPreview(biz as Business);
    let resolvedColonia = normalizeColonia(preview.colonia);
    if (!resolvedColonia) {
      resolvedColonia = inferColoniaFromAddress(preview.address);
    }
    const displayColonia = resolvedColonia ? labelByNorm.get(resolvedColonia) || preview.colonia : preview.colonia;

    return {
      ...preview,
      colonia: displayColonia,
      rating: toNumber(preview.rating) ?? null,
    };
  });

  return {
    props: {
      businesses,
      categories,
      colonias,
      filters: {
        category,
        colonia,
        order,
        page,
      },
    },
  };
};

const ResultsPage: NextPage<PageProps> = (
  {
    businesses = [],
    categories = [],
    colonias = [],
    filters = DEFAULT_FILTER_STATE,
  }: PageProps = {
    businesses: [],
    categories: [],
    colonias: [],
    filters: DEFAULT_FILTER_STATE,
  }
) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [prefersDataSaver, setPrefersDataSaver] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pageViewType = router.pathname === "/" ? "home" : "list";

  useEffect(() => {
    sendEvent({ t: "pv", p: pageViewType });
  }, [pageViewType]);

  useEffect(() => {
    const body = {
      event: "home_render",
      payload: {
        page: pageViewType,
        filters,
      },
    };
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // silent swallow to keep home lightweight
    });
  }, [pageViewType, filters]);

  const [uiFilters, setUiFilters] = useState<Filters>(() => ({
    category: filters.category || "",
    colonia: filters.colonia || "",
    order: filters.order || DEFAULT_ORDER,
    page: filters.page || 1,
  }));

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection && typeof connection.saveData === "boolean") {
      setPrefersDataSaver(Boolean(connection.saveData));
    }
  }, []);

  const pushQuery = useCallback(
    (next: Filters) => {
      const query: Record<string, string> = {};
      if (next.category) query.c = next.category;
      if (next.colonia) query.co = next.colonia;
      if (next.order && next.order !== DEFAULT_ORDER) query.o = next.order;
      if (next.page > 1) query.p = String(next.page);
      setIsFetching(true);
      router.push({ pathname: "/negocios", query }, undefined, { shallow: true }).finally(() => setIsFetching(false));
    },
    [router]
  );

  const updateFilters = useCallback(
    (partial: Partial<Filters>, options?: { resetPage?: boolean }) => {
      setUiFilters((prev) => {
        const nextPage = options?.resetPage ? 1 : partial.page ?? prev.page;
        const next: Filters = {
          category: partial.category ?? prev.category,
          colonia: partial.colonia ?? prev.colonia,
          order: partial.order ?? prev.order,
          page: nextPage,
        };
        pushQuery(next);
        return next;
      });
    },
    [pushQuery]
  );

  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ category: event.target.value }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleColoniaChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ colonia: event.target.value }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleOrderChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      updateFilters({ order: event.target.value as SortMode }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleSignIn = useCallback(() => {
    signInWithGoogle().catch((error) => {
      console.error("sign-in", error);
    });
  }, []);

  const handleSignOut = useCallback(() => {
    signOut(auth).catch((error) => {
      console.error("sign-out", error);
    });
  }, []);

  const paginated = useMemo(() => {
    const normalizedColonia = uiFilters.colonia;
    const normalizedCategory = uiFilters.category;
    const filtered = businesses.filter((biz) => {
      if (normalizedCategory && biz.category !== normalizedCategory) return false;
      if (normalizedColonia && normalizeColonia(biz.colonia) !== normalizedColonia) return false;
      return true;
    });
    const sorted = [...filtered];
    if (uiFilters.order === "az") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else if (uiFilters.order === "rating") {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      sorted.sort((a, b) => {
        if (a.isOpen !== b.isOpen) {
          return a.isOpen === "si" ? -1 : 1;
        }
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }
    const pageCount = Math.max(1, uiFilters.page);
    const currentSlice = sliceBusinesses(sorted, pageCount, PAGE_SIZE);
    const previousEnd = (pageCount - 1) * PAGE_SIZE;
    const accumulated =
      pageCount > 1 ? sorted.slice(0, previousEnd).concat(currentSlice) : currentSlice;
    return {
      items: accumulated,
      total: sorted.length,
    };
  }, [businesses, uiFilters]);

  const hasMore = paginated.items.length < paginated.total;

  const handleLoadMore = useCallback(() => {
    if (isFetching || !hasMore) return;
    updateFilters({ page: uiFilters.page + 1 });
  }, [hasMore, isFetching, uiFilters.page, updateFilters]);

  useEffect(() => {
    if (prefersDataSaver || !hasMore) return;
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMore();
      }
    }, { rootMargin: "200px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [prefersDataSaver, hasMore, handleLoadMore]);

  const selectedColoniaLabel = useMemo(() => {
    if (!uiFilters.colonia) return "";
    const found = colonias.find((c) => normalizeColonia(c) === uiFilters.colonia);
    return found || uiFilters.colonia;
  }, [uiFilters.colonia, colonias]);

  const headingDescription = useMemo(() => {
    const parts: string[] = [];
    if (uiFilters.category) parts.push(uiFilters.category);
    if (uiFilters.colonia) parts.push(`en ${selectedColoniaLabel}`);
    if (!parts.length) {
      return "Explora comercios locales sin consumir datos extra.";
    }
    return `Resultados para ${parts.join(" ")}.`;
  }, [uiFilters.category, uiFilters.colonia, selectedColoniaLabel]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    console.info("home_render", { count: paginated.items.length, saveData: prefersDataSaver });
  }, [paginated.items.length, prefersDataSaver]);

  const showEmptyState = paginated.items.length === 0 && !isFetching;

  return (
    <>
      <Head>
        <title>Directorio Yajalon</title>
        <meta name="robots" content="index,follow" />
        <meta name="description" content={`Directorio optimizado para datos. ${headingDescription}`} />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800 font-sans">
        <section className="max-w-6xl mx-auto px-6 py-10">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#38761D] mb-3">Directorio de negocios en Yajalon</h1>
            <p className="text-base md:text-lg text-gray-600">{headingDescription}</p>
            {prefersDataSaver && (
              <p className="mt-2 text-xs text-gray-500">Modo ahorro de datos activo: evitamos imagenes y mapas embebidos.</p>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link prefetch={false} href="/para-negocios" className="inline-flex items-center justify-center gap-2 bg-[#38761D] text-white px-6 py-3 rounded-lg hover:bg-[#2f5a1a] transition font-semibold shadow-md">
                Registrar mi negocio
              </Link>
              <Link prefetch={false} href="/mis-solicitudes" className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md">
                Verificar mi solicitud
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs">Ya registraste tu negocio? Revisa el estado sin salir de esta pagina ligera.</span>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <button onClick={handleSignOut} className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                    Cerrar sesion
                  </button>
                </div>
              ) : (
                <button onClick={handleSignIn} className="rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]">
                  Iniciar sesion
                </button>
              )}
            </div>
          </header>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Categoria</label>
                <select value={uiFilters.category} onChange={handleCategoryChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40">
                  <option value="">Todas las categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Colonia</label>
                <select value={uiFilters.colonia} onChange={handleColoniaChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40">
                  <option value="">Todas las colonias</option>
                  {colonias.map((col) => (
                    <option key={col} value={normalizeColonia(col)}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ordenar por</label>
                <select value={uiFilters.order} onChange={handleOrderChange} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40">
                  <option value="destacado">Destacado</option>
                  <option value="rating">Mejor calificados</option>
                  <option value="az">A-Z</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {showEmptyState && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
                No encontramos negocios con los filtros seleccionados. Ajusta la busqueda para ver mas opciones.
              </div>
            )}

            {!showEmptyState && paginated.items.map((biz) => <BusinessCard key={biz.id} business={biz} />)}

            {isFetching && paginated.items.length === 0 && <SkeletonList count={3} />}
            {isFetching && paginated.items.length > 0 && <SkeletonList count={1} />}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isFetching}
                aria-label="Cargar mas resultados"
                className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-[#38761D] text-white text-sm font-semibold hover:bg-[#2f5a1a] transition disabled:opacity-50"
              >
                {isFetching ? "Cargando..." : "Cargar mas"}
              </button>
              {!prefersDataSaver && <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default ResultsPage;
