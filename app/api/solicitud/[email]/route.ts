import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../../lib/adminOverrides';
import { appRateLimit } from '../../../../lib/appRateLimit';

type Params = {
  email: string;
};

const limiter = appRateLimit({ interval: 60000, uniqueTokenPerInterval: 10 });

const normalizeEmail = (value: string | undefined) => {
  if (!value) return '';
  return value.trim().toLowerCase();
};

const serializeDate = (value: any) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<Params> },
) {
  const rate = limiter.check(_request, 10);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rate.remaining.toString(),
          'X-RateLimit-Reset': rate.resetSeconds.toString(),
          'Retry-After': rate.retryAfterSeconds.toString(),
        },
      }
    );
  }

  const resolvedParams = await context.params;
  const rawEmail = resolvedParams?.email ? decodeURIComponent(resolvedParams.email) : '';
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Email inválido' },
      { status: 400 },
    );
  }

  try {
    const authHeader = _request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    const auth = getAdminAuth();
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 },
      );
    }

    const requesterEmail = normalizeEmail(decoded.email);
    const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);
    if (!isAdmin && requesterEmail !== email) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 },
      );
    }

    const db = getAdminFirestore();
    const applicationsQuery = db
      .collection('applications')
      .where('ownerEmail', '==', email)
      .orderBy('createdAt', 'desc');
    const businessesQuery = db
      .collection('businesses')
      .where('ownerEmail', '==', email)
      .orderBy('createdAt', 'desc');

    const [applicationsSnap, businessesSnap] = await Promise.all([
      applicationsQuery.get(),
      businessesQuery.get(),
    ]);

    const applications = applicationsSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        businessName: data.businessName || data.name || 'Negocio sin nombre',
        status: data.status || 'pending',
        createdAt: serializeDate(data.createdAt),
        type: 'application' as const,
      };
    });

    const businesses = businessesSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        businessName: data.businessName || data.name || 'Negocio sin nombre',
        status: data.status || 'draft',
        createdAt: serializeDate(data.createdAt),
        type: 'business' as const,
      };
    });

    const items = [...applications, ...businesses].sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[api/solicitud/[email]] error', error);
    return NextResponse.json(
      { error: 'No se pudieron obtener las solicitudes' },
      { status: 500 },
    );
  }
}
