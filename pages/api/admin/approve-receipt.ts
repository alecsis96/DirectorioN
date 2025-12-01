import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';
import { hasAdminOverride } from '../../../lib/adminOverrides';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verificar que el usuario es admin
    const authHeader = req.headers.authorization;
    const token = req.cookies.__session || req.cookies.session || 
                  (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader);

    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const auth = getAdminAuth();
    let decoded;
    try {
      decoded = await auth.verifySessionCookie(token, true);
    } catch {
      decoded = await auth.verifyIdToken(token);
    }

    const isAdmin = (decoded as any).admin === true || hasAdminOverride(decoded.email);
    if (!isAdmin) {
      return res.status(403).json({ error: 'No autorizado - requiere permisos de admin' });
    }

    const db = getAdminFirestore();
    const { receiptId, action } = req.body; // action: 'approve' | 'reject'

    if (!receiptId || !action) {
      return res.status(400).json({ error: 'receiptId y action son requeridos' });
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'action debe ser approve o reject' });
    }

    // Obtener el comprobante
    const receiptRef = db.collection('paymentReceipts').doc(receiptId);
    const receiptDoc = await receiptRef.get();

    if (!receiptDoc.exists) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const receiptData = receiptDoc.data();
    if (!receiptData) {
      return res.status(500).json({ error: 'Error al leer el comprobante' });
    }

    const { businessId, plan, ownerEmail } = receiptData;

    // Actualizar el status del comprobante
    await receiptRef.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: decoded.email || 'admin',
    });

    // Si se rechaza, no actualizar el negocio
    if (action === 'reject') {
      return res.status(200).json({ 
        success: true, 
        message: 'Comprobante rechazado correctamente' 
      });
    }

    // Si se aprueba, actualizar el negocio
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Calcular fechas
    const now = new Date();
    const nextPaymentDate = new Date(now);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 días desde ahora

    // Obtener el historial de pagos actual
    const businessData = businessDoc.data();
    const currentHistory = businessData?.paymentHistory || [];

    // Agregar nuevo registro al historial
    const newPaymentRecord = {
      date: now.toISOString(),
      plan: plan,
      amount: plan === 'featured' ? 100 : plan === 'sponsor' ? 200 : 0,
      method: 'transfer',
      receiptId: receiptId,
      approvedBy: decoded.email || 'admin',
      status: 'completed',
    };

    // Actualizar el negocio
    await businessRef.update({
      plan: plan,
      planPaymentMethod: 'transfer',
      paymentStatus: 'active',
      lastPaymentDate: now.toISOString(),
      nextPaymentDate: nextPaymentDate.toISOString(),
      paymentHistory: [...currentHistory, newPaymentRecord],
      updatedAt: now.toISOString(),
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Comprobante aprobado y plan actualizado correctamente',
      nextPaymentDate: nextPaymentDate.toISOString(),
    });

  } catch (error) {
    console.error('Error en approve-receipt:', error);
    return res.status(500).json({ 
      error: 'Error al procesar el comprobante',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
