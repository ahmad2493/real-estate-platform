const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');

      if (user) {
        req.user = {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
        };
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * Check if user has required role(s)
 * @param {String|Array} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        'Account verification required. Please verify your email or upload required documents.',
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireVerification,
};
