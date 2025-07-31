const Agent = require('../models/Agent');
const User = require('../models/User');

/**
 * Submit Agent Application (User applies to become agent)
 * POST /api/users/apply-agent
 */
exports.applyForAgent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { licenseNumber, agency, specializations } = req.body;

    // 1. VALIDATION
    if (!licenseNumber || !agency?.name) {
      return res.status(400).json({
        success: false,
        message: 'License number and agency name are required',
      });
    }

    // Validate license number format
    const licenseRegex = /^[A-Z0-9-]{6,20}$/i;
    if (!licenseRegex.test(licenseNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid license number format (6-20 alphanumeric characters)',
      });
    }

    // Validate agency name
    if (agency.name.trim().length < 3 || agency.name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Agency name must be 3-100 characters long',
      });
    }

    // Validate specializations
    const validSpecializations = [
      'Residential',
      'Commercial',
      'Luxury',
      'Investment',
      'First-Time Buyers',
      'Rentals',
    ];

    if (specializations && Array.isArray(specializations)) {
      const invalidSpecs = specializations.filter((spec) => !validSpecializations.includes(spec));
      if (invalidSpecs.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid specializations: ${invalidSpecs.join(', ')}`,
          validOptions: validSpecializations,
        });
      }
    }

    // 2. CHECK USER STATUS
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is already an agent
    if (currentUser.role === 'Agent') {
      return res.status(400).json({
        success: false,
        message: 'User is already an agent',
      });
    }

    // 3. CHECK FOR EXISTING APPLICATION
    const existingApplication = await Agent.findOne({ user: userId });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Agent application already exists. Current status: ' + existingApplication.status,
      });
    }

    // 4. CHECK FOR DUPLICATE LICENSE NUMBER
    const existingLicense = await Agent.findOne({
      licenseNumber: licenseNumber.trim().toUpperCase(),
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'License number already registered',
      });
    }

    // 5. CREATE AGENT APPLICATION (NOT ACTIVE YET)
    const agentApplication = new Agent({
      user: userId,
      licenseNumber: licenseNumber.trim().toUpperCase(),
      agency: {
        name: agency.name.trim(),
        address: agency.address?.trim() || '',
        phone: agency.phone?.trim() || '',
        website: agency.website?.trim() || '',
      },
      specializations: specializations || [],
      isVerified: false,
      status: 'Inactive', // Status remains Inactive until admin approval
      joinedAt: new Date(),
      lastActive: new Date(),
    });

    await agentApplication.save();

    // 6. POPULATE RESPONSE
    await agentApplication.populate('user', 'name email phone avatar');

    // 7. LOG APPLICATION
    console.log(`User ${userId} (${currentUser.name}) submitted agent application`);

    res.status(201).json({
      success: true,
      message: 'Agent application submitted successfully. Waiting for admin approval.',
      data: {
        application: agentApplication,
      },
    });
  } catch (error) {
    console.error('Agent application error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit agent application',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

/**
 * Admin: Get All Pending Agent Applications
 * GET /api/users/admin/agent-applications
 */
exports.getPendingAgentApplications = async (req, res) => {
  try {
    // Check admin permission
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { page = 1, limit = 10, status = 'Inactive' } = req.query;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [applications, totalApplications] = await Promise.all([
      Agent.find({ status })
        .populate('user', 'name email phone avatar createdAt')
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Agent.countDocuments({ status }),
    ]);

    const totalPages = Math.ceil(totalApplications / Number(limit));

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalApplications,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get pending applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent applications',
    });
  }
};
