const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  type: {
    type: String,
    enum: [
      'Lease Agreement',
      'Property Deed',
      'Insurance',
      'Inspection Report',
      'KYC Document',
      'ID Verification',
      'Contract',
      'Other',
    ],
    required: true,
  },
  // Basic file details
  file: {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    url: String,
  },
  // Basic ownership
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  relatedProperty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
  },
  relatedLease: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lease',
  },
  // Basic access control
  visibility: {
    type: String,
    enum: ['Private', 'Shared', 'Public'],
    default: 'Private',
  },
  // Basic status
  status: {
    type: String,
    enum: ['Pending Review', 'Approved', 'Rejected', 'Expired'],
    default: 'Pending Review',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: Date,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Basic indexes
documentSchema.index({ uploadedBy: 1, type: 1 });
documentSchema.index({ relatedProperty: 1 });

module.exports = mongoose.model('Document', documentSchema);
