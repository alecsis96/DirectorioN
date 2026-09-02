import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import { rateLimit } from '../../../lib/rateLimit';
import { csrfProtection } from '../../../lib/csrfProtection';
import {
  assertSupportedApplicationVersion,
  getApplicationBusinessData,
  isApplicationV2,
  resolveApplicationOwnerId,
} from '../../../lib/applications/compatibility';

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
        const now = new Date();
        // businessStatus es la fuente de verdad; status se conserva solo por compatibilidad legacy.
        await businessRef.update({
          status: 'published',
          businessStatus: 'published',
          applicationStatus: 'approved',
          adminStatus: 'active',
          visibility: 'published',
          isActive: true,
          publishedAt: now,
          lastReviewedAt: now,
          publishedBy: decoded.uid,
          updatedAt: now,
        });
        
        console.log(`✅ [review-business] Business ${businessId} published successfully`);
        
        // Enviar notificaciones (email y WhatsApp)
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const ownerEmail = businessData?.ownerEmail;
        const ownerPhone = businessData?.phone || businessData?.WhatsApp;
        const businessName = businessData?.name;
        const ownerName = businessData?.ownerName;
        
        // Enviar email
        if (ownerEmail) {
          try {
            await fetch(`${baseUrl}/api/send-email-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                type: 'approved',
                to: ownerEmail,
                businessName,
                ownerName,
              }),
            });
            console.log(`📧 Email notification sent to ${ownerEmail}`);
          } catch (emailError) {
            console.warn('Failed to send email notification:', emailError);
          }
        }
        
        // Enviar WhatsApp
        if (ownerPhone) {
          try {
            // Normalizar número de teléfono (agregar +52 si no tiene código)
            let phoneNumber = ownerPhone.replace(/\D/g, '');
            if (!phoneNumber.startsWith('52') && phoneNumber.length === 10) {
              phoneNumber = '52' + phoneNumber;
            }
            if (!phoneNumber.startsWith('+')) {
              phoneNumber = '+' + phoneNumber;
            }
            
            await fetch(`${baseUrl}/api/send-whatsapp-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                type: 'approved',
                to: phoneNumber,
                businessName,
                ownerName,
              }),
            });
            console.log(`📱 WhatsApp notification sent to ${phoneNumber}`);
          } catch (whatsappError) {
            console.warn('Failed to send WhatsApp notification:', whatsappError);
          }
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

    const appData = appSnap.data() || {};
    assertSupportedApplicationVersion(appData);
    const applicationV2 = isApplicationV2(appData);
    const applicationBusiness = getApplicationBusinessData(appData);

    if (applicationV2 && appData.status === 'approved' && typeof appData.businessId === 'string') {
      return res.status(200).json({
        ok: true,
        message: 'Application already approved',
        businessId: appData.businessId,
      });
    }
    
    console.log('🔍 [review-business] Application data:', {
      businessId,
      ownerId: appData?.ownerId,
      ownerUid: appData?.ownerUid,
      ownerEmail: appData?.ownerEmail,
      businessName: applicationBusiness.businessName,
      schemaVersion: appData.schemaVersion,
    });

    if (action === 'approve') {
      // Crear el negocio en businesses
      const businessRef = db.collection('businesses').doc();
      const now = new Date();
      
      // En v1 se conserva applications/{uid}; un ID v2 aleatorio nunca es ownership.
      const finalOwnerId = resolveApplicationOwnerId(businessId, appData);
      
      console.log('📝 [review-business] Creating business with ownerId:', finalOwnerId);

      const newBusiness: Record<string, unknown> = {
        name: applicationBusiness.businessName || 'Sin nombre',
        category: applicationBusiness.category || '',
        description: applicationBusiness.description || '',
        address: applicationBusiness.address || '',
        colonia: applicationBusiness.colonia || '',
        phone: applicationBusiness.phone || appData.ownerPhone || '',
        WhatsApp: applicationBusiness.whatsapp || '',
        Facebook: applicationBusiness.facebookPage || '',
        hours: applicationBusiness.hours || '',
        horarios: applicationBusiness.horarios || {},
        ownerEmail: appData.ownerEmail || '',
        ownerName: appData.ownerName || '',
        plan: 'free', // Siempre inicia como free
        featured: false,
        isOpen: 'si',
        rating: 0,
        logoUrl: applicationBusiness.logoUrl || null,
        coverUrl: applicationBusiness.coverPhoto || null,
        image1: Array.isArray(applicationBusiness.gallery) ? applicationBusiness.gallery[0] || null : null,
        image2: Array.isArray(applicationBusiness.gallery) ? applicationBusiness.gallery[1] || null : null,
        image3: Array.isArray(applicationBusiness.gallery) ? applicationBusiness.gallery[2] || null : null,
        images: applicationBusiness.gallery || [],
        location: applicationBusiness.location || null,
        hasEnvio: applicationBusiness.hasEnvio || false,
        status: 'draft', // Cambiado a 'draft' - necesita edición del dueño antes de publicar
        approvedAt: now,
        approvedBy: decoded.uid,
        createdAt: appData?.createdAt || now,
        updatedAt: now,
      };
      if (finalOwnerId) newBusiness.ownerId = finalOwnerId;
      if (applicationV2) {
        newBusiness.sourceApplicationId = businessId;
        newBusiness.applicationSchemaVersion = 2;
        newBusiness.businessStatus = 'draft';
        newBusiness.applicationStatus = 'approved';
        newBusiness.adminStatus = 'active';
        newBusiness.visibility = 'hidden';
        newBusiness.isActive = true;
      }

      if (applicationV2) {
        const resolvedBusinessId = await db.runTransaction(async (transaction) => {
          const freshApplication = await transaction.get(appRef);
          if (!freshApplication.exists) throw new Error('Application not found');
          const freshData = freshApplication.data() || {};
          if (freshData.status === 'approved' && freshData.businessId) {
            return String(freshData.businessId);
          }

          transaction.create(businessRef, newBusiness);
          transaction.update(appRef, {
            status: 'approved',
            businessId: businessRef.id,
            approvedAt: now,
            approvedBy: decoded.uid,
            updatedAt: now,
          });
          return businessRef.id;
        });
        if (resolvedBusinessId !== businessRef.id) {
          return res.status(200).json({
            ok: true,
            message: 'Application already approved',
            businessId: resolvedBusinessId,
          });
        }
      } else {
        await businessRef.set(newBusiness);
        // Compatibilidad v1: la ruta histórica consumía applications/{uid}.
        await appRef.delete();
      }

      console.log(`✅ [review-business] Business ${businessRef.id} created successfully`);
      console.log(`   - ownerId: ${finalOwnerId}`);
      console.log(`   - ownerEmail: ${appData?.ownerEmail}`);
      console.log(`   - businessName: ${appData?.businessName}`);

      if (applicationV2) {
        return res.status(200).json({
          ok: true,
          message: 'Ownerless business approved; claim delivery remains disabled',
          businessId: businessRef.id,
          applicationId: businessId,
        });
      }

      // Enviar notificaciones (email y WhatsApp)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const ownerEmail = appData?.ownerEmail;
      const ownerPhone = applicationBusiness.phone || applicationBusiness.whatsapp || appData.ownerPhone;
      const businessName = applicationBusiness.businessName;
      const ownerName = appData?.ownerName;
      
      // Enviar email
      if (ownerEmail) {
        try {
          await fetch(`${baseUrl}/api/send-email-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: 'approved',
              to: ownerEmail,
              businessName,
              ownerName,
              applicationId: businessId,
              businessId: businessRef.id,
            }),
          });
          console.log(`📧 Email notification sent to ${ownerEmail}`);
        } catch (emailError) {
          console.warn('Failed to send email notification:', emailError);
        }
      }
      
      // Enviar WhatsApp
      if (ownerPhone) {
        try {
          // Normalizar número de teléfono (agregar +52 si no tiene código)
          let phoneNumber = ownerPhone.replace(/\D/g, '');
          if (!phoneNumber.startsWith('52') && phoneNumber.length === 10) {
            phoneNumber = '52' + phoneNumber;
          }
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+' + phoneNumber;
          }
          
          await fetch(`${baseUrl}/api/send-whatsapp-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: 'approved',
              to: phoneNumber,
              businessName,
              ownerName,
              applicationId: businessId,
              businessId: businessRef.id,
            }),
          });
          console.log(`📱 WhatsApp notification sent to ${phoneNumber}`);
        } catch (whatsappError) {
          console.warn('Failed to send WhatsApp notification:', whatsappError);
        }
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
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: 'rejected',
            to: appData?.ownerEmail,
            businessName: applicationBusiness.businessName,
            ownerName: appData?.ownerName,
            applicationId: businessId,
            businessId: typeof appData.businessId === 'string' ? appData.businessId : null,
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
