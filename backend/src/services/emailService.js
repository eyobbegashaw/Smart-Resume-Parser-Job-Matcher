const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Resume Parser & Job Matcher';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome ${user.name}!</h1>
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
        <a href="${process.env.FRONTEND_URL}/upload" 
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
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset</h1>
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
          Best regards,<br>The Resume Parser Team
        </p>
      </div>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send resume analysis complete email
   */
  async sendAnalysisCompleteEmail(user, resumeData) {
    const subject = 'Your Resume Analysis is Complete!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Analysis Complete!</h1>
        <p>Hello ${user.name},</p>
        <p>Your resume has been successfully analyzed. Here's a quick summary:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #374151; margin-top: 0;">Results:</h2>
          <ul style="color: #4b5563;">
            <li><strong>Resume Score:</strong> ${resumeData.analysis.score}/100</li>
            <li><strong>Skills Found:</strong> ${resumeData.parsedData.skills.all.length}</li>
            <li><strong>Matching Jobs:</strong> ${resumeData.matchedJobs.length}</li>
          </ul>
        </div>

        <h3>Top Recommended Jobs:</h3>
        <ul style="list-style: none; padding: 0;">
          ${resumeData.matchedJobs.slice(0, 3).map(job => `
            <li style="background-color: #ffffff; border: 1px solid #e5e7eb; 
                       padding: 15px; margin-bottom: 10px; border-radius: 6px;">
              <strong>${job.jobId.title}</strong> at ${job.jobId.company}<br>
              <span style="color: #2563eb;">${job.matchScore}% Match</span>
            </li>
          `).join('')}
        </ul>

        <a href="${process.env.FRONTEND_URL}/results/${resumeData._id}" 
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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Job Match Found!</h1>
        <p>Hello ${user.name},</p>
        <p>We found a new job that matches your skills:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #374151; margin-top: 0;">${job.title}</h2>
          <p><strong>Company:</strong> ${job.company}</p>
          <p><strong>Location:</strong> ${job.location}</p>
          <p><strong>Match Score:</strong> ${matchScore}%</p>
          <p><strong>Job Type:</strong> ${job.jobType}</p>
          ${job.salary ? `<p><strong>Salary:</strong> ${job.salary.min} - ${job.salary.max} ETB/month</p>` : ''}
        </div>

        <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" 
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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Application Deadline Reminder</h1>
        <p>Hello ${user.name},</p>
        <p>This is a reminder that the application for <strong>${job.title}</strong> at <strong>${job.company}</strong> closes in ${daysLeft} days.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #b91c1c;">
            <strong>Deadline:</strong> ${new Date(job.expiryDate).toLocaleDateString()}
          </p>
        </div>

        <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" 
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
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
      </div>
    `;

    return this.sendEmail(process.env.CONTACT_EMAIL, subject, html);
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: `"Resume Parser" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email sending error:', error);
      return { success: false, error: error.message };
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
    // Simple template rendering - in production, use a template engine
    let html = template;
    Object.keys(data).forEach(key => {
      const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return html;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
