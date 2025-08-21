const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  requestLease,
  uploadLeaseDocument,
  signLeaseDocument,
  getLeaseDetails,
  getUserLeases,
  updateLeaseStatus,
  createDocuSignEnvelope,
  handleDocuSignWebhook,
  checkDocuSignStatus,
} = require('../controllers/leaseController');

// Existing lease management routes
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
router.patch('/:leaseId/sign', authenticateToken, signLeaseDocument);

// NEW: DocuSign specific routes
router.post('/:leaseId/docusign/create-envelope', authenticateToken, createDocuSignEnvelope);
router.get('/:leaseId/docusign/status', authenticateToken, checkDocuSignStatus);

// DocuSign webhook (no authentication required as DocuSign sends this)
router.post('/docusign/webhook', handleDocuSignWebhook);

module.exports = router;
