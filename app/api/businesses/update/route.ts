import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';

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
  'hasDelivery',
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
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminFirestore();
    const ref = db.doc(`businesses/${businessId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const data = snap.data() || {};
    const ownerId = data.ownerId;
    const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
    const isAdmin = decoded.admin === true || hasAdminOverride(decoded.email);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para editar este negocio' }, { status: 403 });
    }

    const sanitized = sanitizeUpdates(updates);
    if (!Object.keys(sanitized).length) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    sanitized.updatedAt = new Date();
    await ref.set(sanitized, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/businesses/update] error', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
