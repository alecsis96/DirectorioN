'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useForm, UseFormRegister, Controller } from "react-hook-form";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { signOut, type User } from "firebase/auth";
import { submitNewBusiness } from "../app/actions/businesses";
import { createBusinessImmediately } from "../app/actions/businessActions";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_GROUPS, CATEGORIES, getCategoriesByGroup, resolveCategory, type CategoryGroupId } from "../lib/categoriesCatalog";

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
  category: string; // legacy label
  categoryId: string;
  categoryName: string;
  categoryGroupId: CategoryGroupId | "";
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
  categoryId: "",
  categoryName: "",
  categoryGroupId: "",
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
type BusinessWizardProps = {
  publicApplicationV2Enabled?: boolean;
};

type PublicApplicationConfirmation = {
  email: string;
  folio: string;
};

function createBrowserIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto === 'undefined') {
    throw new Error('SECURE_RANDOM_UNAVAILABLE');
  }
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function BusinessWizardProInner({ publicApplicationV2Enabled = false }: BusinessWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wizardMode = searchParams?.get('mode'); // 'new' = forzar nuevo negocio
  const isNewBusinessMode = wizardMode === 'new';
  
  const { register, handleSubmit, reset, getValues, setValue, watch, control, formState } = useForm<WizardData>({
    mode: "onBlur",
    defaultValues,
  });
  
  // Watch category values for display
  const watchedGroupId = watch("categoryGroupId") as CategoryGroupId | "";
  const watchedCategoryId = watch("categoryId") || "";
  const watchedOwnerPhone = watch("ownerPhone") || "";
  const watchedBusinessPhone = watch("phone") || "";

  const [currentStep, setCurrentStep] = useState<StepKey>(steps[0].key);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(() => publicApplicationV2Enabled ? null : auth.currentUser);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [existingBusiness, setExistingBusiness] = useState<{ id: string; name: string } | null>(null);
  const [useOwnerPhoneForBusiness, setUseOwnerPhoneForBusiness] = useState(false);
  const [useBusinessPhoneForWhatsapp, setUseBusinessPhoneForWhatsapp] = useState(false);
  const [publicConfirmation, setPublicConfirmation] = useState<PublicApplicationConfirmation | null>(null);

  const addressRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submittingPublicRef = useRef(false);
  const idempotencyRef = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    if (publicApplicationV2Enabled) {
      setUser(null);
      setEmailVerificationRequired(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      // Verificar si el email está verificado
      if (u && !u.emailVerified) {
        setEmailVerificationRequired(true);
      } else {
        setEmailVerificationRequired(false);
      }
    });
    return () => unsubscribe();
  }, [publicApplicationV2Enabled]);

  //  Verificar si el usuario ya tiene un negocio registrado
  // Si mode=new, solo informar pero NO bloquear el flujo
  useEffect(() => {
    if (publicApplicationV2Enabled) {
      setExistingBusiness(null);
      return;
    }
    if (!user?.uid) {
      setExistingBusiness(null);
      return;
    }

    const checkExistingBusiness = async () => {
      try {
        const q = query(
          collection(db, 'businesses'),
          where('ownerId', '==', user.uid),
          limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          setExistingBusiness({
            id: doc.id,
            name: data.name || data.businessName || 'Tu negocio',
          });
        } else {
          setExistingBusiness(null);
        }
      } catch (error) {
        console.error('Error checking existing business:', error);
      }
    };

    checkExistingBusiness();
  }, [user, publicApplicationV2Enabled]);

  // Carga progreso guardado
  // ⚠️ Si mode=new, NO cargar progreso viejo (empezar limpio)
  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      if (publicApplicationV2Enabled) {
        if (isMounted) setLoading(false);
        return;
      }
      if (!user?.uid) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      // Si mode=new, resetear a valores por defecto y salir (no cargar progreso)
      if (isNewBusinessMode) {
        if (isMounted) {
          reset(defaultValues);
          setLoading(false);
        }
        return;
      }
      
      try {
        if (isMounted) {
          setLoading(true);
        }
        const ref = doc(db, "business_wizard", user.uid);
        const snap = await getDoc(ref);
        if (!isMounted) return;
        
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.formData) {
            const incoming = data.formData as Partial<WizardData>;
            const resolved = resolveCategory(
              incoming.categoryId || incoming.categoryName || incoming.category
            );
            reset({
              ...defaultValues,
              ...incoming,
              category: incoming.category || resolved.categoryName,
              categoryId: incoming.categoryId || resolved.categoryId,
              categoryName: incoming.categoryName || resolved.categoryName,
              categoryGroupId: incoming.categoryGroupId || resolved.groupId,
            });
          }
          if (typeof data?.step === "number" && data.step >= 0 && data.step < steps.length) {
            setCurrentStep(steps[data.step].key);
          }
        }
      } catch (e) {
        console.error("wizard load", e);
        if (isMounted) {
          setStatusMsg("No pudimos cargar tu progreso.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, reset, isNewBusinessMode, publicApplicationV2Enabled]);

  useEffect(() => {
    if (publicApplicationV2Enabled && useOwnerPhoneForBusiness) {
      setValue('phone', watchedOwnerPhone, { shouldValidate: true });
    }
  }, [publicApplicationV2Enabled, setValue, useOwnerPhoneForBusiness, watchedOwnerPhone]);

  useEffect(() => {
    if (publicApplicationV2Enabled && useBusinessPhoneForWhatsapp) {
      setValue('whatsapp', watchedBusinessPhone, { shouldValidate: true });
    }
  }, [publicApplicationV2Enabled, setValue, useBusinessPhoneForWhatsapp, watchedBusinessPhone]);

  // Autocomplete
  usePlacesAutocomplete(addressRef, ({ address, lat, lng }) => {
    setValue("address", address);
    if (typeof lat === "number") setValue("lat", String(lat));
    if (typeof lng === "number") setValue("lng", String(lng));
  });

  const persist = useCallback(
    async (payload: Partial<WizardData>, nextStep?: StepKey, modeOverride?: "wizard" | "application") => {
      if (!user?.uid) {
        setStatusMsg("Inicia sesión para continuar con tu solicitud.");
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error("sign-in wizard", error);
        }
        return;
      }
      const merged = { ...getValues(), ...payload };
      const targetStep = stepToIndex(nextStep ?? currentStep);
      const mode: "wizard" | "application" = modeOverride ?? (nextStep ? "wizard" : "application");
      try {
        setSaving(true);
        const token = await user.getIdToken();
        const body: Record<string, unknown> = { formData: merged, mode };
        if (mode === "wizard") body.step = targetStep;

        const formData = new FormData();
        formData.append("token", token);
        formData.append("mode", mode);
        formData.append("formData", JSON.stringify(merged));
        if (mode === "wizard") {
          formData.append("step", String(targetStep));
        }

        const data = await submitNewBusiness(formData);
        if (!data?.ok) {
          throw new Error("No se pudo guardar");
        }
        return data;
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
      
      // Validar checkbox en el último paso
      if (!next && !confirmChecked) {
        setShowConfirmError(true);
        return;
      }

      if (publicApplicationV2Enabled) {
        if (next) {
          setStatusMsg('');
          setCurrentStep(next.key);
          return;
        }

        if (submittingPublicRef.current) return;
        submittingPublicRef.current = true;
        setSaving(true);
        setStatusMsg('');
        try {
          const merged = { ...getValues(), ...values };
          const business: Record<string, string> = {
            businessName: merged.businessName,
          };
          if (merged.categoryName || merged.category) business.category = merged.categoryName || merged.category;
          if (merged.categoryId) business.categoryId = merged.categoryId;
          if (merged.categoryGroupId) business.categoryGroupId = merged.categoryGroupId;
          if (merged.phone.trim()) business.phone = merged.phone;
          if (merged.whatsapp.trim()) business.whatsapp = merged.whatsapp;

          const requestBody = {
            ownerName: merged.ownerName,
            ownerEmail: merged.ownerEmail,
            ownerPhone: merged.ownerPhone,
            business,
            contactWebsite: honeypotRef.current?.value || '',
          };
          const serialized = JSON.stringify(requestBody);
          if (!idempotencyRef.current || idempotencyRef.current.payload !== serialized) {
            idempotencyRef.current = { payload: serialized, key: createBrowserIdempotencyKey() };
          }

          const response = await fetch('/api/public-applications', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'idempotency-key': idempotencyRef.current.key,
            },
            body: serialized,
          });
          const result = await response.json() as { ok?: boolean; folio?: string };
          if (!response.ok || !result.ok || !result.folio) {
            throw new Error('PUBLIC_APPLICATION_SUBMISSION_FAILED');
          }

          setPublicConfirmation({ email: merged.ownerEmail.trim().toLowerCase(), folio: result.folio });
        } catch (error) {
          console.error('public application submit', error);
          setStatusMsg('No pudimos enviar tu solicitud. Intenta de nuevo.');
        } finally {
          submittingPublicRef.current = false;
          setSaving(false);
        }
        return;
      }
      
      // Si hay siguiente paso, solo guardar progreso
      if (next) {
        await persist(values, next.key, "wizard");
        setCurrentStep(next.key);
        setStatusMsg(" Tu información se guardó correctamente.");
        return;
      }
      
      // LTIMO PASO: Crear negocio inmediatamente y redirigir
      if (!user?.uid) {
        setStatusMsg(" Debes iniciar sesión para completar el registro.");
        return;
      }
      
      setSaving(true);
      setIsRedirecting(true);
      
      try {
        const token = await user.getIdToken();
        const merged = { ...getValues(), ...values };
        
        const formData = new FormData();
        formData.append("token", token);
        formData.append("formData", JSON.stringify(merged));
        
        // ✅ Pasar mode=new al backend para evitar dedupe
        if (isNewBusinessMode) {
          formData.append("mode", "new");
        }
        
        const result = await createBusinessImmediately(formData);
        
        if (!result.success) {
          throw new Error(result.error || 'Error al crear el negocio');
        }
        
        // Mostrar mensaje apropiado (nuevo o duplicado)
        if (result.isDuplicate) {
          setStatusMsg("️ Ya tienes un negocio registrado. Redirigiendo a tu dashboard...");
        } else {
          setStatusMsg(" ¡Tu negocio ya está registrado! Redirigiendo...");
        }
        
        // Redirigir inmediatamente al dashboard
        setTimeout(() => {
          router.push(result.redirectUrl || `/dashboard/${result.businessId}`);
        }, result.isDuplicate ? 500 : 1000);
        
      } catch (error) {
        console.error("submit", error);
        setStatusMsg(" No pudimos crear tu negocio. Intenta de nuevo.");
        setIsRedirecting(false);
        setSaving(false);
      }
    } catch (e) {
      console.error("submit", e);
      setStatusMsg(" Ocurrió un error. Intenta de nuevo.");
      setIsRedirecting(false);
      setSaving(false);
    }
  };

  const onSaveDraft = async () => {
    try {
      await persist(getValues(), currentStep, "wizard");
      setStatusMsg(" Tu borrador se guardó correctamente.");
    } catch (e) {
      console.error("draft", e);
      setStatusMsg(" No pudimos guardar tu borrador. Por favor, intenta de nuevo.");
    }
  };

  const goBack = () => {
    const i = stepToIndex(currentStep);
    if (i > 0) {
      setCurrentStep(steps[i - 1].key);
      setShowConfirmError(false);
    }
  };

  // Resetear checkbox cuando llega al paso de confirmación
  useEffect(() => {
    if (currentStep === 'confirm') {
      setConfirmChecked(false);
      setShowConfirmError(false);
    }
  }, [currentStep]);

  // ------------- Contenido por paso SIMPLIFICADO -------------
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case "basics":
        return (
          <div className="grid gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                 Solicitud de registro simplificada
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
                    placeholder="correo@gmail.com" 
                    {...register("ownerEmail", {
                      required: "Ingresa tu correo",
                      ...(publicApplicationV2Enabled ? {
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresa un correo válido' },
                      } : {}),
                    })}
                  />
                </Field>
                <Field label="Tu teléfono" error={formState.errors.ownerPhone?.message}>
                  <input 
                    className="input" 
                    aria-label="Tu teléfono"
                    placeholder="9611234567" 
                    {...register("ownerPhone", {
                      required: "Ingresa tu teléfono",
                      ...(publicApplicationV2Enabled ? {
                        pattern: { value: /^\+?[\d\s().-]{7,40}$/, message: 'Ingresa un teléfono válido' },
                      } : {}),
                    })}
                  />
                  {publicApplicationV2Enabled && (
                    <label className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        checked={useOwnerPhoneForBusiness}
                        onChange={(event) => setUseOwnerPhoneForBusiness(event.target.checked)}
                      />
                      Usar este número como teléfono del negocio
                    </label>
                  )}
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
                <Field label={publicApplicationV2Enabled ? "Categoría y tipo de negocio" : "Categora"} error={formState.errors.category?.message}>
                  {/* Hidden fields for category metadata */}
                  <input type="hidden" {...register("categoryName")} />
                  <input type="hidden" {...register("category")} />
                  
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700">
                          {publicApplicationV2Enabled ? 'Categoría' : 'Grupo'}
                        </label>
                        <div className="relative">
                          <Controller
                            name="categoryGroupId"
                            control={control}
                            rules={publicApplicationV2Enabled ? { required: 'Selecciona una categoría' } : undefined}
                            render={({ field }) => (
                              <select
                                {...field}
                                aria-label={publicApplicationV2Enabled ? 'Categoría' : 'Grupo'}
                                className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                onChange={(e) => {
                                  const nextGroup = e.target.value as CategoryGroupId;
                                  field.onChange(nextGroup);
                                  // Clear category when group changes
                                  setValue("categoryId", "");
                                  setValue("categoryName", "");
                                  setValue("category", "");
                                }}
                              >
                                <option value="" disabled>
                                  Selecciona un grupo
                                </option>
                                {CATEGORY_GROUPS.map((group) => (
                                  <option key={group.id} value={group.id}>
                                    {group.icon} {group.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          {publicApplicationV2Enabled
                            ? 'Elige la categoría general de tu negocio.'
                            : 'Elige un grupo para acotar las categoras disponibles.'}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700">
                          {publicApplicationV2Enabled ? 'Tipo de negocio' : 'Categora especfica'}
                        </label>
                        <div className="relative">
                          <Controller
                            name="categoryId"
                            control={control}
                            rules={publicApplicationV2Enabled ? { required: 'Selecciona un tipo de negocio' } : undefined}
                            render={({ field }) => {
                              const availableCats = watchedGroupId ? getCategoriesByGroup(watchedGroupId as CategoryGroupId) : [];
                              
                              return (
                                <select
                                  {...field}
                                  aria-label={publicApplicationV2Enabled ? 'Tipo de negocio' : 'Categoría específica'}
                                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                  disabled={!watchedGroupId}
                                  onChange={(e) => {
                                    const catId = e.target.value;
                                    field.onChange(catId);
                                    
                                    if (catId) {
                                      const cat = CATEGORIES.find((c) => c.id === catId);
                                      if (cat) {
                                        setValue("categoryName", cat.name);
                                        setValue("category", cat.name);
                                      }
                                    } else {
                                      setValue("categoryName", "");
                                      setValue("category", "");
                                    }
                                  }}
                                >
                                  {!watchedGroupId && <option value="">Selecciona un grupo primero</option>}
                                  {watchedGroupId && <option value="">Selecciona una categoría</option>}
                                  {watchedGroupId && availableCats.length === 0 && (
                                    <option value="">No hay categoras para este grupo</option>
                                  )}
                                  {watchedGroupId && availableCats.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.icon} {cat.name}
                                    </option>
                                  ))}\n                                </select>
                              );
                            }}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          {publicApplicationV2Enabled
                            ? 'Selecciona la opción que mejor describe tu negocio.'
                            : 'Guardamos el slug estable y la etiqueta legacy para compatibilidad.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <span className="text-base">
                        {(() => {
                          const availableCats = watchedGroupId ? getCategoriesByGroup(watchedGroupId as CategoryGroupId) : [];
                          return availableCats.find((c) => c.id === watchedCategoryId)?.icon ?? "";
                        })()}
                      </span>
                      <div>
                        <div className="font-semibold">
                          {(() => {
                            const availableCats = watchedGroupId ? getCategoriesByGroup(watchedGroupId as CategoryGroupId) : [];
                            return availableCats.find((c) => c.id === watchedCategoryId)?.name ?? "Selecciona una categora";
                          })()}
                        </div>
                        <div className="text-xs text-emerald-700">
                          {publicApplicationV2Enabled ? 'Categoría' : 'Grupo'}: {CATEGORY_GROUPS.find((g) => g.id === watchedGroupId)?.name ?? "Sin seleccionar"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Field>

                <Field label="WhatsApp del negocio">
                  <input 
                    className="input" 
                    aria-label="WhatsApp del negocio"
                    placeholder="5219991234567" 
                    readOnly={publicApplicationV2Enabled && useBusinessPhoneForWhatsapp}
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
                  aria-label="Teléfono del negocio"
                  placeholder="9991234567" 
                  readOnly={publicApplicationV2Enabled && useOwnerPhoneForBusiness}
                  {...register("phone")} 
                />
                {publicApplicationV2Enabled && (
                  <label className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600">
                    <input
                      type="checkbox"
                      checked={useBusinessPhoneForWhatsapp}
                      onChange={(event) => setUseBusinessPhoneForWhatsapp(event.target.checked)}
                    />
                    Usar este número también para WhatsApp
                  </label>
                )}
              </Field>
            </Group>

            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5">
              <p className="text-xs text-amber-900 leading-relaxed">
                <span className="text-sm"></span> Solo necesitamos un medio de contacto.
                Después podrás agregar ubicación, horarios, fotos y más desde tu panel.
              </p>
            </div>
          </div>
        );

      case "confirm":
        const v = getValues();
        return (
          <div className="grid gap-4">
            <div className="rounded-2xl border p-4 bg-gradient-to-br from-[#38761D]/5 to-[#38761D]/10">
              <h3 className="text-lg font-bold text-[#38761D] mb-3"> Resumen de tu solicitud</h3>
              
              <div className="space-y-2 text-sm">
                <p><strong>Responsable:</strong> {v.ownerName || ""}</p>
                <p><strong>Email:</strong> {v.ownerEmail || ""}</p>
                <p><strong>Teléfono:</strong> {v.ownerPhone || ""}</p>
                <hr className="my-3 border-[#38761D]/20" />
                <p><strong>Negocio:</strong> {v.businessName || ""}</p>
                <p><strong>Categoría:</strong> {v.categoryName || v.category || "Sin especificar"}</p>
                <p><strong>Teléfono del negocio:</strong> {v.phone || ""}</p>
                <p><strong>WhatsApp:</strong> {v.whatsapp || ""}</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                ️ <strong>¿Qué sigue?</strong> <br/>
                {publicApplicationV2Enabled
                  ? 'Nuestro equipo revisará tu solicitud y te enviará por correo los siguientes pasos. En este envío no se crea una cuenta ni se asigna la propiedad del negocio.'
                  : 'Un administrador revisará tu solicitud. Si es aprobada, podrás acceder a tu dashboard para completar la información de tu negocio y publicarlo en YajaGon.'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [currentStep, formState.errors, register, control, setValue, getValues, watchedGroupId, watchedCategoryId, publicApplicationV2Enabled, useOwnerPhoneForBusiness, useBusinessPhoneForWhatsapp]);

  const currentIndex = stepToIndex(currentStep);
  const hasNext = currentIndex < steps.length - 1;

  if (loading) {
    return <div className="text-center text-sm text-gray-500">Cargando asistente...</div>;
  }

  if (publicApplicationV2Enabled && publicConfirmation) {
    return (
      <div data-testid="public-application-confirmation" className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Solicitud recibida</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Gracias. Ya recibimos tu solicitud.</h1>
        <p className="mt-4 text-gray-700">
          La revisaremos en un plazo estimado de <strong>24–48 horas</strong> y te avisaremos por correo.
        </p>
        <dl className="mt-6 grid gap-3 rounded-xl bg-gray-50 p-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Correo de contacto</dt>
            <dd className="font-semibold text-gray-900">{publicConfirmation.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Folio</dt>
            <dd className="font-mono font-bold text-gray-900">{publicConfirmation.folio}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-gray-600">
          Guarda este folio. No es una contraseña y no concede acceso ni propiedad sobre el negocio.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#38761D]">Solicitud de registro</h1>
          <p className="text-sm text-gray-600">Registro rápido en 2 pasos
            Completa tu negocio después de la aprobación.
          </p>
        </div>
      </header>

      {/*  Banner de negocio existente */}
      {/* Si mode=new, mostrar banner informativo pero NO bloquear */}
      {!publicApplicationV2Enabled && existingBusiness && user && !isNewBusinessMode && (
        <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-3xl"></div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900 mb-1">
                Ya tienes un negocio registrado
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                <strong>{existingBusiness.name}</strong> ya está en nuestro sistema. 
                Puedes gestionar tu negocio desde el dashboard.
              </p>
              <button
                onClick={() => router.push(`/dashboard/${existingBusiness.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                 Ir a mi Dashboard
                <span></span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Banner informativo en modo nuevo negocio */}
      {!publicApplicationV2Enabled && existingBusiness && user && isNewBusinessMode && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-3xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-1">
                Registrando un negocio adicional
              </h3>
              <p className="text-sm text-amber-800 mb-2">
                Ya tienes <strong>{existingBusiness.name}</strong> registrado. 
                Estás creando un nuevo negocio independiente.
              </p>
              <a
                href={`/dashboard/${existingBusiness.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 hover:text-amber-900 underline"
              >
                Ver mi negocio existente →
              </a>
            </div>
          </div>
        </div>
      )}

      {!publicApplicationV2Enabled && !user && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-start gap-3">
          <span className="text-xl"></span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Para continuar necesitas iniciar sesión.
            </p>
            <p className="text-xs text-blue-700">
              Es rápido y gratuito.
            </p>
          </div>
          <button
            onClick={() => signInWithGoogle()}
            className="rounded-lg bg-[#38761D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f5a1a] transition-all whitespace-nowrap"
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {!publicApplicationV2Enabled && emailVerificationRequired && user && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4 flex items-start gap-3">
          <span className="text-xl">️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 mb-1">
              Debes verificar tu correo electrónico
            </p>
            <p className="text-xs text-yellow-700 mb-3">
              Te enviamos un email de verificación a <strong>{user.email}</strong>. 
              Haz clic en el enlace para continuar con el registro de tu negocio.
            </p>
            <button
              onClick={async () => {
                try {
                  await user.reload();
                  if (user.emailVerified) {
                    setEmailVerificationRequired(false);
                    setStatusMsg(" ¡Email verificado! Ahora puedes continuar.");
                  } else {
                    setStatusMsg("Tu email aún no está verificado. Por favor, revisa tu bandeja de entrada.");
                  }
                } catch (err) {
                  console.error("Error recargando usuario:", err);
                }
              }}
              className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 transition-all"
            >
              Ya verifiqué mi correo
            </button>
          </div>
        </div>
      )}

      <nav className="flex gap-3">
        {steps.map((s, index) => {
          const active = s.key === currentStep;
          const completed = index < stepToIndex(currentStep);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => completed && setCurrentStep(s.key)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-xs font-semibold transition-all ${
                active
                  ? "border-[#38761D] bg-[#38761D]/5 text-[#38761D] shadow-sm"
                  : completed
                  ? "border-[#38761D]/40 bg-white text-[#38761D] hover:bg-[#38761D]/5 cursor-pointer"
                  : "border-gray-200 bg-gray-50/50 text-gray-400 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="uppercase tracking-wider text-[10px] font-bold">
                  Paso {index + 1}
                </span>
                {completed && (
                  <span className="text-[#38761D] text-base"></span>
                )}
              </div>
              <span className="block text-left text-sm font-bold">{s.title}</span>
            </button>
          );
        })}
      </nav>

      {statusMsg && (
        <div className={`rounded-xl border-2 px-4 py-4 ${
          /No pudimos|Debes iniciar|Ocurrió un error|aún no está verificado/.test(statusMsg)
            ? 'border-red-300 bg-red-50 text-red-800'
            : statusMsg.includes('Redirigiendo')
            ? 'border-blue-400 bg-blue-50 text-blue-800'
            : 'border-green-400 bg-green-50 text-green-800'
        }`}>
          <p className="font-bold text-base mb-2 flex items-center gap-2">
            <span className="text-xl">
              {/No pudimos|Debes iniciar|Ocurrió un error|aún no está verificado/.test(statusMsg) ? '⚠️' : statusMsg.includes('Redirigiendo') ? '⏳' : '✓'}
            </span>
            <span>{statusMsg.trim()}</span>
          </p>
          {isRedirecting && (
            <div className="mt-4 space-y-3">
              <div className="bg-white rounded-lg border border-blue-200 p-4 text-center">
                <div className="mb-3">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                   Tu negocio ya está registrado.
                </p>
                <p className="text-xs text-gray-600">
                  Ahora complétalo para aparecer en YajaGon más rápido.
                </p>
              </div>
            </div>
          )}
          {submittedEmail && !isRedirecting && (
            <div className="mt-4 space-y-3">
              <div className="bg-white rounded-lg border border-green-200 p-3">
                <p className="text-sm text-gray-700">
                   <span className="font-medium">Email registrado:</span>{' '}
                  <span className="font-semibold text-gray-900">{submittedEmail}</span>
                </p>
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Tiempo estimado de revisión: <strong>24–48 horas</strong></span>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="/mis-solicitudes"
                  className="flex-1 inline-block bg-[#38761D] text-white px-4 py-2.5 rounded-lg hover:bg-[#2f5a1a] hover:shadow-md transition font-semibold text-center text-sm"
                >
                   Consultar estado de mi solicitud
                </a>
                <a
                  href={`/solicitud/${encodeURIComponent(submittedEmail)}`}
                  className="flex-1 inline-block border-2 border-gray-300 bg-white text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition font-semibold text-center text-sm"
                >
                   Ver todas mis solicitudes
                </a>
              </div>
              
              <p className="text-xs text-gray-600 leading-relaxed">
                 Te notificaremos cuando tu solicitud sea aprobada para que puedas completar los datos de tu negocio.
              </p>
            </div>
          )}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onStepSubmit)}>
        {publicApplicationV2Enabled && (
          <input
            ref={honeypotRef}
            type="text"
            name="contactWebsite"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px opacity-0"
          />
        )}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {stepContent}
        </section>

        {currentStep === 'confirm' && (
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => {
                  setConfirmChecked(e.target.checked);
                  setShowConfirmError(false);
                }}
                className="mt-1 h-5 w-5 rounded border-gray-300 text-[#38761D] focus:ring-2 focus:ring-[#38761D]/40 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-800">
                Confirmo que la información proporcionada es correcta.
              </span>
            </label>
            {showConfirmError && (
              <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                <span>️</span>
                <span>Por favor, confirma que la información es correcta antes de enviar.</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={currentIndex === 0 || saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
             Anterior
          </button>
          <div className="flex items-center gap-3">
            {!publicApplicationV2Enabled && user?.uid && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                 Guardar borrador
              </button>
            )}
            <button
              type="submit"
              disabled={saving || (!hasNext && !confirmChecked) || (!publicApplicationV2Enabled && emailVerificationRequired) || isRedirecting}
              className="rounded-lg bg-[#38761D] px-6 py-2 text-sm font-bold text-white hover:bg-[#2f5a1a] hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isRedirecting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Redirigiendo...
                </span>
              ) : hasNext ? (
                "Siguiente "
              ) : (
                publicApplicationV2Enabled ? "Enviar solicitud" : " Completar mi negocio"
              )}
            </button>
          </div>
        </div>
        
        {!hasNext && (
          <p className="text-xs text-gray-500 text-center mt-2">
            ⏱️ Tiempo de revisión estimado: 24–48 horas
          </p>
        )}
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
    <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#38761D]/20 text-sm font-bold text-[#38761D]">
        {initials}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{user.displayName || user.email}</p>
        <p className="text-xs text-gray-600">{user.email}</p>
        <p className="text-[10px] text-green-600 font-medium mt-0.5">
           Sesión activa. Puedes continuar con tu solicitud.
        </p>
      </div>
      <button 
        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors" 
        onClick={onSignOut}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

// Wrapper con Suspense para useSearchParams
export default function BusinessWizardPro(props: BusinessWizardProps) {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500">Cargando formulario...</div>}>
      <BusinessWizardProInner {...props} />
    </Suspense>
  );
}

