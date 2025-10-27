// pages/para-negocios/BusinessWizard.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

type Plan = "free" | "featured" | "sponsor";
type StepKey = "basics" | "profile" | "plan";

interface WizardData {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessName: string;
  category: string;
  address: string;
  description: string;
  plan: Plan;
  notes?: string;
}

interface SubmitResponse {
  ok: boolean;
  submitted?: boolean;
  notified?: boolean;
}

const steps: { key: StepKey; title: string }[] = [
  { key: "basics", title: "Datos básicos" },
  { key: "profile", title: "Perfil del negocio" },
  { key: "plan", title: "Plan y pago" },
];

const defaultValues: WizardData = {
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  businessName: "",
  category: "",
  address: "",
  description: "",
  plan: "free",
  notes: "",
};

const stepToIndex = (s: StepKey) => steps.findIndex((x) => x.key === s);
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

// Validación mínima por paso
function isStepValid(step: StepKey, data: WizardData): boolean {
  switch (step) {
    case "basics":
      return (
        data.ownerName.trim().length >= 2 &&
        /^\S+@\S+\.\S+$/.test(data.ownerEmail) &&
        /^\d{10}$/.test(onlyDigits(data.ownerPhone))
      );
    case "profile":
      return (
        data.businessName.trim().length >= 2 &&
        data.category.trim().length > 0 &&
        data.address.trim().length >= 5 &&
        data.description.trim().length >= 10
      );
    case "plan":
      return ["free", "featured", "sponsor"].includes(data.plan);
    default:
      return true;
  }
}

