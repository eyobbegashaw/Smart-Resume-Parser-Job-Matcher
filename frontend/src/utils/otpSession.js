export const PENDING_OTP_STORAGE_KEY = 'tp_pending_otp';

export function buildPendingOtpSession(payload = {}) {
  const now = Date.now();
  const expiresSec = Number(payload.otpExpiresIn);
  const resendSec = Number(payload.resendCooldown);

  return {
    email: (payload.email || '').trim().toLowerCase(),
    name: payload.name || '',
    authProvider: payload.authProvider || payload.provider || 'local',
    emailSent: payload.emailSent !== undefined ? Boolean(payload.emailSent) : true,
    deliveryMode: payload.deliveryMode || '',
    previewUrl: payload.previewUrl || '',
    verificationToken: payload.verificationToken || '',
    otpExpiresAt: payload.otpExpiresAt || now + (expiresSec > 0 ? expiresSec : 600) * 1000,
    resendAvailableAt: payload.resendAvailableAt || now + (resendSec > 0 ? resendSec : 60) * 1000
  };
}

export function savePendingOtpSession(payload) {
  const session = buildPendingOtpSession(payload);
  try {
    sessionStorage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  return session;
}

export function loadPendingOtpSession() {
  try {
    const raw = sessionStorage.getItem(PENDING_OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingOtpSession() {
  try {
    sessionStorage.removeItem(PENDING_OTP_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function maskEmailAddress(email) {
  const clean = (email || '').trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0) return clean;
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}${local.slice(-1)}${domain}`;
}
