/**
 * Rotación justa de negocios patrocinados
 * Selecciona un subconjunto determinístico de negocios usando un seed de sesión
 */

const SEED_KEY = 'sponsored_seed';
const DEFAULT_LIMIT = 6;

/**
 * Obtiene o crea un seed estable para la sesión actual
 * El seed se mantiene en sessionStorage para consistencia durante toda la sesión
 */
function getSessionSeed(): number {
  if (typeof window === 'undefined') {
    // En SSR, usar un valor por defecto
    return 0;
  }

  try {
    const stored = sessionStorage.getItem(SEED_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }

    // Crear nuevo seed basado en timestamp
    const newSeed = Date.now();
    sessionStorage.setItem(SEED_KEY, newSeed.toString());
    return newSeed;
  } catch (error) {
    // Fallback si sessionStorage no está disponible
    console.warn('sessionStorage no disponible, usando seed por defecto');
    return Date.now();
  }
}

/**
 * Selecciona un subconjunto rotativo de negocios patrocinados
 * 
 * @param businesses - Lista completa de negocios patrocinados
 * @param limit - Número máximo de negocios a mostrar (default: 6)
 * @param seedKey - Clave opcional para el seed (útil para testing)
 * @returns Array con los negocios seleccionados de forma determinística
 */
export function selectSponsoredRotation<T>(
  businesses: T[],
  limit: number = DEFAULT_LIMIT,
  seedKey?: string
): T[] {
  // Si hay menos negocios que el límite, devolver todos
  if (businesses.length <= limit) {
    return [...businesses];
  }

  // Obtener seed estable de la sesión (o usar el proporcionado para testing)
  const seed = seedKey ? parseInt(seedKey, 10) : getSessionSeed();

  // Calcular offset rotativo basado en el seed
  // Esto crea una "ventana" diferente para cada sesión
  const offset = seed % businesses.length;

  // Crear array rotado: tomar desde offset hasta el final, luego desde el inicio
  const rotated = [
    ...businesses.slice(offset),
    ...businesses.slice(0, offset)
  ];

  // Devolver solo los primeros 'limit' elementos
  return rotated.slice(0, limit);
}

/**
 * Limpia el seed de sesión (útil para testing o reset manual)
 */
export function clearSponsoredSeed(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SEED_KEY);
    } catch (error) {
      console.warn('No se pudo limpiar el seed de sessionStorage');
    }
  }
}
