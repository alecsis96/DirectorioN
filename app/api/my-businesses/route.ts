import { NextResponse } from 'next/server';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { appRateLimit } from '../../../lib/appRateLimit';
import {
  AuthorizationError,
  extractBearerToken,
  verifyIdTokenOrThrow,
} from '../../../lib/server/authorization';

const limiter = appRateLimit({ interval: 60000, uniqueTokenPerInterval: 20 });

export async function GET(req: Request) {
  try {
    const rate = limiter.check(req, 20);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta más tarde.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rate.remaining.toString(),
            'X-RateLimit-Reset': rate.resetSeconds.toString(),
            'Retry-After': rate.retryAfterSeconds.toString(),
          },
        }
      );
    }

    const decoded = await verifyIdTokenOrThrow(extractBearerToken(req.headers));
    const uid = decoded.uid;
    const db = getAdminFirestore();

    // La lectura privada de negocios depende exclusivamente de ownerId.
    const byIdSnap = await db.collection('businesses').where('ownerId', '==', uid).get();

    const bizMap = new Map<string, Record<string, unknown>>();
    byIdSnap.forEach((doc) => {
      const business = doc.data();
      const { ownerId: _ownerId, ownerUid: _ownerUid, ...privateBusinessView } = business;
      bizMap.set(doc.id, {
        id: doc.id,
        ...privateBusinessView,
        // This flag is authoritative because the server query is ownerId == decoded uid.
        canManage: business.ownerId === uid,
      });
    });

    // Applications v1 por identidad real. ownerEmail nunca concede lectura.
    const [appByIdSnap, appByOwnerSnap] = await Promise.all([
      db.collection('applications').doc(uid).get(),
      db.collection('applications').where('ownerId', '==', uid).limit(3).get(),
    ]);
    const applications: Record<string, unknown>[] = [];
    const appByIdDoc = appByIdSnap as unknown as FirebaseFirestore.DocumentSnapshot;
    if (appByIdDoc && (appByIdDoc as any).exists === true) {
      applications.push({ id: (appByIdDoc as any).id, ...(appByIdDoc.data() as object) });
    }
    if (!appByOwnerSnap.empty) {
      appByOwnerSnap.forEach((doc) => {
        if (!applications.find((a) => (a as any).id === doc.id)) {
          applications.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    return NextResponse.json({
      businesses: Array.from(bizMap.values()),
      applications,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[my-businesses] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
