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
    const email = (decoded.email || '').toLowerCase();

    const db = getAdminFirestore();

    // La lectura privada de negocios depende exclusivamente de ownerId.
    const byIdSnap = await db.collection('businesses').where('ownerId', '==', uid).get();

    const bizMap = new Map<string, Record<string, unknown>>();
    byIdSnap.forEach((doc) => bizMap.set(doc.id, { id: doc.id, ...doc.data() }));

    // Applications (pending) by uid or email
    const appQueries = [
      db.collection('applications').doc(uid).get(),
      ...(email ? [db.collection('applications').where('ownerEmail', '==', email).limit(3).get()] : []),
    ];
    const [appByIdSnap, appByEmailSnap] = await Promise.all(appQueries);
    const applications: Record<string, unknown>[] = [];
    const appByIdDoc = appByIdSnap as unknown as FirebaseFirestore.DocumentSnapshot;
    if (appByIdDoc && (appByIdDoc as any).exists === true) {
      applications.push({ id: (appByIdDoc as any).id, ...(appByIdDoc.data() as object) });
    }
    const appByEmailQuerySnap = appByEmailSnap as FirebaseFirestore.QuerySnapshot | null;
    if (appByEmailQuerySnap && !appByEmailQuerySnap.empty) {
      appByEmailQuerySnap.forEach((doc) => {
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
