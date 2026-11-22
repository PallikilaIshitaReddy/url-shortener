const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const needsSsl =
  process.env.DB_SSL === 'true' ||
  (connectionString &&
    !connectionString.includes('localhost') &&
    !connectionString.includes('127.0.0.1') &&
    !connectionString.includes('postgres:'));

const pool = new Pool({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres error', err);
});

module.exports = pool;
