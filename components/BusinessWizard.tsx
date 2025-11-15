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

// ---------- Pasos SIMPLIFICADOS (Solo fase pública) ----------
// El dueño completará el resto en el dashboard después de la aprobación
const steps = [
  { key: "basics", title: "Información básica" },
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
function usePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onPlace: (data: { address: string; lat?: number; lng?: number }) => void
) {
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
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
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
        // Guardar el email para mostrar el link
        setSubmittedEmail(values.ownerEmail);
        setStatusMsg("✅ ¡Solicitud enviada exitosamente!");
      }
    } catch (e) {
      console.error("submit", e);
      setStatusMsg("❌ No pudimos enviar la solicitud. Intenta de nuevo.");
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

  // ------------- Contenido por paso SIMPLIFICADO -------------
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case "basics":
        return (
          <div className="grid gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                📝 Solicitud de registro simplificada
              </h3>
              <p className="text-sm text-blue-800">
                Solo necesitamos estos datos básicos para comenzar. Después de la aprobación, podrás completar toda la información de tu negocio en el dashboard.
              </p>
            </div>

            <Group title="Tus datos (Responsable)">
              <Field label="Tu nombre completo" error={formState.errors.ownerName?.message}>
                <input 
                  className="input" 
                  placeholder="Ej: Juan Pérez" 
                  {...register("ownerName", { required: "Ingresa tu nombre" })} 
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Tu correo electrónico" error={formState.errors.ownerEmail?.message}>
                  <input 
                    className="input" 
                    type="email" 
                    placeholder="correo@ejemplo.com" 
                    {...register("ownerEmail", { required: "Ingresa tu correo" })} 
                  />
                </Field>
                <Field label="Tu teléfono" error={formState.errors.ownerPhone?.message}>
                  <input 
                    className="input" 
                    placeholder="9611234567" 
                    {...register("ownerPhone", { required: "Ingresa tu teléfono" })} 
                  />
                </Field>
              </div>
            </Group>

            <Group title="Información del negocio">
              <Field label="Nombre del negocio" error={formState.errors.businessName?.message}>
                <input 
                  className="input" 
                  placeholder="Ej: Restaurante El Sabor" 
                  {...register("businessName", { required: "Ingresa el nombre del negocio" })} 
                />
              </Field>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Categoría" error={formState.errors.category?.message}>
                  <select className="input" {...register("category")}>
                    <option value="">Selecciona una categoría (opcional)</option>
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

                <Field label="WhatsApp del negocio">
                  <input 
                    className="input" 
                    placeholder="5219991234567" 
                    {...register("whatsapp")} 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Incluye código de país (521...)
                  </p>
                </Field>
              </div>

              <Field label="Teléfono del negocio">
                <input 
                  className="input" 
                  placeholder="9991234567" 
                  {...register("phone")} 
                />
              </Field>
            </Group>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Nota:</strong> Solo necesitamos al menos un teléfono o WhatsApp del negocio. Después de la aprobación, podrás agregar ubicación, horarios, fotos y mucho más en el dashboard.
              </p>
            </div>
          </div>
        );

      case "confirm":
        const v = getValues();
        return (
          <div className="grid gap-4">
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-[#38761D]/5 to-[#38761D]/10">
              <h3 className="text-lg font-bold text-[#38761D] mb-3">📋 Resumen de tu solicitud</h3>
              
              <div className="space-y-2 text-sm">
                <p><strong>Dueño:</strong> {v.ownerName || "—"}</p>
                <p><strong>Email:</strong> {v.ownerEmail || "—"}</p>
                <p><strong>Teléfono:</strong> {v.ownerPhone || "—"}</p>
                <hr className="my-3 border-[#38761D]/20" />
                <p><strong>Negocio:</strong> {v.businessName || "—"}</p>
                <p><strong>Categoría:</strong> {v.category || "Sin especificar"}</p>
                <p><strong>Teléfono del negocio:</strong> {v.phone || "—"}</p>
                <p><strong>WhatsApp:</strong> {v.whatsapp || "—"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                ℹ️ <strong>¿Qué sigue?</strong> Al enviar tu solicitud, un administrador la revisará y aprobará. 
                Una vez aprobada, recibirás acceso a un dashboard donde podrás completar la información de tu negocio 
                (ubicación, horarios, fotos, redes sociales, etc.) y publicarlo en el directorio.
              </p>
            </div>
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
          <h1 className="text-3xl font-bold text-[#38761D]">Solicitud de registro</h1>
          <p className="text-sm text-gray-600">Proceso rápido en 2 pasos. Completa después de la aprobación.</p>
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
        <div className={`rounded border px-4 py-3 text-sm ${
          statusMsg.includes('❌') 
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-green-300 bg-green-50 text-green-700'
        }`}>
          <p className="font-semibold mb-2">{statusMsg}</p>
          {submittedEmail && (
            <div className="mt-3 space-y-2">
              <p className="text-sm">
                📧 Email de registro: <span className="font-semibold">{submittedEmail}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="/mis-solicitudes"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-center"
                >
                  🔍 Verificar estado de mi solicitud
                </a>
                <a
                  href={`/solicitud/${encodeURIComponent(submittedEmail)}`}
                  className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-semibold text-center"
                >
                  Ver mis solicitudes directamente
                </a>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 Guarda este link para consultar el estado cuando quieras. Te notificaremos cuando tu solicitud sea aprobada y puedas completar los datos de tu negocio.
              </p>
            </div>
          )}
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
              {hasNext ? "Siguiente" : "Enviar solicitud"}
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