export default function BusinessWizard() {
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState,
  } = useForm<WizardData>({ mode: "onBlur", defaultValues });

  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<"none" | "draft" | "step">("none"); // <-- solo al guardar manual
  const [statusMsg, setStatusMsg] = useState("");
  const [currentStep, setCurrentStep] = useState<StepKey>("basics");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Step en URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const s = u.searchParams.get("step") as StepKey | null;
    if (s && steps.some((st) => st.key === s)) setCurrentStep(s);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("step", currentStep);
    window.history.replaceState(null, "", u.toString());
  }, [currentStep]);

  // Carga progreso (Firestore o localStorage)
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (user?.uid) {
          const ref = doc(db, "business_wizard", user.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as any;
            if (data?.formData) reset({ ...defaultValues, ...(data.formData as Partial<WizardData>) });
            if (typeof data?.step === "number" && steps[data.step]) {
              setCurrentStep(steps[data.step].key);
            }
            setLoading(false);
            return;
          }
        }
        const raw = localStorage.getItem("wizardBackup");
        if (raw) reset({ ...defaultValues, ...JSON.parse(raw) });
      } catch (e) {
        console.error("Load wizard error", e);
        setStatusMsg("No pudimos cargar tu progreso. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.uid, reset]);

  // Backup silencioso en localStorage (no toca la UI ni botones)
  const backupTimerRef = useRef<number | null>(null);
  const allValues = watch();
  useEffect(() => {
    if (backupTimerRef.current) window.clearTimeout(backupTimerRef.current);
    backupTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem("wizardBackup", JSON.stringify(getValues()));
      } catch {}
    }, 1200); // silencioso; NO cambia estados
    return () => {
      if (backupTimerRef.current) window.clearTimeout(backupTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allValues]);

  // Autocomplete de dirección (si está el script de Places cargado)
  const addressRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!addressRef.current || !(window as any).google?.maps?.places) return;
    const ac = new (window as any).google.maps.places.Autocomplete(addressRef.current, {
      fields: ["formatted_address", "geometry"],
      componentRestrictions: { country: "mx" },
    });
    ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      if (p?.formatted_address) setValue("address", p.formatted_address, { shouldDirty: true });
    });
  }, [setValue]);

  // Persistencia (solo cuando el usuario guarda)
  const persist = useCallback(
    async (
      payload: Partial<WizardData>,
      nextStep?: StepKey,
      modeOverride?: "wizard" | "application"
    ): Promise<SubmitResponse | undefined> => {
      if (!user?.uid) return; // si no hay sesión, no llamamos API (backup ya queda en localStorage)
      const mergedData = { ...getValues(), ...payload };
      const targetStep = stepToIndex(nextStep ?? currentStep);
      const mode: "wizard" | "application" = modeOverride ?? (nextStep ? "wizard" : "application");

      const token = await user.getIdToken();
      const body: Record<string, unknown> = { formData: mergedData, mode };
      if (mode === "wizard" && targetStep >= 0) body.step = targetStep;

      const res = await fetch("/api/businesses/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as SubmitResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Error al guardar");
      return json ?? { ok: true };
    },
    [user, currentStep, getValues]
  );

  const onStepSubmit = async (values: WizardData) => {
    const i = stepToIndex(currentStep);
    const next = steps[i + 1];

    // Solo bloquear si el paso es inválido
    if (!isStepValid(currentStep, values)) {
      setStatusMsg("Revisa los campos requeridos de este paso.");
      return;
    }

    try {
      setSavingAction("step");
      const result = await persist(values, next ? next.key : currentStep, next ? "wizard" : "application");
      if (next) {
        setCurrentStep(next.key);
        setStatusMsg("Progreso guardado.");
      } else if (result?.submitted) {
        setStatusMsg(result.notified ? "¡Solicitud enviada! Ya fuimos notificados." : "¡Solicitud enviada! Te contactaremos pronto.");
        localStorage.removeItem("wizardBackup");
      } else {
        setStatusMsg("Progreso guardado.");
      }
    } catch (e) {
      console.error("Submit error", e);
      setStatusMsg("No pudimos guardar. Intenta nuevamente.");
    } finally {
      setSavingAction("none");
    }
  };

  const onSaveDraft = async () => {
    try {
      setSavingAction("draft");
      await persist(getValues(), currentStep, "wizard");
      setStatusMsg("Progreso guardado.");
    } catch (e) {
      console.error("Draft error", e);
      setStatusMsg("No pudimos guardar el borrador.");
    } finally {
      setSavingAction("none");
    }
  };

  const goBack = () => {
    const i = stepToIndex(currentStep);
    if (i > 0) setCurrentStep(steps[i - 1].key);
  };

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case "basics":
        return (
          <div className="grid gap-4">
            <Field label="Nombre completo" error={formState.errors.ownerName?.message}>
              <input
                className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                placeholder="Nombre del responsable"
                {...register("ownerName", { required: "Ingresa tu nombre", minLength: { value: 2, message: "Muy corto" } })}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Correo electrónico" error={formState.errors.ownerEmail?.message}>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                  {...register("ownerEmail", { required: "Ingresa tu correo", pattern: { value: /^\S+@\S+\.\S+$/, message: "Correo inválido" } })}
                />
              </Field>
              <Field label="Teléfono" error={formState.errors.ownerPhone?.message}>
                <input
                  placeholder="9611234567"
                  className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                  {...register("ownerPhone", {
                    required: "Ingresa un teléfono",
                    setValueAs: (v) => onlyDigits(v).slice(0, 10),
                    validate: (v) => /^\d{10}$/.test(v) || "A 10 dígitos",
                  })}
                />
              </Field>
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="grid gap-4">
            <Field label="Nombre del negocio" error={formState.errors.businessName?.message}>
              <input
                placeholder="Ej. Balconería González"
                className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                {...register("businessName", { required: "Ingresa el nombre del negocio", minLength: { value: 2, message: "Muy corto" } })}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categoría" error={formState.errors.category?.message}>
                <select
                  className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                  {...register("category", { required: "Selecciona una categoría" })}
                >
                  <option value="">Selecciona una categoría</option>
                  {[
                    "Restaurante","Cafetería","Comida rápida","Bar","Gimnasio","Spa","Salón de belleza",
                    "Ferretería","Supermercado","Papelería","Boutique","Farmacia","Servicios profesionales",
                    "Tecnología","Automotriz","Educación","Entretenimiento","Salud","Turismo","Otros",
                  ].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Dirección" error={formState.errors.address?.message}>
                <input
                  ref={addressRef}
                  placeholder="Calle, colonia, municipio"
                  className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                  {...register("address", { required: "Ingresa la dirección", minLength: { value: 5, message: "Muy corta" } })}
                />
              </Field>
            </div>
            <Field label="Descripción" error={formState.errors.description?.message}>
              <textarea
                rows={4}
                placeholder="Describe tus servicios, horarios..."
                className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                {...register("description", { required: "Describe tu negocio", minLength: { value: 10, message: "Muy corta" } })}
              />
            </Field>
          </div>
        );
      case "plan":
        return (
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-gray-700">Selecciona un plan</label>
            <div className="grid gap-3 md:grid-cols-3">
              <PlanOption value="free"     title="Básico"      description="Ficha en el directorio y reseñas."            register={register} currentValue={watch("plan")} />
              <PlanOption value="featured" title="Destacado"   description="Posición preferente y promoción mensual."     register={register} currentValue={watch("plan")} />
              <PlanOption value="sponsor"  title="Patrocinado" description="Campaña digital y banners."                  register={register} currentValue={watch("plan")} />
            </div>
            <Field label="Notas adicionales">
              <textarea
                rows={3}
                className="block w-full rounded border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-[#38761D]/40 focus:outline-none"
                placeholder="Cuéntanos necesidades especiales o disponibilidad de pago."
                {...register("notes")}
              />
            </Field>
          </div>
        );
      default:
        return null;
    }
  }, [currentStep, formState.errors, register, setValue, watch]);

  const i = stepToIndex(currentStep);
  const canGoPrev = i > 0;

  if (loading) return <div className="text-center text-sm text-gray-500">Cargando asistente…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#38761D]">Registro de negocio</h1>
          <p className="text-sm text-gray-600">Completa cada paso y guarda tu progreso cuando tú decidas.</p>
        </div>
        <UserBadge user={user} onSignIn={() => signInWithGoogle()} onSignOut={async () => { await signOut(auth); }} />
      </header>

      <nav className="flex gap-2">
        {steps.map((s, idx) => {
          const active = s.key === currentStep;
          const completed = idx < i;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => completed && setCurrentStep(s.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition
                ${active ? "border-[#38761D] bg-[#38761D]/10 text-[#2d5418]"
                         : completed ? "border-[#38761D]/60 text-[#38761D]"
                                     : "border-gray-200 text-gray-400"}`}
            >
              <span className="block text-left uppercase tracking-wide">Paso {idx + 1}</span>
              <span className="block text-left text-sm font-bold">{s.title}</span>
            </button>
          );
        })}
      </nav>

      {statusMsg && (
        <div className="rounded border border-[#38761D]/40 bg-[#38761D]/10 px-4 py-2 text-sm text-[#2d5418]">
          {savingAction === "draft" ? "Guardando borrador…" : savingAction === "step" ? "Guardando…" : statusMsg}
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
            disabled={!canGoPrev || savingAction !== "none"}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
          >
            Anterior
          </button>

          <div className="flex items-center gap-3">
            {user?.uid && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={savingAction !== "none"}
                className="rounded-lg border border-[#38761D] px-4 py-2 text-sm font-semibold text-[#38761D] hover:bg-[#38761D]/10 disabled:opacity-40"
              >
                Guardar borrador
              </button>
            )}
            <button
              type="submit"
              // NO deshabilitamos por “autosave”, solo si está guardando explícitamente o si el paso es inválido
              disabled={savingAction !== "none" || !isStepValid(currentStep, getValues())}
              className="rounded-lg bg-[#38761D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f5a1a] disabled:opacity-40"
            >
              {i + 1 < steps.length ? "Siguiente" : "Enviar"}
            </button>
          </div>
        </div>

        <p className="text-right text-xs text-gray-500">{`Paso ${i + 1} de ${steps.length}`}</p>
      </form>

      {!user && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          Si inicias sesión con Google podrás guardar tu progreso y enviar la solicitud al finalizar.
        </div>
      )}
    </div>
  );
}

// ---------- UI helpers ----------
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
    </label>
  );
}

interface PlanOptionProps {
  value: Plan;
  title: string;
  description: string;
  register: UseFormRegister<WizardData>;
  currentValue: string;
}
function PlanOption({ value, title, description, register, currentValue }: PlanOptionProps) {
  const checked = currentValue === value;
  return (
    <label
      className={`flex cursor-pointer flex-col space-y-2 rounded-xl border px-4 py-3 text-left shadow-sm transition
      ${checked ? "border-[#38761D] bg-[#38761D]/10" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-gray-800">{title}</span>
        <input type="radio" value={value} {...register("plan")} className="h-4 w-4" />
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </label>
  );
}

function UserBadge({
  user,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
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




