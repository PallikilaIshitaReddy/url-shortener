const express = require('express');
const createRateLimiter = require('../middleware/rateLimiter');
const { redirect } = require('../controllers/linkController');

const redirectLimiter = createRateLimiter({
  prefix: 'redirect',
  windowSeconds: 60,
  maxRequests: 120,
  keyFn: (req) => `ip:${req.ip}`,
});

const router = express.Router();
router.get('/:code', redirectLimiter, redirect);

module.exports = router;
