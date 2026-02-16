/**
 * 🔥 Sistema de Escasez por Categoría
 * Límites artificiales para crear urgencia y aumentar conversiones
 * 
 * FILOSOFÍA:
 * - Escasez legítima (técnicamente enforcement)
 * - Límites por categoría + zona geográfica
 * - Lista de espera automatizada
 */

import { BusinessPlan } from './planPermissions';
import { resolveCategory } from './categoriesCatalog';

export type CategoryTier = 'saturated' | 'specialized' | 'premium';
export type Zone = 'centro' | 'norte' | 'sur' | 'periferia' | 'city-wide';

/**
 * 📊 LÍMITES POR CATEGORÍA
 */
export const CATEGORY_LIMITS = {
  // ============================================
  // TIER 1: CATEGORÍAS SATURADAS
  // ============================================
  restaurantes: {
    tier: 'saturated' as CategoryTier,
    limits: {
      free: Infinity,
      featured: 10, // Por zona
      sponsor: 3,   // Por zona (ESCASEZ EXTREMA)
    },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 3 restaurantes pueden ser Líderes en tu zona',
      featured: 'Máximo 10 restaurantes Destacados por zona',
    },
  },
  
  taquerias: {
    tier: 'saturated' as CategoryTier,
    limits: { free: Infinity, featured: 8, sponsor: 2 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 2 taquerías Líderes por zona',
      featured: 'Máximo 8 taquerías Destacadas por zona',
    },
  },
  
  ferreterias: {
    tier: 'saturated' as CategoryTier,
    limits: { free: Infinity, featured: 10, sponsor: 3 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 3 ferreterías pueden dominar tu zona',
      featured: 'Máximo 10 ferreterías Destacadas por zona',
    },
  },
  
  farmacias: {
    tier: 'saturated' as CategoryTier,
    limits: { free: Infinity, featured: 8, sponsor: 2 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 2 farmacias Líderes por zona',
      featured: 'Máximo 8 farmacias Destacadas por zona',
    },
  },
  
  abarrotes: {
    tier: 'saturated' as CategoryTier,
    limits: { free: Infinity, featured: 12, sponsor: 3 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 3 tiendas de abarrotes pueden ser Líderes',
      featured: 'Máximo 12 tiendas Destacadas por zona',
    },
  },
  
  // ============================================
  // TIER 2: CATEGORÍAS ESPECIALIZADAS
  // ============================================
  veterinarias: {
    tier: 'specialized' as CategoryTier,
    limits: { free: Infinity, featured: 5, sponsor: 2 },
    zoneLevel: false, // City-wide
    message: {
      sponsor: 'Solo 2 veterinarias Líderes en toda la ciudad',
      featured: 'Máximo 5 veterinarias Destacadas en la ciudad',
    },
  },
  
  gimnasios: {
    tier: 'specialized' as CategoryTier,
    limits: { free: Infinity, featured: 5, sponsor: 2 },
    zoneLevel: false,
    message: {
      sponsor: 'Solo 2 gimnasios pueden ser Líderes en la ciudad',
      featured: 'Máximo 5 gimnasios Destacados en la ciudad',
    },
  },
  
  escuelas: {
    tier: 'specialized' as CategoryTier,
    limits: { free: Infinity, featured: 8, sponsor: 3 },
    zoneLevel: false,
    message: {
      sponsor: 'Solo 3 escuelas Líderes en la ciudad',
      featured: 'Máximo 8 escuelas Destacadas',
    },
  },
  
  talleres: {
    tier: 'specialized' as CategoryTier,
    limits: { free: Infinity, featured: 6, sponsor: 2 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 2 talleres mecánicos Líderes por zona',
      featured: 'Máximo 6 talleres Destacados por zona',
    },
  },
  
  salones_belleza: {
    tier: 'specialized' as CategoryTier,
    limits: { free: Infinity, featured: 8, sponsor: 3 },
    zoneLevel: true,
    message: {
      sponsor: 'Solo 3 salones pueden ser Líderes en tu zona',
      featured: 'Máximo 8 salones Destacados por zona',
    },
  },
  
  // ============================================
  // TIER 3: CATEGORÍAS PREMIUM
  // ============================================
  abogados: {
    tier: 'premium' as CategoryTier,
    limits: { free: Infinity, featured: Infinity, sponsor: 1 },
    zoneLevel: false,
    specialtyLevel: true, // Por especialidad
    message: {
      sponsor: 'Solo 1 abogado Líder por especialidad en toda la ciudad',
      featured: 'Sin límite de abogados Destacados',
    },
  },
  
  doctores: {
    tier: 'premium' as CategoryTier,
    limits: { free: Infinity, featured: Infinity, sponsor: 1 },
    zoneLevel: false,
    specialtyLevel: true,
    message: {
      sponsor: 'Solo 1 doctor Líder por especialidad',
      featured: 'Sin límite de doctores Destacados',
    },
  },
  
  contadores: {
    tier: 'premium' as CategoryTier,
    limits: { free: Infinity, featured: 10, sponsor: 1 },
    zoneLevel: false,
    message: {
      sponsor: 'Solo 1 contador puede ser Líder en la ciudad',
      featured: 'Máximo 10 contadores Destacados',
    },
  },
  
  arquitectos: {
    tier: 'premium' as CategoryTier,
    limits: { free: Infinity, featured: 8, sponsor: 1 },
    zoneLevel: false,
    message: {
      sponsor: 'Solo 1 arquitecto Líder en la ciudad',
      featured: 'Máximo 8 arquitectos Destacados',
    },
  },
} as const;

