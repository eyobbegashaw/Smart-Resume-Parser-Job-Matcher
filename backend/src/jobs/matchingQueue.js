const Queue = require('bull');
const jobMatcher = require('../services/jobMatcher');
const emailQueue = require('./emailQueue');
const Resume = require('../models/Resume');
const User = require('../models/User');
const logger = require('../utils/logger');

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
};

// Create matching queue
const matchingQueue = new Queue('matching', redisConfig);

// Process matching jobs
matchingQueue.process(async (job) => {
  const { type, data } = job.data;
  
  logger.info(`Processing matching job: ${type}`, { jobId: job.id });
  
  try {
    switch (type) {
      case 'match-resume':
        return await matchResume(data.resumeId);
        
      case 'match-new-job':
        return await matchNewJob(data.jobId);
        
      case 'batch-match':
        return await batchMatch(data.limit);
        
      case 'update-matches':
        return await updateMatches(data.resumeId);
        
      default:
        logger.warn(`Unknown matching type: ${type}`);
        return { success: false, error: 'Unknown matching type' };
    }
  } catch (error) {
    logger.error(`Matching job failed: ${type}`, { jobId: job.id, error: error.message });
    throw error;
  }
});

// Match resume with jobs
const matchResume = async (resumeId) => {
  try {
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      throw new Error(`Resume not found: ${resumeId}`);
    }

    // Find matching jobs
    const matches = await jobMatcher.findMatchingJobs(resume.parsedData, 20);
    
    // Update resume with matches
    resume.matchedJobs = matches.map(m => ({
      jobId: m.jobId,
      matchScore: m.matchScore,
      matchedSkills: m.matchedSkills,
      missingSkills: m.missingSkills
    }));
    
    await resume.save();

    // Notify user of top matches
    const user = await User.findById(resume.userId);
    
    if (user && user.preferences?.emailNotifications) {
      // Send notifications for top 3 matches
      const topMatches = matches.slice(0, 3);
      
      for (const match of topMatches) {
        await emailQueue.addEmailJob('job-match', {
          user,
          job: match.job,
          matchScore: match.matchScore
        });
      }
    }

    logger.info(`Resume matched successfully: ${resumeId}`, {
      matches: matches.length,
      topScore: matches[0]?.matchScore
    });

    return {
      success: true,
      resumeId,
      matches: matches.length,
      topMatches: matches.slice(0, 3)
    };

  } catch (error) {
    logger.error('Error matching resume:', error);
    throw error;
  }
};

// Match new job with existing resumes
const matchNewJob = async (jobId) => {
  try {
    const Job = require('../models/Job');
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Find resumes that match this job
    const resumes = await Resume.find({
      status: 'completed',
      'parsedData.skills.all': { $in: job.requiredSkills.map(s => 
        typeof s === 'string' ? s : s.name
      ) }
    }).limit(100);

    const matches = [];
    
    for (const resume of resumes) {
      const matchScore = jobMatcher.calculateMatchScore(
        resume.parsedData.skills.all,
        job.requiredSkills.map(s => typeof s === 'string' ? s : s.name)
      );

      if (matchScore >= 60) { // Only notify for good matches
        matches.push({
          resumeId: resume._id,
          userId: resume.userId,
          matchScore
        });
      }
    }

    // Notify users
    for (const match of matches.slice(0, 10)) { // Limit to top 10
      const user = await User.findById(match.userId);
      
      if (user && user.preferences?.emailNotifications) {
        await emailQueue.addEmailJob('job-match', {
          user,
          job,
          matchScore: match.matchScore
        });
      }
    }

    logger.info(`Job matched with resumes: ${jobId}`, {
      matches: matches.length
    });

    return {
      success: true,
      jobId,
      matches: matches.length
    };

  } catch (error) {
    logger.error('Error matching job:', error);
    throw error;
  }
};

