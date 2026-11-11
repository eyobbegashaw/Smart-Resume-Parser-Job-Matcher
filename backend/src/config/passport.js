const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  generateToken,
  generateRefreshToken,
  issueAndSendVerificationOtp,
  sanitizeFrontendOrigin,
  encodeGoogleOAuthState,
  decodeGoogleOAuthState
} = require('../utils/authTokens');

// JWT Strategy (only registered if JWT_SECRET is configured)
if (process.env.JWT_SECRET) {
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
} else {
  logger.warn('JWT_SECRET is not set; passport JWT strategy was not registered');
}

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
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google profile does not include an email address'), null);
          }

          const { mode, lang } = decodeGoogleOAuthState(req.query?.state);
          const normalizedEmail = email.toLowerCase();
          let user = await User.findOne({ email: normalizedEmail });
          let isNewUser = false;

          if (!user) {
            isNewUser = true;
            user = await User.create({
              name: profile.displayName || normalizedEmail.split('@')[0],
              email: normalizedEmail,
              googleId: profile.id,
              authProvider: 'google',
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: false,
              preferences: { language: lang }
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            if (profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
          }

          return done(null, user, { isNewUser, mode, lang });
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
  const defaultFrontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const callerOrigin = sanitizeFrontendOrigin(req.headers.origin || req.headers.referer) || defaultFrontend;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${callerOrigin}/login?error=google_not_configured`);
  }

  const mode = req.query?.mode === 'register' ? 'register' : 'login';
  const lang = req.query?.lang === 'am' ? 'am' : 'en';
  const state = encodeGoogleOAuthState({
    mode,
    lang,
    frontendUrl: callerOrigin
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
    ...(mode === 'register' ? { prompt: 'select_account' } : {})
  })(req, res, next);
};

// Custom passport middleware for Google OAuth callback
passport.authenticateGoogleCallback = (req, res, next) => {
  const defaultFrontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const fallbackState = decodeGoogleOAuthState(req.query?.state);
  const frontendUrl = fallbackState.frontendUrl || defaultFrontend;

  passport.authenticate('google', {
    session: false,
    failureRedirect: `${frontendUrl}/login?error=google_auth_failed`
  }, async (err, user, info) => {
    try {
      if (err) {
        logger.error('Google callback error:', err);
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      if (!user) {
        return res.redirect(`${frontendUrl}/login?error=user_not_found`);
      }

      if (user.status && user.status !== 'active') {
        return res.redirect(`${frontendUrl}/login?error=account_suspended`);
      }

      if (!process.env.JWT_SECRET) {
        logger.error('JWT_SECRET is not configured for Google OAuth callback');
        return res.redirect(`${frontendUrl}/login?error=server_config_error`);
      }

      const mode = info?.mode || fallbackState.mode;
      const lang = info?.lang || fallbackState.lang || user.preferences?.language || 'en';
      const isNewUser = Boolean(info?.isNewUser);

      if (isNewUser || !user.isEmailVerified || mode === 'register') {
        const otpSession = await issueAndSendVerificationOtp(user, {
          language: lang,
          provider: 'google'
        });

        const params = new URLSearchParams({
          requiresOtp: 'true',
          email: user.email,
          name: user.name || '',
          provider: 'google',
          emailSent: otpSession.emailSent ? '1' : '0',
          otpExpiresIn: String(otpSession.otpExpiresIn),
          resendCooldown: String(otpSession.resendCooldown),
          verificationToken: otpSession.verificationToken
        });
        if (otpSession.previewUrl) {
          params.set('previewUrl', otpSession.previewUrl);
        }

        logger.info(`Google OAuth OTP issued for ${user.email} (emailSent=${otpSession.emailSent}); redirecting to ${frontendUrl}/auth/callback`);
        return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
      }

      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();

      const params = new URLSearchParams({ token, refreshToken });
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (callbackErr) {
      logger.error('Google callback processing error:', callbackErr);
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  })(req, res, next);
};

module.exports = passport;