/**
 * 🗺️ ZONAS GEOGRÁFICAS
 */
export const ZONES = {
  centro: { name: 'Centro', radius: 2 }, // km
  norte: { name: 'Zona Norte', radius: 3 },
  sur: { name: 'Zona Sur', radius: 3 },
  periferia: { name: 'Periferia', radius: 5 },
} as const;

/**
 * 🔍 VERIFICAR DISPONIBILIDAD DE UPGRADE
 */
export async function canUpgradeToPlan(
  categoryId: string,
  targetPlan: BusinessPlan,
  zone?: Zone,
  specialty?: string
): Promise<{
  allowed: boolean;
  slotsLeft: number;
  totalSlots: number;
  waitlistPosition?: number;
  message: string;
  urgencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}> {
  // Plan FREE siempre permitido
  if (targetPlan === 'free') {
    return {
      allowed: true,
      slotsLeft: Infinity,
      totalSlots: Infinity,
      message: 'Plan gratuito siempre disponible',
      urgencyLevel: 'none',
    };
  }

  const category = CATEGORY_LIMITS[categoryId as keyof typeof CATEGORY_LIMITS];
  
  if (!category) {
    // Categoría sin límites configurados = permitir
    return {
      allowed: true,
      slotsLeft: Infinity,
      totalSlots: Infinity,
      message: 'Sin límites para esta categoría',
      urgencyLevel: 'none',
    };
  }

  const maxAllowed = category.limits[targetPlan];
  
  // Si es infinito, siempre permitir
  if (maxAllowed === Infinity) {
    return {
      allowed: true,
      slotsLeft: Infinity,
      totalSlots: Infinity,
      message: 'Disponibilidad ilimitada',
      urgencyLevel: 'none',
    };
  }

  // Obtener conteo actual
  const currentCount = await countBusinessesInPlan(
    categoryId,
    targetPlan,
    category.zoneLevel ? zone : undefined,
    'specialtyLevel' in category && category.specialtyLevel ? specialty : undefined
  );

  const slotsLeft = maxAllowed - currentCount;

  // Si está lleno, lista de espera
  if (slotsLeft <= 0) {
    const waitlistPosition = await getWaitlistPosition(categoryId, targetPlan, zone, specialty);
    
    return {
      allowed: false,
      slotsLeft: 0,
      totalSlots: maxAllowed,
      waitlistPosition,
      message: `Cupo lleno. Estás en lista de espera posición #${waitlistPosition}`,
      urgencyLevel: 'critical',
    };
  }

  // Determinar nivel de urgencia
  let urgencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
  const percentLeft = (slotsLeft / maxAllowed) * 100;

  if (percentLeft <= 10) urgencyLevel = 'critical'; // 10% o menos
  else if (percentLeft <= 25) urgencyLevel = 'high'; // 25% o menos
  else if (percentLeft <= 50) urgencyLevel = 'medium'; // 50% o menos
  else urgencyLevel = 'low';

  // Mensaje dinámico
  let message = '';
  if (slotsLeft === 1) {
    message = `🔥 ¡ÚLTIMO LUGAR DISPONIBLE en ${category.message[targetPlan]}!`;
  } else if (slotsLeft <= 3) {
    message = `⚠️ Quedan solo ${slotsLeft} lugares disponibles`;
  } else {
    message = `${slotsLeft} lugares disponibles de ${maxAllowed}`;
  }

  return {
    allowed: true,
    slotsLeft,
    totalSlots: maxAllowed,
    message,
    urgencyLevel,
  };
}

