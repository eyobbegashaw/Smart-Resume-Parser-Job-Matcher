process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const passport = require('passport');

const app = require('../src/server');
const User = require('../src/models/User');
const emailService = require('../src/services/emailService');
const { hashOtp, encodeGoogleOAuthState, decodeGoogleOAuthState } = require('../src/utils/authTokens');

describe('Auth Controller & Routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('POST /api/auth/login blocks locked accounts before password check', async () => {
    const matchPassword = jest.fn();
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'active',
        lockUntil: new Date(Date.now() + 10 * 60 * 1000),
        matchPassword
      })
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password123' });

    expect(res.status).toBe(423);
    expect(res.body.success).toBe(false);
    expect(matchPassword).not.toHaveBeenCalled();
  });

  test('POST /api/auth/refresh-token selects +refreshToken and rotates tokens', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET);

    const mockUser = {
      _id: userId,
      refreshToken,
      save: jest.fn().mockResolvedValue(true)
    };

    const selectMock = jest.fn().mockResolvedValue(mockUser);
    jest.spyOn(User, 'findById').mockReturnValue({ select: selectMock });

    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(selectMock).toHaveBeenCalledWith('+refreshToken');
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(mockUser.save).toHaveBeenCalled();
  });

  test('GET /api/auth/verify-email/:token hashes token with SHA-256 to match resendVerification', async () => {
    const rawToken = 'plain-verification-token';
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const mockUser = {
      isEmailVerified: false,
      emailVerificationToken: expectedHash,
      emailVerificationExpire: new Date(Date.now() + 60000),
      save: jest.fn().mockResolvedValue(true)
    };

    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);

    const res = await request(app).get(`/api/auth/verify-email/${rawToken}`);

    expect(res.status).toBe(200);
    expect(findOneSpy).toHaveBeenCalledWith(expect.objectContaining({
      emailVerificationToken: expectedHash
    }));
    expect(mockUser.isEmailVerified).toBe(true);
    expect(mockUser.emailVerificationToken).toBeUndefined();
    expect(mockUser.save).toHaveBeenCalled();
  });

  test('POST /api/auth/register sends 6-digit OTP to inbox and requires OTP before full login', async () => {
    const userId = new mongoose.Types.ObjectId();
    const createdUser = {
      _id: userId,
      name: 'Abebe Bikila',
      email: 'abebe.otp@example.com',
      authProvider: 'local',
      isEmailVerified: false,
      preferences: { language: 'en' },
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'create').mockResolvedValue(createdUser);
    const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({
      success: true,
      messageId: 'msg-123',
      deliveryMode: 'smtp'
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Abebe Bikila', email: 'abebe.otp@example.com', password: 'Password123', language: 'en' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresOtpVerification).toBe(true);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.emailSent).toBe(true);
    expect(res.body.data.verificationToken).toBeTruthy();
    expect(createdUser.emailVerificationOtp).toMatch(/^[a-f0-9]{64}$/);
    expect(sendOtpSpy).toHaveBeenCalledTimes(1);
    const [recipient, otp] = sendOtpSpy.mock.calls[0];
    expect(recipient.email).toBe('abebe.otp@example.com');
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('POST /api/auth/google sends 6-digit OTP when registering a Google account', async () => {
    const userId = new mongoose.Types.ObjectId();
    const createdGoogleUser = {
      _id: userId,
      name: 'Hanna Tesfaye',
      email: 'hanna.google@gmail.com',
      authProvider: 'google',
      isEmailVerified: false,
      preferences: { language: 'am' },
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        email: 'hanna.google@gmail.com',
        name: 'Hanna Tesfaye',
        sub: 'google-sub-99',
        picture: 'https://example.com/avatar.png'
      })
    });
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'create').mockResolvedValue(createdGoogleUser);
    const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({
      success: true,
      messageId: 'msg-google',
      deliveryMode: 'smtp'
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'fake-google-id-token', mode: 'register', language: 'am' });

    expect(res.status).toBe(200);
    expect(res.body.requiresOtpVerification).toBe(true);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.authProvider).toBe('google');
    expect(sendOtpSpy).toHaveBeenCalledWith(
      createdGoogleUser,
      expect.stringMatching(/^\d{6}$/),
      expect.objectContaining({ language: 'am', provider: 'google' })
    );
  });

  test('POST /api/auth/verify-otp tracks wrong attempts and issues session tokens when valid 6-digit OTP matches', async () => {
    const userId = new mongoose.Types.ObjectId();
    const validOtp = '482915';
    const mockUser = {
      _id: userId,
      name: 'Dawit Bekele',
      email: 'dawit.verify@gmail.com',
      role: 'user',
      status: 'active',
      authProvider: 'local',
      isEmailVerified: false,
      emailVerificationOtp: hashOtp(validOtp),
      emailVerificationOtpExpire: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationOtpAttempts: 0,
      preferences: { language: 'en', darkMode: false },
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });
    const welcomeSpy = jest.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue({ success: true });

    // Invalid attempt increments counter
    const badRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'dawit.verify@gmail.com', otp: '111111' });

    expect(badRes.status).toBe(400);
    expect(badRes.body.attemptsRemaining).toBe(4);
    expect(mockUser.emailVerificationOtpAttempts).toBe(1);

    // Valid OTP verifies account and issues workspace tokens
    const goodRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'dawit.verify@gmail.com', otp: validOtp });

    expect(goodRes.status).toBe(200);
    expect(goodRes.body.success).toBe(true);
    expect(goodRes.body.data.token).toBeTruthy();
    expect(goodRes.body.data.refreshToken).toBeTruthy();
    expect(goodRes.body.data.isEmailVerified).toBe(true);
    expect(mockUser.emailVerificationOtp).toBeUndefined();
    expect(welcomeSpy).toHaveBeenCalledTimes(1);
  });

  test('POST /api/auth/resend-otp enforces 60s cooldown and resends when elapsed', async () => {
    const userId = new mongoose.Types.ObjectId();
    const activeCooldownUser = {
      _id: userId,
      email: 'cooldown@example.com',
      status: 'active',
      isEmailVerified: false,
      emailVerificationOtpResendAt: new Date(Date.now() + 30 * 1000),
      save: jest.fn().mockResolvedValue(true)
    };

    const selectMock = jest.fn().mockResolvedValueOnce(activeCooldownUser);
    jest.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });

    const coolRes = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'cooldown@example.com' });

    expect(coolRes.status).toBe(429);
    expect(coolRes.body.retryAfter).toBeGreaterThan(0);

    // Expired cooldown sends new OTP
    activeCooldownUser.emailVerificationOtpResendAt = new Date(Date.now() - 1000);
    selectMock.mockResolvedValueOnce(activeCooldownUser);
    const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({ success: true });

    const resendRes = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'cooldown@example.com', language: 'am' });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.data.emailSent).toBe(true);
    expect(sendOtpSpy).toHaveBeenCalledTimes(1);
  });

  test('EmailService.sendOtpEmail renders 6-digit OTP, copyable code styling, and Copy CTA button link', async () => {
    const sendEmailSpy = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({
      success: true,
      messageId: 'test-otp-email'
    });

    await emailService.sendOtpEmail(
      { name: 'Sara', email: 'sara@example.com' },
      '654321',
      { language: 'en', provider: 'google', expiresMinutes: 10 }
    );

    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const [to, subject, html, text] = sendEmailSpy.mock.calls[0];
    expect(to).toBe('sara@example.com');
    expect(subject).toContain('654321');
    expect(html).toContain('654321');
    expect(html).toContain('user-select:all');
    expect(html).toContain('#code=654321&action=copy');
    expect(html).toContain('Copy OTP');
    expect(text).toContain('654321');
  });

  test('Passport Google callback sends OTP and redirects new/unverified accounts to /auth/callback?requiresOtp=true', async () => {
    const userId = new mongoose.Types.ObjectId();
    const googleUser = {
      _id: userId,
      name: 'Abebe Google',
      email: 'abebe.google@gmail.com',
      status: 'active',
      authProvider: 'google',
      isEmailVerified: false,
      preferences: { language: 'am' },
      save: jest.fn().mockResolvedValue(true)
    };

    const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({ success: true });
    jest.spyOn(passport, 'authenticate').mockImplementation((_strategy, _opts, cb) => (req, res, next) => {
      cb(null, googleUser, { isNewUser: true, mode: 'register', lang: 'am' });
    });

    const res = await request(app).get('/api/auth/google/callback');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/callback?');
    expect(res.headers.location).toContain('requiresOtp=true');
    expect(res.headers.location).toContain('email=abebe.google%40gmail.com');
    expect(res.headers.location).toContain('verificationToken=');
    expect(res.headers.location).not.toContain('&token=');
    expect(sendOtpSpy).toHaveBeenCalledWith(
      googleUser,
      expect.stringMatching(/^\d{6}$/),
      expect.objectContaining({ language: 'am', provider: 'google' })
    );
  });

  test('EmailService outbound URLs match React SPA routes', async () => {
    const sendEmailSpy = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });
    const sampleUser = { name: 'Dawit', email: 'dawit@example.com' };

    await emailService.sendWelcomeEmail(sampleUser);
    await emailService.sendVerificationEmail(sampleUser, 'tok-123');
    await emailService.sendPasswordResetEmail(sampleUser, 'rst-456');
    await emailService.sendAnalysisCompleteEmail(sampleUser, {
      _id: 'res-789',
      parsedData: { skills: { all: ['Node.js'] } },
      matchedJobs: [],
      analysis: { score: 85 }
    });

    expect(sendEmailSpy.mock.calls[0][2]).toContain('/resumes"');
    expect(sendEmailSpy.mock.calls[1][2]).toContain('/verify-email/tok-123"');
    expect(sendEmailSpy.mock.calls[2][2]).toContain('/reset-password/rst-456"');
    expect(sendEmailSpy.mock.calls[3][2]).toContain('/resumes/res-789"');
  });

  test('POST /api/auth/forgot-password sends reset email with reset link and 6-digit OTP, enforces cooldown, and rolls back on delivery failure', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Selam',
      email: 'selam.reset@gmail.com',
      status: 'active',
      preferences: { language: 'en' },
      resetPasswordResendAt: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const selectMock = jest.fn().mockResolvedValue(mockUser);
    jest.spyOn(User, 'findOne').mockReturnValue({ select: selectMock });
    const resetMailSpy = jest
      .spyOn(emailService, 'sendPasswordResetEmail')
      .mockResolvedValue({ success: true, deliveryMode: 'smtp' });

    const okRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'selam.reset@gmail.com', language: 'en' });

    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.data.emailSent).toBe(true);
    expect(okRes.body.data.email).toBe('selam.reset@gmail.com');
    expect(mockUser.resetPasswordToken).toBeTruthy();
    expect(mockUser.resetPasswordOtp).toBeTruthy();
    expect(resetMailSpy).toHaveBeenCalledWith(
      mockUser,
      expect.any(String),
      expect.objectContaining({
        resetOtp: expect.stringMatching(/^\d{6}$/),
        language: 'en'
      })
    );

    // Enforces 60s resend cooldown immediately after sending
    const coolRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'selam.reset@gmail.com' });

    expect(coolRes.status).toBe(429);
    expect(coolRes.body.retryAfter).toBeGreaterThan(0);

    // Rolls back reset tokens and returns 503 if SMTP delivery reports failure
    mockUser.resetPasswordResendAt = new Date(Date.now() - 1000);
    resetMailSpy.mockResolvedValueOnce({ success: false, error: 'SMTP unavailable' });

    const failRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'selam.reset@gmail.com' });

    expect(failRes.status).toBe(503);
    expect(failRes.body.success).toBe(false);
    expect(mockUser.resetPasswordToken).toBeUndefined();
    expect(mockUser.resetPasswordOtp).toBeUndefined();
  });

  test('POST /api/auth/reset-password-otp checks confirmPassword, tracks wrong OTP attempts, and resets password with confirmation email', async () => {
    const validOtp = '842195';
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Selam',
      email: 'selam.otp@gmail.com',
      status: 'active',
      preferences: { language: 'am' },
      resetPasswordOtp: hashOtp(validOtp),
      resetPasswordExpire: new Date(Date.now() + 10 * 60 * 1000),
      resetPasswordOtpAttempts: 0,
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });
    const confirmMailSpy = jest
      .spyOn(emailService, 'sendPasswordChangedConfirmationEmail')
      .mockResolvedValue({ success: true });

    // Mismatched confirmPassword is rejected
    const mismatchRes = await request(app)
      .post('/api/auth/reset-password-otp')
      .send({
        email: 'selam.otp@gmail.com',
        otp: validOtp,
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword'
      });

    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.success).toBe(false);

    // Wrong 6-digit OTP increments attempt counter
    const badOtpRes = await request(app)
      .post('/api/auth/reset-password-otp')
      .send({
        email: 'selam.otp@gmail.com',
        otp: '000000',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      });

    expect(badOtpRes.status).toBe(400);
    expect(badOtpRes.body.attemptsRemaining).toBe(4);
    expect(mockUser.resetPasswordOtpAttempts).toBe(1);

    // Valid OTP resets password, clears reset state, and sends confirmation email
    const goodRes = await request(app)
      .post('/api/auth/reset-password-otp')
      .send({
        email: 'selam.otp@gmail.com',
        otp: validOtp,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
        language: 'am'
      });

    expect(goodRes.status).toBe(200);
    expect(goodRes.body.success).toBe(true);
    expect(goodRes.body.data.token).toBeTruthy();
    expect(mockUser.password).toBe('NewPassword123');
    expect(mockUser.resetPasswordOtp).toBeUndefined();
    expect(mockUser.resetPasswordToken).toBeUndefined();
    expect(confirmMailSpy).toHaveBeenCalledWith(
      mockUser,
      expect.objectContaining({ language: 'am' })
    );
  });

  test('PUT /api/auth/reset-password/:token validates confirmPassword and updates password + sends confirmation email', async () => {
    const rawToken = 'reset-link-token-123';
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Dawit',
      email: 'dawit.reset@example.com',
      preferences: { language: 'en' },
      resetPasswordToken: expectedHash,
      resetPasswordExpire: new Date(Date.now() + 60000),
      save: jest.fn().mockResolvedValue(true)
    };

    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
    const confirmMailSpy = jest
      .spyOn(emailService, 'sendPasswordChangedConfirmationEmail')
      .mockResolvedValue({ success: true });

    const mismatchRes = await request(app)
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'NewPassword123', confirmPassword: 'WrongConfirm' });

    expect(mismatchRes.status).toBe(400);
    expect(findOneSpy).not.toHaveBeenCalled();

    const okRes = await request(app)
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'NewPassword123', confirmPassword: 'NewPassword123' });

    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.data.token).toBeTruthy();
    expect(findOneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resetPasswordToken: expectedHash })
    );
    expect(mockUser.password).toBe('NewPassword123');
    expect(mockUser.resetPasswordToken).toBeUndefined();
    expect(confirmMailSpy).toHaveBeenCalledTimes(1);
  });

  test('EmailService.getFromAddress uses SMTP_USER on Gmail when SMTP_FROM is placeholder noreply@resumeparser.et', () => {
    const origHost = process.env.SMTP_HOST;
    const origUser = process.env.SMTP_USER;
    const origFrom = process.env.SMTP_FROM;

    try {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_USER = 'sender@gmail.com';
      process.env.SMTP_FROM = 'noreply@resumeparser.et';
      expect(emailService.getFromAddress()).toBe('"TalentPulse ET" <sender@gmail.com>');

      process.env.SMTP_FROM = 'custom@talentpulse.et';
      expect(emailService.getFromAddress()).toBe('"TalentPulse ET" <custom@talentpulse.et>');
    } finally {
      if (origHost === undefined) delete process.env.SMTP_HOST;
      else process.env.SMTP_HOST = origHost;
      if (origUser === undefined) delete process.env.SMTP_USER;
      else process.env.SMTP_USER = origUser;
      if (origFrom === undefined) delete process.env.SMTP_FROM;
      else process.env.SMTP_FROM = origFrom;
    }
  });

  test('Google OAuth state preserves trusted frontend origins, guards against open redirects, and uses select_account on register', async () => {
    const trustedCodespacesState = encodeGoogleOAuthState({
      mode: 'register',
      lang: 'am',
      frontendUrl: 'https://demo-5173.app.github.dev/register'
    });
    expect(decodeGoogleOAuthState(trustedCodespacesState)).toEqual({
      mode: 'register',
      lang: 'am',
      frontendUrl: 'https://demo-5173.app.github.dev'
    });

    const untrustedState = encodeGoogleOAuthState({
      mode: 'register',
      lang: 'en',
      frontendUrl: 'https://evil.example.com/phish'
    });
    expect(decodeGoogleOAuthState(untrustedState).frontendUrl).toBeNull();

    const origClientId = process.env.GOOGLE_CLIENT_ID;
    const origClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    try {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      let capturedAuthOptions = null;
      jest.spyOn(passport, 'authenticate').mockImplementation((_strategy, opts) => (_req, res) => {
        capturedAuthOptions = opts;
        res.status(302).set('Location', 'https://accounts.google.com/o/oauth2/v2/auth').end();
      });

      const res = await request(app)
        .get('/api/auth/google?mode=register&lang=am')
        .set('Origin', 'https://demo-5173.app.github.dev');

      expect(res.status).toBe(302);
      expect(capturedAuthOptions.prompt).toBe('select_account');
      expect(decodeGoogleOAuthState(capturedAuthOptions.state)).toEqual({
        mode: 'register',
        lang: 'am',
        frontendUrl: 'https://demo-5173.app.github.dev'
      });

      jest.restoreAllMocks();

      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Eyob',
        email: 'eyob@gmail.com',
        status: 'active',
        authProvider: 'google',
        isEmailVerified: true,
        preferences: { language: 'en' },
        save: jest.fn().mockResolvedValue(true)
      };

      const sendOtpSpy = jest.spyOn(emailService, 'sendOtpEmail').mockResolvedValue({ success: true });
      jest.spyOn(passport, 'authenticate').mockImplementation((_strategy, _opts, cb) => (req, res, next) => {
        cb(null, mockUser, { isNewUser: false, mode: 'register', lang: 'en' });
      });

      const callbackRes = await request(app).get(`/api/auth/google/callback?state=${encodeURIComponent(trustedCodespacesState)}`);

      expect(callbackRes.status).toBe(302);
      expect(callbackRes.headers.location.startsWith('https://demo-5173.app.github.dev/auth/callback?')).toBe(true);
      expect(callbackRes.headers.location).toContain('requiresOtp=true');
      expect(callbackRes.headers.location).toContain('email=eyob%40gmail.com');
      expect(sendOtpSpy).toHaveBeenCalledTimes(1);
    } finally {
      if (origClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = origClientId;
      if (origClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = origClientSecret;
    }
  });
});
