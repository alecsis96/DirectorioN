'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { BsGeoAlt } from 'react-icons/bs';

type Props = {
  radiusKm?: number;
  className?: string;
  label?: string;
  variant?: 'default' | 'compact';
  onSuccess?: () => void;
};

const DEFAULT_RADIUS_KM = 5;

export default function GeolocationButton({
  radiusKm = DEFAULT_RADIUS_KM,
  className = '',
  label,
  variant = 'default',
  onSuccess,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() || '/negocios';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationClick = useCallback(async () => {
    if (loading) return;
    if (!window?.isSecureContext && window?.location.hostname !== 'localhost') {
      setError('Activa HTTPS para usar tu ubicación.');
      return;
    }
    if (!navigator?.geolocation) {
      setError('Tu dispositivo no soporta geolocalización.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: 15_000,
        });
      });

      const { latitude, longitude } = position.coords;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('lat', latitude.toFixed(6));
      params.set('lng', longitude.toFixed(6));
      params.set('r', String(radiusKm));
      params.set('radius', String(radiusKm));
      params.delete('p');

      router.replace(`${pathname}?${params.toString()}`);
      onSuccess?.();
    } catch (err) {
      const geoError = err as GeolocationPositionError;
      if (geoError?.code === geoError?.PERMISSION_DENIED) {
        setError('Necesitamos permiso para obtener tu ubicación.');
      } else if (geoError?.code === geoError?.TIMEOUT) {
        setError('La solicitud tardó demasiado. Intenta nuevamente.');
      } else {
        setError('No pudimos obtener tu ubicación.');
      }
    } finally {
      setLoading(false);
    }
  }, [loading, pathname, radiusKm, router, searchParams, onSuccess]);

  const compact = variant === 'compact';
  const buttonClasses = compact
    ? 'inline-flex items-center justify-center gap-1 rounded-full border border-emerald-500/70 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70'
    : 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto';

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button type="button" onClick={handleLocationClick} disabled={loading} className={buttonClasses}>
        <BsGeoAlt className={compact ? 'text-base' : 'text-lg'} aria-hidden="true" />
        {loading ? 'Buscando...' : label ?? 'Usar mi ubicación'}
      </button>
      {error && (
        <span role="status" className="text-xs text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
