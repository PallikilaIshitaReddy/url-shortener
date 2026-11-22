const { UAParser } = require('ua-parser-js');
const geoip = require('geoip-lite');
const pool = require('../config/db');

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5000;

const clickQueue = [];
let isFlushing = false;
let flushTimer = null;

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let rawIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket?.remoteAddress || '';

  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.slice(7);
  }
  return rawIp;
}

function parseDevice(userAgent) {
  if (!userAgent) return 'desktop';
  const parser = new UAParser(userAgent);
  const deviceType = parser.getDevice().type;
  if (deviceType === 'mobile') return 'mobile';
  if (deviceType === 'tablet') return 'tablet';
  return 'desktop';
}

function parseCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  try {
    const geo = geoip.lookup(ip);
    return geo && geo.country ? geo.country : null;
  } catch (_) {
    return null;
  }
}

async function insertClickBatch(rows) {
  if (!rows.length) return;

  const values = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 4;
    values.push(row.linkId, row.referrer || null, row.device || 'desktop', row.country || null);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });

  await pool.query(
    `INSERT INTO clicks (link_id, referrer, device, country)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}

async function flushClicks() {
  if (isFlushing || clickQueue.length === 0) return;
  isFlushing = true;

  const batch = clickQueue.splice(0, clickQueue.length);
  try {
    await insertClickBatch(batch);
  } catch (err) {
    console.warn(`[analytics] batch flush error (${batch.length} clicks):`, err.message);
    // Re-queue up to a safe cap so transient DB hiccups don't unboundedly grow memory
    if (clickQueue.length < 5000) {
      clickQueue.unshift(...batch.slice(0, 5000 - clickQueue.length));
    }
  } finally {
    isFlushing = false;
    if (clickQueue.length >= BATCH_SIZE) {
      setImmediate(() => {
        flushClicks().catch(() => {});
      });
    }
  }
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushClicks().catch(() => {});
  }, FLUSH_INTERVAL_MS);
  if (typeof flushTimer.unref === 'function') {
    flushTimer.unref();
  }
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

function recordClickAsync(req, linkId) {
  if (!linkId) return;

  try {
    const referrer = req.get('referer') || req.headers.referer || null;
    const userAgent = req.get('user-agent') || req.headers['user-agent'] || '';
    const device = parseDevice(userAgent);
    const ip = extractClientIp(req);
    const country = parseCountry(ip);

    startFlushTimer();
    clickQueue.push({ linkId, referrer, device, country });

    if (clickQueue.length >= BATCH_SIZE) {
      setImmediate(() => {
        flushClicks().catch(() => {});
      });
    }
  } catch (err) {
    console.warn(`[analytics] click enqueue error link_id=${linkId}:`, err.message);
  }
}

process.on('SIGTERM', () => {
  stopFlushTimer();
  flushClicks().catch(() => {});
});

module.exports = {
  recordClickAsync,
  flushClicks,
  insertClickBatch,
  startFlushTimer,
  stopFlushTimer,
  parseDevice,
  parseCountry,
  extractClientIp,
};