/**
 * 📊 CONTAR NEGOCIOS EN UN PLAN
 * (Implementación depende de Firestore)
 */
async function countBusinessesInPlan(
  categoryId: string,
  plan: BusinessPlan,
  zone?: Zone,
  specialty?: string
): Promise<number> {
  const resolved = resolveCategory(categoryId);
  if (typeof window === 'undefined') {
    // Server-side: usar Firebase Admin
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      
      const buildBaseQuery = () => {
        let q = db.collection('businesses')
          .where('plan', '==', plan)
          .where('status', '==', 'published');
        if (zone) q = q.where('zone', '==', zone) as any;
        if (specialty) q = q.where('specialty', '==', specialty) as any;
        return q;
      };

      const newQuery = buildBaseQuery().where('categoryId', '==', resolved.categoryId);
      const legacyQuery = buildBaseQuery().where('category', '==', resolved.categoryName);

      const [newSnap, legacySnap] = await Promise.all([newQuery.get(), legacyQuery.get()]);
      const ids = new Set<string>();
      newSnap.forEach((doc) => ids.add(doc.id));
      legacySnap.forEach((doc) => ids.add(doc.id));
      return ids.size;
    } catch (error) {
      console.error('Error counting businesses (server):', error);
      return 0;
    }
  } else {
    // Client-side: usar Firebase Client SDK
    try {
      const { db } = await import('../firebaseConfig');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const baseConstraints = [
        where('plan', '==', plan),
        where('status', '==', 'published'),
      ];
      if (zone) baseConstraints.push(where('zone', '==', zone));
      if (specialty) baseConstraints.push(where('specialty', '==', specialty));

      const qNew = query(collection(db, 'businesses'), where('categoryId', '==', resolved.categoryId), ...baseConstraints);
      const qLegacy = query(collection(db, 'businesses'), where('category', '==', resolved.categoryName), ...baseConstraints);

      const [newSnap, legacySnap] = await Promise.all([getDocs(qNew), getDocs(qLegacy)]);
      const ids = new Set<string>();
      newSnap.forEach((doc) => ids.add(doc.id));
      legacySnap.forEach((doc) => ids.add(doc.id));
      return ids.size;
    } catch (error) {
      console.error('Error counting businesses (client):', error);
      return 0;
    }
  }
}

/**
 * 📝 OBTENER POSICIÓN EN LISTA DE ESPERA
 */
