const express = require('express');
const router = express.Router();
const { applyForAgent, getAgentApplicationStatus } = require('../controllers/agentController');
const { authenticateToken } = require('../middleware/auth');

// USER: Apply to become an agent
router.post('/apply', authenticateToken, applyForAgent);
router.get('/status', authenticateToken, getAgentApplicationStatus);
module.exports = router;
