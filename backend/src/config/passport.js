const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      passReqToCallback: true, // This allows us to access req in the callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth profile:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          action: req.session.oauthAction, // This will be 'signin' or 'signup'
        });

        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update last login and profile info
          user.lastLogin = new Date();
          user.updatedAt = new Date();

          // Update profile picture if available
          if (profile.photos?.[0]?.value && !user.avatar) {
            user.avatar = profile.photos[0].value;
          }

          await user.save();
          console.log('Existing Google user logged in:', user.email);
          return done(null, user);
        }

        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email provided by Google'), null);
        }

        user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.isVerified = true; // Google accounts are pre-verified
          user.lastLogin = new Date();
          user.updatedAt = new Date();

          // Update profile picture if not set
          if (profile.photos?.[0]?.value && !user.avatar) {
            user.avatar = profile.photos[0].value;
          }

          await user.save();
          console.log('Linked Google account to existing user:', user.email);
          return done(null, user);
        }

        // NEW: Check the action - if it's 'signin', don't create new user
        const action = req.session.oauthAction;

        if (action === 'signin') {
          // User tried to sign in but account doesn't exist
          console.log('Sign in attempted but no account found for:', email);
          return done(new Error('ACCOUNT_NOT_FOUND'), null);
        }

        // Only create new user if action is 'signup' or undefined (backward compatibility)
        if (action === 'signup' || !action) {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName || profile.name?.givenName || 'Google User',
            email: email.toLowerCase(),
            avatar: profile.photos?.[0]?.value || null,
            isVerified: true, // Google accounts are pre-verified
            role: 'Visitor', // Default role
            lastLogin: new Date(),
          });

          console.log('Created new Google user:', user.email);
          return done(null, user);
        }

        // If we get here, action is not recognized
        return done(new Error('Invalid OAuth action'), null);
      } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error, null);
  }
});

module.exports = passport;
