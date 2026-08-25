import type { DecodedIdToken } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import DashboardEditor from '../../../components/DashboardEditor';
import { assertOwnerOrAdmin, AuthorizationError } from '../../../lib/server/authorization';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { serializeTimestamps } from '../../../lib/server/serializeFirestore';

type DashboardParams = {
  id: string;
};

async function requireAuthenticatedUser(): Promise<DecodedIdToken> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authorization = headerStore.get('authorization');
  const token =
    cookieStore.get('__session')?.value ||
    cookieStore.get('session')?.value ||
    cookieStore.get('token')?.value ||
    cookieStore.get('firebaseToken')?.value ||
    (authorization?.startsWith('Bearer ') ? authorization.slice(7) : authorization);

  if (!token) redirect('/para-negocios?auth=required');

  const auth = getAdminAuth();
  try {
    return await auth.verifySessionCookie(token, true);
  } catch {
    try {
      return await auth.verifyIdToken(token);
    } catch {
      redirect('/para-negocios?auth=required');
    }
  }
}

// Se resuelve la promesa 'params' con await directamente en la firma de la función.
export default async function DashboardBusinessPage({ params }: { params: DashboardParams | Promise<DashboardParams> }) {
  const user = await requireAuthenticatedUser();
  // Asegurarse de resolver params con await
  const resolvedParams = await params; 
  const { id } = resolvedParams;

  const businessId = decodeURIComponent(id);
  const db = getAdminFirestore();
  const snap = await db.doc(`businesses/${businessId}`).get();
  if (!snap.exists) notFound();

  try {
    assertOwnerOrAdmin(user, snap.data()?.ownerId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 403) notFound();
    throw error;
  }

  const initialBusiness = serializeTimestamps({
    id: snap.id,
    ...(snap.data() as Record<string, unknown>),
  });
  return <DashboardEditor businessId={businessId} initialBusiness={initialBusiness} />;
}
