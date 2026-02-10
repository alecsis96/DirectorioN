import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación de admin
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const auth = getAdminAuth();
    let decoded;
    
    try {
      decoded = await auth.verifySessionCookie(token, true);
    } catch {
      decoded = await auth.verifyIdToken(token);
    }

    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return res.status(403).json({ error: 'No tienes permisos de administrador' });
    }

    // Obtener negocios publicados
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('businesses')
      .where('businessStatus', '==', 'published')
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ businesses: [], stats: { total: 0, free: 0, featured: 0, sponsor: 0 } });
    }

    const businesses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessName: data.businessName || data.name || 'Sin nombre',
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        category: data.category,
        status: data.status,
        plan: data.plan || 'free',
        planExpiresAt: data.planExpiresAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        viewCount: data.viewCount || 0,
        reviewCount: data.reviewCount || 0,
        avgRating: data.avgRating || 0,
        stripeSubscriptionStatus: data.stripeSubscriptionStatus,
        nextPaymentDate: data.nextPaymentDate?.toDate?.()?.toISOString() || null,
        lastPaymentDate: data.lastPaymentDate?.toDate?.()?.toISOString() || null,
        isActive: data.isActive,
      };
    });

    // Calcular estadísticas
    const stats = {
      total: businesses.length,
      free: businesses.filter(b => b.plan === 'free').length,
      featured: businesses.filter(b => b.plan === 'featured').length,
      sponsor: businesses.filter(b => b.plan === 'sponsor').length,
    };

    return res.status(200).json({ businesses, stats });
  } catch (error: any) {
    console.error('[businesses-data] Error:', error);
    return res.status(500).json({ error: 'Error al obtener negocios', details: error.message });
  }
}
