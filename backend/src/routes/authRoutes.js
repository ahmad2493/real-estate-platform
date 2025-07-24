const express = require('express');
const passport = require('passport');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

// Google OAuth initiation
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/error`,
    session: false,
  }),
  (req, res) => {
    try {
      if (!req.user) {
        console.error('No user in Google OAuth callback');
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=authentication_failed`);
      }

      // Generate JWT token
      const token = generateToken(req.user);

      console.log('Google OAuth success for user:', req.user.email);

      // Option 1: Redirect with token in URL (for development)
      if (process.env.NODE_ENV === 'development') {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
      }

      // Option 2: Set secure HTTP-only cookie (for production)
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=token_generation_failed`);
    }
  }
);

// Get current authenticated user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('-password').populate('documents');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
    });
  }
});

// Logout endpoint (clear cookie if using cookies)
router.post('/logout', (req, res) => {
  // Clear auth cookie if using cookies
  res.clearCookie('auth_token');

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// OAuth status check
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      googleOAuth: {
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        clientId: process.env.GOOGLE_CLIENT_ID
          ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...'
          : null,
      },
    },
  });
});

module.exports = router;
