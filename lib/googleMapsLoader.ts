const SCRIPT_ID = 'yajagon-google-maps-sdk';
let sdkPromise: Promise<void> | null = null;

export function loadGoogleMapsSdk(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) return Promise.reject(new Error('GOOGLE_MAPS_KEY_MISSING'));
  if (typeof window === 'undefined') return Promise.reject(new Error('GOOGLE_MAPS_BROWSER_REQUIRED'));
  if (window.google?.maps) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const loaded = () => window.google?.maps ? resolve() : reject(new Error('GOOGLE_MAPS_SDK_UNAVAILABLE'));
    const failed = () => { sdkPromise = null; reject(new Error('GOOGLE_MAPS_SDK_FAILED')); };
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID; script.async = true; script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      document.head.appendChild(script);
    }
  });
  return sdkPromise;
}
