import type { NextApiRequest, NextApiResponse } from 'next';
/** Endpoint retirado en R5C: la alerta se reserva dentro de la transición atómica. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(410).json({ error: 'Use the atomic review submission flow' });
}
