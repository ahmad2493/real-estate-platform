const Property = require('../models/Property');
const Agent = require('../models/Agent');

/**
 * Create a new property listing
 * POST /api/properties
 */
exports.createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      price,
      address,
      coordinates,
      details,
      amenities,
      images,
      videos,
      agentId,
      availableFrom,
      tags,
    } = req.body;

    // Validation
    if (!title || !description || !type || !category || !price || !address || !coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: title, description, type, category, price, address, coordinates',
      });
    }

    // Validate coordinates
    if (!coordinates.latitude || !coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude and longitude coordinates are required',
      });
    }

    // Validate price
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0',
      });
    }

    // Validate agent if provided
    if (agentId) {
      const agent = await Agent.findById(agentId).populate('user');
      if (!agent || agent.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive agent',
        });
      }
    }

    // Create property data
    const propertyData = {
      title: title.trim(),
      description: description.trim(),
      type,
      category,
      price: Number(price),
      address: {
        street: address.street?.trim(),
        city: address.city?.trim(),
        state: address.state?.trim(),
        zipCode: address.zipCode?.trim(),
        country: address.country || 'USA',
      },
      coordinates: {
        latitude: Number(coordinates.latitude),
        longitude: Number(coordinates.longitude),
      },
      details: {
        bedrooms: details?.bedrooms || 0,
        bathrooms: details?.bathrooms || 0,
        area: details?.area || 0,
        parking: details?.parking || 0,
        yearBuilt: details?.yearBuilt,
        furnished: details?.furnished || false,
      },
      amenities: amenities || [],
      images: images || [],
      videos: videos || [],
      owner: req.user.id,
      agent: agentId || null,
      availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
      tags: tags || [],
      status: 'Draft', // Start as draft
      updatedAt: new Date(),
    };

    const property = await Property.create(propertyData);

    // Populate owner and agent for response
    await property.populate([
      { path: 'owner', select: 'name email phone' },
      { path: 'agent', populate: { path: 'user', select: 'name email phone' } },
    ]);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property },
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all properties with filters and pagination
 * GET /api/properties
 */
exports.getAllProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      status,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      city,
      state,
      amenities,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
    } = req.query;

    // Build filter object
    const filter = {};

    // Basic filters
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (state) filter['address.state'] = new RegExp(state, 'i');
    if (featured !== undefined) filter.featured = featured === 'true';

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Room filters
    if (bedrooms) filter['details.bedrooms'] = Number(bedrooms);
    if (bathrooms) filter['details.bathrooms'] = { $gte: Number(bathrooms) };

    // Amenities filter
    if (amenities) {
      const amenitiesList = amenities.split(',');
      filter.amenities = { $in: amenitiesList };
    }

    // Search filter (title, description, address)
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'address.street': new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
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
        filters: filter,
      },
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single property by ID
 * GET /api/properties/:id
 */
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id)
      .populate('owner', 'name email phone avatar')
      .populate({
        path: 'agent',
        populate: { path: 'user', select: 'name email phone avatar' },
      });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Increment view count (only if not owner or agent viewing)
    if (
      property.owner._id.toString() !== req.user?.id &&
      property.agent?.user?._id.toString() !== req.user?.id
    ) {
      await Property.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
      property.viewCount += 1;
    }

    res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update property
 * PUT /api/properties/:id
 */
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };

    // Find property first
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Check permissions - only owner, assigned agent, or admin can update
    const isOwner = property.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    let isAssignedAgent = false;
    if (property.agent && req.user.role === 'Agent') {
      const agent = await Agent.findOne({ user: req.user.id });
      isAssignedAgent = agent && property.agent.toString() === agent._id.toString();
    }

    if (!isOwner && !isAssignedAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. Only property owner, assigned agent, or admin can update this property',
      });
    }

    // Validate agent assignment if being updated
    if (updateData.agent) {
      const agent = await Agent.findById(updateData.agent).populate('user');
      if (!agent || agent.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive agent',
        });
      }
    }

    // Validate price if being updated
    if (updateData.price && updateData.price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0',
      });
    }

    // Update property
    const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email phone')
      .populate({
        path: 'agent',
        populate: { path: 'user', select: 'name email phone' },
      });

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty },
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete property (soft delete)
 * DELETE /api/properties/:id
 */
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    // Check permissions - only owner or admin can delete
    const isOwner = property.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only property owner or admin can delete this property',
      });
    }

    if (permanent === 'true' && isAdmin) {
      // Hard delete (admin only)
      await Property.findByIdAndDelete(id);
      res.status(200).json({
        success: true,
        message: 'Property permanently deleted',
      });
    } else {
      // Soft delete - set status to Draft
      await Property.findByIdAndUpdate(id, {
        status: 'Draft',
        updatedAt: new Date(),
      });
      res.status(200).json({
        success: true,
        message: 'Property archived successfully',
      });
    }
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get properties by location (nearby properties)
 * GET /api/properties/nearby
 */
exports.getNearbyProperties = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000, limit = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const properties = await Property.find({
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)],
          },
          $maxDistance: Number(maxDistance), // in meters
        },
      },
      status: 'Available',
    })
      .populate('owner', 'name email phone')
      .populate({
        path: 'agent',
        populate: { path: 'user', select: 'name email phone' },
      })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: { properties },
    });
  } catch (error) {
    console.error('Get nearby properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Toggle property featured status (admin only)
 * PATCH /api/properties/:id/featured
 */
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required',
      });
    }

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
      });
    }

    property.featured = !property.featured;
    property.updatedAt = new Date();
    await property.save();

    res.status(200).json({
      success: true,
      message: `Property ${property.featured ? 'featured' : 'unfeatured'} successfully`,
      data: { featured: property.featured },
    });
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating featured status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user's properties (owner or agent)
 * GET /api/properties/my-properties
 */
exports.getMyProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.id;

    let filter = {};

    // Build filter based on user role
    if (req.user.role === 'Owner' || req.user.role === 'Admin') {
      filter.owner = userId;
    } else if (req.user.role === 'Agent') {
      // Find agent record for this user
      const agent = await Agent.findOne({ user: userId });
      if (agent) {
        filter.agent = agent._id;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Agent profile not found',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only owners and agents can view their properties',
      });
    }

    // Add status filter if provided
    if (status) filter.status = status;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [properties, totalProperties] = await Promise.all([
      Property.find(filter)
        .populate('owner', 'name email phone')
        .populate({
          path: 'agent',
          populate: { path: 'user', select: 'name email phone' },
        })
        .sort({ updatedAt: -1 })
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
      },
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
