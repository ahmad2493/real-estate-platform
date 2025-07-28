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
  // Basic stats
  stats: {
    totalSales: { type: Number, default: 0 },
    totalRentals: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  // Basic verification
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
