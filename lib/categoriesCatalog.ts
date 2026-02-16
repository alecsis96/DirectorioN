// Central catalog of business categories for YajaGon
// Defines groups, detailed categories, legacy aliases and resolution helpers

export type CategoryGroupId =
  | 'food'
  | 'home'
  | 'services'
  | 'health'
  | 'commerce'
  | 'education'
  | 'events'
  | 'other';

export type CategoryGroup = {
  id: CategoryGroupId;
  name: string;
  icon: string;
  description?: string;
};

export type CategoryItem = {
  id: string; // stable slug, lowercase, ascii
  name: string; // human label
  icon: string; // emoji
  groupId: CategoryGroupId;
  legacyAliases?: string[]; // legacy names/slugs to map old data
  examples?: string[];
};

export type ResolveMatchType = 'id' | 'name' | 'alias' | 'fallback';

export type ResolvedCategory = {
  categoryId: string;
  categoryName: string;
  groupId: CategoryGroupId;
  matchType: ResolveMatchType;
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'food', name: 'Comida y Bebida', icon: '🍽️', description: 'Restaurantes y antojitos' },
  { id: 'commerce', name: 'Tiendas y Comercio', icon: '🛒', description: 'Retail y ventas' },
  { id: 'services', name: 'Servicios y Profesiones', icon: '🧰', description: 'Oficios, pros y logística' },
  { id: 'health', name: 'Salud y Belleza', icon: '💆', description: 'Cuidado personal y salud' },
  { id: 'home', name: 'Hogar y Reparación', icon: '🏠', description: 'Materiales y mantenimiento' },
  { id: 'events', name: 'Eventos y Entretenimiento', icon: '🎉', description: 'Fiestas y producción' },
  { id: 'education', name: 'Educación y Cursos', icon: '📚', description: 'Formación y clases' },
  { id: 'other', name: 'Otro', icon: '📋', description: 'Categoría abierta' },
];

