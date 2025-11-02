import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { signOut, type User } from "firebase/auth";

// ---------- Tipos ----------
type DayKey =
  | "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "qr";
type Servicio = "domicilio" | "pickup" | "pedidos_whatsapp" | "estacionamiento" | "wifi" | "pet_friendly";

interface HorarioDia {
  abierto: boolean;
  desde: string; // "08:00"
  hasta: string; // "18:00"
}

type HorariosSemana = Record<DayKey, HorarioDia>;

interface WizardData {
  // Propietario
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;

  // Negocio básico
  businessName: string;
  category: string;
  tags: string;                // input de texto "pollo, rostizado"
  description: string;

  // Ubicación
  address: string;
  colonia: string;
  municipio: string;
  lat: string;
  lng: string;
  referencePoint: string;

  // Contacto y redes
  phone: string;
  whatsapp: string;            // 10-13 dígitos; ideal formato 521xxxxxxxxxx
  emailContact: string;
  facebookPage: string;
  instagramUser: string;       // @usuario o url
  website: string;
  tiktok: string;

  // Medios
  logoUrl: string;
  coverPhoto: string;
  gallery: string;             // urls separadas por coma
  videoPromoUrl: string;

  // Horarios
  horarios: HorariosSemana;

  // Operación/marketing
  metodoPago: MetodoPago[];
  servicios: Servicio[];
  priceRange: "$" | "$$" | "$$$" | "";
  promocionesActivas: string;

  // Control
  plan: "free" | "featured" | "sponsor";
  featured: boolean;
  approved: boolean;

  // Notas
  notes: string;
}

const DEFAULT_HORARIO: HorarioDia = { abierto: true, desde: "08:00", hasta: "18:00" };
const DAYS: { key: DayKey; label: string }[] = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

const defaultHorarios: HorariosSemana = DAYS.reduce((acc, d) => {
  acc[d.key] = { ...DEFAULT_HORARIO };
  return acc;
}, {} as HorariosSemana);

const defaultValues: WizardData = {
  // Propietario
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",

  // Negocio
  businessName: "",
  category: "",
  tags: "",
  description: "",

  // Ubicación
  address: "",
  colonia: "",
  municipio: "Yajalón",
  lat: "",
  lng: "",
  referencePoint: "",

  // Contacto y redes
  phone: "",
  whatsapp: "",
  emailContact: "",
  facebookPage: "",
  instagramUser: "",
  website: "",
  tiktok: "",

  // Medios
  logoUrl: "",
  coverPhoto: "",
  gallery: "",
  videoPromoUrl: "",

  // Horarios
  horarios: defaultHorarios,

  // Operación/marketing
  metodoPago: [],
  servicios: [],
  priceRange: "",
  promocionesActivas: "",

  // Control
  plan: "free",
  featured: false,
  approved: true,

  // Notas
  notes: "",
};

// ---------- Pasos ----------
const steps = [
  { key: "basics", title: "Datos básicos" },
  { key: "ubicacion", title: "Ubicación" },
  { key: "contacto", title: "Contacto y redes" },
  { key: "horarios", title: "Horarios" },
  { key: "medios", title: "Logo, portada y galería" },
  { key: "opciones", title: "Servicios y pagos" },
  { key: "plan", title: "Plan y control" },
  { key: "confirm", title: "Confirmación" },
] as const;
type StepKey = typeof steps[number]["key"];

// ---------- Helpers ----------
function stepToIndex(step: StepKey) {
  return steps.findIndex((s) => s.key === step);
}

