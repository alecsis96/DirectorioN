'use server';

import { cookies, headers } from 'next/headers';
import * as admin from 'firebase-admin';
import { z } from 'zod';

import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../lib/adminOverrides';
import type { Business } from '../../types/business';

type DecodedAdmin = admin.auth.DecodedIdToken & { admin?: boolean };

function decodedIsAdmin(decoded: DecodedAdmin | null | undefined) {
  if (!decoded) return false;
  return decoded.admin === true || hasAdminOverride(decoded.email);
}

const horarioDiaSchema = z.object({
  abierto: z.boolean(),
  desde: z.string(),
  hasta: z.string(),
});

const horariosSchema = z
  .object({
    lunes: horarioDiaSchema.optional(),
    martes: horarioDiaSchema.optional(),
    miercoles: horarioDiaSchema.optional(),
    jueves: horarioDiaSchema.optional(),
    viernes: horarioDiaSchema.optional(),
    sabado: horarioDiaSchema.optional(),
    domingo: horarioDiaSchema.optional(),
  })
  .optional();

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const imageSchema = z.object({
  url: z.string().nullable().optional(),
  publicId: z.string().optional(),
});

const BusinessSchema: z.ZodType<Business & { lat?: number | null; lng?: number | null }> = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    category: z.string().optional(),
    description: z.string().optional(),
    colonia: z.string().optional(),
    neighborhood: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    horarios: horariosSchema,
    phone: z.string().optional(),
    WhatsApp: z.string().optional(),
    Facebook: z.string().optional(),
    price: z.string().optional(),
    rating: z.number().optional(),
    ownerId: z.string().optional(),
    ownerEmail: z.string().optional(),
    plan: z.enum(['free', 'featured', 'sponsor']).or(z.string()).optional(),
    isOpen: z.enum(['si', 'no']).or(z.string()).optional(),
    location: locationSchema.nullable().optional(),
    image1: z.string().nullable().optional(),
    image2: z.string().nullable().optional(),
    image3: z.string().nullable().optional(),
    images: z.array(imageSchema).optional(),
    featured: z.string().optional(),
    priceRange: z.string().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
  })
  .passthrough();

async function readAuthToken(): Promise<string> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization') || '';
  return (
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    cookieStore.get('token')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader) ||
    ''
  );
}

async function verifyAdmin(providedToken?: string): Promise<DecodedAdmin> {
  const token = providedToken || (await readAuthToken());
  if (!token) throw new Error('Autenticación requerida.');
  const auth = getAdminAuth();
  let decoded: DecodedAdmin;
  try {
    decoded = (await auth.verifySessionCookie(token, true)) as DecodedAdmin;
  } catch {
    decoded = (await auth.verifyIdToken(token)) as DecodedAdmin;
  }
  if (!decodedIsAdmin(decoded)) {
    throw new Error('Permisos de administrador requeridos.');
  }
  return decoded;
}

function normalizeString(value: unknown, fallback = '', max = 500): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  if (!str.length) return fallback;
  return str.length > max ? str.slice(0, max) : str;
}

function extractOwnerEmail(app: Record<string, any>, form: Record<string, any>): string {
  const candidates = [
    form.ownerEmail,
    form.emailContact,
    form.email,
    app.email,
    app.ownerEmail,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeString(candidate, '', 200).toLowerCase();
    if (normalized && normalized.includes('@')) return normalized;
  }
  return '';
}

function extractOwnerId(app: Record<string, any>, form: Record<string, any>): string {
  return normalizeString(app.uid || app.ownerId || form.uid || form.ownerId, '', 128);
}

function sanitizeBusinessData(source: Record<string, unknown>) {
  const target: Record<string, unknown> = {};
  let lat: number | null = null;
  let lng: number | null = null;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    switch (key) {
      case 'lat':
      case 'latitude': {
        if (value === null) {
          lat = null;
          target.lat = null;
          target.latitude = null;
          target.location = null;
          break;
        }
        const num = typeof value === 'number' ? value : Number(String(value));
        if (Number.isFinite(num)) lat = num;
        break;
      }
      case 'lng':
      case 'longitude': {
        if (value === null) {
          lng = null;
          target.lng = null;
          target.longitude = null;
          target.location = null;
          break;
        }
        const num = typeof value === 'number' ? value : Number(String(value));
        if (Number.isFinite(num)) lng = num;
        break;
      }
      case 'images': {
        if (!Array.isArray(value)) break;
        target.images = value
          .map((item) => {
            if (typeof item === 'string') {
              const url = item.trim();
              return url ? { url } : null;
            }
            if (item && typeof item === 'object') {
              const maybe = item as Record<string, unknown>;
              const url = normalizeString(maybe.url, '');
              if (!url) return null;
              const payload: Record<string, string> = { url };
              const publicId = normalizeString(maybe.publicId, '');
              if (publicId) payload.publicId = publicId;
              return payload;
            }
            return null;
          })
          .filter(Boolean);
        break;
      }
      default: {
        if (typeof value === 'string') {
          target[key] = value.trim();
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          target[key] = value;
        } else if (value === null) {
          target[key] = null;
        } else if (Array.isArray(value) || (value && typeof value === 'object')) {
          target[key] = value;
        }
      }
    }
  }

  if (lat !== null) {
    target.lat = lat;
    target.latitude = lat;
  }
  if (lng !== null) {
    target.lng = lng;
    target.longitude = lng;
  }
  if (lat !== null && lng !== null) {
    target.location = { lat, lng };
  }
  return target;
}

