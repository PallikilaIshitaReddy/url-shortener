const express = require('express');
const { create } = require('../controllers/linkController');

const router = express.Router();
router.post('/', create);

module.exports = router;
