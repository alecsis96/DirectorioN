import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';

// Wizard simplificado: 2 pasos (0=basics, 1=confirm), último índice es 1.
const LAST_STEP_INDEX = 1;

type SubmitMode = 'wizard' | 'application';

type SubmitBody = {
  formData: Record<string, unknown>;
  step?: number;
  mode?: SubmitMode;
};

function resolveMode(mode: unknown): SubmitMode {
  return mode === 'application' ? 'application' : 'wizard';
}

// ----------------- Helpers de normalización -----------------
function asString(v: unknown, max = 500): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function toArrayFromComma(v: unknown, maxItems = 30): string[] {
  const s = asString(v, 2000);
  if (!s) return [];
  return s
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseLatLng(v: unknown): number | null {
  const s = asString(v, 50);
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function coerceStringArray(v: unknown, allowed?: string[], maxItems = 20): string[] {
  if (!Array.isArray(v)) return [];
  const items = v
    .map(x => asString(x, 100))
    .filter(Boolean);
  const filtered = allowed?.length ? items.filter(x => allowed.includes(x)) : items;
  return Array.from(new Set(filtered)).slice(0, maxItems);
}

type DayKey = 'lunes'|'martes'|'miercoles'|'jueves'|'viernes'|'sabado'|'domingo';
type HorarioDia = { abierto: boolean; desde: string; hasta: string; };
type HorariosSemana = Partial<Record<DayKey, HorarioDia>>;

function labelDia(d: DayKey): string {
  const map: Record<DayKey,string> = {
    lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom'
  };
  return map[d] || d;
}

function isValidTimeStr(t: string): boolean {
  // "HH:MM"
  return /^[0-2]\d:[0-5]\d$/.test(t);
}

function normalizeHorarios(v: unknown): HorariosSemana {
  const h: HorariosSemana = {};
  if (typeof v !== 'object' || v === null) return h;
  const obj = v as Record<string, any>;
  (['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as DayKey[]).forEach((k) => {
    const raw = obj[k];
    if (!raw || typeof raw !== 'object') return;
    const abierto = Boolean(raw.abierto);
    const desde = isValidTimeStr(asString(raw.desde, 5)) ? raw.desde : '08:00';
    const hasta = isValidTimeStr(asString(raw.hasta, 5)) ? raw.hasta : '18:00';
    h[k] = { abierto, desde, hasta };
  });
  return h;
}

function summarizeHorarios(h: HorariosSemana): string {
  const days: DayKey[] = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const parts: string[] = [];
  for (const d of days) {
    const cfg = h[d];
    if (!cfg) continue;
    parts.push(cfg.abierto ? `${labelDia(d)} ${cfg.desde}-${cfg.hasta}` : `${labelDia(d)} cerrado`);
  }
  return parts.join('; ');
}

function buildSummary(formData: Record<string, unknown>, email: string, uid: string) {
  const businessName = asString(formData.businessName ?? 'Negocio sin nombre', 140);
  const ownerName = asString(formData.ownerName ?? formData.displayName ?? 'Propietario desconocido', 140);
  const ownerEmail = asString(formData.ownerEmail ?? formData.email ?? email ?? uid, 200);
  const ownerPhone = asString(formData.ownerPhone ?? '', 30);
  const category = asString(formData.category ?? 'Sin categoría', 80);
  const businessPhone = asString((formData as any).phone ?? '', 30);
  const whatsapp = asString((formData as any).whatsapp ?? '', 30);

  return `🆕 Nueva solicitud de registro

📋 Negocio: ${businessName}
📂 Categoría: ${category}
👤 Propietario: ${ownerName}
📧 Correo: ${ownerEmail}
📱 Teléfono propietario: ${ownerPhone}
☎️ Teléfono negocio: ${businessPhone}
💬 WhatsApp: ${whatsapp}`;
}

// Requires SLACK_WEBHOOK_URL or NOTIFY_WEBHOOK_URL in the environment.
async function sendWebhook(summary: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL ?? process.env.NOTIFY_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: summary }),
  });

  return response.ok;
}