async function getWaitlistPosition(
  categoryId: string,
  plan: BusinessPlan,
  zone?: Zone,
  specialty?: string
): Promise<number> {
  const resolved = resolveCategory(categoryId);
  if (typeof window === 'undefined') {
    // Server-side
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      
      const base = () => {
        let q = db.collection('waitlist')
          .where('targetPlan', '==', plan)
          .where('status', '==', 'waiting')
          .orderBy('createdAt', 'asc');
        if (zone) q = q.where('zone', '==', zone) as any;
        if (specialty) q = q.where('specialty', '==', specialty) as any;
        return q;
      };

      const newQuery = base().where('categoryId', '==', resolved.categoryId);
      const legacyQuery = base().where('category', '==', resolved.categoryName);

      const [newSnap, legacySnap] = await Promise.all([newQuery.get(), legacyQuery.get()]);
      const ids = new Set<string>();
      newSnap.forEach((doc) => ids.add(doc.id));
      legacySnap.forEach((doc) => ids.add(doc.id));
      return ids.size + 1;
    } catch (error) {
      console.error('Error getting waitlist position (server):', error);
      return 1;
    }
  } else {
    // Client-side
    try {
      const { db } = await import('../firebaseConfig');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const baseConstraints = [
        where('targetPlan', '==', plan),
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'asc'),
      ];
      if (zone) baseConstraints.push(where('zone', '==', zone));
      if (specialty) baseConstraints.push(where('specialty', '==', specialty));

      const qNew = query(collection(db, 'waitlist'), where('categoryId', '==', resolved.categoryId), ...baseConstraints);
      const qLegacy = query(collection(db, 'waitlist'), where('category', '==', resolved.categoryName), ...baseConstraints);

      const [newSnap, legacySnap] = await Promise.all([getDocs(qNew), getDocs(qLegacy)]);
      const ids = new Set<string>();
      newSnap.forEach((doc) => ids.add(doc.id));
      legacySnap.forEach((doc) => ids.add(doc.id));
      return ids.size + 1;
    } catch (error) {
      console.error('Error getting waitlist position (client):', error);
      return 1;
    }
  }
}

/**
 * ➕ AGREGAR A LISTA DE ESPERA
 */
export async function addToWaitlist(
  businessId: string,
  categoryId: string,
  targetPlan: BusinessPlan,
  zone?: Zone,
  specialty?: string
): Promise<{
  position: number;
  estimatedWaitDays: number;
}> {
  const resolved = resolveCategory(categoryId);
  if (typeof window === 'undefined') {
    // Server-side
    try {
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      const db = getFirestore();
      
      await db.collection('waitlist').add({
        businessId,
        category: resolved.categoryName,
        categoryId: resolved.categoryId,
        categoryName: resolved.categoryName,
        categoryGroupId: resolved.groupId,
        targetPlan,
        zone: zone || null,
        specialty: specialty || null,
        createdAt: FieldValue.serverTimestamp(),
        status: 'waiting',
      });
    } catch (error) {
      console.error('Error adding to waitlist (server):', error);
    }
  } else {
    // Client-side
    try {
      const { db } = await import('../firebaseConfig');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      await addDoc(collection(db, 'waitlist'), {
        businessId,
        category: resolved.categoryName,
        categoryId: resolved.categoryId,
        categoryName: resolved.categoryName,
        categoryGroupId: resolved.groupId,
        targetPlan,
        zone: zone || null,
        specialty: specialty || null,
        createdAt: serverTimestamp(),
        status: 'waiting',
      });
    } catch (error) {
      console.error('Error adding to waitlist (client):', error);
    }
  }
  
  const position = await getWaitlistPosition(resolved.categoryId, targetPlan, zone, specialty);
  
  // Estimar días de espera (promedio 30 días por posición)
  const estimatedWaitDays = position * 30;
  
  return {
    position,
    estimatedWaitDays,
  };
}

/**
 * 🔔 NOTIFICAR CUANDO HAY ESPACIO DISPONIBLE
 */
