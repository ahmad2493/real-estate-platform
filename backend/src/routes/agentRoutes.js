const express = require('express');
const router = express.Router();

const { applyForAgent } = require('../controllers/agentController');

const { authenticateToken } = require('../middleware/auth');

// USER: Apply to become an agent
router.post('/apply', authenticateToken, applyForAgent);

module.exports = router;
