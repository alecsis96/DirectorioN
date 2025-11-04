import { auth, signInWithGoogle } from '../../firebaseConfig';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import Link from "next/link";
import { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPhoneAlt, FaWhatsapp, FaMapMarkerAlt, FaStar } from "react-icons/fa";
import { fetchBusinesses, toNumber } from "../../lib/server/businessData";
import type { Business } from "../../types/business";

const DEFAULT_ORDER = "destacado";
const DISTANCE_OPTIONS = [0, 1, 3, 5, 10, 15];
const MINUTES_PER_DAY = 24 * 60;
const HOURS_TOKEN = /(\d{1,2})(?::(\d{2}))?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|am|pm)?/gi;

function timeStringToMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const normalized = raw
    .toLowerCase()
    .replace(/a\.?\s*m\.?/g, "am")
    .replace(/p\.?\s*m\.?/g, "pm")
    .replace(/\./g, "")
    .trim();

  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  hour = hour % 24;
  return hour * 60 + minute;
}

function extractScheduleTokens(hours: string | null | undefined): string[] {
  if (!hours) return [];
  return Array.from(hours.matchAll(HOURS_TOKEN)).map((match) => match[0]);
}

function formatMinutesLabel(totalMinutes: number): string {
  const normalized = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getScheduleStatus(hours: string | null | undefined, referenceMinutes: number): { isOpen: boolean; infoText: string } | null {
  const tokens = extractScheduleTokens(hours);
  if (tokens.length < 2) return null;

  const openMinutes = timeStringToMinutes(tokens[0]);
  const closeMinutes = timeStringToMinutes(tokens[1]);

  if (openMinutes == null || closeMinutes == null) return null;

  const spansMidnight = closeMinutes <= openMinutes;
  const isOpen = spansMidnight
    ? referenceMinutes >= openMinutes || referenceMinutes < closeMinutes
    : referenceMinutes >= openMinutes && referenceMinutes < closeMinutes;

  const infoText = isOpen
    ? `Cierra a las ${formatMinutesLabel(closeMinutes)}`
    : `Abre a las ${formatMinutesLabel(openMinutes)}`;

  return { isOpen, infoText };
}

/** Normaliza nombres de colonias para poder comparar sin acentos/variantes */
function normalizeColonia(input?: string): string {
  if (!input) return "";
  return input
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/\./g, "")            // quita puntos
    .replace(/\s+/g, " ")          // colapsa espacios
    .trim()
    .replace(/^yajalon\s+/, "");   // "yajalon centro" -> "centro"
}

/** Lista bonita para mostrar en el select */
const YAJALON_COLONIAS_LABELS = [
  "12 de Diciembre","Agua Fría","Amado Nervo","Barranca Nabil","Belén Ajkabalna","Belisario Domínguez",
  "Callejón Lorena Shashijá","Calvario Bahuitz","Calvario Bahuitz Ojo de Agua","Chitaltic","Chul-Ha","Cueva Joctiul",
  "Efigenia Chapoy","El Azufre","El Bosque","El Campo","El Delirio","El Milagro","Flamboyán","Flores","Jardines",
  "Jonuta","José María Morelos y Pavón (Taquinja)","La Aldea","La Belleza","La Candelaria","La Laguna",
  "Lázaro Cárdenas","Linda Vista 1a. Sección","Loma Bonita","Los Tulipanes","Lucio Blanco","Majasil",
  "Nueva Creación","Nueva Esperanza","Saclumil Rosario II","San Antonio","San Fernando","San José Bunslac",
  "San José el Mirador","San José Paraíso","San Luis","San Martín","San Miguel","San Miguel Ojo de Agua",
  "San Pedro Buenavista","San Vicente","Santa Bárbara","Santa Candelaria","Santa Elena","Santa Teresita",
  "Shashijá","Tzitzaquil","Vista Alegre","Centro"
];

/** Mapa label<->normalizada para búsquedas */
const COLONIAS_NORM = YAJALON_COLONIAS_LABELS.map(label => ({
  label,
  norm: normalizeColonia(label),
}));

