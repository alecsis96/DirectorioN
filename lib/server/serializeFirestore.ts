/**
 * Helper utilities para serializar datos de Firestore
 * para pasar a Client Components de Next.js
 */

/**
 * Serializar timestamps de Firestore a ISO strings
 * 
 * Convierte cualquier objeto con estructura de Firestore Timestamp
 * (_seconds/_nanoseconds) o métodos toDate() a strings ISO 8601.
 * 
 * Esta función es necesaria porque Next.js Server Components no pueden
 * pasar objetos con prototipos personalizados (como Firestore Timestamps)
 * directamente a Client Components.
 * 
 * @param obj - Cualquier valor (primitivo, objeto, array)
 * @returns El mismo valor con todos los timestamps serializados a strings ISO
 * 
 * @example
 * const data = {
 *   name: 'Business',
 *   createdAt: { _seconds: 1234567890, _nanoseconds: 123000000 },
 *   nested: {
 *     updatedAt: Timestamp.now()
 *   }
 * };
 * const serialized = serializeTimestamps(data);
 * // {
 * //   name: 'Business',
 * //   createdAt: '2009-02-13T23:31:30.123Z',
 * //   nested: { updatedAt: '2026-02-09T12:34:56.789Z' }
 * // }
 */
export function serializeTimestamps(obj: any): any {
  // Valores primitivos o null/undefined
  if (!obj || typeof obj !== 'object') return obj;
  
  // Firestore Timestamp con estructura {_seconds, _nanoseconds}
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    const milliseconds = obj._seconds * 1000 + obj._nanoseconds / 1000000;
    return new Date(milliseconds).toISOString();
  }
  
  // Firestore Timestamp con método toDate()
  if (obj.toDate && typeof obj.toDate === 'function') {
    try {
      return obj.toDate().toISOString();
    } catch {
      return obj; // Si falla toDate(), retornar original
    }
  }
  
  // JavaScript Date nativo
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Arrays - serializar cada elemento recursivamente
  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps);
  }
  
  // Objeto regular - serializar cada propiedad recursivamente
  const serialized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serialized[key] = serializeTimestamps(obj[key]);
    }
  }
  return serialized;
}

/**
 * Serializar un documento de Firestore completo
 * 
 * @param doc - Firestore DocumentSnapshot
 * @returns Objeto serializado con id y todos los campos serializados
 */
export function serializeFirestoreDoc(doc: any): any {
  if (!doc || !doc.exists) return null;
  
  return serializeTimestamps({
    id: doc.id,
    ...doc.data(),
  });
}

/**
 * Serializar múltiples documentos de Firestore
 * 
 * @param snapshot - Firestore QuerySnapshot
 * @returns Array de objetos serializados
 */
export function serializeFirestoreSnapshot(snapshot: any): any[] {
  if (!snapshot || !snapshot.docs) return [];
  
  return snapshot.docs.map((doc: any) => serializeFirestoreDoc(doc));
}
