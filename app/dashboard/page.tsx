import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DecodedIdToken } from 'firebase-admin/auth';

import DashboardBusinessList, {
  type DashboardApplicationStatus,
  type DashboardBusiness,
} from '../../components/DashboardBusinessList';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';

export const dynamic = 'force-dynamic';

async function requireAuthenticatedUser(): Promise<DecodedIdToken> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    cookieStore.get('token')?.value ||
    cookieStore.get('firebaseToken')?.value ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

  if (!token) {
    redirect('/para-negocios?auth=required');
  }

  const auth = getAdminAuth();
  try {
    return await auth.verifySessionCookie(token, true);
  } catch (sessionError) {
    try {
      return await auth.verifyIdToken(token);
    } catch (error) {
      console.error('[dashboard] auth error', error);
      redirect('/para-negocios?auth=required');
    }
  }
}

async function fetchBusinessesForUser(
  uid: string,
  email?: string | null,
): Promise<DashboardBusiness[]> {
  const db = getAdminFirestore();
  const result = new Map<string, DashboardBusiness>();
  const byOwner = await db.collection('businesses').where('ownerId', '==', uid).get();
  byOwner.forEach((doc) => {
    result.set(doc.id, { id: doc.id, ...(doc.data() as Record<string, unknown>) });
  });

  if (email) {
    const attempts = new Set([email, email.toLowerCase()]);
    for (const value of attempts) {
      if (!value) continue;
      const byEmail = await db.collection('businesses').where('ownerEmail', '==', value).get();
      byEmail.forEach((doc) => {
        result.set(doc.id, { id: doc.id, ...(doc.data() as Record<string, unknown>) });
      });
      if (!byEmail.empty) break;
    }
  }

  return Array.from(result.values());
}

async function fetchApplicationStatus(uid: string): Promise<DashboardApplicationStatus> {
  const db = getAdminFirestore();
  const appDoc = await db.doc(`applications/${uid}`).get();
  if (!appDoc.exists) return null;
  const status = (appDoc.data()?.status as DashboardApplicationStatus) ?? 'pending';
  return status;
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const businesses = await fetchBusinessesForUser(user.uid, user.email ?? null);
  const status = await fetchApplicationStatus(user.uid);

  return (
    <DashboardBusinessList
      ownerId={user.uid}
      ownerEmail={user.email ?? null}
      initialBusinesses={businesses}
      initialStatus={status}
    />
  );
}