// --------- Construcción del payload "application" enriquecido ----------
function buildApplicationPayload(formData: Record<string, unknown>, decoded: { uid: string; email?: string; name?: string; }) {
  // Campos básicos
  const businessName = asString(formData.businessName, 140);
  const category = asString(formData.category, 80);
  const description = asString(formData.description, 1500);

  // Ubicación
  const address = asString(formData.address, 300);
  const colonia = asString((formData as any).colonia, 120);
  const municipio = asString((formData as any).municipio, 120);
  const referencePoint = asString((formData as any).referencePoint, 200);

  const lat = parseLatLng((formData as any).lat);
  const lng = parseLatLng((formData as any).lng);

  // Contacto/redes
  const phone = asString((formData as any).phone, 30);
  const whatsapp = asString((formData as any).whatsapp ?? (formData as any).whatsappNumber, 30);
  const emailContact = asString((formData as any).emailContact, 200);
  const facebookPage = asString((formData as any).facebookPage, 300);
  const instagramUser = asString((formData as any).instagramUser, 200);
  const website = asString((formData as any).website, 300);
  const tiktok = asString((formData as any).tiktok, 300);

  // Medios
  const logoUrl = asString((formData as any).logoUrl, 500);
  const coverPhoto = asString((formData as any).coverPhoto, 500);
  const gallery = toArrayFromComma((formData as any).gallery, 20);
  const videoPromoUrl = asString((formData as any).videoPromoUrl, 500);

  // Operación/marketing
  const metodoPago = coerceStringArray(
    (formData as any).metodoPago,
    ['efectivo','transferencia','tarjeta','qr']
  );
  const servicios = coerceStringArray(
    (formData as any).servicios,
    ['domicilio','pickup','pedidos_whatsapp','estacionamiento','wifi','pet_friendly']
  );
  const priceRange = (['$','$$','$$$'] as const).includes((formData as any).priceRange as any)
    ? (formData as any).priceRange : '';
  const promocionesActivas = asString((formData as any).promocionesActivas, 400);

  const tags = toArrayFromComma((formData as any).tags, 20);

  // Horarios
  const horarios = normalizeHorarios((formData as any).horarios);
  const hours = summarizeHorarios(horarios);

  // Control
  const plan = (['free','featured','sponsor'] as const).includes((formData as any).plan as any)
    ? (formData as any).plan : 'free';
  const featured = !!(formData as any).featured;
  const approved = (formData as any).approved === true;

  // Identidad del solicitante
  const ownerName = asString((formData as any).ownerName ?? decoded.name ?? '', 140);
  const ownerEmail = asString((formData as any).ownerEmail ?? decoded.email ?? '', 200);
  const ownerPhone = asString((formData as any).ownerPhone ?? '', 30);

  // Notas
  const notes = asString((formData as any).notes, 1000);

  // Estado
  const statusFromRequest = asString((formData as any).status, 20);
  const status = statusFromRequest || 'pending';

  const now = new Date();

  const applicationPayload: Record<string, unknown> = {
    uid: decoded.uid,
    email: decoded.email ?? '',
    displayName: asString((formData as any).displayName ?? decoded.name ?? '', 140),

    // Vista rápida
    businessName,
    category,
    address,
    colonia,
    municipio,
    description,
    status,
    updatedAt: now,

    // Campos enriquecidos
    referencePoint,
    lat: lat ?? null,
    lng: lng ?? null,
    location: lat != null && lng != null ? { lat, lng } : null,

    phone,
    whatsapp,
    emailContact,
    facebookPage,
    instagramUser,
    website,
    tiktok,

    logoUrl,
    coverPhoto,
    gallery,
    videoPromoUrl,

    metodoPago,
    servicios,
    priceRange,
    promocionesActivas,

    tags,
    horarios,
    hours,

    plan,
    featured: featured ? 'si' : 'no',
    approved,

    ownerName,
    ownerEmail,
    ownerPhone,

    notes,

    // Guarda el formData completo por si cambias el modelo en frontend
    formData,
  };

  return applicationPayload;
}

// -------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const body = req.body as SubmitBody | undefined;
    const { formData, step, mode: rawMode } = body ?? {};
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ error: 'Missing form data' });
    }

    const mode = resolveMode(rawMode);
    const db = getAdminFirestore();

    // Envío final (application)
    if (mode === 'application') {
      const docRef = db.doc(`applications/${decoded.uid}`);
      const snapshot = await docRef.get();
      const now = new Date();

      // Construye payload enriquecido
      const applicationPayload = buildApplicationPayload(formData, {
        uid: decoded.uid,
        email: decoded.email ?? undefined,
        name: decoded.name ?? undefined,
      });

      if (!snapshot.exists) {
        (applicationPayload as any).createdAt = now;
      } else if (snapshot.get('createdAt')) {
        (applicationPayload as any).createdAt = snapshot.get('createdAt');
      }

      await docRef.set(applicationPayload, { merge: true });

      // Notificación
      let notified = false;
      try {
        const summary = buildSummary(formData, decoded.email ?? '', decoded.uid);
        notified = await sendWebhook(summary);
      } catch (notifyError) {
        console.error('[businesses/submit] webhook error', notifyError);
      }

      return res.status(200).json({ ok: true, submitted: true, notified });
    }

    // Guardado de progreso (wizard)
    const docRef = db.doc(`business_wizard/${decoded.uid}`);
    const snapshot = await docRef.get();

    const now = new Date();
    const payload: Record<string, unknown> = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      formData,
      updatedAt: now,
    };

    const targetStep = typeof step === 'number' && step >= 0 ? step : undefined;
    if (typeof targetStep !== 'undefined') {
      payload.step = targetStep;
    }

    if (!snapshot.exists) {
      payload.createdAt = now;
    }

    await docRef.set(payload, { merge: true });

    const currentStep = typeof payload.step === 'number' ? payload.step : snapshot.get('step');
    const justSubmitted = typeof currentStep === 'number' && currentStep >= LAST_STEP_INDEX;

    let notified = false;
    if (justSubmitted) {
      const summary = buildSummary(formData, decoded.email ?? '', decoded.uid);
      try {
        notified = await sendWebhook(summary);
      } catch (notifyError) {
        console.error('[businesses/submit] webhook error', notifyError);
      }
    }

    return res.status(200).json({ ok: true, submitted: justSubmitted, notified });
  } catch (error) {
    console.error('[businesses/submit] error', error);
    res.status(500).json({ error: 'Internal error' });
  }
}
