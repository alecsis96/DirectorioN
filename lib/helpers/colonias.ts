/**
 * Utilidades para manejo de colonias/barrios
 */

/** Lista completa de colonias de Yajalón */
export const YAJALON_COLONIAS = [
  "12 de Diciembre",
  "Agua Fría",
  "Amado Nervo",
  "Barranca Nabil",
  "Belén Ajkabalna",
  "Belisario Domínguez",
  "Callejón Lorena Shashijá",
  "Calvario Bahuitz",
  "Calvario Bahuitz Ojo de Agua",
  "Centro",
  "Chitaltic",
  "Chul-Ha",
  "Cueva Joctiul",
  "Efigenia Chapoy",
  "El Azufre",
  "El Bosque",
  "El Campo",
  "El Delirio",
  "El Milagro",
  "Flamboyán",
  "Flores",
  "Jardines",
  "Jonuta",
  "José María Morelos y Pavón (Taquinja)",
  "La Aldea",
  "La Belleza",
  "La Candelaria",
  "La Laguna",
  "Lázaro Cárdenas",
  "Linda Vista 1a. Sección",
  "Loma Bonita",
  "Los Tulipanes",
  "Lucio Blanco",
  "Majasil",
  "Nueva Creación",
  "Nueva Esperanza",
  "Saclumil Rosario II",
  "San Antonio",
  "San Fernando",
  "San José Bunslac",
  "San José el Mirador",
  "San José Paraíso",
  "San Luis",
  "San Martín",
  "San Miguel",
  "San Miguel Ojo de Agua",
  "San Pedro Buenavista",
  "San Vicente",
  "Santa Bárbara",
  "Santa Candelaria",
  "Santa Elena",
  "Santa Teresita",
  "Shashijá",
  "Tzitzaquil",
  "Vista Alegre"
] as const;

/** Normaliza nombres de colonias para comparación sin acentos/variantes */
export function normalizeColonia(input?: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .replace(/\./g, "") // quita puntos
    .replace(/\s+/g, " ") // colapsa espacios
    .trim()
    .replace(/^yajalon\s+/, ""); // "yajalon centro" -> "centro"
}

/** Mapa de colonias: label -> normalizada */
export const COLONIAS_MAP = YAJALON_COLONIAS.map((label) => ({
  label,
  normalized: normalizeColonia(label),
}));

/** Intenta inferir colonia desde la dirección completa */
export function inferColoniaFromAddress(address?: string): string {
  if (!address) return "";
  const normalized = normalizeColonia(address);

  // Buscar coincidencia por inclusión
  for (const { normalized: norm } of COLONIAS_MAP) {
    if (norm && normalized.includes(norm)) return norm;
  }

  // Heurística: tomar el segundo segmento después de una coma
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];

  return "";
}
