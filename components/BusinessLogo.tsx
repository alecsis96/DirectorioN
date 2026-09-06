'use client';

import { useEffect, useState } from 'react';

export const YAJAGON_LOGO_PLACEHOLDER = '/images/logo.png';

export function usableLogoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate) return null;
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) ? candidate : null;
  } catch {
    return null;
  }
}

export default function BusinessLogo({ logoUrl, className = '' }: { logoUrl?: string | null; className?: string }) {
  const preferred = usableLogoUrl(logoUrl) || YAJAGON_LOGO_PLACEHOLDER;
  const [src, setSrc] = useState(preferred);
  useEffect(() => setSrc(preferred), [preferred]);

  return <img
    src={src}
    alt=""
    aria-hidden="true"
    className={className}
    onError={event => {
      if (src !== YAJAGON_LOGO_PLACEHOLDER) setSrc(YAJAGON_LOGO_PLACEHOLDER);
      else event.currentTarget.style.visibility = 'hidden';
    }}
  />;
}
