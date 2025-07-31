const express = require('express');
const router = express.Router();
const leaseController = require('../controllers/leaseController');

// Create
router.post('/', leaseController.createLease);

// Read
router.get('/', leaseController.getAllLeases);
router.get('/:id', leaseController.getLeaseById);

// Update
router.put('/:id', leaseController.updateLease);

// Delete
router.delete('/:id', leaseController.deleteLease);

module.exports = router;
