const express = require('express');
const authMiddleware = require('../middleware/auth');
const { create, list, remove } = require('../controllers/linkController');

const router = express.Router();

router.post('/', authMiddleware, create);
router.get('/', authMiddleware, list);
router.delete('/:id', authMiddleware, remove);

module.exports = router;
