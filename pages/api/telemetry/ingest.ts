import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminFirestore, getAdminAuth } from '../../../lib/server/firebaseAdmin';

const adminDb = getAdminFirestore();
const adminAuth = getAdminAuth();

type TelemetryEvent = {
  event: string;
  page?: string;
  businessId?: string;
  businessName?: string;
  category?: string;
  value?: number;
  searchQuery?: string;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
};

/**
 * Endpoint de telemetría para capturar eventos del cliente
 * Almacena eventos en Firestore para análisis posterior
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: TelemetryEvent = req.body;

    if (!payload.event || typeof payload.event !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid event name' });
    }

    // Extraer información del usuario
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        userId = decoded.uid;
        userEmail = decoded.email || null;
      } catch {
        // Token inválido, continuar como anónimo
      }
    }

    // Información de sesión y navegador
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
               req.socket.remoteAddress || 
               'Unknown';
    const saveData = req.headers['save-data'] === 'on';
    
    // Crear documento de evento
    const eventDoc = {
      // Datos del evento
      event: payload.event,
      page: payload.page || null,
      businessId: payload.businessId || null,
      businessName: payload.businessName || null,
      category: payload.category || null,
      value: payload.value || null,
      searchQuery: payload.searchQuery || null,
      filters: payload.filters || null,
      metadata: payload.metadata || null,
      error: payload.error || null,
      
      // Datos del usuario
      userId,
      userEmail,
      isAnonymous: !userId,
      
      // Datos de sesión
      userAgent,
      ip,
      saveData,
      
      // Timestamp
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    // Guardar en Firestore
    await adminDb.collection('telemetry_events').add(eventDoc);

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TELEMETRY] ${payload.event}:`, {
        ...payload,
        userId,
        timestamp: eventDoc.timestamp,
      });
    }

    res.status(200).json({ success: true, received: payload.event });
  } catch (error: any) {
    console.error('Telemetry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
