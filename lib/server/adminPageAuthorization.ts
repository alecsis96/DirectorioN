import 'server-only';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  assertAdminSessionOrIdToken,
  AuthorizationError,
  extractBearerToken,
} from './authorization';

export async function requireAdminPage() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const token =
    extractBearerToken(headerStore) ||
    headerStore.get('x-firebase-token') ||
    cookieStore.get('__session')?.value ||
    cookieStore.get('token')?.value ||
    cookieStore.get('authToken')?.value ||
    '';

  try {
    return await assertAdminSessionOrIdToken(token);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    if (error.status === 401) redirect('/para-negocios?auth=required');
    redirect('/?auth=forbidden');
  }
}
