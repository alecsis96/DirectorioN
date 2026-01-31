import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride as checkAdminOverride } from '../../../lib/adminOverrides';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);

    // Verificar que sea admin
    const isAdmin = await checkAdminOverride(decoded.email);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Obtener negocios con problemas de pago
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const snapshot = await adminDb.collection('businesses').get();
    const businesses = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.businessName || 'Sin nombre',
          ownerEmail: data.ownerEmail,
          ownerName: data.ownerName,
          plan: data.plan,
          isActive: data.isActive,
          paymentStatus: data.paymentStatus,
          nextPaymentDate: data.nextPaymentDate,
          lastPaymentDate: data.lastPaymentDate,
          disabledReason: data.disabledReason,
          stripeSubscriptionStatus: data.stripeSubscriptionStatus,
          paymentHistory: data.paymentHistory || [],
        };
      })
      .filter((biz: any) => {
        if (biz.plan === 'free') return false;
        
        // Incluir negocios deshabilitados
        if (biz.isActive === false) return true;
        
        // Incluir negocios con pagos vencidos o próximos a vencer
        if (biz.nextPaymentDate) {
          const nextPayment = new Date(biz.nextPaymentDate);
          return nextPayment <= in7Days;
        }
        
        // Incluir negocios con estado de pago problemático
        if (['pending', 'overdue', 'canceled'].includes(biz.paymentStatus)) return true;
        if (['past_due', 'unpaid', 'canceled', 'payment_failed'].includes(biz.stripeSubscriptionStatus)) return true;
        
        return false;
      })
      .sort((a: any, b: any) => {
        // Ordenar: deshabilitados primero, luego por fecha de pago
        if (a.isActive === false && b.isActive !== false) return -1;
        if (a.isActive !== false && b.isActive === false) return 1;
        
        if (a.nextPaymentDate && b.nextPaymentDate) {
          return new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime();
        }
        
        return 0;
      });

    res.status(200).json(businesses);
  } catch (error: any) {
    console.error('Payment businesses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
