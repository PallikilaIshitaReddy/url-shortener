require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');
const redis = require('./config/redis');
const { flushClicks, stopFlushTimer } = require('./services/clickService');

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] received ${signal}, flushing analytics and shutting down...`);
    stopFlushTimer();
    try {
      await flushClicks();
    } catch (err) {
      console.warn('[server] error flushing clicks on shutdown:', err.message);
    }

    server.close(async () => {
      try {
        await redis.quit();
      } catch (_) {}
      try {
        await pool.end();
      } catch (_) {}
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
