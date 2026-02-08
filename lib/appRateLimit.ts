import type { NextRequest } from 'next/server';

type RequestLike = Pick<Request, 'headers'> | NextRequest;

interface RateLimitConfig {
  interval: number; // milliseconds
  uniqueTokenPerInterval: number; // max requests per interval
}

interface TokenBucket {
  count: number;
  lastReset: number;
}

const rateLimitMap = new Map<string, TokenBucket>();

function getClientIdentifier(req: RequestLike): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export function appRateLimit(
  config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 10 }
) {
  return {
    check: (req: RequestLike, limit: number = config.uniqueTokenPerInterval) => {
      const identifier = getClientIdentifier(req);
      const now = Date.now();
      let tokenBucket = rateLimitMap.get(identifier);

      if (!tokenBucket || now - tokenBucket.lastReset > config.interval) {
        tokenBucket = { count: 0, lastReset: now };
        rateLimitMap.set(identifier, tokenBucket);
      }

      tokenBucket.count++;
      const remaining = Math.max(0, limit - tokenBucket.count);
      const reset = tokenBucket.lastReset + config.interval;

      return {
        allowed: tokenBucket.count <= limit,
        remaining,
        resetSeconds: Math.ceil(reset / 1000),
        retryAfterSeconds: Math.ceil((reset - now) / 1000),
      };
    },
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitMap.entries()) {
    if (now - bucket.lastReset > 3600000) {
      rateLimitMap.delete(key);
    }
  }
}, 3600000);
