const pool = require('../config/db');

async function getLinkAnalytics(linkId) {
  const [
    totalRes,
    dailyRes,
    deviceRes,
    referrerRes,
    countryRes,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_clicks
       FROM clicks
       WHERE link_id = $1`,
      [linkId]
    ),
    pool.query(
      `SELECT date_trunc('day', clicked_at) AS day, COUNT(*)::int AS count
       FROM clicks
       WHERE link_id = $1 AND clicked_at > now() - interval '30 days'
       GROUP BY day
       ORDER BY day`,
      [linkId]
    ),
    pool.query(
      `SELECT device, COUNT(*)::int AS count
       FROM clicks
       WHERE link_id = $1
       GROUP BY device
       ORDER BY count DESC`,
      [linkId]
    ),
    pool.query(
      `SELECT referrer, COUNT(*)::int AS count
       FROM clicks
       WHERE link_id = $1 AND referrer IS NOT NULL AND referrer <> ''
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 10`,
      [linkId]
    ),
    pool.query(
      `SELECT country, COUNT(*)::int AS count
       FROM clicks
       WHERE link_id = $1 AND country IS NOT NULL AND country <> ''
       GROUP BY country
       ORDER BY count DESC
       LIMIT 10`,
      [linkId]
    ),
  ]);

  return {
    totalClicks: totalRes.rows[0]?.total_clicks ?? 0,
    clicksLast30Days: dailyRes.rows.map((row) => ({
      day: row.day,
      count: row.count,
    })),
    byDevice: deviceRes.rows.map((row) => ({
      device: row.device,
      count: row.count,
    })),
    topReferrers: referrerRes.rows.map((row) => ({
      referrer: row.referrer,
      count: row.count,
    })),
    topCountries: countryRes.rows.map((row) => ({
      country: row.country,
      count: row.count,
    })),
  };
}

module.exports = { getLinkAnalytics };
