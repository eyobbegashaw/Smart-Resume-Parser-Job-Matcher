const nodemailer = require('nodemailer');
const https = require('https');
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
    if (host === 'smtp.gmail.com' && (!smtpFrom || smtpFrom === 'noreply@resumeparser.et') && smtpUser) {
      return `"TalentPulse ET" <${smtpUser}>`;
    }
    return `"TalentPulse ET" <${smtpFrom || smtpUser || 'noreply@resumeparser.et'}>`;
  }

  getTransporter() {
    if (!this.transporter) {
      const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().toLowerCase();
      const configuredPort = Number(process.env.SMTP_PORT) || 587;
      const isGmail = host === 'smtp.gmail.com' || (process.env.SMTP_USER || '').endsWith('@gmail.com');

      if (isGmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const secure = configuredPort === 465;
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: configuredPort,
          secure,
          family: 4,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 6000,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: true
          }
        });
      } else {
        const port = configuredPort;
        const secure = process.env.SMTP_SECURE !== undefined
          ? process.env.SMTP_SECURE === 'true'
          : port === 465;

        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port,
          secure,
          family: 4,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 6000,
          auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
              }
            : undefined
        });
      }
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
    const expiresMinutes = options.expiresMinutes || 10;
    const safeName = this.escapeHtml(user.name || user.email);
    const safeEmail = this.escapeHtml(user.email);
    const safeOtp = this.escapeHtml(otp);
    const isAm = language === 'am';

    const copy = isAm
      ? {
          subject: `TalentPulse ET፡ የማረጋገጫ ኮድዎ ${otp} ነው`,
          brand: 'TalentPulse ET',
          brandSub: 'ብልህ የሲቪ ትንተና እና የሥራ ማዛመጃ',
          badge: 'የTalentPulse ET መለያ ማረጋገጫ',
          heading: 'የኢሜይል ማረጋገጫ ኮድ',
          greeting: `ሰላም ${safeName}፣`,
          intro:
            'የTalentPulse ET መለያዎን ማረጋገጥ ለማጠናቀቅ ከዚህ በታች ያለውን ባለ 6-አሃዝ የማረጋገጫ ኮድ ቀድተው በኦቲፒ መሙያ ገጹ ላይ ይለጥፉ።',
          otpLabel: 'የማረጋገጫ ኮድ (OTP)',
          copyBadge: '📋 ባለ 6-አሃዙን ኮድ ይቅዱ (Copy 6-Digit Code)',
          copyHint: 'ኮዱን በቀላሉ ለመቅዳት ጠቅ ያድርጉ፤ ከዚያም ወደ ድረ-ገጹ በመመለስ "ኮድ ለጥፍ" የሚለውን ይጫኑ ወይም ይለጥፉ (Paste)።',
          fallbackCopyLabel: 'ባለ 6-አሃዝ ኮድ፡',
          expiryTitle: 'የኮዱ የቆይታ ጊዜ',
          expiryValue: `ለ${expiresMinutes} ደቂቃዎች ያገለግላል`,
          targetLabel: 'የተላከበት ኢሜይል',
          securityNote: 'ይህን ኮድ ለማንም አያጋሩ። ይህን መለያ እርስዎ ካልፈጠሩት ይህን መልዕክት ችላ ማለት ይችላሉ።',
          footer: 'TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ',
          textBody:
            `ሰላም ${user.name || ''}፣\n\n` +
            `የTalentPulse ET የ6-አሃዝ የማረጋገጫ ኮድዎ፡ ${otp}\n\n` +
            `ይህ ኮድ ለ${expiresMinutes} ደቂቃዎች ያገለግላል።\n` +
            `እባክዎ ይህን ኮድ ቀድተው በማረጋገጫ ገጹ ላይ ይለጥፉ።\n\n` +
            `ይህን መለያ እርስዎ ካልፈጠሩት ይህን መልዕክት ችላ ማለት ይችላሉ።\n\n` +
            `TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ\n`
        }
      : {
          subject: `TalentPulse ET: Your verification code is ${otp}`,
          brand: 'TalentPulse ET',
          brandSub: 'AI Resume Intelligence & Job Matcher',
          badge: 'TalentPulse ET Account Verification',
          heading: 'Verify your email address',
          greeting: `Hello ${safeName},`,
          intro:
            'To finish setting up your TalentPulse ET account, please copy the 6-digit verification code below and paste it into the verification screen.',
          otpLabel: 'VERIFICATION CODE (OTP)',
          copyBadge: '📋 Copy 6-Digit Code',
          copyHint: 'Tap or double-click to copy the code, then return to your verification page and click "Paste Code".',
          fallbackCopyLabel: '6-digit code:',
          expiryTitle: 'Valid Window',
          expiryValue: `${expiresMinutes} minutes`,
          targetLabel: 'Sent To',
          securityNote:
            'For your security, never share this code with anyone. If you did not create an account, you can safely ignore this message.',
          footer: 'TalentPulse ET • Addis Ababa, Ethiopia',
          textBody:
            `Hello ${user.name || ''},\n\n` +
            `Your TalentPulse ET 6-digit verification code is: ${otp}\n\n` +
            `This code is valid for ${expiresMinutes} minutes.\n` +
            `Please copy this code and paste it on the verification page.\n\n` +
            `If you did not create an account, you can safely ignore this email.\n\n` +
            `TalentPulse ET • Addis Ababa, Ethiopia\n`
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
                              ${this.escapeHtml(copy.badge)}
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
                          <td style="padding:26px 20px;text-align:center;">
                            <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#059669;margin-bottom:14px;">
                              ${this.escapeHtml(copy.otpLabel)}
                            </div>

                            <div style="display:inline-block;background-color:#ecfdf5;border:2px dashed #10b981;border-radius:14px;padding:16px 28px;margin-bottom:14px;">
                              <span style="font-family:'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#065f46;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;display:inline-block;">${safeOtp}</span>
                            </div>

                            <!-- Copy Button Badge (Instructional, no external redirect) -->
                            <div style="margin:4px 0 12px;">
                              <div style="display:inline-block;background-color:#059669;color:#ffffff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;box-shadow:0 4px 12px rgba(5,150,105,0.22);">
                                ${this.escapeHtml(copy.copyBadge)}
                              </div>
                            </div>

                            <div style="font-size:12px;line-height:1.6;color:#475569;margin-bottom:12px;max-width:380px;margin-left:auto;margin-right:auto;">
                              ${this.escapeHtml(copy.copyHint)}
                            </div>

                            <div style="display:inline-block;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:6px 14px;font-size:12px;color:#334155;">
                              <span style="color:#64748b;">${this.escapeHtml(copy.fallbackCopyLabel)}</span>
                              <strong style="font-family:'JetBrains Mono',Consolas,monospace;color:#0f172a;letter-spacing:2px;user-select:all;-webkit-user-select:all;margin-left:6px;">${safeOtp}</strong>
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
    const safeName = this.escapeHtml(user.name || user.email);
    const safeEmail = this.escapeHtml(user.email);
    const safeOtp = this.escapeHtml(resetOtp);
    const isAm = language === 'am';

    const copy = isAm
      ? {
          subject: resetOtp
            ? `TalentPulse ET፡ የይለፍ ቃል መቀየሪያ ኮድዎ ${resetOtp} ነው`
            : 'TalentPulse ET፡ የይለፍ ቃልዎን ይቀይሩ',
          badge: 'የይለፍ ቃል መቀየሪያ ጥያቄ',
          heading: 'አዲስ ይለፍ ቃል ያዘጋጁ',
          brand: 'TalentPulse ET',
          greeting: `ሰላም ${safeName}፣`,
          intro:
            'የይለፍ ቃልዎን ለመቀየር ጥያቄ ደርሶናል። ከዚህ በታች ያለውን ቁልፍ ተጭነው አዲስ ይለፍ ቃል ማስገባት ወይም ባለ 6-አሃዝ ኮዱን ቀድተው በማገገሚያ ገጹ ላይ መለጠፍ ይችላሉ።',
          primaryCta: '🔐 አዲስ ይለፍ ቃል ያስገቡ (ይለፍ ቃል ቀይር)',
          otpLabel: 'አማራጭ ባለ 6-አሃዝ የመቀየሪያ ኮድ (OTP)',
          copyBadge: '📋 ባለ 6-አሃዙን ኮድ ይቅዱ (Copy)',
          copyHint: 'ኮዱን ቀድተው ወደ ድረ-ገጹ በመመለስ በይለፍ ቃል መቀየሪያ ገጹ ላይ "ኮድ ለጥፍ" የሚለውን ይጫኑ ወይም ይለጥፉ (Paste)።',
          expiryTitle: 'የአገልግሎት ጊዜ',
          expiryValue: `${expiresMinutes} ደቂቃዎች`,
          targetLabel: 'የተላከበት ኢሜይል',
          securityNote: 'ይህን ጥያቄ እርስዎ ካላቀረቡ መለያዎ ደህንነቱ የተጠበቀ ነው — ይህን ኢሜይል ችላ ይበሉት።',
          footer: 'TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ',
          textBody:
            `ሰላም ${user.name || ''}፣\n\n` +
            `አዲስ ይለፍ ቃል ለማስገባት ይህን አገናኝ ይክፈቱ፡ ${resetUrl}\n` +
            (resetOtp ? `ወይም ባለ 6-አሃዝ ኮዱን ቀድተው በማገገሚያ ገጹ ላይ ይለጥፉ፡ ${resetOtp}\n` : '') +
            `ይህ አገናኝ እና ኮድ በ${expiresMinutes} ደቂቃ ውስጥ ጊዜው ያበቃል።\n\n` +
            `TalentPulse ET • አዲስ አበባ፣ ኢትዮጵያ\n`
        }
      : {
          subject: resetOtp
            ? `TalentPulse ET: Your password reset code is ${resetOtp}`
            : 'TalentPulse ET: Password reset request',
          badge: 'Password Recovery',
          heading: 'Set your new password',
          brand: 'TalentPulse ET',
          greeting: `Hello ${safeName},`,
          intro:
            'We received a request to reset your password. Click the button below to enter your New Password and Confirm Password, or copy the 6-digit reset code into the recovery screen.',
          primaryCta: '🔐 Set New & Confirm Password',
          otpLabel: 'OR USE THIS 6-DIGIT RESET CODE',
          copyBadge: '📋 Copy 6-Digit Reset Code',
          copyHint: 'Copy this 6-digit code and paste it on the password recovery screen.',
          expiryTitle: 'Valid Window',
          expiryValue: `${expiresMinutes} minutes`,
          targetLabel: 'Account Email',
          securityNote:
            "If you didn't request a password reset, no action is needed and your current password remains secure.",
          footer: 'TalentPulse ET • Addis Ababa, Ethiopia',
          textBody:
            `Hello ${user.name || ''},\n\n` +
            `Open this link to set and confirm your new password: ${resetUrl}\n` +
            (resetOtp ? `Or copy this 6-digit code and paste it into the recovery screen: ${resetOtp}\n` : '') +
            `Expires in ${expiresMinutes} minutes.\n\n` +
            `TalentPulse ET • Addis Ababa, Ethiopia\n`
        };

    const otpSectionHtml = resetOtp
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;margin:20px 0 24px;">
          <tr>
            <td style="padding:22px 20px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#059669;margin-bottom:12px;">
                ${this.escapeHtml(copy.otpLabel)}
              </div>
              <div style="display:inline-block;background-color:#ecfdf5;border:2px dashed #10b981;border-radius:14px;padding:14px 26px;margin-bottom:12px;">
                <span style="font-family:'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:9px;color:#065f46;line-height:1.2;user-select:all;-webkit-user-select:all;-moz-user-select:all;display:inline-block;">${safeOtp}</span>
              </div>
              <div style="margin:4px 0 10px;">
                <div style="display:inline-block;background-color:#059669;color:#ffffff;font-size:12px;font-weight:700;padding:6px 18px;border-radius:999px;">
                  ${this.escapeHtml(copy.copyBadge)}
                </div>
              </div>
              <div style="font-size:12px;line-height:1.5;color:#475569;">
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
   * Send email via Resend HTTPS API (bypasses cloud host outbound SMTP port blocks)
   */
  async sendViaResend(to, subject, html, text) {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromAddress = (process.env.RESEND_FROM || 'TalentPulse ET <onboarding@resend.dev>').trim();
    const payload = JSON.stringify({
      from: fromAddress,
      to: [to],
      subject,
      html,
      text: text || undefined
    });

    return new Promise((resolve, reject) => {
      const req = https.request('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 8000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              logger.info(`Resend email sent successfully: ${data.id}`);
              resolve({ success: true, messageId: data.id, deliveryMode: 'resend-http' });
            } else {
              reject(new Error(data.message || `Resend error (${res.statusCode}): ${body}`));
            }
          } catch (e) {
            reject(new Error(`Resend response parse error: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Resend HTTPS request timed out'));
      });
      req.write(payload);
      req.end();
    });
  }

  /**
   * Send email via Brevo HTTPS API (bypasses cloud host outbound SMTP port blocks)
   */
  async sendViaBrevo(to, subject, html, text) {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'eyobbegashaw075@gmail.com').trim();
    const senderName = process.env.BREVO_SENDER_NAME || 'TalentPulse ET';

    const payload = JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || undefined
    });

    return new Promise((resolve, reject) => {
      const req = https.request('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 8000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              logger.info(`Brevo email sent successfully: ${data.messageId}`);
              resolve({ success: true, messageId: data.messageId, deliveryMode: 'brevo-http' });
            } else {
              reject(new Error(data.message || `Brevo error (${res.statusCode}): ${body}`));
            }
          } catch (e) {
            reject(new Error(`Brevo response parse error: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Brevo HTTPS request timed out'));
      });
      req.write(payload);
      req.end();
    });
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text, options = {}) {
    if (!to) {
      throw new Error('Recipient email address is required');
    }

    // 1. Try Resend HTTP API if configured (Port 443 HTTPS, works on Render free tier)
    if (process.env.RESEND_API_KEY) {
      try {
        return await this.sendViaResend(to, subject, html, text);
      } catch (resendErr) {
        logger.warn(`Resend HTTP delivery failed: ${resendErr.message}; falling back to next provider`);
      }
    }

    // 2. Try Brevo HTTP API if configured (Port 443 HTTPS, works on Render free tier)
    if (process.env.BREVO_API_KEY) {
      try {
        return await this.sendViaBrevo(to, subject, html, text);
      } catch (brevoErr) {
        logger.warn(`Brevo HTTP delivery failed: ${brevoErr.message}; falling back to next provider`);
      }
    }

    const smtpUser = (process.env.SMTP_USER || '').trim();
    const mailOptions = {
      from: this.getFromAddress(),
      to,
      replyTo: options?.replyTo || smtpUser || undefined,
      subject,
      html,
      ...(text ? { text } : {}),
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        'Importance': 'high',
        'X-Priority': '1',
        ...(options?.headers || {})
      }
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
