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

  // Document tracking
  documents: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      type: { type: String, required: true },
      version: { type: Number, default: 1 },
      uploadedAt: { type: Date, default: Date.now },
      docusignEnvelopeId: String,
      isSigned: { type: Boolean, default: false },
    },
  ],

  // Legacy leaseDocument for backward compatibility
  leaseDocument: {
    url: String,
    signedByTenant: { type: Boolean, default: false },
    signedByLandlord: { type: Boolean, default: false },
    signedAt: Date,
  },

  // Signatures tracking - enhanced for DocuSign
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
      // NEW: DocuSign specific fields
      docusignEnvelopeId: String,
      signatureMethod: {
        type: String,
        enum: ['docusign', 'simple'],
        default: 'simple',
      },
      ipAddress: String,
      userAgent: String,
    },
  ],

  // Basic conditions
  conditions: {
    petsAllowed: { type: Boolean, default: false },
    smokingAllowed: { type: Boolean, default: false },
  },

  // Status - enhanced for DocuSign
  status: {
    type: String,
    enum: [
      'Draft',
      'requested',
      'document_uploaded',
      'Pending Signature',
      'pending_docusign_signature',
      'signed',
      'Active',
      'active',
      'Expired',
      'Terminated',
      'Renewed',
      'signing_error',
    ],
    default: 'Draft',
  },

  // NEW: DocuSign specific fields
  docusignEnvelopeId: String,
  docusignStatus: String,
  docusignCompletedAt: Date,
  docusignSentAt: Date,
  signingError: String,

  // Additional fields
  notes: String,
  signedAt: Date,
  activatedAt: Date,
  uploadedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add index for DocuSign envelope ID for faster lookups
leaseSchema.index({ docusignEnvelopeId: 1 });

module.exports = mongoose.model('Lease', leaseSchema);
