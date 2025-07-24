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
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['Admin', 'Agent', 'Owner', 'Tenant', 'Visitor'],
    default: 'Visitor',
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String, // Profile picture URL
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  googleId: {
    type: String, // For Google OAuth
    sparse: true, // Allows multiple documents without googleId
  },
  // KYC/Document verification
  documents: [
    {
      type: { type: String, enum: ['ID', 'Passport', 'License', 'Other'] },
      url: String,
      verified: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  // Preferences for AI recommendations
  preferences: {
    budget: {
      min: Number,
      max: Number,
    },
    propertyTypes: [{ type: String, enum: ['Apartment', 'House', 'Condo', 'Commercial', 'Land'] }],
    preferredAreas: [String],
    amenities: [String],
  },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

module.exports = mongoose.model('User', userSchema);
