import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { auth, db, googleProvider } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { signInWithPopup, signOut, type User } from "firebase/auth";

interface WizardData {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessName: string;
  category: string;
  address: string;
  description: string;
  whatsappNumber: string;
  whatsappCode: string;
  plan: "free" | "featured" | "sponsor";
  notes?: string;
}

const defaultValues: WizardData = {
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  businessName: "",
  category: "",
  address: "",
  description: "",
  whatsappNumber: "",
  whatsappCode: "",
  plan: "free",
  notes: "",
};

const steps = [
  { key: "basics", title: "Datos basicos" },
  { key: "profile", title: "Perfil del negocio" },
  { key: "whatsapp", title: "Verificacion de WhatsApp" },
  { key: "plan", title: "Plan y pago" },
] as const;

type StepKey = typeof steps[number]["key"];

interface SubmitResponse {
  ok: boolean;
  submitted?: boolean;
  notified?: boolean;
}

function stepToIndex(step: StepKey) {
  return steps.findIndex((item) => item.key === step);
}

export default function BusinessWizard() {
  const { register, handleSubmit, reset, getValues, watch, formState } = useForm<WizardData>({
    mode: "onBlur",
    defaultValues,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<StepKey>(steps[0].key);
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  useEffect(() => auth.onAuthStateChanged((next) => setUser(next)), []);

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
          const data = snap.data();
          if (data?.formData) {
            reset({ ...defaultValues, ...(data.formData as Partial<WizardData>) });
          }
          if (typeof data?.step === "number" && data.step >= 0 && data.step < steps.length) {
            setCurrentStep(steps[data.step].key);
          }
        }
      } catch (error) {
        console.error("Wizard load error", error);
        setStatusMsg("No pudimos cargar tu progreso. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, [user?.uid, reset]);

  const persist = useCallback(
    async (payload: Partial<WizardData>, nextStep?: StepKey, modeOverride?: 'wizard' | 'application') => {
      if (!user?.uid) return;
      const mergedData = { ...getValues(), ...payload };
      const targetStep = stepToIndex(nextStep ?? currentStep);
      const mode: 'wizard' | 'application' = modeOverride ?? (nextStep ? 'wizard' : 'application');
      try {
        setSaving(true);
        const token = await user.getIdToken();
        const requestBody: Record<string, unknown> = {
          formData: mergedData,
          mode,
        };
        if (mode === 'wizard' && targetStep >= 0) {
          requestBody.step = targetStep;
        }
        const response = await fetch("/api/businesses/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify(requestBody),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error((result as any)?.error || "No se pudo guardar la información");
        }
        return (result as SubmitResponse | null) ?? { ok: true };
      } catch (error) {
        console.error("Wizard persist error", error);
        setStatusMsg("No pudimos guardar los cambios. Intenta nuevamente.");
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [user, currentStep, getValues, setStatusMsg]
  );

  const onStepSubmit = async (values: WizardData) => {
    try {
      const index = stepToIndex(currentStep);
      const next = steps[index + 1];
      const result = await persist(values, next ? next.key : currentStep, next ? 'wizard' : 'application');
      if (next) {
        setCurrentStep(next.key);
        setStatusMsg("Progreso guardado.");
      } else if (result?.submitted) {
        setStatusMsg(
          result.notified
            ? "¡Solicitud enviada! Nuestro equipo ya fue notificado."
            : "¡Solicitud enviada! Te contactaremos pronto."
        );
      } else {
        setStatusMsg("Progreso guardado.");
      }
    } catch (error) {
      console.error("Wizard submit error", error);
      setStatusMsg("No pudimos guardar los cambios. Intenta nuevamente.");
    }
  };

  const goBack = () => {
    const index = stepToIndex(currentStep);
    if (index > 0) setCurrentStep(steps[index - 1].key);
  };

  const onSaveDraft = async () => {
    try {
            await persist(getValues(), currentStep, 'wizard');
      setStatusMsg("Progreso guardado.");
    } catch (error) {
      console.error("Wizard draft error", error);
      setStatusMsg("No pudimos guardar el borrador. Intenta nuevamente.");
    }
  };

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case "basics":
        return (
          <div className="grid gap-4">
            <Field label="Nombre completo" error={formState.errors.ownerName?.message}>
              <input placeholder="Nombre del responsable" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("ownerName", { required: "Ingresa tu nombre" })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Correo electronico" error={formState.errors.ownerEmail?.message}>
                <input type="email" placeholder="correo@ejemplo.com" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("ownerEmail", { required: "Ingresa tu correo" })} />
              </Field>
              <Field label="Telefono" error={formState.errors.ownerPhone?.message}>
                <input placeholder="9611234567" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("ownerPhone", { required: "Ingresa un telefono" })} />
              </Field>
            </div>
          </div>
        );
      case "profile":
        return (
          <div className="grid gap-4">
            <Field label="Nombre del negocio" error={formState.errors.businessName?.message}>
              <input placeholder="Ej. Balconeria Gonzalez" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("businessName", { required: "Ingresa el nombre del negocio" })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categoria" error={formState.errors.category?.message}>
                <select
                  className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40"
                  {...register("category", { required: "Indica una categoria" })}
                >
                  <option value="" disabled>Selecciona una categoria</option>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Cafeteria">Cafeteria</option>
                  <option value="Comida rapida">Comida rapida</option>
                  <option value="Bar">Bar</option>
                  <option value="Gimnasio">Gimnasio</option>
                  <option value="Spa">Spa</option>
                  <option value="Salon de belleza">Salon de belleza</option>
                  <option value="Ferreteria">Ferreteria</option>
                  <option value="Supermercado">Supermercado</option>
                  <option value="Papeleria">Papeleria</option>
                  <option value="Boutique">Boutique</option>
                  <option value="Farmacia">Farmacia</option>
                  <option value="Servicios profesionales">Servicios profesionales</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Automotriz">Automotriz</option>
                  <option value="Educacion">Educacion</option>
                  <option value="Entretenimiento">Entretenimiento</option>
                  <option value="Salud">Salud</option>
                  <option value="Turismo">Turismo</option>
                  <option value="Otros">Otros</option>
                </select>
              </Field>
              <Field label="Direccion" error={formState.errors.address?.message}>
                <input placeholder="Calle, colonia, municipio" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("address", { required: "Ingresa la direccion" })} />
              </Field>
            </div>
            <Field label="Descripcion" error={formState.errors.description?.message}>
              <textarea rows={4} placeholder="Describe tus servicios, horarios..." className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("description", { required: "Describe tu negocio" })} />
            </Field>
          </div>
        );
      case "whatsapp":
        return (
          <div className="grid gap-4">
            <p className="text-sm text-gray-600">
              Validaremos tu WhatsApp para confirmar la propiedad del negocio. Recibiras un codigo que puedes compartir con el equipo.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Numero de WhatsApp" error={formState.errors.whatsappNumber?.message}>
                <input placeholder="9611234567" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("whatsappNumber", { required: "Ingresa tu numero" })} />
              </Field>
              <Field label="Codigo recibido">
                <input placeholder="Codigo opcional" className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" {...register("whatsappCode")}
                />
              </Field>
            </div>
          </div>
        );
      case "plan":
        return (
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-gray-700">Selecciona un plan</label>
            <div className="grid gap-3 md:grid-cols-3">
              <PlanOption
                value="free"
                title="Basico"
                description="Tu ficha en el directorio y resenas abiertas."
                register={register}
                currentValue={watch("plan")}
              />
              <PlanOption
                value="featured"
                title="Destacado"
                description="Posicion preferente y promocion mensual."
                register={register}
                currentValue={watch("plan")}
              />
              <PlanOption
                value="sponsor"
                title="Patrocinado"
                description="Incluye campana digital y banners especificos."
                register={register}
                currentValue={watch("plan")}
              />
            </div>
            <Field label="Notas adicionales">
              <textarea rows={3} className="block w-full rounded border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#38761D]/40" placeholder="Cuentanos necesidades especiales o disponibilidad de pago." {...register("notes")} />
            </Field>
          </div>
        );
      default:
        return null;
    }
  }, [currentStep, formState.errors, register, watch]);

  const currentIndex = stepToIndex(currentStep);
  const hasNext = currentIndex < steps.length - 1;
  const hasPrev = currentIndex > 0;

  if (loading) {
    return <div className="text-center text-sm text-gray-500">Cargando asistente...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#38761D]">Registro de negocio</h1>
          <p className="text-sm text-gray-600">Completa cada paso y guarda tu progreso para terminar mas tarde.</p>
        </div>
        <UserBadge user={user} onSignIn={async () => { await signInWithPopup(auth, googleProvider); }} onSignOut={async () => { await signOut(auth); }} />
      </header>

      <nav className="flex gap-2">
        {steps.map((step, index) => {
          const active = step.key === currentStep;
          const completed = index < stepToIndex(currentStep);
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => completed && setCurrentStep(step.key)}
              className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-[#38761D] bg-[#38761D]/10 text-[#2d5418]" : completed ? "border-[#38761D]/60 text-[#38761D]" : "border-gray-200 text-gray-400"}`}
            >
              <span className="block text-left uppercase tracking-wide">Paso {index + 1}</span>
              <span className="block text-left text-sm font-bold">{step.title}</span>
            </button>
          );
        })}
      </nav>

      {statusMsg && <div className="rounded border border-[#38761D]/40 bg-[#38761D]/10 px-4 py-2 text-sm text-[#2d5418]">{statusMsg}</div>}

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

      {!user && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          Inicia sesion con Google para guardar tu progreso y enviar la solicitud al completar el asistente.
        </div>
      )}
    </div>
  );
}

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
      className={`flex cursor-pointer flex-col space-y-2 rounded-xl border px-4 py-3 text-left shadow-sm transition ${checked ? "border-[#38761D] bg-[#38761D]/10" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-gray-800">{title}</span>
        <input type="radio" value={value} {...register("plan")} className="h-4 w-4" />
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </label>
  );
}

interface UserBadgeProps {
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

function UserBadge({ user, onSignIn, onSignOut }: UserBadgeProps) {
  if (!user) {
    return (
      <button
        type="button"
        className="rounded-lg border border-[#38761D] px-4 py-2 text-sm font-semibold text-[#38761D] hover:bg-[#38761D]/10"
        onClick={onSignIn}
      >
        Iniciar sesion
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
        Cerrar sesion
      </button>
    </div>
  );
}



