const InProcessQueue = require('./inProcessQueue');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const emailQueue = new InProcessQueue('email');

const processDeadlineCheck = async () => {
  const SavedJob = require('../models/SavedJob');
  const User = require('../models/User');

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const savedJobs = await SavedJob.find({ status: { $in: ['saved', 'applied'] } })
    .populate('jobId')
    .limit(100);

  let sent = 0;
  for (const saved of savedJobs) {
    const job = saved.jobId;
    if (!job || !job.isActive || !job.expiryDate) continue;
    if (job.expiryDate <= now || job.expiryDate > threeDaysFromNow) continue;

    const user = await User.findById(saved.userId);
    if (!user || !user.preferences?.emailNotifications) continue;

    const daysLeft = Math.max(1, Math.ceil((job.expiryDate - now) / (1000 * 60 * 60 * 24)));
    await emailService.sendDeadlineReminder(user, job, daysLeft);
    sent++;
  }

  return { success: true, remindersSent: sent };
};

const processWeeklyRecommendations = async () => {
  const Resume = require('../models/Resume');
  const User = require('../models/User');

  const users = await User.find({
    status: 'active',
    'preferences.jobAlerts': true,
    'preferences.emailNotifications': true
  }).limit(100);

  let sent = 0;
  for (const user of users) {
    const latestResume = await Resume.findOne({ userId: user._id, status: 'completed' })
      .sort('-createdAt')
      .populate('matchedJobs.jobId');

    const topMatch = latestResume?.matchedJobs?.find((m) => m.jobId && m.jobId.isActive);
    if (!topMatch) continue;

    await emailService.sendJobMatchNotification(user, topMatch.jobId, topMatch.matchScore);
    sent++;
  }

  return { success: true, recommendationsSent: sent };
};

const EMAIL_HANDLERS = {
  welcome: (data) => emailService.sendWelcomeEmail(data.user),
  verification: (data) => emailService.sendVerificationEmail(data.user, data.token),
  'password-reset': (data) => emailService.sendPasswordResetEmail(data.user, data.token),
  'resume-analyzed': (data) => emailService.sendAnalysisCompleteEmail(data.user, data.resume),
  'job-match': (data) => emailService.sendJobMatchNotification(data.user, data.job, data.matchScore),
  'deadline-reminder': (data) => emailService.sendDeadlineReminder(data.user, data.job, data.daysLeft),
  'contact-form': (data) => emailService.sendContactForm(data.form),
  'deadline-check': () => processDeadlineCheck(),
  'weekly-recommendations': () => processWeeklyRecommendations(),
  'monthly-newsletter': async () => ({
    success: true,
    skipped: true,
    reason: 'Monthly newsletter template not configured'
  })
};

// Process email jobs
emailQueue.process(async (job) => {
  const { type, data = {} } = job.data || {};
  logger.info(`Processing email job: ${type}`, { jobId: job.id });

  const handler = EMAIL_HANDLERS[type];
  if (!handler) {
    logger.warn(`Unknown email type: ${type}`);
    return { success: false, error: 'Unknown email type' };
  }

  try {
    const result = await handler(data);
    logger.info(`Email job completed: ${type}`, { jobId: job.id, result });
    return result;
  } catch (error) {
    logger.error(`Email job failed: ${type}`, { jobId: job.id, error: error.message });
    throw error;
  }
});

emailQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`, { result });
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed`, { error: err.message });
});

/**
 * Add an email job to the in-process queue.
 */
const addEmailJob = async (type, data, options = {}) => {
  try {
    const job = await emailQueue.add(
      { type, data },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      }
    );

    logger.info(`Email job queued: ${type}`, { jobId: job.id });
    return job;
  } catch (error) {
    logger.error('Failed to add email job to queue', { error: error.message });
    throw error;
  }
};

/**
 * Schedule recurring email tasks with node-cron.
 */
const scheduleRecurringEmails = async (options = {}) => {
  const scheduleOpts = { timezone: 'Africa/Addis_Ababa', ...options };

  emailQueue.schedule(
    'deadline-check-daily',
    '0 9 * * *',
    { type: 'deadline-check', data: { checkType: 'daily' } },
    scheduleOpts
  );

  emailQueue.schedule(
    'weekly-recommendations',
    '0 10 * * 1',
    { type: 'weekly-recommendations', data: {} },
    scheduleOpts
  );

  emailQueue.schedule(
    'monthly-newsletter',
    '0 11 1 * *',
    { type: 'monthly-newsletter', data: {} },
    scheduleOpts
  );
};

const stopScheduledEmails = () => {
  emailQueue.stopSchedules();
};

module.exports = {
  emailQueue,
  addEmailJob,
  scheduleRecurringEmails,
  stopScheduledEmails
};
