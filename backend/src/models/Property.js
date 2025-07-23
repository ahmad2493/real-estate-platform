const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Apartment', 'House', 'Condo', 'Commercial', 'Land'],
    required: true,
  },
  category: {
    type: String,
    enum: ['Sale', 'Rent'],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  // Location details
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' },
  },
  // Map coordinates for geo-location
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  // Property details
  details: {
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    area: { type: Number, required: true }, // in sq ft
    parking: { type: Number, default: 0 },
    yearBuilt: Number,
    furnished: { type: Boolean, default: false },
  },
  // Amenities and features
  amenities: [
    {
      type: String,
      enum: [
        'Pool',
        'Gym',
        'Parking',
        'Elevator',
        'Balcony',
        'Garden',
        'Security',
        'AC',
        'Heating',
        'Pet-Friendly',
        'Laundry',
      ],
    },
  ],
  // Media files
  images: [
    {
      url: String,
      caption: String,
      isPrimary: { type: Boolean, default: false },
    },
  ],
  videos: [
    {
      url: String,
      title: String,
    },
  ],
  virtualTour: {
    type: String, // URL for 3D tour (Matterport, etc.)
  },
  // Ownership and management
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
  },
  // Status and availability
  status: {
    type: String,
    enum: ['Available', 'Rented', 'Sold', 'Under Review', 'Draft'],
    default: 'Draft',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  availableFrom: {
    type: Date,
  },
  // AI and analytics data
  aiInsights: {
    marketValue: Number,
    roiPrediction: Number,
    marketComparison: String,
    recommendationScore: Number,
  },
  tags: [String], // For categorization and search
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for geo-location queries
propertySchema.index({ coordinates: '2dsphere' });
propertySchema.index({ 'address.city': 1, 'address.state': 1 });
propertySchema.index({ type: 1, category: 1, status: 1 });

module.exports = mongoose.model('Property', propertySchema);
