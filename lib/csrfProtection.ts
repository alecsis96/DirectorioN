import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Simple CSRF protection middleware
 * Verifies that requests come from the same origin
 */
export function csrfProtection(req: NextApiRequest, res: NextApiResponse): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (req.method && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  const origin = req.headers.origin || req.headers.referer;
  const host = req.headers.host;
  
  // Allow requests from same origin
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost === host) {
      return true;
    }
  }
  
  // In production, reject mismatched origins
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ 
      error: 'CSRF validation failed. Request origin does not match server.' 
    });
    return false;
  }
  
  // In development, allow (for hot reload, etc.)
  return true;
}
