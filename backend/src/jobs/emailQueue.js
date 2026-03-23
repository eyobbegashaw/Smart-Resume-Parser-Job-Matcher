const Queue = require('bull');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Create Redis connection
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};


// Create email queue
const emailQueue = new Queue('email', redisConfig);

// Process email jobs
emailQueue.process(async (job) => {
  const { type, data } = job.data;
  
  logger.info(`Processing email job: ${type}`, { jobId: job.id });
  
  try {
    let result;
    
    switch (type) {
      case 'welcome':
        result = await emailService.sendWelcomeEmail(data.user);
        break;
        
      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(data.user, data.token);
        break;
        
      case 'resume-analyzed':
        result = await emailService.sendAnalysisCompleteEmail(data.user, data.resume);
        break;
        
      case 'job-match':
        result = await emailService.sendJobMatchNotification(
          data.user, 
          data.job, 
          data.matchScore
        );
        break;
        
      case 'deadline-reminder':
        result = await emailService.sendDeadlineReminder(
          data.user, 
          data.job, 
          data.daysLeft
        );
        break;
        
      case 'contact-form':
        result = await emailService.sendContactForm(data.form);
        break;
        
      default:
        logger.warn(`Unknown email type: ${type}`);
        return { success: false, error: 'Unknown email type' };
    }
    
    logger.info(`Email job completed: ${type}`, { jobId: job.id, result });
    return result;
    
  } catch (error) {
    logger.error(`Email job failed: ${type}`, { jobId: job.id, error: error.message });
    throw error;
  }
});

// Event handlers
emailQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`, { result });
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed`, { error: err.message });
});

emailQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

// Add email job to queue
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
        removeOnComplete: true,
        ...options
      }
    );
    
    logger.info(`Email job added to queue: ${type}`, { jobId: job.id });
    return job;
    
  } catch (error) {
    logger.error('Failed to add email job to queue', { error: error.message });
    throw error;
  }
};

// Schedule recurring emails
const scheduleRecurringEmails = async () => {
  // Job deadline reminders - run daily at 9 AM
  emailQueue.add(
    {
      type: 'deadline-check',
      data: { checkType: 'daily' }
    },
    {
      repeat: {
        cron: '0 9 * * *', // 9 AM every day
        tz: 'Africa/Addis_Ababa'
      },
      jobId: 'deadline-check-daily'
    }
  );

  // Weekly job recommendations - every Monday at 10 AM
  emailQueue.add(
    {
      type: 'weekly-recommendations',
      data: {}
    },
    {
      repeat: {
        cron: '0 10 * * 1', // Monday 10 AM
        tz: 'Africa/Addis_Ababa'
      },
      jobId: 'weekly-recommendations'
    }
  );

  // Monthly newsletter - 1st of month at 11 AM
  emailQueue.add(
    {
      type: 'monthly-newsletter',
      data: {}
    },
    {
      repeat: {
        cron: '0 11 1 * *', // 1st of month 11 AM
        tz: 'Africa/Addis_Ababa'
      },
      jobId: 'monthly-newsletter'
    }
  );
};

// Clean old jobs
const cleanOldJobs = async () => {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  await emailQueue.clean(oneWeekAgo, 'completed');
  await emailQueue.clean(oneWeekAgo, 'failed');
  
  logger.info('Cleaned old email jobs');
};

// Run cleanup weekly
setInterval(cleanOldJobs, 7 * 24 * 60 * 60 * 1000);

module.exports = {
  emailQueue,
  addEmailJob,
  scheduleRecurringEmails
};
