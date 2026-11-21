const pool = require('../config/db');
const { encode } = require('../utils/base62');

async function createLink(originalUrl, userId, customAlias = null, expiresAt = null) {
  // 1. Reserve the next ID from the table's sequence
  const seqResult = await pool.query(
    "SELECT nextval(pg_get_serial_sequence('links', 'id')) AS id"
  );
  const id = Number(seqResult.rows[0].id);

  // 2. Use the custom alias if provided, otherwise derive Base62 from ID
  const shortCode = customAlias || encode(id);

  // 3. Save the link (let Postgres UNIQUE constraint catch duplicate short_code via 23505)
  const result = await pool.query(
    `INSERT INTO links (id, short_code, original_url, user_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, short_code, original_url, user_id, expires_at, is_active, created_at`,
    [id, shortCode, originalUrl, userId, expiresAt]
  );
  return result.rows[0];
}

async function findByCode(shortCode) {
  const result = await pool.query(
    `SELECT id, short_code, original_url, user_id, expires_at, is_active, created_at
     FROM links WHERE short_code = $1`,
    [shortCode]
  );
  return result.rows[0] || null;
}

async function listByUser(userId) {
  const result = await pool.query(
    `SELECT id, short_code, original_url, expires_at, is_active, created_at
     FROM links
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, short_code, original_url, user_id, expires_at, is_active, created_at
     FROM links WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function deleteById(id) {
  const result = await pool.query(
    `DELETE FROM links WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  createLink,
  findByCode,
  listByUser,
  findById,
  deleteById,
};
