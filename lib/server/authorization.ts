import type { DecodedIdToken } from 'firebase-admin/auth';

import { hasAdminOverride } from '../adminOverrides';
import { getAdminAuth } from './firebaseAdmin';

export type AuthorizationStatus = 401 | 403;

export class AuthorizationError extends Error {
  readonly status: AuthorizationStatus;

  constructor(message: string, status: AuthorizationStatus) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = status;
  }
}

type HeaderReader = Pick<Headers, 'get'>;

export function extractBearerToken(headers: HeaderReader): string {
  const authorization = headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export async function verifySessionOrIdTokenOrThrow(token?: string | null): Promise<DecodedIdToken> {
  if (!token?.trim()) {
    throw new AuthorizationError('Autenticacion requerida.', 401);
  }

  const normalizedToken = token.trim();
  try {
    return await getAdminAuth().verifySessionCookie(normalizedToken, true);
  } catch {
    return verifyIdTokenOrThrow(normalizedToken);
  }
}

export async function verifyIdTokenOrThrow(token?: string | null): Promise<DecodedIdToken> {
  if (!token?.trim()) {
    throw new AuthorizationError('Autenticacion requerida.', 401);
  }

  try {
    return await getAdminAuth().verifyIdToken(token.trim());
  } catch {
    throw new AuthorizationError('Token de autenticacion invalido o expirado.', 401);
  }
}

/** Verificación reforzada para operaciones irreversibles como asignar ownership. */
export async function verifyRevocationCheckedIdTokenOrThrow(
  token?: string | null,
): Promise<DecodedIdToken> {
  if (!token?.trim()) {
    throw new AuthorizationError('Autenticacion requerida.', 401);
  }

  try {
    return await getAdminAuth().verifyIdToken(token.trim(), true);
  } catch {
    throw new AuthorizationError('Token de autenticacion invalido, expirado o revocado.', 401);
  }
}

export function isAdminIdentity(decoded: DecodedIdToken): boolean {
  return decoded.admin === true || hasAdminOverride(decoded.email);
}

export async function assertAdminToken(token?: string | null): Promise<DecodedIdToken> {
  const decoded = await verifyIdTokenOrThrow(token);
  if (!isAdminIdentity(decoded)) {
    throw new AuthorizationError('Permisos de administrador requeridos.', 403);
  }
  return decoded;
}

export async function assertRevocationCheckedAdminToken(
  token?: string | null,
): Promise<DecodedIdToken> {
  const decoded = await verifyRevocationCheckedIdTokenOrThrow(token);
  if (!isAdminIdentity(decoded)) {
    throw new AuthorizationError('Permisos de administrador requeridos.', 403);
  }
  return decoded;
}

export async function assertAdminSessionOrIdToken(token?: string | null): Promise<DecodedIdToken> {
  const decoded = await verifySessionOrIdTokenOrThrow(token);
  if (!isAdminIdentity(decoded)) {
    throw new AuthorizationError('Permisos de administrador requeridos.', 403);
  }
  return decoded;
}

export function isOwnerIdentity(decoded: DecodedIdToken, ownerId: unknown): boolean {
  return typeof ownerId === 'string' && ownerId.length > 0 && ownerId === decoded.uid;
}

export function assertOwnerOrAdmin(decoded: DecodedIdToken, ownerId: unknown): void {
  if (!isOwnerIdentity(decoded, ownerId) && !isAdminIdentity(decoded)) {
    throw new AuthorizationError('No tienes permisos para administrar este recurso.', 403);
  }
}
