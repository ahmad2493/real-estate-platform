const express = require('express');
const router = express.Router();
const {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getNearbyProperties,
  toggleFeatured,
  getMyProperties,
} = require('../controllers/propertyController');

const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const validateProperty = (req, res, next) => {
  const isCreate = req.method === 'POST'; // full validation for POST
  const { title, description, type, category, price } = req.body;

  // Title
  if ((isCreate || title !== undefined) && (!title || title.trim().length < 5)) {
    return res.status(400).json({
      success: false,
      message: 'Title must be at least 5 characters long',
    });
  }

  // Description
  if ((isCreate || description !== undefined) && (!description || description.trim().length < 20)) {
    return res.status(400).json({
      success: false,
      message: 'Description must be at least 20 characters long',
    });
  }

  // Type
  if (
    (isCreate || type !== undefined) &&
    !['Apartment', 'House', 'Condo', 'Commercial', 'Land'].includes(type)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property type',
    });
  }

  // Category
  if ((isCreate || category !== undefined) && !['Sale', 'Rent'].includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid property category',
    });
  }

  // Price
  if ((isCreate || price !== undefined) && (!price || isNaN(price) || Number(price) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'Valid price is required',
    });
  }

  next();
};

// PUBLIC ROUTES (no authentication required)
// Get all properties (with optional authentication for personalized results)
router.get('/', optionalAuth, getAllProperties);

// Get single property by ID (with optional authentication for view tracking)
router.get('/:id', optionalAuth, getPropertyById);

// Get nearby properties
router.get('/location/nearby', getNearbyProperties);

// PROTECTED ROUTES (authentication required)
// Create new property (Owner, Agent, Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole(['Owner', 'Agent', 'Admin']),
  validateProperty,
  createProperty
);

// Get user's own properties
router.get('/user/my-properties', authenticateToken, getMyProperties);

// Update property (Owner, assigned Agent, Admin only - checked in controller)
router.put('/:id', authenticateToken, updateProperty);

// Delete property (Owner, Admin only - checked in controller)
router.delete('/:id', authenticateToken, deleteProperty);

// Toggle featured status (Admin only)
router.patch('/:id/featured', authenticateToken, requireRole(['Admin']), toggleFeatured);

// BULK OPERATIONS (Admin only)
router.patch('/bulk/status', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { propertyIds, status } = req.body;

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Property IDs array is required',
      });
    }

    if (!['Available', 'Rented', 'Sold', 'Under Review', 'Draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const Property = require('../models/Property');
    const result = await Property.updateMany(
      { _id: { $in: propertyIds } },
      { status, updatedAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} properties updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating properties',
    });
  }
});

// SEARCH ROUTES
router.get('/search/advanced', optionalAuth, async (req, res) => {
  try {
    const {
      q, // general search query
      type,
      category,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      city,
      state,
      amenities,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'relevance',
    } = req.query;

    const Property = require('../models/Property');
    let filter = { status: 'Available' };
    let sortOptions = {};

    // Build search query
    if (q) {
      filter.$text = { $search: q };
    }

    // Apply filters (similar to getAllProperties but more specific)
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Bedroom range
    if (minBedrooms || maxBedrooms) {
      filter['details.bedrooms'] = {};
      if (minBedrooms) filter['details.bedrooms'].$gte = Number(minBedrooms);
      if (maxBedrooms) filter['details.bedrooms'].$lte = Number(maxBedrooms);
    }

    // Minimum bathrooms
    if (minBathrooms) {
      filter['details.bathrooms'] = { $gte: Number(minBathrooms) };
    }

    // Amenities
    if (amenities) {
      const amenitiesList = amenities.split(',');
      filter.amenities = { $in: amenitiesList };
    }

    // Tags
    if (tags) {
      const tagsList = tags.split(',');
      filter.tags = { $in: tagsList };
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        sortOptions.price = 1;
        break;
      case 'price_high':
        sortOptions.price = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'oldest':
        sortOptions.createdAt = 1;
        break;
      case 'popular':
        sortOptions.viewCount = -1;
        break;
      case 'relevance':
      default:
        if (q) {
          sortOptions = { score: { $meta: 'textScore' } };
        } else {
          sortOptions.createdAt = -1;
        }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [properties, totalProperties] = await Promise.all([
      Property.find(filter)
        .populate('owner', 'name email phone')
        .populate({
          path: 'agent',
          populate: { path: 'user', select: 'name email phone' },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalProperties / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        properties,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalProperties,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
        searchQuery: q,
        appliedFilters: {
          type,
          category,
          priceRange: { min: minPrice, max: maxPrice },
          bedrooms: { min: minBedrooms, max: maxBedrooms },
          minBathrooms,
          location: { city, state },
          amenities: amenities?.split(','),
          tags: tags?.split(','),
        },
      },
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
    });
  }
});

// STATISTICS ROUTES (for analytics)
router.get('/stats/overview', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const Property = require('../models/Property');

    const stats = await Property.aggregate([
      {
        $group: {
          _id: null,
          totalProperties: { $sum: 1 },
          availableProperties: {
            $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] },
          },
          rentedProperties: {
            $sum: { $cond: [{ $eq: ['$status', 'Rented'] }, 1, 0] },
          },
          soldProperties: {
            $sum: { $cond: [{ $eq: ['$status', 'Sold'] }, 1, 0] },
          },
          averagePrice: { $avg: '$price' },
          totalViews: { $sum: '$viewCount' },
        },
      },
    ]);

    const categoryStats = await Property.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const typeStats = await Property.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {},
        byCategory: categoryStats,
        byType: typeStats,
      },
    });
  } catch (error) {
    console.error('Property stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property statistics',
    });
  }
});

module.exports = router;