export const CATEGORIES: CategoryItem[] = [
  // Food
  { id: 'restaurantes', name: 'Restaurante', icon: '🍽️', groupId: 'food', legacyAliases: ['restaurante', 'restaurant', 'restaurantes'] },
  { id: 'taquerias', name: 'Taquería', icon: '🌮', groupId: 'food', legacyAliases: ['tacos', 'taqueria', 'taquerias'] },
  { id: 'polleria_rosticeria', name: 'Pollería / Rosticería', icon: '🍗', groupId: 'food', legacyAliases: ['polleria', 'rosticeria', 'pollo rostizado'] },
  { id: 'pizzeria', name: 'Pizzería', icon: '🍕', groupId: 'food', legacyAliases: ['pizza', 'pizzeria'] },
  { id: 'comida_rapida', name: 'Comida Rápida', icon: '🍔', groupId: 'food', legacyAliases: ['comida rapida', 'hamburguesas', 'fast food'] },
  { id: 'cafeteria', name: 'Cafetería', icon: '☕', groupId: 'food', legacyAliases: ['cafeteria', 'cafe'] },
  { id: 'panaderia', name: 'Panadería / Pastelería', icon: '🥖', groupId: 'food', legacyAliases: ['panaderia', 'pasteleria', 'reposteria'] },
  { id: 'mariscos', name: 'Mariscos', icon: '🦐', groupId: 'food', legacyAliases: ['marisqueria', 'mariscos'] },
  { id: 'cocina_economica', name: 'Cocina Económica', icon: '🍲', groupId: 'food', legacyAliases: ['cocina economica', 'menu del dia'] },
  { id: 'antojitos', name: 'Antojitos y Snacks', icon: '🥙', groupId: 'food', legacyAliases: ['antojitos', 'garnachas'] },
  { id: 'bar_cantina', name: 'Bar / Cantina', icon: '🍻', groupId: 'food', legacyAliases: ['bar', 'cantina'] },
  { id: 'heladeria', name: 'Heladería / Paletería', icon: '🍦', groupId: 'food', legacyAliases: ['heladeria', 'paleteria', 'nieve'] },

  // Commerce
  { id: 'abarrotes', name: 'Abarrotes / Miscelánea', icon: '🛒', groupId: 'commerce', legacyAliases: ['abarrotes', 'tienda', 'comercio'] },
  { id: 'supermercado', name: 'Supermercado / Mini super', icon: '🛍️', groupId: 'commerce', legacyAliases: ['supermercado', 'super'] },
  { id: 'papeleria', name: 'Papelería', icon: '📄', groupId: 'commerce', legacyAliases: ['papeleria'] },
  { id: 'tienda_ropa', name: 'Ropa y Boutique', icon: '👗', groupId: 'commerce', legacyAliases: ['boutique', 'ropa'] },
  { id: 'calzado', name: 'Zapatería', icon: '👟', groupId: 'commerce', legacyAliases: ['zapateria', 'calzado'] },
  { id: 'regalos', name: 'Regalos y Novedades', icon: '🎁', groupId: 'commerce', legacyAliases: ['regalos', 'novedades'] },
  { id: 'joyeria', name: 'Joyería / Accesorios', icon: '💍', groupId: 'commerce', legacyAliases: ['joyeria', 'accesorios'] },
  { id: 'electronica', name: 'Electrónica y Tecnología', icon: '💻', groupId: 'commerce', legacyAliases: ['tecnologia', 'electrónica', 'electronica'] },
  { id: 'celulares', name: 'Celulares y Accesorios', icon: '📱', groupId: 'commerce', legacyAliases: ['celulares', 'telefonia'] },
  { id: 'muebles', name: 'Muebles y Decoración', icon: '🛋️', groupId: 'commerce', legacyAliases: ['muebles', 'decoracion'] },
  { id: 'deportes', name: 'Deportes y Outdoor', icon: '🏀', groupId: 'commerce', legacyAliases: ['deportes'] },

  // Services
  { id: 'servicios_generales', name: 'Servicios Generales', icon: '🛠️', groupId: 'services', legacyAliases: ['servicios'] },
  { id: 'servicios_profesionales', name: 'Servicios Profesionales', icon: '💼', groupId: 'services', legacyAliases: ['profesional', 'abogado', 'contabilidad'] },
  { id: 'taller_mecanico', name: 'Taller Mecánico', icon: '🔧', groupId: 'services', legacyAliases: ['automotriz', 'mecanico', 'mecánico'] },
  { id: 'mensajeria', name: 'Mensajería y Paquetería', icon: '📦', groupId: 'services', legacyAliases: ['mensajeria', 'envios'] },
  { id: 'imprenta', name: 'Imprenta / Copias', icon: '🖨️', groupId: 'services', legacyAliases: ['imprenta', 'copias'] },
  { id: 'limpieza', name: 'Limpieza y Sanitización', icon: '🧹', groupId: 'services', legacyAliases: ['limpieza'] },
  { id: 'ciber_centro', name: 'Cibercafé / Centro de Cómputo', icon: '🖥️', groupId: 'services', legacyAliases: ['ciber', 'computadoras', 'internet'] },
  { id: 'reparacion_electronica', name: 'Reparación electrónica', icon: '🔌', groupId: 'services', legacyAliases: ['reparacion', 'electronica'] },

  // Health & beauty
  { id: 'farmacias', name: 'Farmacia', icon: '💊', groupId: 'health', legacyAliases: ['farmacia', 'farmacias'] },
  { id: 'clinica', name: 'Clínica / Consultorio', icon: '🏥', groupId: 'health', legacyAliases: ['salud', 'clinica', 'consultorio', 'doctor'] },
  { id: 'dentista', name: 'Dentista', icon: '😁', groupId: 'health', legacyAliases: ['dentista'] },
  { id: 'estetica', name: 'Estética / Salón de belleza', icon: '💇', groupId: 'health', legacyAliases: ['estetica', 'salon de belleza', 'belleza', 'spa'] },
  { id: 'barberia', name: 'Barbería', icon: '✂️', groupId: 'health', legacyAliases: ['barberia'] },
  { id: 'spa', name: 'Spa / Masajes', icon: '🧖', groupId: 'health', legacyAliases: ['spa', 'masajes'] },
  { id: 'veterinarias', name: 'Veterinaria', icon: '🐾', groupId: 'health', legacyAliases: ['veterinaria', 'veterinarias'] },

  // Home / hardware
  { id: 'ferreterias', name: 'Ferretería', icon: '🔩', groupId: 'home', legacyAliases: ['ferreteria', 'ferretería', 'ferreterias'] },
  { id: 'materiales_construccion', name: 'Materiales de construcción', icon: '🏗️', groupId: 'home', legacyAliases: ['construccion', 'materiales', 'construcción'] },
  { id: 'refaccionaria', name: 'Refaccionaria / Autopartes', icon: '🚗', groupId: 'home', legacyAliases: ['refaccionaria', 'autopartes'] },
  { id: 'tlapaleria', name: 'Tlapalería', icon: '🧰', groupId: 'home', legacyAliases: ['tlapaleria'] },
  { id: 'cerrajeria', name: 'Cerrajería', icon: '🔑', groupId: 'home', legacyAliases: ['cerrajeria', 'llaves'] },
  { id: 'vidrieria', name: 'Vidriería', icon: '🪟', groupId: 'home', legacyAliases: ['vidrieria', 'aluminio'] },

  // Events & entertainment
  { id: 'salon_eventos', name: 'Salón de eventos', icon: '🎉', groupId: 'events', legacyAliases: ['eventos', 'salon de eventos', 'salon eventos'] },
  { id: 'fotografia_video', name: 'Fotografía / Video', icon: '📸', groupId: 'events', legacyAliases: ['fotografia', 'video'] },
  { id: 'banquetes', name: 'Banquetes / Catering', icon: '🍽️', groupId: 'events', legacyAliases: ['banquetes', 'catering'] },
  { id: 'sonido_iluminacion', name: 'Audio e Iluminación', icon: '🎤', groupId: 'events', legacyAliases: ['dj', 'audio', 'iluminacion'] },
  { id: 'renta_mobiliario', name: 'Renta de mobiliario', icon: '🪑', groupId: 'events', legacyAliases: ['renta mobiliario', 'sillas', 'mesas'] },

  // Education
  { id: 'clases_particulares', name: 'Clases particulares', icon: '📚', groupId: 'education', legacyAliases: ['clases', 'tutorias'] },
  { id: 'guarderia', name: 'Guardería / Estancia', icon: '🧸', groupId: 'education', legacyAliases: ['guarderia'] },
  { id: 'idiomas', name: 'Idiomas y Cursos', icon: '🌐', groupId: 'education', legacyAliases: ['idiomas', 'cursos'] },

  // Other
  { id: 'otro', name: 'Otro', icon: '📋', groupId: 'other', legacyAliases: ['otro', 'otros'] },
];

