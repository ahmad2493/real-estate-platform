const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: String,
  type: { 
    type: String, 
    enum: [
      'Lease Agreement', 'Property Deed', 'Insurance', 'Inspection Report', 
      'KYC Document', 'ID Verification', 'Financial Statement', 'Contract',
      'Property Images', 'Legal Document', 'Other'
    ],
    required: true
  },
  // File details
  file: {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true }, // Stored filename
    filePath: { type: String, required: true }, // Storage path
    fileSize: { type: Number, required: true }, // in bytes
    mimeType: { type: String, required: true },
    url: String // Public access URL if applicable
  },
  // Ownership and access
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  relatedProperty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property'
  },
  relatedLease: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lease'
  },
  // Access control
  visibility: { 
    type: String, 
    enum: ['Private', 'Shared', 'Public'],
    default: 'Private'
  },
  sharedWith: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: { 
      type: String, 
      enum: ['View', 'Download', 'Edit'],
      default: 'View'
    },
    sharedAt: { type: Date, default: Date.now }
  }],
  // Document status and verification
  status: { 
    type: String, 
    enum: ['Pending Review', 'Approved', 'Rejected', 'Expired', 'Requires Update'],
    default: 'Pending Review'
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  verifiedAt: Date,
  // Document lifecycle
  expiryDate: Date,
  tags: [String], // For categorization and search
  version: { 
    type: Number, 
    default: 1 
  },
  // AI-generated insights
  aiExtractedData: {
    summary: String,
    keyTerms: [String],
    importantDates: [Date],
    confidence: Number // AI confidence score
  },
  // Activity tracking
  downloads: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    downloadedAt: { type: Date, default: Date.now },
    ipAddress: String
  }],
  views: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
documentSchema.index({ uploadedBy: 1, type: 1 });
documentSchema.index({ relatedProperty: 1 });
documentSchema.index({ status: 1, verified: 1 });

module.exports = mongoose.model('Document', documentSchema);