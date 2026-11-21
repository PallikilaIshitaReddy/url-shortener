const pool = require('../config/db');
const { encode } = require('../utils/base62');

async function createLink(originalUrl) {
  // 1. Reserve the next ID from the table's sequence
  const seqResult = await pool.query(
    "SELECT nextval(pg_get_serial_sequence('links', 'id')) AS id"
  );
  const id = Number(seqResult.rows[0].id);

  // 2. Derive the short code from that ID
  const shortCode = encode(id);

  // 3. Save the link with both values
  const result = await pool.query(
    `INSERT INTO links (id, short_code, original_url)
     VALUES ($1, $2, $3)
     RETURNING id, short_code, original_url, created_at`,
    [id, shortCode, originalUrl]
  );
  return result.rows[0];
}

async function findByCode(shortCode) {
  const result = await pool.query(
    `SELECT id, original_url, expires_at, is_active
     FROM links WHERE short_code = $1`,
    [shortCode]
  );
  return result.rows[0] || null;
}

module.exports = { createLink, findByCode };