function toArrayFromComma(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLatLng(value: string): number | null {
  const n = Number((value || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Convierte horarios a un string resumen tipo "Lun-Vie 08:00-18:00; Sáb 09:00-14:00; Dom cerrado"
function summarizeHorarios(h: HorariosSemana): string {
  const label = (d: DayKey) => DAYS.find((x) => x.key === d)?.label || d;
  const entries = Object.entries(h) as [DayKey, HorarioDia][];
  const parts: string[] = [];
  for (const [dia, cfg] of entries) {
    parts.push(
      cfg.abierto
        ? `${label(dia)} ${cfg.desde}-${cfg.hasta}`
        : `${label(dia)} cerrado`
    );
  }
  return parts.join("; ");
}

// Autocomplete de Google Places: si está disponible window.google.maps.places
function usePlacesAutocomplete(inputRef: React.RefObject<HTMLInputElement>, onPlace: (data: { address: string; lat?: number; lng?: number }) => void) {
  useEffect(() => {
    const el = inputRef.current;
    const w = (typeof window !== "undefined" ? window : undefined) as any;
    if (!el || !w?.google?.maps?.places?.Autocomplete) return;
    const ac = new w.google.maps.places.Autocomplete(el, {
      fields: ["formatted_address", "geometry"],
      componentRestrictions: { country: ["mx"] },
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const address = place?.formatted_address || "";
      const lat = place?.geometry?.location?.lat?.();
      const lng = place?.geometry?.location?.lng?.();
      onPlace({ address, lat, lng });
    });
    return () => {
      try {
        w.google.maps.event.clearInstanceListeners(ac);
      } catch {}
    };
  }, [inputRef, onPlace]);
}

// ---------- Componente principal ----------
export default function BusinessWizardPro() {
  const { register, handleSubmit, reset, getValues, setValue, watch, formState } = useForm<WizardData>({
    mode: "onBlur",
    defaultValues,
  });

  const [currentStep, setCurrentStep] = useState<StepKey>(steps[0].key);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => auth.onAuthStateChanged((u) => setUser(u)), []);

  // Carga progreso guardado
  useEffect(() => {
    async function loadProgress() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const ref = doc(db, "business_wizard", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.formData) {
            reset({ ...defaultValues, ...(data.formData as Partial<WizardData>) });
          }
          if (typeof data?.step === "number" && data.step >= 0 && data.step < steps.length) {
            setCurrentStep(steps[data.step].key);
          }
        }
      } catch (e) {
        console.error("wizard load", e);
        setStatusMsg("No pudimos cargar tu progreso.");
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, [user?.uid, reset]);

  // Autocomplete
  usePlacesAutocomplete(addressRef, ({ address, lat, lng }) => {
    setValue("address", address);
    if (typeof lat === "number") setValue("lat", String(lat));
    if (typeof lng === "number") setValue("lng", String(lng));
  });

  const persist = useCallback(
    async (payload: Partial<WizardData>, nextStep?: StepKey, modeOverride?: "wizard" | "application") => {
      if (!user?.uid) return;
      const merged = { ...getValues(), ...payload };
      const targetStep = stepToIndex(nextStep ?? currentStep);
      const mode: "wizard" | "application" = modeOverride ?? (nextStep ? "wizard" : "application");
      try {
        setSaving(true);
        const token = await user.getIdToken();
        const body: Record<string, unknown> = { formData: merged, mode };
        if (mode === "wizard") body.step = targetStep;

        const res = await fetch("/api/businesses/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data as any)?.error || "No se pudo guardar");
        return data as { ok: boolean; submitted?: boolean; notified?: boolean } | null;
      } finally {
        setSaving(false);
      }
    },
    [user, currentStep, getValues]
  );

  const onStepSubmit = async (values: WizardData) => {
    try {
      const index = stepToIndex(currentStep);
      const next = steps[index + 1];
      // Ensambla structure para backend si es último paso
      const result = await persist(values, next ? next.key : currentStep, next ? "wizard" : "application");
      if (next) {
        setCurrentStep(next.key);
        setStatusMsg("Progreso guardado.");
      } else {
        setStatusMsg(
          result?.submitted
            ? result?.notified
              ? "¡Solicitud enviada y notificada!"
              : "¡Solicitud enviada!"
            : "Enviado."
        );
      }
    } catch (e) {
      console.error("submit", e);
      setStatusMsg("No pudimos guardar los cambios.");
    }
  };

  const onSaveDraft = async () => {
    try {
      await persist(getValues(), currentStep, "wizard");
      setStatusMsg("Borrador guardado.");
    } catch (e) {
      console.error("draft", e);
      setStatusMsg("No pudimos guardar el borrador.");
    }
  };

  const goBack = () => {
    const i = stepToIndex(currentStep);
    if (i > 0) setCurrentStep(steps[i - 1].key);
  };

  // ------------- Contenido por paso -------------
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case "basics":
        return (
          <div className="grid gap-4">
            <Group title="Responsable">
              <Field label="Nombre completo" error={formState.errors.ownerName?.message}>
                <input className="input" placeholder="Nombre del responsable" {...register("ownerName", { required: "Ingresa tu nombre" })} />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Correo del responsable" error={formState.errors.ownerEmail?.message}>
                  <input className="input" type="email" placeholder="correo@ejemplo.com" {...register("ownerEmail", { required: "Ingresa tu correo" })} />
                </Field>
                <Field label="Teléfono del responsable" error={formState.errors.ownerPhone?.message}>
                  <input className="input" placeholder="9611234567" {...register("ownerPhone", { required: "Ingresa un teléfono" })} />
                </Field>
              </div>
            </Group>

            <Group title="Negocio">
              <Field label="Nombre del negocio" error={formState.errors.businessName?.message}>
                <input className="input" placeholder="Ej. Pollo Magon" {...register("businessName", { required: "Ingresa el nombre del negocio" })} />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Categoría" error={formState.errors.category?.message}>
                  <select className="input" {...register("category", { required: "Selecciona una categoría" })}>
                    <option value="">Selecciona una categoría</option>
                    <option value="Restaurante">Restaurante</option>
                    <option value="Cafetería">Cafetería</option>
                    <option value="Comida rápida">Comida rápida</option>
                    <option value="Bar">Bar</option>
                    <option value="Gimnasio">Gimnasio</option>
                    <option value="Spa">Spa</option>
                    <option value="Salón de belleza">Salón de belleza</option>
                    <option value="Ferretería">Ferretería</option>
                    <option value="Supermercado">Supermercado</option>
                    <option value="Papelería">Papelería</option>
                    <option value="Boutique">Boutique</option>
                    <option value="Farmacia">Farmacia</option>
                    <option value="Servicios profesionales">Servicios profesionales</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Automotriz">Automotriz</option>
                    <option value="Educación">Educación</option>
                    <option value="Entretenimiento">Entretenimiento</option>
                    <option value="Salud">Salud</option>
                    <option value="Turismo">Turismo</option>
                    <option value="Otros">Otros</option>
                  </select>
                </Field>
                <Field label="Tags (coma separada)">
                  <input className="input" placeholder="pollo, rostizado, familiar" {...register("tags")} />
                </Field>
              </div>
              <Field label="Descripción" error={formState.errors.description?.message}>
                <textarea className="textarea" rows={4} placeholder="Describe tus servicios, propuesta de valor..." {...register("description", { required: "Describe tu negocio" })} />
              </Field>
            </Group>
          </div>
        );

      case "ubicacion":
        return (
          <div className="grid gap-4">
            <Group title="Dirección">
              <Field label="Dirección (autocomplete si está Google Places)">
                <input ref={addressRef} className="input" placeholder="Calle, colonia, municipio" {...register("address", { required: "Ingresa la dirección" })} />
              </Field>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Colonia">
                  <input className="input" placeholder="Ej. Jonuta" {...register("colonia")} />
                </Field>
                <Field label="Municipio">
                  <input className="input" placeholder="Yajalón" {...register("municipio")} />
                </Field>
                <Field label="Punto de referencia">
                  <input className="input" placeholder="Frente al parque central" {...register("referencePoint")} />
                </Field>
              </div>
            </Group>
            <Group title="Coordenadas (opcional)">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Latitud">
                  <input className="input" placeholder="17.123456" {...register("lat")} />
                </Field>
                <Field label="Longitud">
                  <input className="input" placeholder="-92.123456" {...register("lng")} />
                </Field>
              </div>
            </Group>
          </div>
        );

      case "contacto":
        return (
          <div className="grid gap-4">
            <Group title="Contacto y redes">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <input className="input" placeholder="9611234567" {...register("phone")} />
                </Field>
                <Field label="WhatsApp (con lada, ej. 5219611234567)">
                  <input className="input" placeholder="5219611234567" {...register("whatsapp")} />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Email de contacto">
                  <input className="input" type="email" placeholder="contacto@negocio.com" {...register("emailContact")} />
                </Field>
                <Field label="Sitio web">
                  <input className="input" placeholder="https://..." {...register("website")} />
                </Field>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Facebook">
                  <input className="input" placeholder="https://facebook.com/mi-pagina" {...register("facebookPage")} />
                </Field>
                <Field label="Instagram">
                  <input className="input" placeholder="@miusuario o url" {...register("instagramUser")} />
                </Field>
                <Field label="TikTok">
                  <input className="input" placeholder="https://tiktok.com/@miusuario" {...register("tiktok")} />
                </Field>
              </div>
            </Group>
          </div>
        );

      case "horarios":
        return (
          <div className="grid gap-4">
            <Group title="Horarios por día">
              <div className="grid gap-3">
                {DAYS.map(({ key, label }) => {
                  const abierto = watch(`horarios.${key}.abierto`);
                  return (
                    <div key={key} className="rounded-xl border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="font-semibold">{label}</div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register(`horarios.${key}.abierto` as const)} />
                          <span>Abierto</span>
                        </label>
                        <input type="time" className="input w-36" disabled={!abierto} {...register(`horarios.${key}.desde` as const)} />
                        <span className="text-gray-500">a</span>
                        <input type="time" className="input w-36" disabled={!abierto} {...register(`horarios.${key}.hasta` as const)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Group>
          </div>
        );

      case "medios":
        return (
          <div className="grid gap-4">
            <Group title="Branding e imágenes">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Logo (URL)">
                  <input className="input" placeholder="https://..." {...register("logoUrl")} />
                </Field>
                <Field label="Portada (URL)">
                  <input className="input" placeholder="https://..." {...register("coverPhoto")} />
                </Field>
              </div>
              <Field label="Galería (URLs separadas por coma)">
                <input className="input" placeholder="https://img1, https://img2" {...register("gallery")} />
              </Field>
              <Field label="Video promocional (YouTube o MP4)">
                <input className="input" placeholder="https://..." {...register("videoPromoUrl")} />
              </Field>
            </Group>
          </div>
        );

      case "opciones":
        return (
          <div className="grid gap-4">
            <Group title="Servicios y métodos de pago">
              <Field label="Servicios (elige los que apliquen)">
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    { v: "domicilio", l: "Entrega a domicilio" },
                    { v: "pickup", l: "Recoger en tienda" },
                    { v: "pedidos_whatsapp", l: "Pedidos por WhatsApp" },
                    { v: "estacionamiento", l: "Estacionamiento" },
                    { v: "wifi", l: "Wi-Fi" },
                    { v: "pet_friendly", l: "Pet friendly" },
                  ].map((s) => (
                    <label key={s.v} className="inline-flex items-center gap-2">
                      <input type="checkbox" value={s.v} {...register("servicios")} />
                      <span>{s.l}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Métodos de pago">
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    { v: "efectivo", l: "Efectivo" },
                    { v: "transferencia", l: "Transferencia" },
                    { v: "tarjeta", l: "Tarjeta" },
                    { v: "qr", l: "Pago QR" },
                  ].map((m) => (
                    <label key={m.v} className="inline-flex items-center gap-2">
                      <input type="checkbox" value={m.v} {...register("metodoPago")} />
                      <span>{m.l}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Rango de precios">
                  <select className="input" {...register("priceRange")}>
                    <option value="">Sin especificar</option>
                    <option value="$">$ (económico)</option>
                    <option value="$$">$$ (medio)</option>
                    <option value="$$$">$$$ (alto)</option>
                  </select>
                </Field>
                <Field label="Promociones activas">
                  <input className="input" placeholder="2x1 miércoles, combo familiar, etc." {...register("promocionesActivas")} />
                </Field>
              </div>
            </Group>
          </div>
        );

      case "plan":
        return (
          <div className="grid gap-4">
            <Group title="Plan y control">
              <div className="grid md:grid-cols-3 gap-3">
                <PlanOption value="free" title="Básico" description="Ficha en el directorio" register={register} currentValue={watch("plan")} />
                <PlanOption value="featured" title="Destacado" description="Posición preferente" register={register} currentValue={watch("plan")} />
                <PlanOption value="sponsor" title="Patrocinado" description="Incluye campaña" register={register} currentValue={watch("plan")} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="switch">
                  <input type="checkbox" {...register("featured")} />
                  <span>Marcar como destacado</span>
                </label>
                <label className="switch">
                  <input type="checkbox" {...register("approved")} />
                  <span>Aprobado para publicar</span>
                </label>
              </div>
              <Field label="Notas internas">
                <textarea className="textarea" rows={3} placeholder="Notas para administración (no públicas)" {...register("notes")} />
              </Field>
            </Group>
          </div>
        );

      case "confirm":
        const v = getValues();
        const resumenHorarios = summarizeHorarios(v.horarios);
        return (
          <div className="grid gap-4">
            <div className="rounded-2xl border p-4 bg-gray-50">
              <p className="text-sm text-gray-700">
                <strong>Resumen de horarios:</strong> {resumenHorarios || "—"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Tags:</strong> {v.tags || "—"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Servicios:</strong> {v.servicios?.join(", ") || "—"}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Métodos de pago:</strong> {v.metodoPago?.join(", ") || "—"}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Al enviar, se guardará el registro y (si configuraste) se notificará por webhook/Slack.
            </p>
          </div>
        );

      default:
        return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formState.errors, register, watch]);

  const currentIndex = stepToIndex(currentStep);
  const hasNext = currentIndex < steps.length - 1;

  if (loading) {
    return <div className="text-center text-sm text-gray-500">Cargando asistente...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#38761D]">Registro de negocio (versión PRO)</h1>
          <p className="text-sm text-gray-600">Completa los pasos. Puedes guardar borrador en cualquier momento.</p>
        </div>
        <UserBadge
          user={user}
          onSignIn={() => signInWithGoogle()}
          onSignOut={async () => { await signOut(auth); }}
        />
      </header>

      <nav className="flex gap-2">
        {steps.map((s, index) => {
          const active = s.key === currentStep;
          const completed = index < stepToIndex(currentStep);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => completed && setCurrentStep(s.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-[#38761D] bg-[#38761D]/10 text-[#2d5418]"
                  : completed
                  ? "border-[#38761D]/60 text-[#38761D]"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              <span className="block text-left uppercase tracking-wide">Paso {index + 1}</span>
              <span className="block text-left text-sm font-bold">{s.title}</span>
            </button>
          );
        })}
      </nav>

      {statusMsg && (
        <div className="rounded border border-[#38761D]/40 bg-[#38761D]/10 px-4 py-2 text-sm text-[#2d5418]">
          {statusMsg}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onStepSubmit)}>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {stepContent}
        </section>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentIndex === 0 || saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
          >
            Anterior
          </button>
          <div className="flex items-center gap-3">
            {user?.uid && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="rounded-lg border border-[#38761D] px-4 py-2 text-sm font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-40"
              >
                Guardar borrador
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#38761D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f5a1a] disabled:opacity-40"
            >
              {hasNext ? "Siguiente" : "Enviar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------- Subcomponentes UI ----------
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-gray-100 bg-gray-50/80 p-5">
      <legend className="px-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500">
        {title}
      </legend>
      <div className="mt-4 grid gap-4">{children}</div>
    </fieldset>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
      <style jsx>{`
        .input {
          @apply block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40;
        }
        .textarea {
          @apply block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40;
        }
        .switch {
          @apply inline-flex items-center gap-2 text-sm;
        }
      `}</style>
    </label>
  );
}

interface PlanOptionProps {
  value: "free" | "featured" | "sponsor";
  title: string;
  description: string;
  register: UseFormRegister<WizardData>;
  currentValue: string;
}
function PlanOption({ value, title, description, register, currentValue }: PlanOptionProps) {
  const checked = currentValue === value;
  return (
    <label
      className={`flex cursor-pointer flex-col space-y-2 rounded-xl border px-4 py-3 text-left shadow-sm transition ${
        checked ? "border-[#38761D] bg-[#38761D]/10" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-gray-800">{title}</span>
        <input type="radio" value={value} {...register("plan")} className="h-4 w-4" />
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </label>
  );
}

function UserBadge({ user, onSignIn, onSignOut }: { user: User | null; onSignIn: () => Promise<void>; onSignOut: () => Promise<void>; }) {
  if (!user) {
    return (
      <button
        type="button"
        className="rounded-lg border border-[#38761D] px-4 py-2 text-sm font-semibold text-[#38761D] hover:bg-[#38761D]/10"
        onClick={onSignIn}
      >
        Iniciar sesión
      </button>
    );
  }
  const initials = user.email?.slice(0, 2).toUpperCase() || "US";
  return (
    <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#38761D]/20 text-xs font-bold text-[#38761D]">
        {initials}
      </div>
      <div className="text-xs text-gray-600">
        <p className="font-semibold text-gray-800">{user.displayName || user.email}</p>
        <p>{user.email}</p>
      </div>
      <button className="text-xs font-semibold text-red-500" onClick={onSignOut}>
        Cerrar sesión
      </button>
    </div>
  );
}
