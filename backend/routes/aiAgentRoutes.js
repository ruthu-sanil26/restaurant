const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiAgentController');

router.post('/chat', chat);

module.exports = router;
