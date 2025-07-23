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
  // Lease terms
  terms: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    lateFeePenalty: { type: Number, default: 0 },
    renewalOption: { type: Boolean, default: false },
  },
  // Payment details
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
  // Legal and documents
  leaseDocument: {
    url: String, // PDF URL
    signedByTenant: { type: Boolean, default: false },
    signedByLandlord: { type: Boolean, default: false },
    signedAt: Date,
    templateUsed: String,
  },
  // Rules and conditions
  conditions: {
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
    guestsPolicy: String,
    maintenanceResponsibility: String,
  },
  // Status tracking
  status: {
    type: String,
    enum: ['Draft', 'Pending Signature', 'Active', 'Expired', 'Terminated', 'Renewed'],
    default: 'Draft',
  },
  // Renewal tracking
  renewalHistory: [
    {
      renewedAt: Date,
      newEndDate: Date,
      newRent: Number,
      terms: String,
    },
  ],
  // Emergency contacts
  emergencyContacts: [
    {
      name: String,
      relationship: String,
      phone: String,
      email: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lease', leaseSchema);
