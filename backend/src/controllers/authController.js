const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_EXPIRY_SECONDS,
  generateToken,
  generateRefreshToken,
  verifyOtpVerificationToken,
  generateSixDigitOtp,
  hashOtp,
  compareOtpHash,
  issueAndSendVerificationOtp
} = require('../utils/authTokens');

async function applyPasswordReset(user, newPassword, language) {
  user.password = newPassword;
  user.isEmailVerified = true;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpAttempts = 0;
  user.resetPasswordResendAt = undefined;
  user.refreshToken = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  try {
    await emailService.sendPasswordChangedConfirmationEmail(user, {
      language: language === 'am' ? 'am' : user.preferences?.language || 'en'
    });
  } catch (confirmErr) {
    logger.warn('Failed to send password reset confirmation email:', confirmErr.message);
  }

  return generateToken(user._id);
}

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;
    const language = req.body.language === 'am' ? 'am' : 'en';

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user (unverified until 6-digit OTP confirmation)
    const user = await User.create({
      name,
      email,
      password,
      authProvider: 'local',
      isEmailVerified: false,
      preferences: { language }
    });

    const otpSession = await issueAndSendVerificationOtp(user, {
      language,
      provider: 'local'
    });

    res.status(201).json({
      success: true,
      requiresOtpVerification: true,
      message: otpSession.emailSent
        ? '6-digit verification OTP sent to your email'
        : 'Account created. Verification OTP generated.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        isEmailVerified: false,
        emailSent: otpSession.emailSent,
        deliveryMode: otpSession.deliveryMode,
        previewUrl: otpSession.previewUrl,
        otpExpiresIn: otpSession.otpExpiresIn,
        resendCooldown: otpSession.resendCooldown,
        verificationToken: otpSession.verificationToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;
    const requestedLang = req.body.language === 'am' ? 'am' : undefined;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    // Check if account is temporarily locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Log failed attempt
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }

      await user.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Reset failed attempts on valid password
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Require 6-digit OTP verification if email is not verified yet
    if (!user.isEmailVerified) {
      const otpSession = await issueAndSendVerificationOtp(user, {
        language: requestedLang || user.preferences?.language || 'en',
        provider: user.authProvider || 'local'
      });

      return res.status(200).json({
        success: true,
        requiresOtpVerification: true,
        message: 'Please verify your email with the 6-digit OTP sent to your inbox',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider || 'local',
          isEmailVerified: false,
          emailSent: otpSession.emailSent,
          deliveryMode: otpSession.deliveryMode,
          previewUrl: otpSession.previewUrl,
          otpExpiresIn: otpSession.otpExpiresIn,
          resendCooldown: otpSession.resendCooldown,
          verificationToken: otpSession.verificationToken
        }
      });
    }

    user.lastLogin = new Date();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google OAuth login / registration
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential, mode, language } = req.body;
    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential token is required'
      });
    }

    // Verify Google token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;
    const normalizedEmail = email.toLowerCase();
    const resolvedLang = language === 'am' ? 'am' : 'en';

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        googleId,
        authProvider: 'google',
        avatar: picture,
        isEmailVerified: false,
        preferences: { language: resolvedLang }
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      if (picture) user.avatar = picture;
      await user.save();
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    // Require 6-digit OTP when creating/registering or when email is unverified
    if (isNewUser || !user.isEmailVerified || mode === 'register') {
      const otpSession = await issueAndSendVerificationOtp(user, {
        language: resolvedLang || user.preferences?.language || 'en',
        provider: 'google'
      });

      return res.status(200).json({
        success: true,
        requiresOtpVerification: true,
        message: '6-digit verification OTP sent to your Google email',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: 'google',
          isEmailVerified: Boolean(user.isEmailVerified),
          emailSent: otpSession.emailSent,
          deliveryMode: otpSession.deliveryMode,
          previewUrl: otpSession.previewUrl,
          otpExpiresIn: otpSession.otpExpiresIn,
          resendCooldown: otpSession.resendCooldown,
          verificationToken: otpSession.verificationToken
        }
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Google auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
};

/**
 * @desc    Verify 6-digit registration OTP and issue session tokens
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const otp = String(req.body.otp).trim();
    const { verificationToken } = req.body;

    const user = await User.findOne({ email }).select(
      '+emailVerificationOtp +emailVerificationOtpExpire +emailVerificationOtpAttempts +emailVerificationOtpResendAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Account not found for this email'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    if (verificationToken) {
      const decodedSession = verifyOtpVerificationToken(verificationToken);
      if (!decodedSession || decodedSession.id !== user._id.toString()) {
        return res.status(401).json({
          success: false,
          error: 'Verification session expired. Please request a new OTP.'
        });
      }
    }

    if (!user.emailVerificationOtp || !user.emailVerificationOtpExpire) {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found. Please request a new OTP.'
      });
    }

    const attempts = user.emailVerificationOtpAttempts || 0;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many invalid attempts. Please request a new 6-digit OTP.',
        attemptsRemaining: 0
      });
    }

    if (new Date(user.emailVerificationOtpExpire) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new OTP.'
      });
    }

    if (!compareOtpHash(otp, user.emailVerificationOtp)) {
      user.emailVerificationOtpAttempts = attempts + 1;
      await user.save();
      const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - user.emailVerificationOtpAttempts);

      return res.status(400).json({
        success: false,
        error:
          attemptsRemaining > 0
            ? 'Invalid verification code'
            : 'Too many invalid attempts. Please request a new 6-digit OTP.',
        attemptsRemaining
      });
    }

    const wasVerified = Boolean(user.isEmailVerified);
    user.isEmailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationOtpExpire = undefined;
    user.emailVerificationOtpAttempts = 0;
    user.emailVerificationOtpResendAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    if (!wasVerified) {
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailErr) {
        logger.warn('Failed to send welcome email after OTP verification:', emailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        avatar: user.avatar,
        isEmailVerified: true,
        preferences: user.preferences,
        token,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend 6-digit verification OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const { verificationToken, language } = req.body;

    const user = await User.findOne({ email }).select('+emailVerificationOtpResendAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    const tokenPayload = verificationToken ? verifyOtpVerificationToken(verificationToken) : null;
    const hasMatchingSession = Boolean(tokenPayload && tokenPayload.id === user._id.toString());

    if (user.isEmailVerified && !hasMatchingSession) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified. Please sign in.'
      });
    }

    if (user.emailVerificationOtpResendAt && new Date(user.emailVerificationOtpResendAt) > new Date()) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(user.emailVerificationOtpResendAt).getTime() - Date.now()) / 1000)
      );
      return res.status(429).json({
        success: false,
        error: `Please wait ${retryAfter}s before requesting another code`,
        retryAfter
      });
    }

    const otpSession = await issueAndSendVerificationOtp(user, {
      language: language === 'am' ? 'am' : user.preferences?.language || 'en',
      provider: user.authProvider || 'local'
    });

    res.status(200).json({
      success: true,
      message: otpSession.emailSent
        ? 'A new 6-digit verification code has been sent to your inbox'
        : 'New OTP generated. Please check SMTP configuration if email did not arrive.',
      data: {
        email: user.email,
        name: user.name,
        authProvider: user.authProvider || 'local',
        emailSent: otpSession.emailSent,
        deliveryMode: otpSession.deliveryMode,
        previewUrl: otpSession.previewUrl,
        otpExpiresIn: otpSession.otpExpiresIn,
        resendCooldown: otpSession.resendCooldown,
        verificationToken: otpSession.verificationToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: 'Server authentication is not configured'
      });
    }

    const decoded = jwt.verify(refreshToken, secret);

    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: error.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token'
      });
    }
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshToken')
      .populate('resumes', 'fileName parsedData.name analysis.score createdAt')
      .populate('savedJobs');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/password
 * @access  Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Current password and a new password (min 6 characters) are required'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'Account does not have a local password configured'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: { token },
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password (sends Reset Link + 6-digit OTP to inbox)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email }).select('+resetPasswordResendAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    if (user.resetPasswordResendAt && new Date(user.resetPasswordResendAt) > new Date()) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(user.resetPasswordResendAt).getTime() - Date.now()) / 1000)
      );
      return res.status(429).json({
        success: false,
        error: `Please wait ${retryAfter}s before requesting another reset email`,
        retryAfter
      });
    }

    const language = req.body.language === 'am' ? 'am' : user.preferences?.language || 'en';
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetOtp = generateSixDigitOtp();

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordOtp = hashOtp(resetOtp);
    user.resetPasswordExpire = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordResendAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);

    await user.save();

    let sendResult;
    try {
      sendResult = await emailService.sendPasswordResetEmail(user, resetToken, {
        resetOtp,
        language,
        expiresMinutes: Math.round(OTP_EXPIRY_SECONDS / 60)
      });
    } catch (emailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpire = undefined;
      user.resetPasswordOtpAttempts = 0;
      user.resetPasswordResendAt = undefined;
      await user.save();
      return next(emailErr);
    }

    if (!sendResult?.success) {
      user.resetPasswordToken = undefined;
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpire = undefined;
      user.resetPasswordOtpAttempts = 0;
      user.resetPasswordResendAt = undefined;
      await user.save();
      return res.status(503).json({
        success: false,
        error: 'Failed to deliver password reset email to your inbox. Please check server SMTP configuration.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset instructions and 6-digit code sent to your inbox',
      data: {
        email: user.email,
        emailSent: true,
        deliveryMode: sendResult.deliveryMode || 'smtp',
        previewUrl: sendResult.previewUrl,
        expiresIn: OTP_EXPIRY_SECONDS,
        resendCooldown: OTP_RESEND_COOLDOWN_SECONDS
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using email reset token link
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword, language } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset link'
      });
    }

    const newToken = await applyPasswordReset(user, password, language);

    res.status(200).json({
      success: true,
      data: { token: newToken },
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using 6-digit email OTP + New Password + Confirm Password
 * @route   POST /api/auth/reset-password-otp
 * @access  Public
 */
exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const otp = String(req.body.otp).trim();
    const { password, confirmPassword, language } = req.body;

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    const user = await User.findOne({ email }).select(
      '+resetPasswordOtp +resetPasswordExpire +resetPasswordOtpAttempts'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this email'
      });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account suspended. Please contact support.'
      });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpire) {
      return res.status(400).json({
        success: false,
        error: 'No active password reset code found. Please request a new reset email.'
      });
    }

    const attempts = user.resetPasswordOtpAttempts || 0;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        error: 'Too many invalid attempts. Please request a new reset email.',
        attemptsRemaining: 0
      });
    }

    if (new Date(user.resetPasswordExpire) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired. Please request a new reset email.'
      });
    }

    if (!compareOtpHash(otp, user.resetPasswordOtp)) {
      user.resetPasswordOtpAttempts = attempts + 1;
      await user.save();
      const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - user.resetPasswordOtpAttempts);

      return res.status(400).json({
        success: false,
        error:
          attemptsRemaining > 0
            ? 'Invalid reset code'
            : 'Too many invalid attempts. Please request a new reset email.',
        attemptsRemaining
      });
    }

    const newToken = await applyPasswordReset(user, password, language);

    res.status(200).json({
      success: true,
      data: { token: newToken },
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    // Clear refresh token
    await User.findByIdAndUpdate(req.user.id, {
      refreshToken: null
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (emailErr) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save();
      return next(emailErr);
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Debug and verify SMTP connectivity from current environment
 * @route   GET /api/auth/debug-smtp
 * @access  Public
 */
exports.debugSmtp = async (req, res) => {
  const targetEmail = req.query.email || process.env.SMTP_USER;
  try {
    const isVerified = await emailService.verifyConnection();
    let sendResult = null;
    let sendError = null;

    if (targetEmail) {
      try {
        sendResult = await emailService.sendOtpEmail(
          { name: 'Developer Test', email: targetEmail },
          '998877',
          { language: req.query.lang === 'am' ? 'am' : 'en', expiresMinutes: 10 }
        );
      } catch (err) {
        sendError = { message: err.message, code: err.code };
      }
    }

    res.status(200).json({
      success: isVerified && !sendError,
      environment: process.env.NODE_ENV,
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpUser: process.env.SMTP_USER,
      hasSmtpPass: Boolean(process.env.SMTP_PASS),
      connectionVerified: isVerified,
      testRecipient: targetEmail,
      sendResult,
      sendError
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
};
