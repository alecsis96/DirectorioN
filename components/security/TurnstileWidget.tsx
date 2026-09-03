'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: 'interaction-only';
      theme: 'auto';
      callback(token: string): void;
      'expired-callback'(): void;
      'error-callback'(): void;
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function TurnstileWidget({
  siteKey,
  resetKey,
  onTokenChange,
}: {
  siteKey: string;
  resetKey: number;
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const previousResetKeyRef = useRef(resetKey);
  const [scriptReady, setScriptReady] = useState(() => Boolean(globalThis.window?.turnstile));

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: 'public_application',
      appearance: 'interaction-only',
      theme: 'auto',
      callback: (token) => onTokenChange(token),
      'expired-callback': () => onTokenChange(null),
      'error-callback': () => onTokenChange(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      onTokenChange(null);
    };
  }, [onTokenChange, scriptReady, siteKey]);

  useEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    if (!widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    onTokenChange(null);
  }, [onTokenChange, resetKey]);

  return (
    <div className="space-y-2" data-testid="turnstile-container">
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
      <p className="text-xs text-gray-500">Verificación de seguridad protegida por Cloudflare Turnstile.</p>
    </div>
  );
}
