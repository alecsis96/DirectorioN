import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { appRateLimit } from '../../../lib/appRateLimit';

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

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    const db = getAdminFirestore();

    // Businesses by ownerId
    const byIdSnap = await db.collection('businesses').where('ownerId', '==', uid).get();
    // Businesses by ownerEmail
    const byEmailSnap = email
      ? await db.collection('businesses').where('ownerEmail', '==', email).get()
      : null;

    const bizMap = new Map<string, Record<string, unknown>>();
    byIdSnap.forEach((doc) => bizMap.set(doc.id, { id: doc.id, ...doc.data() }));
    byEmailSnap?.forEach((doc) => bizMap.set(doc.id, { id: doc.id, ...doc.data() }));

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
    console.error('[my-businesses] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