const DEFAULT_CATEGORY: ResolvedCategory = {
  categoryId: 'otro',
  categoryName: 'Otro',
  groupId: 'other',
  matchType: 'fallback',
};

const normalize = (value?: string): string =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');

const CATEGORY_LOOKUP = (() => {
  const map = new Map<string, { item: CategoryItem; matchType: ResolveMatchType }>();
  for (const item of CATEGORIES) {
    map.set(normalize(item.id), { item, matchType: 'id' });
    map.set(normalize(item.name), { item, matchType: 'name' });
    if (item.legacyAliases) {
      for (const alias of item.legacyAliases) {
        map.set(normalize(alias), { item, matchType: 'alias' });
      }
    }
  }
  return map;
})();

export function resolveCategory(input?: string): ResolvedCategory {
  const key = normalize(input);
  if (key && CATEGORY_LOOKUP.has(key)) {
    const { item, matchType } = CATEGORY_LOOKUP.get(key)!;
    return {
      categoryId: item.id,
      categoryName: item.name,
      groupId: item.groupId,
      matchType,
    };
  }
  return DEFAULT_CATEGORY;
}

export function getCategoriesByGroup(groupId: CategoryGroupId): CategoryItem[] {
  return CATEGORIES.filter((cat) => cat.groupId === groupId);
}

export function getGroupById(groupId: CategoryGroupId): CategoryGroup | undefined {
  return CATEGORY_GROUPS.find((group) => group.id === groupId);
}
