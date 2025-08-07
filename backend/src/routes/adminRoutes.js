const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');

const {
  getAllUsers,
  updateUser,
  suspendUser,
  reactivateUser,
  deleteUser,
  getAllAgents,
  editAgent,
  suspendAgent,
  approveAgent,
  getAllProperties,
  deleteProperty,
  reactivateAgent,
} = require('../controllers/adminController');

// User Management
router.get('/users', authenticateToken, requireRole(['Admin']), getAllUsers);
router.put('/users/:id', authenticateToken, requireRole(['Admin']), updateUser);
router.patch('/users/:id/suspend', authenticateToken, requireRole(['Admin']), suspendUser);
router.patch('/users/:id/reactivate', authenticateToken, requireRole(['Admin']), reactivateUser);
router.delete('/users/:id', authenticateToken, requireRole(['Admin']), deleteUser);

// Agent Management
router.get('/agents', authenticateToken, requireRole(['Admin']), getAllAgents);
router.put('/agents/:id', authenticateToken, requireRole(['Admin']), editAgent);
router.patch('/agents/:id/suspend', authenticateToken, requireRole(['Admin']), suspendAgent);
router.patch('/agents/:id/reactivate', authenticateToken, requireRole(['Admin']), reactivateAgent);
router.patch('/agents/:id/approve', authenticateToken, requireRole(['Admin']), approveAgent);

// Property Management
router.get('/properties', authenticateToken, requireRole(['Admin']), getAllProperties);
router.delete('/properties/:id', authenticateToken, requireRole(['Admin']), deleteProperty);

module.exports = router;
