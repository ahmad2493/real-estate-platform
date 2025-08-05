const express = require('express');
const passport = require('passport');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

// Google OAuth initiation for SIGN IN
router.get(
  '/google/signin',
  (req, res, next) => {
    req.session.oauthAction = 'signin'; // Set action to signin
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth initiation for SIGN UP
router.get(
  '/google/signup',
  (req, res, next) => {
    req.session.oauthAction = 'signup'; // Set action to signup
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// Google OAuth callback - handles both signin and signup
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/signin?error=oauth_failed`,
    session: false,
  }),
  (req, res) => {
    try {
      if (!req.user) {
        console.error('No user in Google OAuth callback');
        return res.redirect(`${process.env.FRONTEND_URL}/signin?error=authentication_failed`);
      }

      // Generate JWT token
      const token = generateToken(req.user);

      console.log('Google OAuth success for user:', req.user.email);

      // Clear the session action
      delete req.session.oauthAction;

      // Redirect to OAuth handler with token
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);

      // Check if it's account not found error
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        return res.redirect(
          `${process.env.FRONTEND_URL}/signin?error=account_not_found&message=${encodeURIComponent('No account found. Please sign up first.')}`
        );
      }

      res.redirect(`${process.env.FRONTEND_URL}/signin?error=token_generation_failed`);
    }
  }
);

// Error handler for OAuth failures
router.use('/google/callback', (err, req, res) => {
  console.error('OAuth error:', err.message);

  if (err.message === 'ACCOUNT_NOT_FOUND') {
    return res.redirect(
      `${process.env.FRONTEND_URL}/signin?error=account_not_found&message=${encodeURIComponent('No account found. Please sign up first.')}`
    );
  }

  res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth_error`);
});

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

// Logout endpoint
router.post('/logout', (req, res) => {
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
