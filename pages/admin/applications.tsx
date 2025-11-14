// pages/admin/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { auth, signInWithGoogle } from "../../firebaseConfig";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import AdminStatsPanel from "../../components/AdminStatsPanel";

/* ----------------------------
   Tipos mínimos (ajústalos si tus APIs devuelven campos extra)
   ---------------------------- */
type ApplicationItem = {
  uid: string;
  status: "pending" | "approved" | "rejected";
  businessName: string;
  plan: "free" | "featured" | "sponsor" | string;
  ownerName: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type BusinessListItem = {
  id: string;
  name: string;
  plan: "free" | "featured" | "sponsor" | string;
  status: "approved" | "pending" | "rejected" | "draft" | string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  category: string;
  address: string;
  featured: "si" | "no" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type BusinessFormState = {
  name: string;
  category: string;
  address: string;
  description: string;
  phone: string;
  WhatsApp: string;
  Facebook: string;
  hours: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  plan: "free" | "featured" | "sponsor" | string;
  featured: "si" | "no" | string;
  isOpen: "si" | "no" | string;
  status: "approved" | "pending" | "rejected" | "draft" | string;
  lat: string;
  lng: string;
};

/* ----------------------------
   Utils
   ---------------------------- */
const inputBase =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-[#38761D] focus:outline-none focus:ring-2 focus:ring-[#38761D]/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

const selectBase = inputBase;
const areaBase = inputBase;

function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "indigo" | "purple";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    brand: "bg-[#38761D]/15 text-[#2f5a1a]",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

function Toast({ kind = "info", text }: { kind?: "info" | "success" | "error"; text: string }) {
  const map = {
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-green-200 bg-green-50 text-green-700",
    error: "border-red-200 bg-red-50 text-red-700",
  };
  return <div className={`rounded border px-3 py-2 text-xs ${map[kind]}`}>{text}</div>;
}

function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function useAuthAdmin() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        if (mounted) {
          setIsAdmin(false);
          setChecking(false);
        }
        return;
      }
      try {
        const tr = await user.getIdTokenResult();
        const admin = tr.claims?.admin === true;
        if (mounted) {
          setIsAdmin(!!admin);
        }
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  return { user, isAdmin, checking };
}

/* ----------------------------
   Panel principal con tabs
   ---------------------------- */
export default function AdminHome() {
  const { user, isAdmin, checking } = useAuthAdmin();
  const [tab, setTab] = useState<"apps" | "biz" | "stats" | "settings">("apps");
  const [banner, setBanner] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);

  return (
    <>
      <Head>
        <title>Admin | Directorio Yajalón</title>
      </Head>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 rounded-3xl bg-gradient-to-r from-[#2f5a1a] via-[#38761D] to-[#5a882f] px-6 py-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">Panel de control</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight">Administración</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Gestiona solicitudes, negocios y configuración desde un solo lugar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <>
                  <span className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white/75">
                    {user.email}
                  </span>
                  <button
                    onClick={() => signOut(auth)}
                    className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/20"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#2f5a1a] shadow-sm transition hover:bg-gray-100"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>

          <nav className="mt-5 flex gap-2">
            {([
              { key: "apps", label: "Solicitudes" },
              { key: "biz", label: "Negocios" },
              { key: "stats", label: "Estadisticas" },
              { key: "settings", label: "Configuración" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-white/10 text-white/85"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {banner && (
          <div className="mb-4">
            <Toast kind={banner.kind} text={banner.text} />
          </div>
        )}

        {checking && <p className="text-gray-500">Verificando permisos</p>}
        {!checking && !user && <p className="text-gray-500">Inicia sesión para continuar.</p>}
        {!checking && user && !isAdmin && (
          <p className="rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            Tu cuenta no tiene permisos de administrador.
          </p>
        )}

        {!checking && user && isAdmin && (
          <>
            {tab === "apps" && <ApplicationsPanel setBanner={setBanner} />}
            {tab === "biz" && <BusinessesPanel setBanner={setBanner} />}
            {tab === "stats" && <AdminStatsPanel />}
            {tab === "settings" && <SettingsPanel />}
          </>
        )}
      </main>
    </>
  );
}

/* ----------------------------
   Solicitudes (Applications)
   ---------------------------- */
function ApplicationsPanel({
  setBanner,
}: {
  setBanner: (b: { kind: "info" | "success" | "error"; text: string } | null) => void;
}) {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "approved" | "rejected">("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/applications/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudieron obtener las solicitudes");
      setItems((data as { applications: ApplicationItem[] })?.applications || []);
    } catch (e: any) {
      setBanner({ kind: "error", text: e.message || "Error al cargar solicitudes" });
    } finally {
      setLoading(false);
    }
  }, [q, status, page, setBanner]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "pending").length;
    const approved = items.filter((i) => i.status === "approved").length;
    return { total, pending, approved };
  }, [items]);

  async function handleStatus(uid: string, next: ApplicationItem["status"]) {
  const user = auth.currentUser;
  if (!user) return;

  const confirmText =
    next === "approved"
      ? "¿Seguro que quieres aprobar esta solicitud?"
      : next === "rejected"
      ? "¿Seguro que quieres rechazar esta solicitud?"
      : "¿Seguro que quieres devolver a pendiente?";

  if (!window.confirm(confirmText)) return;

  let notes: string | undefined;
  if (next === "rejected") {
    notes = window.prompt("Motivo del rechazo (opcional):") || undefined;
  }
setBanner({ kind: "success", text: `Solicitud ${uid} aprobada. Se creó el negocio en borrador.` });

  try {
    setActioning((prev) => ({ ...prev, [uid]: true }));
    const token = await user.getIdToken();

    if (next === "approved") {
      // ?? LLAMA AL ENDPOINT CORRECTO Y CON EL NOMBRE CORRECTO DEL CAMPO
      const res = await fetch("/api/admin/applications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: uid, removeSource: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudo aprobar la solicitud");

      setBanner({ kind: "success", text: `Solicitud ${uid} aprobada y movida a negocios.` });

      // ?? Refresca solicitudes y avisa a la pestaña de negocios
      await load();
      window.dispatchEvent(new CustomEvent("biz:refresh"));
      return;
    }

    // Para pending/rejected se mantiene el flujo original
    const res = await fetch("/api/admin/applications/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid, status: next, notes }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data as any)?.error || "No se pudo actualizar la solicitud");

    setBanner({ kind: "success", text: `Solicitud ${uid} actualizada a ${next}.` });
    await load();
  } catch (e: any) {
    setBanner({ kind: "error", text: e.message || "Error aplicando cambio" });
  } finally {
    setActioning((prev) => ({ ...prev, [uid]: false }));
  }
}



  async function handleDelete(uid: string) {
    const user = auth.currentUser;
    if (!user) return;
    if (!window.confirm("¿Eliminar negocio y solicitud? Esta acción no se puede deshacer.")) return;
    try {
      setActioning((prev) => ({ ...prev, [uid]: true }));
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/applications/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudo eliminar");
      setBanner({ kind: "success", text: `Eliminado ${uid}.` });
      await load();
    } catch (e: any) {
      setBanner({ kind: "error", text: e.message || "Error al eliminar" });
    } finally {
      setActioning((prev) => ({ ...prev, [uid]: false }));
    }
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Buscar (nombre, email, negocio)"
          className={inputBase}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as any);
          }}
          className={selectBase}
        >
          <option value="">Estado: todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada</option>
          <option value="rejected">Rechazada</option>
        </select>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Total: {totals.total}</Badge>
          <Badge tone="warning">Pendientes: {totals.pending}</Badge>
          <Badge tone="success">Aprobadas: {totals.approved}</Badge>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full bg-[#38761D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2f5a1a] disabled:opacity-60"
          >
            {loading ? "Actualizando" : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-900 text-left text-xs uppercase tracking-wider text-white">
            <tr>
              <th className="px-5 py-3 font-semibold">Solicitante</th>
              <th className="px-5 py-3 font-semibold">Negocio</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Actualizado</th>
              <th className="px-5 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white/90 backdrop-blur">
            {items.map((app) => {
              const busy = !!actioning[app.uid];
              return (
                <tr key={app.uid} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{app.ownerName || "Sin nombre"}</div>
                    <div className="text-xs text-gray-500">{app.email}</div>
                    {app.phone && <div className="text-xs text-gray-500">{app.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{app.businessName || "Sin nombre"}</div>
                    {app.notes && <div className="text-xs text-gray-500">Notas: {app.notes}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">{app.plan}</td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {app.status === "approved" ? (
                      <Badge tone="success">Aprobada</Badge>
                    ) : app.status === "rejected" ? (
                      <Badge tone="danger">Rechazada</Badge>
                    ) : (
                      <Badge tone="warning">Pendiente</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {app.updatedAt ? new Date(app.updatedAt).toLocaleString() : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        disabled={busy || app.status === "approved"}
                        onClick={() => handleStatus(app.uid, "approved")}
                      >
                        Aprobar
                      </button>
                      <button
                        className="rounded bg-yellow-500 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
                        disabled={busy || app.status === "pending"}
                        onClick={() => handleStatus(app.uid, "pending")}
                      >
                        Pendiente
                      </button>
                      <button
                        className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        disabled={busy || app.status === "rejected"}
                        onClick={() => handleStatus(app.uid, "rejected")}
                      >
                        Rechazar
                      </button>
                      <button
                        className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => handleDelete(app.uid)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  No hay solicitudes con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación simple (cliente/servidor-ready) */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-xs text-gray-600">Página {page}</span>
        <button
          disabled={loading || items.length < limit}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}

/* ----------------------------
   Negocios (lista + drawer edición)
   ---------------------------- */
function BusinessesPanel({
  
  setBanner,
}: {
  setBanner: (b: { kind: "info" | "success" | "error"; text: string } | null) => void;
}) {
  const [items, setItems] = useState<BusinessListItem[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [plan, setPlan] = useState("");
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessFormState>(() => emptyBusinessForm());

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category.trim()) params.set("category", category.trim());
      if (plan.trim()) params.set("plan", plan.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/admin/businesses/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudieron obtener los negocios");
      setItems((data as { businesses: BusinessListItem[] })?.businesses || []);
    } catch (e: any) {
      setBanner({ kind: "error", text: e.message || "Error al cargar negocios" });
    } finally {
      setLoading(false);
    }
  }, [q, category, plan, page, setBanner]);

  useEffect(() => {
  const onRefresh = () => load();
  window.addEventListener("biz:refresh", onRefresh);
  return () => window.removeEventListener("biz:refresh", onRefresh);
}, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const openDrawerFor = useCallback(async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setDrawerBusy(true);
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/businesses/manage?businessId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudo cargar el negocio");
      const biz = (data as { business?: any })?.business || {};
      setForm(toForm(biz));
      setEditId(id);
      setDrawerOpen(true);
    } catch (e: any) {
      setBanner({ kind: "error", text: e.message || "Error al abrir edición" });
    } finally {
      setDrawerBusy(false);
    }
  }, [setBanner]);

  const createNew = useCallback(() => {
    setEditId(null);
    setForm(emptyBusinessForm());
    setDrawerOpen(true);
  }, []);

  const save = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setDrawerBusy(true);
      const token = await user.getIdToken();
      // Validación mínima
      if (!form.name.trim()) throw new Error("El nombre del negocio es obligatorio.");
      if (!form.category.trim()) throw new Error("La categoría es obligatoria.");

      // Normaliza lat/lng
      const lat = form.lat.trim() ? Number(form.lat.replace(",", ".")) : null;
      const lng = form.lng.trim() ? Number(form.lng.replace(",", ".")) : null;
      if (lat !== null && !Number.isFinite(lat)) throw new Error("Latitud inválida.");
      if (lng !== null && !Number.isFinite(lng)) throw new Error("Longitud inválida.");

      const body = {
        businessId: editId || undefined,
        data: {
          name: form.name.trim(),
          category: form.category.trim(),
          address: form.address.trim(),
          description: form.description.trim(),
          phone: form.phone.trim(),
          WhatsApp: form.WhatsApp.trim(),
          Facebook: form.Facebook.trim(),
          hours: form.hours.trim(),
          ownerId: form.ownerId.trim(),
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          plan: form.plan || "free",
          featured: form.featured || "no",
          isOpen: form.isOpen || "si",
          status: form.status || "approved",
          lat,
          lng,
          location: lat === null || lng === null ? null : undefined,
        },
      };

      const res = await fetch("/api/admin/businesses/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as any)?.error || "No se pudo guardar");

      setBanner({
        kind: "success",
        text: editId ? "Negocio actualizado." : `Negocio creado (ID ${(data as any)?.businessId || ""}).`,
      });
      setDrawerOpen(false);
      setEditId(null);
      await load();
    } catch (e: any) {
      setBanner({ kind: "error", text: e.message || "Error al guardar" });
    } finally {
      setDrawerBusy(false);
    }
  }, [editId, form, setBanner, load]);

  const handleDeleteBusiness = useCallback(
    async (businessId: string) => {
      const user = auth.currentUser;
      if (!user) return;
      if (
        !window.confirm(
          "¿Eliminar este negocio? Se borrará el registro y no podrás recuperarlo."
        )
      ) {
        return;
      }
      try {
        setDeleting((prev) => ({ ...prev, [businessId]: true }));
        const token = await user.getIdToken();
        const res = await fetch("/api/admin/applications/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid: businessId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data as any)?.error || "No se pudo eliminar el negocio.");
        setBanner({ kind: "success", text: "Negocio eliminado." });
        await load();
      } catch (e: any) {
        setBanner({ kind: "error", text: e.message || "Error al eliminar el negocio." });
      } finally {
        setDeleting((prev) => {
          const next = { ...prev };
          delete next[businessId];
          return next;
        });
      }
    },
    [load, setBanner]
  );

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Buscar (nombre, dirección, propietario)"
          className={inputBase}
        />
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className={selectBase}
        >
          <option value="">Categoría: todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(e) => {
            setPage(1);
            setPlan(e.target.value);
          }}
          className={selectBase}
        >
          <option value="">Plan: todos</option>
          <option value="free">free</option>
          <option value="featured">featured</option>
          <option value="sponsor">sponsor</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={createNew}
            className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Nuevo negocio
          </button>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full bg-[#38761D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2f5a1a] disabled:opacity-60"
          >
            {loading ? "Actualizando" : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs md:text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Negocio</th>
              <th className="px-4 py-2 text-left font-semibold">Categoría</th>
              <th className="px-4 py-2 text-left font-semibold">Plan</th>
              <th className="px-4 py-2 text-left font-semibold">Estado</th>
              <th className="px-4 py-2 text-left font-semibold">Propietario</th>
              <th className="px-4 py-2 text-left font-semibold">Actualizado</th>
              <th className="px-4 py-2 text-left font-semibold">Acciones</th>
            </tr>n
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((biz) => (
              <tr key={biz.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{biz.name || "Sin nombre"}</div>
                  {biz.address && <div className="text-xs text-gray-500">Dir: {biz.address}</div>}
                  <div className="text-xs text-gray-400">ID: {biz.id}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">{biz.category || "-"}</td>
                <td className="px-4 py-3 text-gray-700">
                  <div className="font-medium capitalize">{biz.plan || "free"}</div>
                  {biz.featured === "si" && (
                    <span className="mt-1 inline-flex rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                      Destacado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700 capitalize">{biz.status || "approved"}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{biz.ownerName || "Sin nombre"}</div>
                  {biz.ownerEmail && <div className="text-xs text-gray-500">{biz.ownerEmail}</div>}
                  {biz.ownerId && <div className="text-xs text-gray-400">UID: {biz.ownerId}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {biz.updatedAt ? new Date(biz.updatedAt).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-[#38761D] px-3 py-1 text-xs font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-50"
                      onClick={() => openDrawerFor(biz.id)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      disabled={!!deleting[biz.id]}
                      onClick={() => handleDeleteBusiness(biz.id)}
                    >
                      Eliminar
                    </button>
                    <a
                      href={`/dashboard/${biz.id}`}
                      className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                    >
                      Abrir dashboard
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                  No hay negocios con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-xs text-gray-600">Página {page}</span>
        <button
          disabled={loading || items.length < limit}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      {/* Drawer edición/creación */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editId ? "Editar negocio" : "Nuevo negocio"}>
        <div className="space-y-4">
          <Field label="Nombre del negocio">
            <input
              className={inputBase}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Taquería La Esquina"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Categoría">
              <input
                className={inputBase}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Ej. Restaurante"
              />
            </Field>
            <Field label="Horario">
              <input
                className={inputBase}
                value={form.hours}
                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                placeholder="09:00 - 18:00"
              />
            </Field>
          </div>
          <Field label="Dirección">
            <input
              className={inputBase}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Calle, colonia, ciudad"
            />
          </Field>
          <Field label="Descripción">
            <textarea
              rows={4}
              className={areaBase}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Cuenta lo que hace especial al negocio."
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Teléfono">
              <input
                className={inputBase}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="10 dígitos"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                className={inputBase}
                value={form.WhatsApp}
                onChange={(e) => setForm((f) => ({ ...f, WhatsApp: e.target.value }))}
                placeholder="5522334455"
              />
            </Field>
          </div>
          <Field label="Facebook">
            <input
              className={inputBase}
              value={form.Facebook}
              onChange={(e) => setForm((f) => ({ ...f, Facebook: e.target.value }))}
              placeholder="https://facebook.com/mi-negocio"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Latitud">
              <input
                className={inputBase}
                value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                placeholder="19.4326"
              />
            </Field>
            <Field label="Longitud">
              <input
                className={inputBase}
                value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                placeholder="-99.1332"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Plan">
              <select
                className={selectBase}
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              >
                <option value="free">free</option>
                <option value="featured">featured</option>
                <option value="sponsor">sponsor</option>
              </select>
            </Field>
            <Field label="Destacado">
              <select
                className={selectBase}
                value={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.value }))}
              >
                <option value="no">no</option>
                <option value="si">si</option>
              </select>
            </Field>
            <Field label="Estado">
              <select
                className={selectBase}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="rejected">rejected</option>
                <option value="draft">draft</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Owner ID">
              <input
                className={inputBase}
                value={form.ownerId}
                onChange={(e) => setForm((f) => ({ ...f, ownerId: e.target.value }))}
                placeholder="UID del propietario"
              />
            </Field>
            <Field label="Owner email">
              <input
                className={inputBase}
                value={form.ownerEmail}
                onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                placeholder="correo@ejemplo.com"
                type="email"
              />
            </Field>
            <Field label="Owner nombre">
              <input
                className={inputBase}
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                placeholder="Nombre del contacto"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              disabled={drawerBusy}
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="rounded bg-[#38761D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2f5a1a] disabled:opacity-60"
              disabled={drawerBusy}
            >
              {drawerBusy ? "Guardando" : editId ? "Guardar cambios" : "Crear negocio"}
            </button>
          </div>
        </div>
      </Drawer>
    </section>
  );
}

/* ----------------------------
   Configuración (placeholder)
   ---------------------------- */
function SettingsPanel() {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>
      <p className="mt-2 text-sm text-gray-600">
        Integra aquí opciones como: recordatorios de renovación, expiración automática de Destacado, notificaciones
        por correo/Slack, y variables de entorno visibles para el admin (solo lectura).
      </p>
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-600">
        <li>CRON/Cloud Scheduler para expirar planes.</li>
        <li>Webhook Slack/email templates (aprobado, rechazado, por vencer).</li>
        <li>Activar modo mantenimiento.</li>
      </ul>
    </section>
  );
}

/* ----------------------------
   Helpers de formulario negocio
   ---------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-700">
      {label}
      <div>{children}</div>
    </label>
  );
}

function emptyBusinessForm(): BusinessFormState {
  return {
    name: "",
    category: "",
    address: "",
    description: "",
    phone: "",
    WhatsApp: "",
    Facebook: "",
    hours: "",
    ownerId: "",
    ownerName: "",
    ownerEmail: "",
    plan: "free",
    featured: "no",
    isOpen: "si",
    status: "approved",
    lat: "",
    lng: "",
  };
}

function toForm(d: any): BusinessFormState {
  const f = emptyBusinessForm();
  return {
    ...f,
    name: str(d?.name),
    category: str(d?.category),
    address: str(d?.address),
    description: str(d?.description),
    phone: str(d?.phone),
    WhatsApp: str(d?.WhatsApp ?? d?.whatsapp),
    Facebook: str(d?.Facebook ?? d?.facebook),
    hours: str(d?.hours),
    ownerId: str(d?.ownerId),
    ownerName: str(d?.ownerName),
    ownerEmail: str(d?.ownerEmail),
    plan: (str(d?.plan) as any) || "free",
    featured: (str(d?.featured) as any) || "no",
    isOpen: (str(d?.isOpen) as any) || "si",
    status: (str(d?.status) as any) || "approved",
    lat: toNumStr(d?.lat ?? d?.latitude ?? d?.location?.lat),
    lng: toNumStr(d?.lng ?? d?.longitude ?? d?.location?.lng),
  };
}
function str(v: any, fb = "") {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s.length ? s : fb;
}
function toNumStr(v: any) {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v.trim();
  return "";
}


