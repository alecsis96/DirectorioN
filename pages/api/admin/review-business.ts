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
    
    // Primero buscar en businesses (segunda revisión)
    const businessRef = db.doc(`businesses/${businessId}`);
    const businessSnap = await businessRef.get();
    
    if (businessSnap.exists) {
      // Es una segunda revisión (negocio ya creado, enviado a revisión por el dueño)
      const businessData = businessSnap.data();
      
      console.log('🔍 [review-business] Reviewing existing business:', {
        businessId,
        currentStatus: businessData?.status,
        ownerId: businessData?.ownerId,
      });
      
      if (action === 'approve') {
        // Cambiar status a published
        await businessRef.update({
          status: 'published',
          publishedAt: new Date(),
          publishedBy: decoded.uid,
          updatedAt: new Date(),
        });
        
        console.log(`✅ [review-business] Business ${businessId} published successfully`);
        
        // Enviar email de publicación
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          await fetch(`${baseUrl}/api/send-email-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'published',
              to: businessData?.ownerEmail,
              businessName: businessData?.name,
              ownerName: businessData?.ownerName,
            }),
          });
        } catch (emailError) {
          console.warn('Failed to send published email:', emailError);
        }
        
        return res.status(200).json({ ok: true, message: 'Business published successfully', businessId });
      } else {
        // Rechazar: volver a draft con notas
        await businessRef.update({
          status: 'draft',
          rejectedAt: new Date(),
          rejectedBy: decoded.uid,
          rejectionNotes: notes || 'Sin motivo especificado',
          updatedAt: new Date(),
        });
        
        return res.status(200).json({ ok: true, message: 'Business rejected, returned to draft' });
      }
    }
    
    // Si no existe en businesses, buscar en applications (primera revisión)
    const appRef = db.doc(`applications/${businessId}`);
    const appSnap = await appRef.get();
    
    if (!appSnap.exists) {
      return res.status(404).json({ error: 'Application or business not found' });
    }

    const appData = appSnap.data();
    
    console.log('🔍 [review-business] Application data:', {
      businessId,
      ownerId: appData?.ownerId,
      ownerUid: appData?.ownerUid,
      ownerEmail: appData?.ownerEmail,
      businessName: appData?.businessName,
    });

    if (action === 'approve') {
      // Crear el negocio en businesses
      const businessRef = db.collection('businesses').doc();
      const now = new Date();
      
      // Mapear correctamente todos los campos
      // IMPORTANTE: businessId es el UID del usuario (doc path: applications/{uid})
      const finalOwnerId = appData?.ownerId || appData?.ownerUid || businessId;
      
      console.log('📝 [review-business] Creating business with ownerId:', finalOwnerId);
      
      await businessRef.set({
        name: appData?.businessName || 'Sin nombre',
        category: appData?.category || '',
        description: appData?.description || '',
        address: appData?.address || '',
        colonia: appData?.colonia || '',
        phone: appData?.phone || '',
        WhatsApp: appData?.whatsapp || '',
        Facebook: appData?.facebookPage || '',
        hours: appData?.hours || '',
        horarios: appData?.horarios || {},
        ownerId: finalOwnerId,
        ownerEmail: appData?.ownerEmail || '',
        ownerName: appData?.ownerName || '',
        plan: 'free', // Siempre inicia como free
        featured: false,
        isOpen: 'si',
        rating: 0,
        logoUrl: appData?.logoUrl || null,
        coverUrl: appData?.coverPhoto || null,
        image1: appData?.gallery?.[0] || null,
        image2: appData?.gallery?.[1] || null,
        image3: appData?.gallery?.[2] || null,
        images: appData?.gallery || [],
        location: appData?.location || null,
        hasDelivery: appData?.hasDelivery || false,
        status: 'draft', // Cambiado a 'draft' - necesita edición del dueño antes de publicar
        approvedAt: now,
        approvedBy: decoded.uid,
        createdAt: appData?.createdAt || now,
        updatedAt: now,
      });

      // Eliminar de applications
      await appRef.delete();

      console.log(`✅ [review-business] Business ${businessRef.id} created successfully`);
      console.log(`   - ownerId: ${finalOwnerId}`);
      console.log(`   - ownerEmail: ${appData?.ownerEmail}`);
      console.log(`   - businessName: ${appData?.businessName}`);

      // Enviar email de aprobación
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/send-email-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'approved',
            to: appData?.ownerEmail,
            businessName: appData?.businessName,
            ownerName: appData?.ownerName,
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send approval email:', emailError);
      }

      return res.status(200).json({ ok: true, message: 'Business approved and created successfully', businessId: businessRef.id });
    } else {
      // Rechazar: actualizar en applications
      await appRef.update({
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
            to: appData?.ownerEmail,
            businessName: appData?.businessName,
            ownerName: appData?.ownerName,
            rejectionNotes: notes || 'Por favor revisa la información de tu negocio y asegúrate de que esté completa y precisa.',
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send rejection email:', emailError);
      }

      return res.status(200).json({ ok: true, message: 'Application rejected successfully' });
    }
  } catch (error) {
    console.error('[admin/review-business] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
