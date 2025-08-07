const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function () {
      // Password required only if not using Google OAuth
      return !this.googleId;
    },
    minlength: 8,
  },
  role: {
    type: String,
    enum: ['Admin', 'Agent', 'Owner', 'Tenant', 'Visitor'],
    default: 'Visitor',
  },
  intendedRole: {
    type: String,
    enum: ['Visitor', 'Tenant', 'Owner', 'Agent', 'Admin'],
    default: null,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String, // Profile picture URL
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active',
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  googleId: {
    type: String, // For Google OAuth
    sparse: true, // Allows multiple documents without googleId
  },
  // PASSWORD RESET FIELDS - REQUIRED FOR FORGOT PASSWORD
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  // KYC/Document verification - basic version
  documents: [
    {
      type: { type: String, enum: ['ID', 'Passport', 'License', 'Other'] },
      url: String,
      verified: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
