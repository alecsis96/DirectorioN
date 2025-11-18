import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Endpoint de telemetría para capturar eventos del cliente
 * Por ahora solo registra en consola, se puede integrar con Google Analytics, Mixpanel, etc.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event, data } = req.body;

    if (!event || typeof event !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid event name' });
    }

    // Log del evento (en producción se enviaría a servicio de analytics)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TELEMETRY] ${event}:`, data);
    }

    // TODO: Integrar con servicio de analytics
    // - Google Analytics 4
    // - Mixpanel
    // - Amplitude
    // - PostHog
    // Ejemplo:
    // await analytics.track({
    //   userId: req.headers['x-user-id'],
    //   event,
    //   properties: data,
    // });

    res.status(200).json({ success: true, received: event });
  } catch (error: any) {
    console.error('Telemetry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
