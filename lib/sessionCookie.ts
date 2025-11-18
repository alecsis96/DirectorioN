export function writeSessionCookie(token?: string, maxAgeSeconds = 60 * 60 * 24) {
  if (typeof document === 'undefined') return;
  const base = '__session=';
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  
  if (!token) {
    document.cookie = `${base}; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    return;
  }
  document.cookie = `${base}${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}
