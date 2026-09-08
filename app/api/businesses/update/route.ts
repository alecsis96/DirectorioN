import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';
import { getResourceLimit, normalizePlan } from '../../../../lib/planPermissions';
import { updateBusinessState } from '../../../../lib/businessStates';

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
  'logoUrl',
  'logoPublicId',
  'coverUrl',
  'coverPublicId',
  'hasEnvio',
  'lat',
  'lng',
  'location',
]);

function sanitizeUpdates(source: Record<string, unknown>) {
  const target: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (value === undefined) continue;
    target[key] = value;
  }
  return target;
}

function sanitizeImageItems(value: unknown, maxImages: number) {
  if (!Array.isArray(value) || maxImages <= 0) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const url = typeof (item as { url?: unknown }).url === 'string'
        ? (item as { url: string }).url.trim().slice(0, 500)
        : '';
      const publicId = typeof (item as { publicId?: unknown }).publicId === 'string'
        ? (item as { publicId: string }).publicId.trim().slice(0, 300)
        : '';

      if (!url) return null;
      return { url, publicId };
    })
    .filter((item): item is { url: string; publicId: string } => Boolean(item))
    .slice(0, maxImages);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const businessId = body?.businessId;
    const updates = body?.updates;
    if (!businessId || !updates) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token, true);
    const db = getAdminFirestore();
    const ref = db.doc(`businesses/${businessId}`);
    const sanitized = sanitizeUpdates(updates);
    if (!Object.keys(sanitized).length) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('BUSINESS_NOT_FOUND');
      const data = snap.data() || {};
      const isOwner = typeof data.ownerId === 'string' && data.ownerId === decoded.uid;
      const isAdmin = decoded.admin === true || hasAdminOverride(decoded.email);
      if (!isOwner && !isAdmin) throw new Error('BUSINESS_FORBIDDEN');

      const currentStatus = data.businessStatus ??
        (data.status === 'published' ? 'published' : 'draft');
      if (currentStatus === 'published' && !isAdmin) throw new Error('BUSINESS_PUBLISHED');
      if (data.businessStatus === 'deleted') throw new Error('BUSINESS_DELETED');

      if ('images' in sanitized) {
        const plan = normalizePlan(typeof data.plan === 'string' ? data.plan : 'free');
        sanitized.images = sanitizeImageItems(
          sanitized.images,
          getResourceLimit(plan, 'galleryPhotos'),
        );
      }
      const reviewInvalidated = currentStatus === 'in_review';
      const nextState = updateBusinessState({
        ...data,
        ...sanitized,
        ...(reviewInvalidated ? { businessStatus: 'draft' as const } : {}),
      });
      const now = new Date();
      transaction.set(ref, {
        ...sanitized,
        ...nextState,
        ...(reviewInvalidated ? {
          businessStatus: 'draft',
          reviewInvalidatedAt: now,
          reviewInvalidatedBy: decoded.uid,
        } : {}),
        updatedAt: now,
      }, { merge: true });
      return { reviewInvalidated };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'BUSINESS_NOT_FOUND') {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'BUSINESS_FORBIDDEN') {
      return NextResponse.json({ error: 'No tienes permisos para editar este negocio' }, { status: 403 });
    }
    if (error instanceof Error && (error.message === 'BUSINESS_PUBLISHED' || error.message === 'BUSINESS_DELETED')) {
      return NextResponse.json({ error: 'Este negocio no puede editarse desde este flujo' }, { status: 409 });
    }
    console.error('[api/businesses/update] error', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
