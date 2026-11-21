const redis = require('../config/redis');

const DEFAULT_TTL_SECONDS = 3600;

function cacheKey(shortCode) {
  return `link:${shortCode}`;
}

async function getCachedLink(shortCode) {
  try {
    const raw = await redis.get(cacheKey(shortCode));
    if (!raw) {
      console.log(`[cache] miss code=${shortCode}`);
      return null;
    }
    console.log(`[cache] hit code=${shortCode}`);
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[cache] get error code=${shortCode}:`, err.message);
    return null;
  }
}

async function setCachedLink(shortCode, link) {
  try {
    let ttlSeconds = DEFAULT_TTL_SECONDS;

    if (link.expires_at) {
      const remainingMs = new Date(link.expires_at).getTime() - Date.now();
      const remainingSec = Math.floor(remainingMs / 1000);
      if (remainingSec <= 0) return;
      ttlSeconds = Math.min(DEFAULT_TTL_SECONDS, remainingSec);
    }

    const payload = JSON.stringify({
      original_url: link.original_url,
      expires_at: link.expires_at,
      is_active: link.is_active,
    });

    await redis.set(cacheKey(shortCode), payload, 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[cache] set error code=${shortCode}:`, err.message);
  }
}

async function deleteCachedLink(shortCode) {
  try {
    await redis.del(cacheKey(shortCode));
  } catch (err) {
    console.warn(`[cache] del error code=${shortCode}:`, err.message);
  }
}

module.exports = { getCachedLink, setCachedLink, deleteCachedLink };
