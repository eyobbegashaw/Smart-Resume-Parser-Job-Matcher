const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  hasConfiguredSmtp() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return true;
    }
    const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
    return Boolean(host && host !== 'smtp.gmail.com');
  }

  getFromAddress() {
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpFrom = (process.env.SMTP_FROM || '').trim();
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().toLowerCase();
    // Avoid unaligned placeholder From headers on Gmail SMTP so mail reaches Inbox instead of Spam
    if (host === 'smtp.gmail.com' && smtpUser && (!smtpFrom || smtpFrom === 'noreply@resumeparser.et')) {
      return `"TalentPulse ET" <${smtpUser}>`;
    }
    return `"TalentPulse ET" <${smtpFrom || smtpUser || 'noreply@resumeparser.et'}>`;
  }

  getTransporter() {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : port === 465;

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          : undefined
      });
    }
    return this.transporter;
  }

  async getDevEtherealTransporter() {
    if (!this.etherealTransporter) {
      const testAccount = await nodemailer.createTestAccount();
      this.etherealTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }
    return this.etherealTransporter;
  }

  getFrontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Resume Parser & Job Matcher';
    const frontendUrl = this.getFrontendUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome ${this.escapeHtml(user.name)}!</h1>
        <p>Thank you for joining our platform. We're excited to help you find your dream job in Ethiopia.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #374151; margin-top: 0;">Get Started:</h2>
          <ol style="color: #4b5563;">
            <li>Upload your resume for AI analysis</li>
            <li>Discover your skills and get a resume score</li>
            <li>Find matching job opportunities</li>
            <li>Track your applications</li>
          </ol>
        </div>
        <a href="${frontendUrl}/resumes" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Upload Your Resume
        </a>
        <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
          Best regards,<br>The Resume Parser Team
        </p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send 6-digit OTP verification email (English & Amharic, enterprise HTML + Copy CTA)
   */
  async sendOtpEmail(user, otp, options = {}) {
    const language = options.language === 'am' ? 'am' : 'en';
    const provider = options.provider === 'google' ? 'google' : 'local';
    const expiresMinutes = options.expiresMinutes || 10;
    const frontendUrl = this.getFrontendUrl().replace(/\/+$/, '');
    const verifyUrl = `${frontendUrl}/verify-otp?email=${encodeURIComponent(user.email)}#code=${encodeURIComponent(otp)}&action=copy`;
    const safeName = this.escapeHtml(user.name || user.email);
    const safeEmail = this.escapeHtml(user.email);
    const safeOtp = this.escapeHtml(otp);
    const isAm = language === 'am';

    const copy = isAm
      ? {
          subject: `${otp} የማረጋገጫ ኮድዎ ነው • TalentPulse ET`,
          preheader: `የ6-አሃዝ የማረጋገጫ ኮድዎ ${otp} ነው። በ${expiresMinutes} ደቂቃ ውስጥ ጊዜው ያበቃል።`,
          brand: 'TalentPulse ET',
          brandSub: 'ብልህ የሲቪ ትንተና እና የሥራ ማዛመጃ',
          providerBadge: provider === 'google' ? 'በGoogle መለያ ምዝገባ' : 'በኢሜይል ምዝገባ',
          heading: 'ኢሜይልዎን ያረጋግጡ',
          greeting: `ሰላም ${safeName}፣`,
          intro:
            provider === 'google'
              ? 'በGoogle መለያዎ ምዝገባውን ለማጠናቀቅ እና ወደ የግል መድረክዎ ለመግባት ከዚህ በታች ያለውን ባለ 6-አሃዝ የማረጋገጫ ኮድ ያስገቡ።'
              : 'ምዝገባዎን ለማጠናቀቅ እና ወደ የግል መድረክዎ ለመግባት ከዚህ በታች ያለውን ባለ 6-አሃዝ የማረጋገጫ ኮድ ያስገቡ።',
          otpLabel: 'የአንድ ጊዜ የማረጋገጫ ኮድ (OTP)',
          copyHint: 'ሁሉንም 6 አሃዞች ለመምረጥ እና ለመቅዳት ኮዱ ላይ ጠቅ ያድርጉ ወይም ሁለት ጊዜ ይንኩ።',
          copyCta: '📋 ኮዱን ቅዳ እና አረጋግጥ',
          fallbackCopyLabel: 'ለመቅዳት ዝግጁ ኮድ፡',
          expiryTitle: 'የኮዱ የቆይታ ጊዜ',
          expiryValue: `ለ${expiresMinutes} ደቂቃዎች ያገለግላል`,
          targetLabel: 'የተላከበት ኢሜይል',
          securityNote: 'ይህን ኮድ ለማንም አያጋሩ። ይህን መለያ እርስዎ ካልፈጠሩት ይህን መልዕክት ችላ ማለት ይችላሉ።',
          footer: 'TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ',
          textBody:
            `ሰላም ${user.name || ''},\n\n` +
            `የ6-አሃዝ የማረጋገጫ ኮድዎ፡ ${otp}\n\n` +
            `ይህ ኮድ በ${expiresMinutes} ደቂቃ ውስጥ ጊዜው ያበቃል።\n` +
            `ኮዱን ለመቅዳት እና ለማረጋገጥ ይህን አገናኝ ይክፈቱ፡ ${verifyUrl}\n`
        }
      : {
          subject: `${otp} is your verification code • TalentPulse ET`,
          preheader: `Your 6-digit verification code is ${otp}. Valid for ${expiresMinutes} minutes.`,
          brand: 'TalentPulse ET',
          brandSub: 'AI Resume Intelligence & Job Matcher',
          providerBadge: provider === 'google' ? 'Google Account Registration' : 'Email Registration',
          heading: 'Verify your email address',
          greeting: `Hello ${safeName},`,
          intro:
            provider === 'google'
              ? 'To finish registering with your Google account and unlock your personal workspace, enter the 6-digit OTP verification code below.'
              : 'To complete your registration and enter your personal workspace, enter the 6-digit OTP verification code below.',
          otpLabel: 'ONE-TIME 6-DIGIT CODE',
          copyHint: 'Tap or double-click the code box above to select all 6 digits instantly.',
          copyCta: '📋 Copy OTP & Open Verification',
          fallbackCopyLabel: 'Quick-select code:',
          expiryTitle: 'Valid Window',
          expiryValue: `${expiresMinutes} minutes`,
          targetLabel: 'Sent To',
          securityNote:
            'For your security, never share this code with anyone. If you did not create an account, you can safely ignore this message.',
          footer: 'TalentPulse ET • Addis Ababa, Ethiopia',
          textBody:
            `Hello ${user.name || ''},\n\n` +
            `Your 6-digit verification code is: ${otp}\n\n` +
            `This code expires in ${expiresMinutes} minutes.\n` +
            `Copy OTP & verify here: ${verifyUrl}\n`
        };

    const html = `
      <!doctype html>
      <html lang="${language}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${this.escapeHtml(copy.subject)}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${isAm ? "'Noto Serif Ethiopic','Nyala','Abyssinica SIL'," : ''}-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${this.escapeHtml(copy.preheader)}
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
                  <!-- Header Banner -->
                  <tr>
                    <td style="background-color:#0f172a;background-image:linear-gradient(135deg,#0f172a 0%,#064e3b 65%,#059669 100%);padding:28px 32px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <span style="display:inline-block;background-color:rgba(16,185,129,0.22);border:1px solid rgba(52,211,153,0.4);color:#6ee7b7;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
                              ${this.escapeHtml(copy.providerBadge)}
                            </span>
                            <h1 style="margin:14px 0 4px;font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;">
                              ${this.escapeHtml(copy.heading)}
                            </h1>
                            <p style="margin:0;font-size:13px;color:#cbd5e1;">
                              ${this.escapeHtml(copy.brand)} &bull; ${this.escapeHtml(copy.brandSub)}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Body -->
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">
                        ${copy.greeting}
                      </p>
                      <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#475569;">
                        ${this.escapeHtml(copy.intro)}
                      </p>

                      <!-- Selectable OTP Vault Box -->
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;margin-bottom:24px;">
                        <tr>
                          <td style="padding:24px 20px;text-align:center;">
                            <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#059669;margin-bottom:14px;">
                              ${this.escapeHtml(copy.otpLabel)}
                            </div>

                            <div style="display:inline-block;background-color:#ecfdf5;border:2px dashed #10b981;border-radius:14px;padding:16px 26px;margin-bottom:16px;">
                              <code style="font-family:'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#065f46;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;cursor:pointer;">${safeOtp}</code>
                            </div>

                            <!-- Copy Button CTA inside Email Message -->
                            <div style="margin:8px 0 14px;">
                              <a href="${verifyUrl}"
                                 style="display:inline-block;background-color:#059669;background-image:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:12px;box-shadow:0 6px 16px rgba(5,150,105,0.28);">
                                ${this.escapeHtml(copy.copyCta)}
                              </a>
                            </div>

                            <div style="font-size:12px;color:#64748b;margin-bottom:10px;">
                              ${this.escapeHtml(copy.copyHint)}
                            </div>

                            <div style="display:inline-block;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:6px 12px;font-size:12px;color:#334155;">
                              <span style="color:#64748b;">${this.escapeHtml(copy.fallbackCopyLabel)}</span>
                              <strong style="font-family:'JetBrains Mono',Consolas,monospace;color:#0f172a;letter-spacing:2px;user-select:all;-webkit-user-select:all;cursor:pointer;margin-left:6px;">${safeOtp}</strong>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Metadata Strip -->
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:20px;">
                        <tr>
                          <td width="50%" style="padding:12px 8px 12px 0;font-size:12px;color:#64748b;">
                            <div style="font-weight:700;color:#334155;margin-bottom:2px;">${this.escapeHtml(copy.expiryTitle)}</div>
                            <div>${this.escapeHtml(copy.expiryValue)}</div>
                          </td>
                          <td width="50%" style="padding:12px 0 12px 8px;font-size:12px;color:#64748b;">
                            <div style="font-weight:700;color:#334155;margin-bottom:2px;">${this.escapeHtml(copy.targetLabel)}</div>
                            <div style="word-break:break-all;">${safeEmail}</div>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                        ${this.escapeHtml(copy.securityNote)}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
                      ${this.escapeHtml(copy.footer)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    return this.sendEmail(user.email, copy.subject, html, copy.textBody);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(user, verificationToken) {
    const verifyUrl = `${this.getFrontendUrl()}/verify-email/${encodeURIComponent(verificationToken)}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Email Verification</h1>
        <p>Hello ${this.escapeHtml(user.name)},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send password reset email (bilingual HTML with New/Confirm reset link + selectable 6-digit reset OTP)
   */
  async sendPasswordResetEmail(user, resetToken, options = {}) {
    const language = options.language === 'am' ? 'am' : 'en';
    const expiresMinutes = options.expiresMinutes || 10;
    const resetOtp = options.resetOtp ? String(options.resetOtp) : '';
    const frontendUrl = this.getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password/${encodeURIComponent(resetToken)}`;
    const copyResetCodeUrl = resetOtp
      ? `${frontendUrl}/forgot-password?email=${encodeURIComponent(user.email)}&step=verify#code=${encodeURIComponent(resetOtp)}&action=copy`
      : resetUrl;
    const safeName = this.escapeHtml(user.name || user.email);
    const safeEmail = this.escapeHtml(user.email);
    const safeOtp = this.escapeHtml(resetOtp);
    const isAm = language === 'am';

    const copy = isAm
      ? {
          subject: resetOtp
            ? `${resetOtp} የይለፍ ቃል መቀየሪያ ኮድዎ ነው • TalentPulse ET`
            : 'የይለፍ ቃልዎን ይቀይሩ • TalentPulse ET',
          preheader: resetOtp
            ? `የይለፍ ቃል መቀየሪያ ኮድዎ ${resetOtp} ነው። አዲስ ይለፍ ቃል እና ማረጋገጫ ለማስገባት ይጠቀሙበት።`
            : `አዲስ ይለፍ ቃል ለመፍጠር ይህን መልዕክት ይክፈቱ (በ${expiresMinutes} ደቂቃ ውስጥ ጊዜው ያበቃል)።`,
          badge: 'የይለፍ ቃል መቀየሪያ ጥያቄ',
          heading: 'አዲስ ይለፍ ቃል ያዘጋጁ',
          brand: 'TalentPulse ET',
          greeting: `ሰላም ${safeName}፣`,
          intro:
            'የይለፍ ቃልዎን ለመቀየር ጥያቄ ደርሶናል። ከዚህ በታች ያለውን ቁልፍ ተጭነው አዲስ ይለፍ ቃል እና የማረጋገጫ ይለፍ ቃል ማስገባት ወይም ባለ 6-አሃዝ ኮዱን መቅዳት ይችላሉ።',
          primaryCta: '🔐 አዲስ ይለፍ ቃል ያስገቡ (ይለፍ ቃል ቀይር)',
          otpLabel: 'አማራጭ ባለ 6-አሃዝ የመቀየሪያ ኮድ (OTP)',
          copyBtn: '📋 ኮዱን ቅዳ እና ከታች ያስገቡ',
          copyHint: 'ሁሉንም 6 አሃዞች ለመቅዳት ኮዱ ላይ ሁለት ጊዜ ይንኩ።',
          expiryTitle: 'የአገልግሎት ጊዜ',
          expiryValue: `${expiresMinutes} ደቂቃዎች`,
          targetLabel: 'የተላከበት ኢሜይል',
          securityNote: 'ይህን ጥያቄ እርስዎ ካላቀረቡ መለያዎ ደህንነቱ የተጠበቀ ነው — ይህን ኢሜይል ችላ ይበሉት።',
          footer: 'TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ',
          textBody:
            `ሰላም ${user.name || ''},\n\n` +
            `አዲስ ይለፍ ቃል ለማስገባት ይህን አገናኝ ይክፈቱ፡ ${resetUrl}\n` +
            (resetOtp ? `ወይም ይህን ባለ 6-አሃዝ ኮድ ይጠቀሙ፡ ${resetOtp}\n` : '') +
            `ይህ አገናኝ እና ኮድ በ${expiresMinutes} ደቂቃ ውስጥ ጊዜው ያበቃል።\n`
        }
      : {
          subject: resetOtp
            ? `${resetOtp} is your password reset code • TalentPulse ET`
            : 'Reset Your Password • TalentPulse ET',
          preheader: resetOtp
            ? `Your 6-digit password reset code is ${resetOtp}. Open the link inside to set and confirm your new password.`
            : `Set and confirm your new TalentPulse ET password within ${expiresMinutes} minutes.`,
          badge: 'Password Recovery',
          heading: 'Set your new password',
          brand: 'TalentPulse ET',
          greeting: `Hello ${safeName},`,
          intro:
            'We received a request to reset your password. Click the button below to enter your New Password and Confirm Password, or copy the 6-digit reset code into the recovery screen.',
          primaryCta: '🔐 Set New & Confirm Password',
          otpLabel: 'OR USE THIS 6-DIGIT RESET CODE',
          copyBtn: '📋 Copy Reset Code & Continue',
          copyHint: 'Double-click or tap the 6-digit code above to copy it cleanly.',
          expiryTitle: 'Valid Window',
          expiryValue: `${expiresMinutes} minutes`,
          targetLabel: 'Account Email',
          securityNote:
            "If you didn't request a password reset, no action is needed and your current password remains secure.",
          footer: 'TalentPulse ET • Addis Ababa, Ethiopia',
          textBody:
            `Hello ${user.name || ''},\n\n` +
            `Open this link to set and confirm your new password: ${resetUrl}\n` +
            (resetOtp ? `Or enter this 6-digit reset code: ${resetOtp}\n` : '') +
            `Expires in ${expiresMinutes} minutes.\n`
        };

    const otpSectionHtml = resetOtp
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;margin:20px 0 24px;">
          <tr>
            <td style="padding:20px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#059669;margin-bottom:12px;">
                ${this.escapeHtml(copy.otpLabel)}
              </div>
              <div style="display:inline-block;background-color:#ecfdf5;border:2px dashed #10b981;border-radius:14px;padding:14px 24px;margin-bottom:14px;">
                <code style="font-family:'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:9px;color:#065f46;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;cursor:pointer;">${safeOtp}</code>
              </div>
              <div style="margin:6px 0 12px;">
                <a href="${copyResetCodeUrl}"
                   style="display:inline-block;background-color:#ffffff;border:1px solid #10b981;color:#065f46;font-size:13px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:10px;">
                  ${this.escapeHtml(copy.copyBtn)}
                </a>
              </div>
              <div style="font-size:12px;color:#64748b;">
                ${this.escapeHtml(copy.copyHint)}
              </div>
            </td>
          </tr>
        </table>
      `
      : '';

    const html = `
      <!doctype html>
      <html lang="${language}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${this.escapeHtml(copy.subject)}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:${isAm ? "'Noto Serif Ethiopic','Nyala','Abyssinica SIL'," : ''}-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${this.escapeHtml(copy.preheader)}
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
                  <tr>
                    <td style="background-color:#0f172a;background-image:linear-gradient(135deg,#0f172a 0%,#064e3b 65%,#059669 100%);padding:28px 32px;">
                      <span style="display:inline-block;background-color:rgba(16,185,129,0.22);border:1px solid rgba(52,211,153,0.4);color:#6ee7b7;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
                        ${this.escapeHtml(copy.badge)}
                      </span>
                      <h1 style="margin:14px 0 4px;font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;">
                        ${this.escapeHtml(copy.heading)}
                      </h1>
                      <p style="margin:0;font-size:13px;color:#cbd5e1;">
                        ${this.escapeHtml(copy.brand)}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">
                        ${copy.greeting}
                      </p>
                      <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#475569;">
                        ${this.escapeHtml(copy.intro)}
                      </p>

                      <div style="text-align:center;margin-bottom:24px;">
                        <a href="${resetUrl}"
                           style="display:inline-block;background-color:#059669;background-image:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;box-shadow:0 6px 16px rgba(5,150,105,0.28);">
                          ${this.escapeHtml(copy.primaryCta)}
                        </a>
                      </div>

                      ${otpSectionHtml}

                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:20px;">
                        <tr>
                          <td width="50%" style="padding:12px 8px 12px 0;font-size:12px;color:#64748b;">
                            <div style="font-weight:700;color:#334155;margin-bottom:2px;">${this.escapeHtml(copy.expiryTitle)}</div>
                            <div>${this.escapeHtml(copy.expiryValue)}</div>
                          </td>
                          <td width="50%" style="padding:12px 0 12px 8px;font-size:12px;color:#64748b;">
                            <div style="font-weight:700;color:#334155;margin-bottom:2px;">${this.escapeHtml(copy.targetLabel)}</div>
                            <div style="word-break:break-all;">${safeEmail}</div>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                        ${this.escapeHtml(copy.securityNote)}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
                      ${this.escapeHtml(copy.footer)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    return this.sendEmail(user.email, copy.subject, html, copy.textBody);
  }

  /**
   * Send password changed security confirmation email
   */
  async sendPasswordChangedConfirmationEmail(user, options = {}) {
    const language = options.language === 'am' ? 'am' : 'en';
    const frontendUrl = this.getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;
    const safeName = this.escapeHtml(user.name || user.email);
    const isAm = language === 'am';

    const subject = isAm
      ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል • TalentPulse ET'
      : 'Your Password Has Been Updated • TalentPulse ET';
    const heading = isAm ? 'የይለፍ ቃል ተቀይሯል' : 'Password successfully updated';
    const body = isAm
      ? 'የመለያዎ የይለፍ ቃል በተሳካ ሁኔታ ተዘምኗል። አሁን በአዲሱ ይለፍ ቃልዎ መግባት ይችላሉ።'
      : 'Your account password has been changed and previous sessions were signed out. You can now sign in with your new password.';
    const cta = isAm ? 'በአዲስ ይለፍ ቃል ይግቡ' : 'Sign in with New Password';

    const html = `
      <div style="font-family:${isAm ? "'Noto Serif Ethiopic'," : ''}-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;color:#0f172a;">
        <h2 style="margin:0 0 12px;color:#059669;">${this.escapeHtml(heading)}</h2>
        <p style="margin:0 0 12px;font-size:15px;">${isAm ? `ሰላም ${safeName}፣` : `Hello ${safeName},`}</p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569;">${this.escapeHtml(body)}</p>
        <a href="${loginUrl}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
          ${this.escapeHtml(cta)}
        </a>
      </div>
    `;

    const text = `${heading}\n\n${body}\n${loginUrl}\n`;
    return this.sendEmail(user.email, subject, html, text);
  }

  /**
   * Send resume analysis complete email
   */
  async sendAnalysisCompleteEmail(user, resumeData) {
    const subject = 'Your Resume Analysis is Complete!';
    const frontendUrl = this.getFrontendUrl();
    const skills = resumeData?.parsedData?.skills || {};
    const skillsCount = Array.isArray(skills.all) && skills.all.length
      ? skills.all.length
      : (skills.hard?.length || 0) + (skills.soft?.length || 0);
    const matchedJobs = Array.isArray(resumeData?.matchedJobs) ? resumeData.matchedJobs : [];
    const score = resumeData?.analysis?.score ?? 0;

    const jobItemsHtml = matchedJobs
      .slice(0, 3)
      .filter(entry => entry?.jobId && typeof entry.jobId === 'object' && entry.jobId.title)
      .map(entry => `
        <li style="background-color: #ffffff; border: 1px solid #e5e7eb; 
                   padding: 15px; margin-bottom: 10px; border-radius: 6px;">
          <strong>${this.escapeHtml(entry.jobId.title)}</strong> at ${this.escapeHtml(entry.jobId.company)}<br>
          <span style="color: #2563eb;">${entry.matchScore ?? 0}% Match</span>
        </li>
      `)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Analysis Complete!</h1>
        <p>Hello ${this.escapeHtml(user.name)},</p>
        <p>Your resume has been successfully analyzed. Here's a quick summary:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #374151; margin-top: 0;">Results:</h2>
          <ul style="color: #4b5563;">
            <li><strong>Resume Score:</strong> ${score}/100</li>
            <li><strong>Skills Found:</strong> ${skillsCount}</li>
            <li><strong>Matching Jobs:</strong> ${matchedJobs.length}</li>
          </ul>
        </div>

        ${jobItemsHtml ? `<h3>Top Recommended Jobs:</h3><ul style="list-style: none; padding: 0;">${jobItemsHtml}</ul>` : ''}

        <a href="${frontendUrl}/resumes/${resumeData._id}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Full Results
        </a>

        <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
          Best regards,<br>The Resume Parser Team
        </p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send job match notification
   */
  async sendJobMatchNotification(user, job, matchScore) {
    const subject = `New Job Match: ${job.title} at ${job.company}`;
    const frontendUrl = this.getFrontendUrl();
    const hasSalary = job.salary && (job.salary.min != null || job.salary.max != null);
    const salaryText = hasSalary
      ? `${job.salary.min ?? ''} - ${job.salary.max ?? ''} ${this.escapeHtml(job.salary.currency || 'ETB')}/${this.escapeHtml(job.salary.period || 'monthly')}`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Job Match Found!</h1>
        <p>Hello ${this.escapeHtml(user.name)},</p>
        <p>We found a new job that matches your skills:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #374151; margin-top: 0;">${this.escapeHtml(job.title)}</h2>
          <p><strong>Company:</strong> ${this.escapeHtml(job.company)}</p>
          <p><strong>Location:</strong> ${this.escapeHtml(job.location)}</p>
          <p><strong>Match Score:</strong> ${matchScore}%</p>
          <p><strong>Job Type:</strong> ${this.escapeHtml(job.jobType)}</p>
          ${hasSalary ? `<p><strong>Salary:</strong> ${salaryText}</p>` : ''}
        </div>

        <a href="${frontendUrl}/jobs/${job._id}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Job Details
        </a>

        <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
          Best regards,<br>The Resume Parser Team
        </p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send application deadline reminder
   */
  async sendDeadlineReminder(user, job, daysLeft) {
    const subject = `Application Deadline Reminder: ${job.title}`;
    const frontendUrl = this.getFrontendUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Application Deadline Reminder</h1>
        <p>Hello ${this.escapeHtml(user.name)},</p>
        <p>This is a reminder that the application for <strong>${this.escapeHtml(job.title)}</strong> at <strong>${this.escapeHtml(job.company)}</strong> closes in ${daysLeft} days.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #b91c1c;">
            <strong>Deadline:</strong> ${new Date(job.expiryDate).toLocaleDateString()}
          </p>
        </div>

        <a href="${frontendUrl}/jobs/${job._id}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Apply Now
        </a>

        <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
          Best regards,<br>The Resume Parser Team
        </p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send contact form submission
   */
  async sendContactForm(data) {
    const subject = `Contact Form: ${data.subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Contact Form Submission</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Name:</strong> ${this.escapeHtml(data.name)}</p>
          <p><strong>Email:</strong> ${this.escapeHtml(data.email)}</p>
          <p><strong>Subject:</strong> ${this.escapeHtml(data.subject)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${this.escapeHtml(data.message)}</p>
        </div>
      </div>
    `;

    return this.sendEmail(process.env.CONTACT_EMAIL, subject, html);
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text) {
    if (!to) {
      throw new Error('Recipient email address is required');
    }

    const mailOptions = {
      from: this.getFromAddress(),
      to,
      subject,
      html,
      ...(text ? { text } : {})
    };

    try {
      if (this.hasConfiguredSmtp() || this.transporter) {
        const info = await this.getTransporter().sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId, deliveryMode: 'smtp' };
      }

      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMTP credentials (SMTP_USER / SMTP_PASS) are not configured');
      }

      if (process.env.NODE_ENV === 'test') {
        logger.info(`[TEST MODE] Email skipped (SMTP unconfigured) for ${to}: ${subject}`);
        return { success: false, deliveryMode: 'test-unconfigured' };
      }

      // Development convenience: try Ethereal inbox preview if online; never crash signup if offline
      try {
        const ethereal = await this.getDevEtherealTransporter();
        const info = await ethereal.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        logger.info(`Ethereal preview email sent for ${to}: ${previewUrl || info.messageId}`);
        return {
          success: true,
          messageId: info.messageId,
          previewUrl: previewUrl || undefined,
          deliveryMode: 'ethereal'
        };
      } catch (etherealErr) {
        logger.warn(`SMTP not configured & Ethereal unavailable (${etherealErr.message}); email not delivered to ${to}`);
        return { success: false, deliveryMode: 'unconfigured' };
      }
    } catch (error) {
      logger.error('Email sending error:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(recipients, subject, template, data) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const html = this.renderTemplate(template, { ...data, user: recipient });
        const result = await this.sendEmail(recipient.email, subject, html);
        results.push({ email: recipient.email, ...result });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Render email template
   */
  renderTemplate(template, data) {
    let html = template;
    Object.keys(data).forEach(key => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key] ?? '');
      html = html.replace(new RegExp(`{{${escapedKey}}}`, 'g'), () => value);
    });
    return html;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.getTransporter().verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
