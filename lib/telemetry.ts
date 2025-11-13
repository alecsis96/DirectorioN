import { auth } from "../firebaseConfig";

type TelemetryEventInput = {
  t: "pv" | "cta_call" | "cta_wa" | "cta_maps" | "cta_fb" | "open_manage" | "review_submit" | "app_approved";
  p?: "home" | "list" | "detail";
  b?: string;
  r?: number;
};

const CRITICAL_EVENTS = new Set<TelemetryEventInput["t"]>(["pv", "cta_call", "cta_wa", "cta_maps", "cta_fb"]);

export async function sendEvent(payload: TelemetryEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  const saveData = Boolean(connection?.saveData);
  if (saveData && !CRITICAL_EVENTS.has(payload.t)) return;

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
