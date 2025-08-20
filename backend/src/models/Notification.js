const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['LeaseRequest', 'LeaseUploaded', 'LeaseRequiresSignature', 'LeaseSigned'],
    required: true,
  },
  lease: { type: mongoose.Schema.Types.ObjectId, ref: 'Lease' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  message: String,
  metadata: {
    leaseDocumentUrl: String,
    documentId: String,
    signatureStatus: { type: String, enum: ['pending', 'signed', 'rejected'], default: 'pending' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: Date,
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
