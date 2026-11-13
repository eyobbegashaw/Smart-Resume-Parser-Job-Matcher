const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const logger = require('./logger');

const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MINUTES * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateRefreshToken = (id) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not configured');
  }
  return jwt.sign({ id }, secret, {
    expiresIn: '30d'
  });
};

const generateOtpVerificationToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      purpose: 'otp_verification'
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const verifyOtpVerificationToken = (token) => {
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.purpose === 'otp_verification' && decoded.id) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};

const generateSixDigitOtp = () => {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

const compareOtpHash = (submittedOtp, storedHash) => {
  if (!submittedOtp || !storedHash) return false;
  const candidateBuf = Buffer.from(hashOtp(submittedOtp), 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
};

const issueAndSendVerificationOtp = async (user, options = {}) => {
  const resolvedLang = options.language === 'am' || (!options.language && user.preferences?.language === 'am') ? 'am' : 'en';
  const resolvedProvider = options.provider || user.authProvider || 'local';

  const otp = generateSixDigitOtp();
  user.emailVerificationOtp = hashOtp(otp);
  user.emailVerificationOtpExpire = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
  user.emailVerificationOtpAttempts = 0;
  user.emailVerificationOtpResendAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);
  await user.save();

  let emailSent = false;
  let deliveryMode = 'failed';
  let previewUrl;

  try {
    const sendResult = await emailService.sendOtpEmail(user, otp, {
      language: resolvedLang,
      provider: resolvedProvider,
      expiresMinutes: OTP_EXPIRY_MINUTES
    });
    emailSent = Boolean(sendResult?.success);
    deliveryMode = sendResult?.deliveryMode || (emailSent ? 'smtp' : 'unconfigured');
    previewUrl = sendResult?.previewUrl;
  } catch (err) {
    logger.warn(`Failed to send OTP email to ${user.email}: ${err.message}`);
  }

  logger.info(`[AUTH OTP GENERATED for ${user.email}]: ${otp} (deliveryMode: ${deliveryMode}, emailSent: ${emailSent})`);

  return {
    emailSent,
    deliveryMode,
    previewUrl,
    otpExpiresIn: OTP_EXPIRY_SECONDS,
    resendCooldown: OTP_RESEND_COOLDOWN_SECONDS,
    verificationToken: generateOtpVerificationToken(user),
    fallbackOtp: !emailSent ? otp : undefined
  };
};

const sanitizeFrontendOrigin = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const configured = (process.env.FRONTEND_URL || '').trim();
    if (configured) {
      try {
        if (new URL(configured).origin === parsed.origin) {
          return parsed.origin;
        }
      } catch {
        // Ignore malformed configured FRONTEND_URL
      }
    }

    const host = parsed.hostname.toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isCodespaces = host.endsWith('.app.github.dev') || host.endsWith('.githubpreview.dev');
    if (isLocalHost || isCodespaces) {
      return parsed.origin;
    }

    return null;
  } catch {
    return null;
  }
};

const encodeGoogleOAuthState = ({ mode = 'login', lang = 'en', frontendUrl } = {}) => {
  const payload = {
    mode: mode === 'register' ? 'register' : 'login',
    lang: lang === 'am' ? 'am' : 'en'
  };
  const safeOrigin = sanitizeFrontendOrigin(frontendUrl);
  if (safeOrigin) {
    payload.frontendUrl = safeOrigin;
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const decodeGoogleOAuthState = (state) => {
  if (!state || typeof state !== 'string') {
    return { mode: 'login', lang: 'en', frontendUrl: null };
  }
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    return {
      mode: parsed?.mode === 'register' ? 'register' : 'login',
      lang: parsed?.lang === 'am' ? 'am' : 'en',
      frontendUrl: sanitizeFrontendOrigin(parsed?.frontendUrl)
    };
  } catch {
    return { mode: 'login', lang: 'en', frontendUrl: null };
  }
};

module.exports = {
  OTP_EXPIRY_MINUTES,
  OTP_EXPIRY_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  generateToken,
  generateRefreshToken,
  generateOtpVerificationToken,
  verifyOtpVerificationToken,
  generateSixDigitOtp,
  hashOtp,
  compareOtpHash,
  issueAndSendVerificationOtp,
  sanitizeFrontendOrigin,
  encodeGoogleOAuthState,
  decodeGoogleOAuthState
};
