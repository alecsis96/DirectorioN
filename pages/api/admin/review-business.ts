import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import { rateLimit } from '../../../lib/rateLimit';
import { csrfProtection } from '../../../lib/csrfProtection';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 20 });

type ReviewBody = {
  businessId?: string;
  action?: 'approve' | 'reject';
  notes?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // CSRF Protection
  if (!csrfProtection(req, res)) return;

  // Rate limiting: 20 requests per minute
  if (!limiter.check(req, res, 20)) return;

  try {
    // Verificar autenticación admin
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    
    if (!(decoded as any).admin && !hasAdminOverride(decoded.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { businessId, action, notes }: ReviewBody = req.body ?? {};
    
    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid businessId' });
    }
    
    if (!action || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Validar longitud del notes para prevenir ataques
    if (notes && (typeof notes !== 'string' || notes.length > 1000)) {
      return res.status(400).json({ error: 'Notes field too long (max 1000 chars)' });
    }

    const db = getAdminFirestore();
    const ref = db.doc(`businesses/${businessId}`);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const data = snap.data();
    if (data?.status !== 'pending') {
      return res.status(400).json({ error: 'Business is not in pending status' });
    }

    if (action === 'approve') {
      // Aprobar: cambiar status a "approved" para que aparezca en el directorio público
      await ref.update({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: decoded.uid,
        updatedAt: new Date(),
      });

      // Enviar email de aprobación
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/send-email-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'approved',
            to: data.ownerEmail,
            businessName: data.name,
            ownerName: data.ownerEmail?.split('@')[0],
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send approval email:', emailError);
        // No fallar si el email falla
      }

      return res.status(200).json({ ok: true, message: 'Business approved successfully' });
    } else {
      // Rechazar: cambiar status a "rejected" para que el dueño pueda corregir
      await ref.update({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: decoded.uid,
        rejectionNotes: notes || 'Sin motivo especificado',
        updatedAt: new Date(),
      });

      // Enviar email de rechazo
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/send-email-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rejected',
            to: data.ownerEmail,
            businessName: data.name,
            ownerName: data.ownerEmail?.split('@')[0],
            rejectionNotes: notes || 'Por favor revisa la información de tu negocio y asegúrate de que esté completa y precisa.',
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send rejection email:', emailError);
        // No fallar si el email falla
      }

      return res.status(200).json({ ok: true, message: 'Business rejected successfully' });
    }
  } catch (error) {
    console.error('[admin/review-business] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
