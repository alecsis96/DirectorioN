import { auth } from "../firebaseConfig";

// Tipos de eventos de telemetría
export type TelemetryEventType =
  // Navegación
  | "page_view"
  | "search"
  | "filter_applied"
  | "sort_changed"
  
  // Interacciones con negocios
  | "business_viewed"
  | "business_card_clicked"
  | "business_image_viewed"
  | "business_hours_checked"
  | "business_shared"
  
  // CTAs de contacto
  | "cta_call"
  | "cta_whatsapp"
  | "cta_maps"
  | "cta_facebook"
  | "cta_instagram"
  | "cta_website"
  | "cta_email"
  
  // Favoritos
  | "favorite_added"
  | "favorite_removed"
  | "favorites_viewed"
  
  // Reviews
  | "review_started"
  | "review_submitted"
  | "review_edited"
  | "review_deleted"
  
  // Registro y autenticación
  | "register_started"
  | "register_step_completed"
  | "register_completed"
  | "login_initiated"
  | "login_completed"
  | "logout"
  
  // Dashboard de negocios
  | "dashboard_viewed"
  | "business_edited"
  | "business_payment_initiated"
  | "business_payment_completed"
  
  // Errores
  | "error_occurred"
  | "api_error";

export type TelemetryPage = "home" | "negocios" | "detail" | "dashboard" | "registro" | "admin" | "favoritos";

export type TelemetryEventInput = {
  // Tipo de evento
  event: TelemetryEventType;
  
  // Página donde ocurrió
  page?: TelemetryPage;
  
  // ID del negocio (si aplica)
  businessId?: string;
  
  // Nombre del negocio (si aplica)
  businessName?: string;
  
  // Categoría del negocio (si aplica)
  category?: string;
  
  // Valor numérico (rating, step number, etc.)
  value?: number;
  
  // Término de búsqueda
  searchQuery?: string;
  
  // Filtros aplicados
  filters?: Record<string, any>;
  
  // Datos adicionales
  metadata?: Record<string, any>;
  
  // Información de error
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
};

// Eventos críticos que se envían incluso en modo Save Data
const CRITICAL_EVENTS = new Set<TelemetryEventType>([
  "page_view",
  "cta_call",
  "cta_whatsapp",
  "cta_maps",
  "cta_facebook",
  "register_completed",
  "business_payment_completed",
]);

// Helper para tracking rápido de page views
export function trackPageView(page: TelemetryPage, metadata?: Record<string, any>) {
  return sendEvent({
    event: "page_view",
    page,
    metadata: {
      ...metadata,
      pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    },
  });
}

// Helper para tracking de interacciones con negocios
export function trackBusinessInteraction(
  event: TelemetryEventType,
  businessId: string,
  businessName?: string,
  category?: string,
  metadata?: Record<string, any>
) {
  return sendEvent({
    event,
    businessId,
    businessName,
    category,
    metadata,
  });
}

// Helper para tracking de CTAs
export function trackCTA(
  type: "call" | "whatsapp" | "maps" | "facebook" | "instagram" | "website" | "email",
  businessId: string,
  businessName?: string
) {
  const eventMap = {
    call: "cta_call",
    whatsapp: "cta_whatsapp",
    maps: "cta_maps",
    facebook: "cta_facebook",
    instagram: "cta_instagram",
    website: "cta_website",
    email: "cta_email",
  } as const;

  return sendEvent({
    event: eventMap[type] as TelemetryEventType,
    businessId,
    businessName,
  });
}

// Helper para tracking de errores
export function trackError(error: Error, context?: Record<string, any>) {
  return sendEvent({
    event: "error_occurred",
    error: {
      message: error.message,
      code: (error as any).code,
      stack: error.stack,
    },
    metadata: context,
  });
}

export async function sendEvent(payload: TelemetryEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  const saveData = Boolean(connection?.saveData);
  if (saveData && !CRITICAL_EVENTS.has(payload.event)) return;

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Save-Data": saveData ? "on" : "off",
  };

  const user = auth.currentUser;
  if (user) {
    try {
      headers.Authorization = `Bearer ${await user.getIdToken(true)}`;
    } catch {
      // ignore token errors, send anonymously
    }
  }

  const url = "/api/telemetry/ingest";

  if (navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    } catch {
      // fallback to fetch
    }
  }

  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
  } catch {
    // swallow network errors
  }
}
