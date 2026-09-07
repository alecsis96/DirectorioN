import 'server-only';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  assertAdminSessionOrIdToken,
  AuthorizationError,
  extractBearerToken,
} from './authorization';
import { adminFailureDestination } from '../authRedirect';

export async function requireAdminPage(nextPath = '/admin') {
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
    redirect(adminFailureDestination(error.status, nextPath));
  }
}
