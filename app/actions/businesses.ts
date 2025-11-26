'use server';

import { z } from 'zod';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../lib/adminOverrides';

const LAST_STEP_INDEX = 1;

type SubmitMode = 'wizard' | 'application';

const submitActionSchema = z.object({
  token: z.string().min(1, 'Missing auth token'),
  mode: z.enum(['wizard', 'application']).optional(),
  step: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim().length) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    }),
  formPayload: z.string().min(2, 'Missing form data JSON'),
});

const updateActionSchema = z.object({
  token: z.string().min(1, 'Missing auth token'),
  businessId: z.string().min(1, 'Missing business id'),
  updates: z.string().min(2, 'Missing updates payload'),
});

const ALLOWED_FIELDS = new Set([
  'name',
  'category',
  'address',
  'colonia',
  'description',
  'phone',
  'WhatsApp',
  'Facebook',
  'hours',
  'horarios',
  'images',
  'hasDelivery',
  'lat',
  'lng',
]);

type DayKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
type HorarioDia = { abierto: boolean; desde: string; hasta: string };
type HorariosSemana = Partial<Record<DayKey, HorarioDia>>;

const weekdays: DayKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const parseJsonObject = (value: string, label: string) => {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`${label} debe ser un objeto.`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(`No pudimos interpretar ${label}: ${(error as Error).message}`);
  }
};

function resolveMode(mode: unknown): SubmitMode {
  return mode === 'application' ? 'application' : 'wizard';
}

function asString(value: unknown, max = 500): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.length > max ? str.slice(0, max) : str;
}

