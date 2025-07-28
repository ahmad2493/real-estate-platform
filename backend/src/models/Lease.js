const mongoose = require('mongoose');

const leaseSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  // Basic lease terms
  terms: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    renewalOption: { type: Boolean, default: false },
  },
  // Basic payment details
  paymentSchedule: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Annually'],
    default: 'Monthly',
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Credit Card', 'Check', 'Cash'],
    default: 'Bank Transfer',
  },
  // Basic document tracking
  leaseDocument: {
    url: String,
    signedByTenant: { type: Boolean, default: false },
    signedByLandlord: { type: Boolean, default: false },
    signedAt: Date,
  },
  // Basic conditions
  conditions: {
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
  },
  // Status
  status: {
    type: String,
    enum: ['Draft', 'Pending Signature', 'Active', 'Expired', 'Terminated', 'Renewed'],
    default: 'Draft',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lease', leaseSchema);