export async function notifyWaitlistWhenAvailable(
  categoryId: string,
  plan: BusinessPlan,
  zone?: Zone,
  specialty?: string
): Promise<void> {
  const resolved = resolveCategory(categoryId);
  try {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const base = () => {
      let q = db.collection('waitlist')
        .where('targetPlan', '==', plan)
        .where('status', '==', 'waiting');
      if (zone) q = q.where('zone', '==', zone) as any;
      if (specialty) q = q.where('specialty', '==', specialty) as any;
      return q;
    };

    const [snapNew, snapLegacy] = await Promise.all([
      base().where('categoryId', '==', resolved.categoryId).orderBy('createdAt', 'asc').limit(1).get(),
      base().where('category', '==', resolved.categoryName).orderBy('createdAt', 'asc').limit(1).get(),
    ]);

    const candidates = [...snapNew.docs, ...snapLegacy.docs];
    const waitlistEntry = candidates.sort((a, b) => {
      const aTime = a.get('createdAt')?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.get('createdAt')?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];
    
    if (waitlistEntry) {
      const data = waitlistEntry.data();
      const businessId = data.businessId;
      
      // Obtener email del negocio
      const businessDoc = await db.collection('businesses').doc(businessId).get();
      if (!businessDoc.exists) return;
      
      const businessData = businessDoc.data();
      const email = businessData?.email || businessData?.contactEmail;
      
      if (email) {
        // TODO: Integrar con servicio de email (SendGrid, etc)
        console.log(`📧 Notificar a ${email} - Lugar disponible en plan ${plan}`);
        
        // Ejemplo con SendGrid:
        // await sendEmail({
        //   to: email,
        //   template: 'waitlist-available',
        //   data: { businessName: businessData.name, plan }
        // });
      }
      
      // Marcar como notificado
      await waitlistEntry.ref.update({
        status: 'notified',
        notifiedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      });
    }
  } catch (error) {
    console.error('Error notifying waitlist:', error);
  }
}

/**
 * 🎨 OBTENER COLOR DE URGENCIA PARA UI
 */
export function getUrgencyColor(urgency: 'none' | 'low' | 'medium' | 'high' | 'critical'): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const colors = {
    none: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: '✅',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      icon: 'ℹ️',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      icon: '⚠️',
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-400',
      text: 'text-orange-900',
      icon: '🔥',
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      icon: '🚨',
    },
  };
  
  return colors[urgency];
}

/**
 * 📈 MÉTRICAS DE ESCASEZ
 */
export async function getScarcityMetrics(categoryId: string): Promise<{
  totalBusinesses: number;
  byPlan: Record<BusinessPlan, number>;
  saturation: {
    featured: number; // % lleno
    sponsor: number;  // % lleno
  };
  competitionLevel: 'low' | 'medium' | 'high' | 'saturated';
}> {
  const category = CATEGORY_LIMITS[categoryId as keyof typeof CATEGORY_LIMITS];
  
  if (!category) {
    return {
      totalBusinesses: 0,
      byPlan: { free: 0, featured: 0, sponsor: 0 },
      saturation: { featured: 0, sponsor: 0 },
      competitionLevel: 'low',
    };
  }
  
  // Contar negocios por plan
  const freeCount = await countBusinessesInPlan(categoryId, 'free');
  const featuredCount = await countBusinessesInPlan(categoryId, 'featured');
  const sponsorCount = await countBusinessesInPlan(categoryId, 'sponsor');
  
  const featuredMax = category.limits.featured;
  const sponsorMax = category.limits.sponsor;
  
  const featuredSaturation = featuredMax === Infinity ? 0 : (featuredCount / featuredMax) * 100;
  const sponsorSaturation = sponsorMax === Infinity ? 0 : (sponsorCount / sponsorMax) * 100;
  
  let competitionLevel: 'low' | 'medium' | 'high' | 'saturated' = 'low';
  
  if (sponsorSaturation >= 100) competitionLevel = 'saturated';
  else if (sponsorSaturation >= 75) competitionLevel = 'high';
  else if (sponsorSaturation >= 50) competitionLevel = 'medium';
  
  return {
    totalBusinesses: freeCount + featuredCount + sponsorCount,
    byPlan: {
      free: freeCount,
      featured: featuredCount,
      sponsor: sponsorCount,
    },
    saturation: {
      featured: Math.round(featuredSaturation),
      sponsor: Math.round(sponsorSaturation),
    },
    competitionLevel,
  };
}