function toArrayFromComma(value: unknown, maxItems = 30): string[] {
  const str = asString(value, 2000);
  if (!str) return [];
  return str
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseLatLng(value: unknown): number | null {
  const str = asString(value, 50);
  if (!str) return null;
  const parsed = Number(str.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceStringArray(value: unknown, allowed?: string[], maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((entry) => asString(entry, 100))
    .filter(Boolean);
  const filtered = allowed?.length ? items.filter((item) => allowed.includes(item)) : items;
  return Array.from(new Set(filtered)).slice(0, maxItems);
}

function isValidTimeStr(value: string): boolean {
  return /^[0-2]\d:[0-5]\d$/.test(value);
}

function normalizeHorarios(value: unknown): HorariosSemana {
  const normalized: HorariosSemana = {};
  if (typeof value !== 'object' || value === null) return normalized;
  const obj = value as Record<string, any>;
  weekdays.forEach((key) => {
    const raw = obj[key];
    if (!raw || typeof raw !== 'object') return;
    const abierto = Boolean(raw.abierto);
    const desde = isValidTimeStr(asString(raw.desde, 5)) ? raw.desde : '08:00';
    const hasta = isValidTimeStr(asString(raw.hasta, 5)) ? raw.hasta : '18:00';
    normalized[key] = { abierto, desde, hasta };
  });
  return normalized;
}

function labelDia(day: DayKey): string {
  const labels: Record<DayKey, string> = {
    lunes: 'Lun',
    martes: 'Mar',
    miercoles: 'Mié',
    jueves: 'Jue',
    viernes: 'Vie',
    sabado: 'Sáb',
    domingo: 'Dom',
  };
  return labels[day];
}

function summarizeHorarios(value: HorariosSemana): string {
  const parts: string[] = [];
  weekdays.forEach((day) => {
    const cfg = value[day];
    if (!cfg) return;
    parts.push(cfg.abierto ? `${labelDia(day)} ${cfg.desde}-${cfg.hasta}` : `${labelDia(day)} cerrado`);
  });
  return parts.join('; ');
}

function normalizeEmailValue(value: string) {
  if (!value) return '';
  return value.trim().toLowerCase();
}

function buildSummary(formData: Record<string, unknown>, email: string, uid: string) {
  const businessName = asString(formData.businessName ?? 'Negocio sin nombre', 140);
  const ownerName = asString(formData.ownerName ?? formData.displayName ?? 'Propietario desconocido', 140);
  const ownerEmail = normalizeEmailValue(asString(formData.ownerEmail ?? formData.email ?? email ?? uid, 200));
  const ownerPhone = asString(formData.ownerPhone ?? '', 30);
  const category = asString(formData.category ?? 'Sin categoría', 80);
  const businessPhone = asString((formData as any).phone ?? '', 30);
  const whatsapp = asString((formData as any).whatsapp ?? '', 30);

  return `Nueva solicitud de registro

Negocio: ${businessName}
Categoría: ${category}
Propietario: ${ownerName}
Correo: ${ownerEmail}
Teléfono propietario: ${ownerPhone}
Teléfono negocio: ${businessPhone}
WhatsApp: ${whatsapp}`;
}

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

function buildApplicationPayload(
  formData: Record<string, unknown>,
  owner: { uid: string; email?: string; name?: string },
) {
  const businessName = asString(formData.businessName ?? 'Negocio sin nombre', 140);
  const ownerName = asString(formData.ownerName ?? owner.name ?? '', 140);
  const ownerEmail = normalizeEmailValue(asString(formData.ownerEmail ?? owner.email ?? '', 200));
  const ownerPhone = asString(formData.ownerPhone ?? '', 30);
  const description = asString(formData.description, 2000);
  const category = asString(formData.category ?? '', 120);
  const tags = toArrayFromComma(formData.tags, 30);
  const address = asString(formData.address ?? '', 400);
  const colonia = asString(formData.colonia ?? '', 140);
  const municipio = asString(formData.municipio ?? '', 140);
  const lat = parseLatLng(formData.lat);
  const lng = parseLatLng(formData.lng);
  const referencePoint = asString(formData.referencePoint ?? '', 400);
  const phone = asString(formData.phone ?? '', 30);
  const whatsapp = asString(formData.whatsapp ?? '', 30);
  const emailContact = asString(formData.emailContact ?? '', 140);
  const facebookPage = asString(formData.facebookPage ?? '', 200);
  const instagramUser = asString(formData.instagramUser ?? '', 200);
  const website = asString(formData.website ?? '', 200);
  const tiktok = asString(formData.tiktok ?? '', 200);
  const logoUrl = asString(formData.logoUrl ?? '', 400);
  const coverPhoto = asString(formData.coverPhoto ?? '', 400);
  const gallery = toArrayFromComma(formData.gallery, 50);
  const videoPromoUrl = asString(formData.videoPromoUrl ?? '', 400);
  const metodoPago = coerceStringArray(formData.metodoPago);
  const servicios = coerceStringArray(formData.servicios);
  const priceRange = asString(formData.priceRange ?? '', 10);
  const promocionesActivas = asString(formData.promocionesActivas ?? '', 500);
  const horarios = normalizeHorarios(formData.horarios);
  const hours = summarizeHorarios(horarios);
  const plan = asString(formData.plan ?? 'free', 20) || 'free';
  const featured = Boolean(formData.featured);
  const notes = asString(formData.notes ?? '', 800);

  const payload: Record<string, unknown> = {
    businessName,
    ownerName,
    ownerEmail,
    ownerPhone,
    description,
    category,
    tags,
    address,
    colonia,
    municipio,
    lat,
    lng,
    referencePoint,
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
    horarios,
    hours,
    plan: 'free', // Siempre inicia como free hasta que sea aprobado
    featured: false,
    ownerId: owner.uid,
    ownerUid: owner.uid,
    notes,
    formData,
    status: 'pending', // Siempre pending hasta aprobación del admin
  };

  if (lat != null && lng != null) {
    payload.location = { lat, lng };
  }

  return payload;
}

function sanitizeUpdates(source: Record<string, unknown>) {
  const target: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (value === undefined) continue;
    target[key] = value;
  }
  return target;
}

export async function submitNewBusiness(formData: FormData) {
  const rawStep = formData.get('step');
  const parsed = submitActionSchema.parse({
    token: formData.get('token'),
    mode: formData.get('mode'),
    step: rawStep ?? undefined,
    formPayload: formData.get('formData') ?? formData.get('payload'),
  });

  const payload = parseJsonObject(parsed.formPayload, 'formData');
  const mode = resolveMode(parsed.mode);

  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(parsed.token);
  const db = getAdminFirestore();

  if (mode === 'application') {
    const docRef = db.doc(`applications/${decoded.uid}`);
    const snapshot = await docRef.get();
    const now = new Date();
    const applicationPayload = buildApplicationPayload(payload, {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      name: decoded.name ?? undefined,
    });

    if (!snapshot.exists) {
      applicationPayload.createdAt = now;
    } else if (snapshot.get('createdAt')) {
      applicationPayload.createdAt = snapshot.get('createdAt');
    }

    applicationPayload.updatedAt = now;

    await docRef.set(applicationPayload, { merge: true });

    let notified = false;
    try {
      const summary = buildSummary(payload, decoded.email ?? '', decoded.uid);
      notified = await sendWebhook(summary);
    } catch (error) {
      console.error('[server-action submitNewBusiness] webhook error', error);
    }

    // Enviar email de bienvenida (solo si es nueva aplicación)
    if (!snapshot.exists && decoded.email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/send-email-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            to: decoded.email,
            businessName: asString(payload.businessName, 140),
            ownerName: asString(payload.ownerName ?? decoded.name, 140),
          }),
        });
      } catch (emailError) {
        console.warn('[server-action] Failed to send welcome email:', emailError);
        // No fallar la operación si el email falla
      }
    }

    return { ok: true, submitted: true, notified };
  }

  const docRef = db.doc(`business_wizard/${decoded.uid}`);
  const snapshot = await docRef.get();
  const now = new Date();
  const wizardPayload: Record<string, unknown> = {
    uid: decoded.uid,
    email: decoded.email ?? '',
    formData: payload,
    updatedAt: now,
  };

  const stepValue = typeof parsed.step === 'number' && parsed.step >= 0 ? parsed.step : undefined;
  if (typeof stepValue === 'number') {
    wizardPayload.step = stepValue;
  }

  if (!snapshot.exists) {
    wizardPayload.createdAt = now;
  }

  await docRef.set(wizardPayload, { merge: true });

  const currentStep = typeof wizardPayload.step === 'number' ? wizardPayload.step : snapshot.get('step');
  const justSubmitted = typeof currentStep === 'number' && currentStep >= LAST_STEP_INDEX;

  let notified = false;
  if (justSubmitted) {
    const summary = buildSummary(payload, decoded.email ?? '', decoded.uid);
    try {
      notified = await sendWebhook(summary);
    } catch (error) {
      console.error('[server-action submitNewBusiness] webhook after wizard error', error);
    }
  }

  return { ok: true, submitted: justSubmitted, notified };
}

export async function updateBusinessDetails(businessId: string, formData: FormData) {
  const parsed = updateActionSchema.parse({
    token: formData.get('token'),
    businessId,
    updates: formData.get('updates'),
  });

  const updates = parseJsonObject(parsed.updates, 'updates');
  const sanitized = sanitizeUpdates(updates);
  if (!Object.keys(sanitized).length) {
    throw new Error('No hay campos válidos para actualizar.');
  }

  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(parsed.token);
  const db = getAdminFirestore();
  const ref = db.doc(`businesses/${parsed.businessId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Negocio no encontrado.');
  }

  const data = snap.data() as Record<string, unknown> | undefined;
  const ownerId = data?.ownerId;
  const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
  const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);
  if (!isOwner && !isAdmin) {
    throw new Error('No tienes permisos para editar este negocio.');
  }

  sanitized.updatedAt = new Date();
  await ref.set(sanitized, { merge: true });

  return { ok: true };
}