// Batch update matches for all pending resumes
const batchMatch = async (limit = 50) => {
  try {
    const resumes = await Resume.find({
      status: 'completed',
      $or: [
        { 'matchedJobs.0': { $exists: false } },
        { updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Older than 7 days
      ]
    }).limit(limit);

    logger.info(`Batch matching ${resumes.length} resumes`);

    const results = [];
    
    for (const resume of resumes) {
      try {
        const result = await matchResume(resume._id);
        results.push(result);
      } catch (error) {
        logger.error(`Error matching resume ${resume._id}:`, error);
        results.push({
          resumeId: resume._id,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };

  } catch (error) {
    logger.error('Error in batch matching:', error);
    throw error;
  }
};

// Update matches for existing resume
const updateMatches = async (resumeId) => {
  try {
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      throw new Error(`Resume not found: ${resumeId}`);
    }

    // Get current matches
    const currentMatches = resume.matchedJobs || [];
    
    // Find new matches
    const newMatches = await jobMatcher.findMatchingJobs(resume.parsedData, 20);
    
    // Compare and update
    const updatedMatches = [];
    const newJobIds = new Set(newMatches.map(m => m.jobId.toString()));
    
    // Keep existing matches that are still valid
    for (const match of currentMatches) {
      if (newJobIds.has(match.jobId.toString())) {
        updatedMatches.push(match);
        newJobIds.delete(match.jobId.toString());
      }
    }
    
    // Add new matches
    for (const match of newMatches) {
      if (newJobIds.has(match.jobId.toString())) {
        updatedMatches.push({
          jobId: match.jobId,
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          reviewed: false
        });
      }
    }

    // Sort by match score
    updatedMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Update resume
    resume.matchedJobs = updatedMatches.slice(0, 20);
    await resume.save();

    logger.info(`Updated matches for resume: ${resumeId}`, {
      previous: currentMatches.length,
      current: updatedMatches.length,
      new: updatedMatches.length - currentMatches.length
    });

    return {
      success: true,
      resumeId,
      previousMatches: currentMatches.length,
      currentMatches: updatedMatches.length,
      newMatches: updatedMatches.length - currentMatches.length
    };

  } catch (error) {
    logger.error('Error updating matches:', error);
    throw error;
  }
};

// Add matching job to queue
const addMatchingJob = async (type, data, options = {}) => {
  try {
    const job = await matchingQueue.add(
      { type, data },
      {
        attempts: 2,
        removeOnComplete: true,
        ...options
      }
    );
    
    logger.info(`Matching job added to queue: ${type}`, { jobId: job.id });
    return job;
    
  } catch (error) {
    logger.error('Failed to add matching job to queue', { error: error.message });
    throw error;
  }
};

// Schedule recurring matching
const scheduleMatching = async () => {
  // Run batch matching daily at 2 AM
  matchingQueue.add(
    {
      type: 'batch-match',
      data: { limit: 100 }
    },
    {
      repeat: {
        cron: '0 2 * * *', // 2 AM every day
        tz: 'Africa/Addis_Ababa'
      },
      jobId: 'batch-match-daily'
    }
  );

  // Update stale matches weekly on Sunday at 3 AM
  matchingQueue.add(
    {
      type: 'batch-match',
      data: { limit: 200 }
    },
    {
      repeat: {
        cron: '0 3 * * 0', // Sunday 3 AM
        tz: 'Africa/Addis_Ababa'
      },
      jobId: 'update-matches-weekly'
    }
  );
};

// Event handlers
matchingQueue.on('completed', (job, result) => {
  logger.info(`Matching job ${job.id} completed`, { result });
});

matchingQueue.on('failed', (job, err) => {
  logger.error(`Matching job ${job.id} failed`, { error: err.message });
});

matchingQueue.on('stalled', (job) => {
  logger.warn(`Matching job ${job.id} stalled`);
});

module.exports = {
  matchingQueue,
  addMatchingJob,
  scheduleMatching
};
