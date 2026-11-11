const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const passport = require('../config/passport');
const {
  register,
  login,
  googleAuth,
  verifyOtp,
  resendOtp,
  refreshToken,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  resetPasswordWithOtp,
  logout,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');
const { updatePreferences } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

const SAFE_EMAIL_NORMALIZATION = {
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false
};

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION),
  body('password').notEmpty().withMessage('Password is required')
];

const verifyOtpValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Please enter a valid 6-digit OTP')
];

const resendOtpValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION)
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION)
];

const resetPasswordOtpValidation = [
  body('email').trim().isEmail().withMessage('Please provide a valid email').normalizeEmail(SAFE_EMAIL_NORMALIZATION),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Please enter a valid 6-digit reset code'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/google', googleAuth);
router.get('/google', passport.authenticateGoogle);
router.get('/google/callback', passport.authenticateGoogleCallback);
router.post('/verify-otp', otpLimiter, verifyOtpValidation, verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtpValidation, resendOtp);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', otpLimiter, forgotPasswordValidation, forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/reset-password-otp', otpLimiter, resetPasswordOtpValidation, resetPasswordWithOtp);
router.get('/verify-email/:token', verifyEmail);

// Private routes
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);
router.put('/preferences', protect, updatePreferences);
router.post('/resend-verification', protect, resendVerification);
router.post('/logout', protect, logout);

module.exports = router;