/** Intenta inferir colonia desde la dirección (cuando no viene en el doc). */
function inferColoniaFromAddress(address?: string): string {
  if (!address) return "";
  const a = normalizeColonia(address);

  // 1) Coincidencia por inclusión: si la dirección contiene el nombre de la colonia
  for (const { norm } of COLONIAS_NORM) {
    if (norm && a.includes(norm)) return norm;
  }

  // 2) Heurística básica: tomar el segundo segmento después de una coma
  //    (ej: "Calle X, Jonuta, 29930 ..." -> "jonuta")
  const parts = a.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];

  return "";
}

type BusinessWithMeta = Business & {
  distanceKm: number | null;
  resolvedColonia: string; // colonia normalizada para comparar
};

type Filters = {
  category: string;
  colonia: string; // normalizada
  distance: number | null;
  order: string;
  lat: number | null;
  lng: number | null;
};

type PageProps = {
  businesses: BusinessWithMeta[];
  categories: string[];
  colonias: string[]; // labels bonitos
  filters: Filters;
};

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ query }) => {
  const category = typeof query.category === "string" ? query.category : "";
  const coloniaRaw = typeof query.colonia === "string" ? query.colonia : "";
  const colonia = normalizeColonia(coloniaRaw); // normalizamos lo que viene por URL
  const order = typeof query.order === "string" && query.order.length ? query.order : DEFAULT_ORDER;
  const distance = toNumber(query.distance);
  const originLat = toNumber(query.lat);
  const originLng = toNumber(query.lng);

  const allBusinesses = await fetchBusinesses();

  const businessesWithMeta: BusinessWithMeta[] = allBusinesses.map((biz) => {
    const lat = toNumber(biz.lat ?? biz.latitude ?? biz.location?.lat);
    const lng = toNumber(biz.lng ?? biz.longitude ?? biz.location?.lng);
    const distanceKm =
      originLat != null && originLng != null && lat != null && lng != null
        ? haversineDistanceKm(originLat, originLng, lat, lng)
        : null;

    // 1) normalizada por campo
    let resolvedColonia = normalizeColonia(biz.colonia || biz.neighborhood || "");
    // 2) si no vino, intenta deducirla desde la dirección
    if (!resolvedColonia) {
      resolvedColonia = inferColoniaFromAddress(biz.address);
    }

    return { ...biz, distanceKm, resolvedColonia };
  });

  const categories = Array.from(new Set(allBusinesses.map((b) => b.category).filter(Boolean))).sort();

  // Deduplca por versión normalizada y conserva el label bonito
  const labelByNorm = new Map<string, string>();
  for (const { label, norm } of COLONIAS_NORM) {
    if (norm && !labelByNorm.has(norm)) labelByNorm.set(norm, label);
  }
  // añade las colonias que lleguen desde los docs
  for (const b of businessesWithMeta) {
    const raw = b.colonia || b.neighborhood || "";
    const norm = normalizeColonia(raw);
    if (norm && !labelByNorm.has(norm)) labelByNorm.set(norm, raw);
  }
  const colonias = Array.from(labelByNorm.values()).sort((a, b) => a.localeCompare(b, "es"));

  // Filtrado usando la colonia normalizada
  let filtered = businessesWithMeta.filter((biz) => {
    if (category && biz.category !== category) return false;
    if (colonia && biz.resolvedColonia !== colonia) return false;
    if (distance != null) {
      if (distance === 0) {
        if (biz.distanceKm == null) return false;
      } else {
        if (biz.distanceKm == null || biz.distanceKm > distance) return false;
      }
    }
    return true;
  });

  // Orden
  filtered = filtered.sort((a, b) => {
    if (order === "distance") {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    }
    if (order === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    
    // Orden por defecto "destacado": priorizar por plan (sponsor > featured > free)
    const getPlanPriority = (biz: any) => {
      const plan = biz.plan || 'free';
      if (plan === 'sponsor') return 3;
      if (plan === 'featured') return 2;
      return 1;
    };
    
    const aPlan = getPlanPriority(a);
    const bPlan = getPlanPriority(b);
    if (aPlan !== bPlan) return bPlan - aPlan;
    
    // Si tienen el mismo plan, ordenar por rating
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return {
    props: {
      businesses: filtered,
      categories,
      colonias,
      filters: {
        category,
        colonia, // normalizada
        distance: distance ?? null,
        order,
        lat: originLat,
        lng: originLng,
      },
    },
  };
};

const ResultsPage: NextPage<PageProps> = ({ businesses, categories, colonias, filters }) => {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const router = useRouter();
  const [geoError, setGeoError] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(() => getCurrentMinutes());

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => setNowMinutes(getCurrentMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleUpdate = useCallback(
    (next: Partial<Record<string, string | number | null>>) => {
      const current = { ...router.query } as Record<string, string>;
      Object.entries(next).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          delete current[key];
        } else {
          current[key] = String(value);
        }
      });
      router.push({ pathname: "/negocios", query: current }, undefined, { shallow: false });
    },
    [router]
  );

  const handleCategoryChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ category: event.target.value, page: null });
    },
    [handleUpdate]
  );

  const handleColoniaChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      // value viene normalizado (opciones usan normalizeColonia)
      handleUpdate({ colonia: event.target.value, page: null });
    },
    [handleUpdate]
  );

  const handleOrderChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ order: event.target.value });
    },
    [handleUpdate]
  );

  const handleDistanceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      handleUpdate({ distance: value.length ? Number(value) : null });
    },
    [handleUpdate]
  );

  const handleUseLocation = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalizacion.");
      return;
    }
    setGeoError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        handleUpdate({ lat: latitude.toFixed(6), lng: longitude.toFixed(6) });
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos obtener tu ubicacion.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [handleUpdate]);

  const handleSignIn = useCallback(() => {
    signInWithGoogle().catch((error) => {
      console.error('Sign-in error', error);
    });
  }, []);

  const handleSignOut = useCallback(() => {
    signOut(auth).catch((error) => {
      console.error('Sign-out error', error);
    });
  }, []);

  // Mostrar un label bonito para la colonia seleccionada
  const selectedColoniaLabel = useMemo(() => {
    if (!filters.colonia) return "";
    const found = colonias.find(c => normalizeColonia(c) === filters.colonia);
    return found || filters.colonia;
  }, [filters.colonia, colonias]);

  const headingDescription = useMemo(() => {
    const parts: string[] = [];
    if (filters.category) parts.push(filters.category);
    if (filters.colonia) parts.push(`en ${selectedColoniaLabel}`);
    if (!parts.length) {
      return "Explora negocios locales destacados, restaurantes, servicios mas cerca de ti en Yajalon.";
    }
    return `Resultados para ${parts.join(" ")}.`;
  }, [filters.category, filters.colonia, selectedColoniaLabel]);

  return (
    <>
      <Head>
        <title>Negocios en Yajalon | Resultados y filtros</title>
        <meta
          name="description"
          content={`Directorio de negocios locales en Yajalon. ${headingDescription} Filtra por categoria, colonia o distancia y descubre comercios destacados.`}
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
        <section className="max-w-6xl mx-auto px-6 py-10">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#38761D] mb-3">
              Directorio de negocios en Yajalon
            </h1>
            <p className="text-base md:text-lg text-gray-600">{headingDescription}</p>
            
            {/* Botones de acción principales */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/para-negocios"
                className="inline-flex items-center justify-center gap-2 bg-[#38761D] text-white px-6 py-3 rounded-lg hover:bg-[#2f5a1a] transition font-semibold shadow-md"
              >
                <span>📝</span>
                <span>Registrar mi negocio</span>
              </Link>
              <Link
                href="/mis-solicitudes"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
              >
                <span>🔍</span>
                <span>Verificar mi solicitud</span>
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs">
                ¿Ya registraste tu negocio? Verifica el estado de tu solicitud
              </span>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cerrar sesion
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="rounded bg-[#38761D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2f5a1a]"
                >
                  Iniciar sesion
                </button>
              )}
            </div>
          </header>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Categoria
                </label>
                <select
                  value={filters.category}
                  onChange={handleCategoryChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40"
                >
                  <option value="">Todas las categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Colonia
                </label>
                <select
                  value={filters.colonia /* normalizada */}
                  onChange={handleColoniaChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40"
                >
                  <option value="">Todas las colonias</option>
                  {colonias.map((col) => (
                    <option key={col} value={normalizeColonia(col)}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Distancia
                </label>
                <select
                  value={filters.distance != null ? String(filters.distance) : ""}
                  onChange={handleDistanceChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40"
                >
                  <option value="">Sin filtro</option>
                  {DISTANCE_OPTIONS.map((km) => (
                    <option key={km} value={km}>
                      {km === 0 ? "Solo con coordenadas" : `Hasta ${km} km`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="mt-2 text-xs text-[#38761D] underline"
                  disabled={locating}
                >
                  {locating ? "Obteniendo ubicacion..." : "Usar mi ubicacion"}
                </button>
                {geoError && <p className="mt-1 text-xs text-red-500">{geoError}</p>}
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Ordenar por
                </label>
                <select
                  value={filters.order}
                  onChange={handleOrderChange}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D]/40"
                >
                  <option value="destacado">Destacado</option>
                  <option value="rating">Mejor calificados</option>
                  <option value="distance">Mas cercanos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {businesses.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-6 text-center">
                No encontramos negocios con los filtros seleccionados. Intenta ajustar la busqueda o reiniciar los filtros.
              </div>
            )}

            {businesses.map((biz) => {
              const displayDistance = biz.distanceKm != null ? `${biz.distanceKm.toFixed(1)} km` : null;
              const mapsHref =
                biz.lat != null && biz.lng != null
                  ? `https://www.google.com/maps/search/?api=1&query=${biz.lat},${biz.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.address ?? biz.name)}`;
              const scheduleStatus = getScheduleStatus(biz.hours ?? null, nowMinutes);
              const derivedIsOpen = scheduleStatus?.isOpen ?? (biz.isOpen === "si");
              const statusClass = derivedIsOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
              const statusLabel = derivedIsOpen ? "Abierto" : "Cerrado";
              const statusInfoText = scheduleStatus?.infoText ?? null;
              const detailHref = { pathname: "/negocios/[id]", query: { id: biz.id } };
              return (
                <article
                  key={biz.id}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row gap-6"
                >
                  <Link href={detailHref} className="flex-1 group">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-800 group-hover:text-[#38761D] transition-colors">
                        {biz.name}
                      </h2>
                      {biz.featured === "si" && (
                        <span className="inline-flex items-center text-xs font-semibold bg-yellow-200 text-yellow-900 px-2 py-1 rounded-full">
                          Destacado
                        </span>
                      )}
                      {displayDistance && (
                        <span className="inline-flex items-center text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {displayDistance}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                      {biz.category && <span className="bg-gray-100 px-3 py-1 rounded-full">{biz.category}</span>}
                      {biz.resolvedColonia && (
                        <span className="bg-gray-100 px-3 py-1 rounded-full">
                          {(() => {
                            const label = colonias.find(c => normalizeColonia(c) === biz.resolvedColonia);
                            return label || (biz.colonia || biz.neighborhood || "—");
                          })()}
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {statusInfoText && <span className="text-xs text-gray-500">{statusInfoText}</span>}
                      </div>
                      <span className="flex items-center gap-1 text-yellow-500">
                        <FaStar />
                        <span className="text-sm font-semibold text-gray-700">{Number(biz.rating).toFixed(1)}</span>
                      </span>
                    </div>
                    {biz.address && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong className="font-semibold">Direccion:</strong> {biz.address}
                      </p>
                    )}
                    {biz.hours && (
                      <p className="text-sm text-gray-600 mb-4">
                        <strong className="font-semibold">Horario:</strong> {biz.hours}
                      </p>
                    )}
                    {biz.description && (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line overflow-hidden max-h-24">
                        {biz.description}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-semibold text-[#38761D] group-hover:underline">Ver detalles del negocio</p>
                  </Link>
                  <div className="flex flex-col gap-3 md:w-48">
                    <a
                      href={`tel:${biz.phone}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                    >
                      <FaPhoneAlt /> Llamar
                    </a>
                    <a
                      href={`https://wa.me/521${biz.WhatsApp}?text=${encodeURIComponent(
                        'Hola, vi tu negocio en el Directorio Yajalón y me gustaría más información.'
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition"
                    >
                      <FaWhatsapp /> WhatsApp
                    </a>
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
                    >
                      <FaMapMarkerAlt /> Como llegar
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
};

export default ResultsPage;



