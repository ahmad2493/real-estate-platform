const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  requestLease,
  uploadLeaseDocument,
  getLeaseDetails,
  getUserLeases,
  updateLeaseStatus,
} = require('../controllers/leaseController');

// Lease management routes
router.post('/request', authenticateToken, requestLease);
router.post(
  '/:leaseId/upload-document',
  authenticateToken,
  upload.single('leaseDocument'),
  uploadLeaseDocument
);
router.get('/:leaseId', authenticateToken, getLeaseDetails);
router.get('/', authenticateToken, getUserLeases);
router.patch('/:leaseId/status', authenticateToken, updateLeaseStatus);

module.exports = router;
