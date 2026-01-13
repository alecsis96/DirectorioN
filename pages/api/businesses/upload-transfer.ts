import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAuth, getAdminFirestore, getAdminStorage } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';
import admin from 'firebase-admin';

const VALID_PLANS = ['featured', 'sponsor'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

// Configurar límite de body size para esta API
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const auth = getAdminAuth();
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (tokenError) {
      console.error('[upload-transfer] Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Token inválido o expirado. Por favor, cierra sesión y vuelve a iniciar.' });
    }
    
    const db = getAdminFirestore();

    const { businessId, plan, notes, fileName, fileType, fileData } = req.body ?? {};

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Missing businessId' });
    }
    if (!plan || typeof plan !== 'string' || !VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    if (!fileName || !fileType || !fileData || typeof fileData !== 'string') {
      console.error('[upload-transfer] Missing file data');
      return res.status(400).json({ error: 'Falta el archivo o datos inválidos' });
    }
    if (!ALLOWED_TYPES.includes(fileType)) {
      console.error('[upload-transfer] Invalid file type:', fileType);
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Usa PDF, JPG o PNG' });
    }

    // Validar tamaño (base64 ~1.37x)
    const sizeBytes = Math.ceil((fileData.length * 3) / 4);
    console.log('[upload-transfer] File size:', sizeBytes, 'bytes');
    if (sizeBytes > MAX_FILE_SIZE) {
      console.error('[upload-transfer] File too large:', sizeBytes);
      return res.status(400).json({ error: `Archivo demasiado grande (${(sizeBytes/1024/1024).toFixed(2)}MB). Máximo 3MB` });
    }

    // Validar ownership/admin
    const bizRef = db.doc(`businesses/${businessId}`);
    console.log('[upload-transfer] Fetching business:', businessId);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) {
      console.error('[upload-transfer] Business not found:', businessId);
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    const bizData = bizSnap.data() as Record<string, unknown> | undefined;
    const ownerId = bizData?.ownerId;
    const isOwner = typeof ownerId === 'string' && ownerId === decoded.uid;
    const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const receiptRef = db.collection('paymentReceipts').doc();
    console.log('[upload-transfer] Creating receipt document:', receiptRef.id);
    
    // Verificar si el base64 es muy grande para Firestore (límite ~900KB para dejar margen)
    const estimatedSize = Math.ceil((fileData.length * 3) / 4);
    console.log('[upload-transfer] Estimated Firestore doc size:', estimatedSize, 'bytes');
    
    if (estimatedSize > 900000) {
      // Si es muy grande, usar Storage
      try {
        console.log('[upload-transfer] File too large for Firestore, uploading to Storage...');
        const storage = getAdminStorage();
        const bucket = storage.bucket();
        
        if (!bucket.name) {
          throw new Error('Storage bucket not configured. Please set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in Vercel.');
        }
        
        const fileBuffer = Buffer.from(fileData, 'base64');
        const filePath = `payment-receipts/${receiptRef.id}/${fileName}`;
        const file = bucket.file(filePath);
        
        await file.save(fileBuffer, {
          metadata: {
            contentType: fileType,
            metadata: {
              businessId,
              uploadedBy: decoded.email || decoded.uid,
              originalName: fileName,
            }
          }
        });
        
        // Hacer el archivo público
        await file.makePublic();
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        console.log('[upload-transfer] File uploaded to Storage:', fileUrl);
        
        // Guardar con URL en lugar de base64
        await receiptRef.set({
          id: receiptRef.id,
          businessId,
          businessName: bizData?.name || bizData?.businessName || 'Negocio',
          ownerEmail: bizData?.ownerEmail || decoded.email || null,
          ownerId: ownerId ?? decoded.uid,
          plan,
          paymentMethod: 'transfer',
          notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
          fileName,
          fileType,
          fileUrl, // URL del archivo en Storage
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: decoded.email || decoded.uid,
        });
        console.log('[upload-transfer] Receipt saved with Storage URL');
      } catch (storageError) {
        console.error('[upload-transfer] Storage error:', storageError);
        throw new Error('Archivo demasiado grande y Storage no configurado. Intenta con un archivo más pequeño (máx 500KB).');
      }
    } else {
      // Si cabe en Firestore, usar base64 (más rápido)
      try {
        await receiptRef.set({
          id: receiptRef.id,
          businessId,
          businessName: bizData?.name || bizData?.businessName || 'Negocio',
          ownerEmail: bizData?.ownerEmail || decoded.email || null,
          ownerId: ownerId ?? decoded.uid,
          plan,
          paymentMethod: 'transfer',
          notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
          fileName,
          fileType,
          fileData, // base64 para archivos pequeños
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: decoded.email || decoded.uid,
        });
        console.log('[upload-transfer] Receipt saved successfully with base64');
      } catch (firestoreError) {
        console.error('[upload-transfer] Firestore error:', firestoreError);
        throw new Error('Error al guardar en la base de datos: ' + (firestoreError instanceof Error ? firestoreError.message : 'Unknown'));
      }
    }
    }

    // Enviar notificación de Slack
    try {
      const slackWebhook = process.env.SLACK_WEBHOOK_URL;
      if (slackWebhook) {
        const businessName = bizData?.name || bizData?.businessName || 'Negocio';
        const ownerEmail = bizData?.ownerEmail || decoded.email || 'Sin email';
        const planText = plan === 'featured' ? '⭐ Featured' : '🏆 Sponsor';
        
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `💳 Nuevo comprobante de pago recibido`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '💳 Nuevo Comprobante de Pago',
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*Negocio:*\n${businessName}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Plan solicitado:*\n${planText}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Propietario:*\n${ownerEmail}`
                  },
                  {
                    type: 'mrkdwn',
                    text: `*Archivo:*\n${fileName}`
                  }
                ]
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Ver comprobantes pendientes',
                      emoji: true
                    },
                    url: 'https://directorion.vercel.app/admin/payments',
                    style: 'primary'
                  }
                ]
              }
            ]
          })
        });
        console.log('✅ Slack notification sent for new receipt');
      }
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError);
      // No fallar la request si Slack falla
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[upload-transfer] error', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('[upload-transfer] error details:', errorDetails);
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined 
    });
  }
}
