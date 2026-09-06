import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  document.getElementById('yajagon-google-maps-sdk')?.remove();
  delete (window as any).google;
  vi.resetModules();
});

describe('Google Maps singleton loader', () => {
  it('does not append more than one SDK script and reuses the completed load', async () => {
    const { loadGoogleMapsSdk } = await import('../lib/googleMapsLoader');
    const first = loadGoogleMapsSdk('test-key');
    const second = loadGoogleMapsSdk('test-key');
    expect(first).toBe(second);
    const scripts = document.querySelectorAll('#yajagon-google-maps-sdk');
    expect(scripts).toHaveLength(1);
    (window as any).google = { maps: {} };
    scripts[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
    await expect(loadGoogleMapsSdk('test-key')).resolves.toBeUndefined();
    expect(document.querySelectorAll('#yajagon-google-maps-sdk')).toHaveLength(1);
  });
});
