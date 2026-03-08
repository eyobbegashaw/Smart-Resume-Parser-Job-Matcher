const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true
};

passport.use(
  new JwtStrategy(jwtOptions, async (req, payload, done) => {
    try {
      const user = await User.findById(payload.id)
        .select('-password -refreshToken');

      if (user) {
        return done(null, user);
      }
      
      return done(null, false);
    } catch (error) {
      logger.error('JWT Strategy Error:', error);
      return done(error, false);
    }
  })
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        passReqToCallback: true,
        proxy: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({ email: profile.emails[0].value });

          if (!user) {
            // Create new user
            user = await User.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              authProvider: 'google',
              avatar: profile.photos[0]?.value,
              isEmailVerified: true
            });
          } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.isEmailVerified = true;
            if (profile.photos[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          logger.error('Google Strategy Error:', error);
          return done(error, null);
        }
      }
    )
  );
}

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password -refreshToken');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Custom passport middleware for JWT
passport.authenticateJwt = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Custom passport middleware for Google OAuth
passport.authenticateGoogle = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
};

// Custom passport middleware for Google OAuth callback
passport.authenticateGoogleCallback = (req, res, next) => {
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=google_auth_failed'
  }, (err, user, info) => {
    if (err) {
      logger.error('Google callback error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=user_not_found`);
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  })(req, res, next);
};

module.exports = passport;