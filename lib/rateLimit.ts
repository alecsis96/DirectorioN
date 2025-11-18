import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  interval: number; // milliseconds
  uniqueTokenPerInterval: number; // max requests per interval
}

interface TokenBucket {
  count: number;
  lastReset: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, TokenBucket>();

export function rateLimit(config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 10 }) {
  return {
    check: (req: NextApiRequest, res: NextApiResponse, limit: number = config.uniqueTokenPerInterval) => {
      // Use IP address or user ID as identifier
      const identifier = req.headers['x-forwarded-for'] || 
                        req.headers['x-real-ip'] || 
                        req.socket.remoteAddress || 
                        'unknown';
      
      const tokenKey = Array.isArray(identifier) ? identifier[0] : identifier;
      const now = Date.now();
      
      let tokenBucket = rateLimitMap.get(tokenKey);
      
      if (!tokenBucket || now - tokenBucket.lastReset > config.interval) {
        tokenBucket = { count: 0, lastReset: now };
        rateLimitMap.set(tokenKey, tokenBucket);
      }
      
      tokenBucket.count++;
      
      const remaining = Math.max(0, limit - tokenBucket.count);
      const reset = tokenBucket.lastReset + config.interval;
      
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(reset / 1000).toString());
      
      if (tokenBucket.count > limit) {
        res.status(429).json({ 
          error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
          retryAfter: Math.ceil((reset - now) / 1000)
        });
        return false;
      }
      
      return true;
    }
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitMap.entries()) {
    if (now - bucket.lastReset > 3600000) { // 1 hour
      rateLimitMap.delete(key);
    }
  }
}, 3600000); // Run every hour
