import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../../lib/server/firebaseAdmin';
import { hasAdminOverride as checkAdminOverride } from '../../../../lib/adminOverrides';
import type { ReportStatus } from '../../../../types/report';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
    const isAdmin = await checkAdminOverride({ uid: decoded.uid } as any);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { reportId, status, reviewNotes } = req.body;

    // Validaciones
    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({ error: 'reportId es requerido' });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'status es requerido' });
    }

    const validStatuses: ReportStatus[] = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status as ReportStatus)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    // Verificar que el reporte existe
    const reportRef = adminDb.collection('business_reports').doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Actualizar el reporte
    const updateData: any = {
      status,
      updatedAt: new Date(),
      reviewedBy: decoded.uid,
    };

    if (reviewNotes && typeof reviewNotes === 'string') {
      updateData.reviewNotes = reviewNotes.trim();
    }

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = new Date();
    }

    await reportRef.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Reporte actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
