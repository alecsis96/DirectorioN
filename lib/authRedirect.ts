const DEFAULT_AFTER_LOGIN = '/dashboard';

/** Accept only absolute paths on this origin. Backslashes and control characters are rejected. */
export function safeInternalNext(value: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/\p{Cc}/u.test(value)) return fallback;

  try {
    const parsed = new URL(value, 'https://yajagon.invalid');
    if (parsed.origin !== 'https://yajagon.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPathFor(nextPath: string): string {
  const safe = safeInternalNext(nextPath, '/');
  const encoded = encodeURIComponent(safe).replace(/%2F/gi, '/');
  return `/entrar?next=${encoded}`;
}

export function adminFailureDestination(status: 401 | 403, nextPath = '/admin'): string {
  return status === 401
    ? loginPathFor(safeInternalNext(nextPath, '/admin'))
    : '/acceso-no-autorizado';
}
