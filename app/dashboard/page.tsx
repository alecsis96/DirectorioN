import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DecodedIdToken } from 'firebase-admin/auth';

import DashboardBusinessList, {
  type DashboardApplicationStatus,
} from '../../components/DashboardBusinessList';
import { getAdminAuth, getAdminFirestore } from '../../lib/server/firebaseAdmin';
import { getOwnerAggregatedMetrics, getBusinessesWithMetrics, type BusinessWithMetrics } from '../../lib/server/ownerMetrics';

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

async function fetchApplicationStatus(uid: string): Promise<DashboardApplicationStatus> {
  const db = getAdminFirestore();
  const appDoc = await db.doc(`applications/${uid}`).get();
  if (!appDoc.exists) return null;
  const status = (appDoc.data()?.status as DashboardApplicationStatus) ?? 'pending';
  return status;
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  
  // Obtener métricas agregadas y negocios con sus métricas
  const [aggregatedMetrics, businessesWithMetrics, status] = await Promise.all([
    getOwnerAggregatedMetrics(user.uid),
    getBusinessesWithMetrics(user.uid),
    fetchApplicationStatus(user.uid),
  ]);

  return (
    <DashboardBusinessList
      ownerId={user.uid}
      ownerEmail={user.email ?? null}
      initialBusinesses={businessesWithMetrics}
      initialStatus={status}
      aggregatedMetrics={aggregatedMetrics}
    />
  );
}
