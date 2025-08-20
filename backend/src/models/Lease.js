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
  // Add owner field to match controller
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Basic lease terms
  terms: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    renewalOption: { type: Boolean, default: false },
  },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },

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

  // Document tracking - fix to match controller
  documents: [
    {
      name: String,
      url: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      type: String,
      version: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],

  // Legacy leaseDocument for backward compatibility
  leaseDocument: {
    url: String,
    signedByTenant: { type: Boolean, default: false },
    signedByLandlord: { type: Boolean, default: false },
    signedAt: Date,
  },

  // Signatures tracking
  signatures: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      signedAt: Date,
      signatureType: {
        type: String,
        enum: ['tenant', 'landlord', 'agent'],
      },
    },
  ],

  // Basic conditions
  conditions: {
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
  },

  // Status - update enum to match controller
  status: {
    type: String,
    enum: [
      'Draft',
      'requested',
      'document_uploaded',
      'Pending Signature',
      'signed',
      'Active',
      'active',
      'Expired',
      'Terminated',
      'Renewed',
    ],
    default: 'Draft',
  },

  // Additional fields used in controller
  notes: String,
  signedAt: Date,
  activatedAt: Date,
  uploadedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Lease', leaseSchema);
