const express = require('express');
const auth = require('../middleware/auth');
const createRateLimiter = require('../middleware/rateLimiter');
const { create, list, remove, analytics } = require('../controllers/linkController');

const createLinkLimiter = createRateLimiter({
  prefix: 'create-link',
  windowSeconds: 60,
  maxRequests: 20,
  keyFn: (req) => `user:${req.user.id}`,
});

const router = express.Router();
router.post('/', auth, createLinkLimiter, create);
router.get('/', auth, list);
router.delete('/:id', auth, remove);
router.get('/:id/analytics', auth, analytics);

module.exports = router;
