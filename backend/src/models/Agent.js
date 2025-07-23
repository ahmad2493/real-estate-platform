const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
  },
  agency: {
    name: { type: String, required: true },
    address: String,
    phone: String,
    website: String,
  },
  specializations: [
    {
      type: String,
      enum: ['Residential', 'Commercial', 'Luxury', 'Investment', 'First-Time Buyers', 'Rentals'],
    },
  ],
  serviceAreas: [
    {
      city: String,
      state: String,
      zipCodes: [String],
    },
  ],
  // Performance metrics
  stats: {
    totalSales: { type: Number, default: 0 },
    totalRentals: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    yearsExperience: { type: Number, default: 0 },
  },
  // Commission and pricing
  commission: {
    salePercentage: { type: Number, default: 3 }, // 3%
    rentalPercentage: { type: Number, default: 8 }, // 8%
  },
  // Availability and calendar
  availability: {
    workingHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String },
    },
    timezone: { type: String, default: 'America/New_York' },
  },
  // Verification and status
  isVerified: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active',
  },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Agent', agentSchema);
