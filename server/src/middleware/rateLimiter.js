const redis = require('../config/redis');

function createRateLimiter({ prefix, windowSeconds, maxRequests, keyFn }) {
  return async function rateLimiter(req, res, next) {
    let identifier = req.ip || 'unknown';
    if (keyFn) {
      try {
        identifier = String(keyFn(req));
      } catch {
        identifier = req.ip || 'unknown';
      }
    }

    try {
      const key = `rl:${prefix}:${identifier}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);

      let ttl = await redis.ttl(key);
      if (ttl < 0) ttl = windowSeconds;

      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));

      if (count > maxRequests) {
        res.setHeader('Retry-After', String(ttl));
        return res.status(429).json({ error: 'Too many requests', retryAfter: ttl });
      }
      return next();
    } catch (err) {
      console.warn(`[rateLimiter:${prefix}] Redis fallback:`, err.message);
      return next();
    }
  };
}

module.exports = createRateLimiter;