export async function approveApplication(
  token: string,
  applicationId: string,
  businessOverrides: Record<string, unknown> = {},
) {
  const adminUser = await verifyAdmin(token);
  const db = getAdminFirestore();

  const appRef = db.collection('applications').doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) {
    throw new Error('Solicitud no encontrada.');
  }
  const appData = appSnap.data() || {};
  if (appData.status === 'approved') {
    return { ok: true, businessId: appData.businessId };
  }
  const form = (appData.formData as Record<string, any>) || {};
  const ownerId = extractOwnerId(appData, form);
  const ownerEmail = extractOwnerEmail(appData, form);
  if (!ownerId && !ownerEmail) {
    throw new Error('No se encontró ownerId ni ownerEmail válido.');
  }
  const resolvedOwnerId = ownerId || applicationId;
  const resolvedOwnerEmail = ownerEmail || normalizeString(form.ownerEmail, '', 200);

  // Debug: Log de los datos de la aplicación
  console.log('[approveApplication] Debug data:', {
    applicationId,
    formData: form,
    appData: { ...appData, formData: undefined }, // Excluir formData duplicado
    businessName: form.businessName || form.name || appData.businessName || appData.name,
    extractedOwnerId: resolvedOwnerId,
    extractedOwnerEmail: resolvedOwnerEmail,
  });

  // Intentar múltiples campos para el nombre del negocio
  const businessName = normalizeString(
    form.businessName || form.name || appData.businessName || appData.name,
    'Negocio sin nombre',
    140
  );

  const baseBusiness = {
    name: businessName,
    category: normalizeString(form.category, '', 80),
    description: normalizeString(form.description, '', 1500),
    address: normalizeString(form.address, '', 300),
    colonia: normalizeString(form.colonia, '', 120),
    phone: normalizeString(form.ownerPhone || form.phone, '', 30),
    WhatsApp: normalizeString(form.whatsapp || form.WhatsApp, '', 30),
    Facebook: normalizeString(form.facebookPage || form.Facebook, '', 300),
    hours: normalizeString(form.hours, '', 200),
    price: normalizeString(form.price, '', 100),
    ownerId: resolvedOwnerId,
    ownerEmail: resolvedOwnerEmail,
    ownerName: normalizeString(form.ownerName, '', 140),
    plan: normalizeString(form.plan, 'free', 30),
    featured: false,
    isOpen: 'si',
    status: 'approved', // Cambiado de 'draft' a 'approved' - ya fue revisado por admin
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const payload = { ...baseBusiness, ...businessOverrides };
  const bizRef = db.collection('businesses').doc();
  await bizRef.set(payload, { merge: false });

  await appRef.update({
    status: 'approved',
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    businessId: bizRef.id,
    processedBy: adminUser.uid,
  });

  try {
    await db.collection('events').add({
      t: 'app_approved',
      ts: admin.firestore.FieldValue.serverTimestamp(),
      uid: adminUser.uid,
      sd: false,
    });
  } catch (error) {
    console.warn('[telemetry] app_approved', error);
  }

  return { ok: true, businessId: bizRef.id };
}

export async function deleteApplication(token: string, applicationId: string) {
  await verifyAdmin(token);
  const db = getAdminFirestore();

  await db.doc(`applications/${applicationId}`).delete();
  await db.doc(`businesses/${applicationId}`).delete().catch(() => {});
  await db.doc(`business_wizard/${applicationId}`).delete().catch(() => {});

  return { ok: true };
}

export async function manageBusiness(token: string, businessId: string, updates: Record<string, unknown>) {
  const adminUser = await verifyAdmin(token);
  const db = getAdminFirestore();

  const partialSchema = (BusinessSchema as unknown as z.ZodObject<any>).partial();
  const parsed = partialSchema.safeParse(updates);
  if (!parsed.success) {
    throw new Error('Payload de negocio inválido.');
  }

  const sanitized = sanitizeBusinessData(parsed.data as Record<string, unknown>);
  const ref = db.doc(`businesses/${businessId}`);
  const snap = await ref.get();
  const now = new Date();

  if (!snap.exists) {
    sanitized.createdAt = sanitized.createdAt ?? now;
    if (!sanitized.ownerId) sanitized.ownerId = adminUser.uid;
  }

  sanitized.updatedAt = now;
  if (!sanitized.status) sanitized.status = 'approved';
  if (!sanitized.plan) sanitized.plan = 'free';
  if (!sanitized.isOpen) sanitized.isOpen = 'si';
  if (!sanitized.featured) sanitized.featured = 'no';

  await ref.set(sanitized, { merge: true });
  return { ok: true, businessId };
}
