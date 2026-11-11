const InProcessQueue = require('./inProcessQueue');
const jobMatcher = require('../services/jobMatcher');
const emailQueue = require('./emailQueue');
const Resume = require('../models/Resume');
const User = require('../models/User');
const logger = require('../utils/logger');

const matchingQueue = new InProcessQueue('matching');

// Match resume with jobs
const matchResume = async (resumeId) => {
  try {
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      throw new Error(`Resume not found: ${resumeId}`);
    }

    const matches = await jobMatcher.findMatchingJobs(resume.parsedData, 20);

    resume.matchedJobs = matches.map((m) => ({
      jobId: m.jobId,
      matchScore: m.matchScore,
      matchedSkills: m.matchedSkills,
      missingSkills: m.missingSkills
    }));

    await resume.save();

    const user = await User.findById(resume.userId);
    if (user && user.preferences?.emailNotifications) {
      const topMatches = matches.slice(0, 3);
      const userPayload = { name: user.name, email: user.email };

      for (const match of topMatches) {
        const jobObj = match.job?.toObject ? match.job.toObject() : match.job;
        await emailQueue.addEmailJob('job-match', {
          user: userPayload,
          job: jobObj,
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

    const requiredSkillNames = (job.requiredSkills || [])
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean);

    if (!requiredSkillNames.length) {
      return { success: true, jobId, matches: 0 };
    }

    const resumes = await Resume.find({
      status: 'completed',
      $or: [
        { 'parsedData.skills.all': { $in: requiredSkillNames } },
        { 'parsedData.skills.hard': { $in: requiredSkillNames } },
        { 'parsedData.skills.soft': { $in: requiredSkillNames } }
      ]
    }).limit(100);

    const matches = [];

    for (const resume of resumes) {
      const skillsObj = resume.parsedData?.skills || {};
      const candidateSkills = [
        ...(Array.isArray(skillsObj.all) ? skillsObj.all : []),
        ...(Array.isArray(skillsObj.hard) ? skillsObj.hard : []),
        ...(Array.isArray(skillsObj.soft) ? skillsObj.soft : [])
      ];

      const matchScore = jobMatcher.calculateMatchScore(
        candidateSkills,
        requiredSkillNames
      );

      if (matchScore >= 60) {
        matches.push({
          resumeId: resume._id,
          userId: resume.userId,
          matchScore
        });
      }
    }

    const jobPayload = job.toObject ? job.toObject() : job;
    for (const match of matches.slice(0, 10)) {
      const user = await User.findById(match.userId);

      if (user && user.preferences?.emailNotifications) {
        await emailQueue.addEmailJob('job-match', {
          user: { name: user.name, email: user.email },
          job: jobPayload,
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
        { updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
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
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
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

    const currentMatches = resume.matchedJobs || [];
    const existingByJobId = new Map(
      currentMatches.map((m) => [m.jobId.toString(), m])
    );

    const newMatches = await jobMatcher.findMatchingJobs(resume.parsedData, 20);

    let addedCount = 0;
    const updatedMatches = newMatches.map((match) => {
      const existing = existingByJobId.get(match.jobId.toString());
      if (!existing) addedCount++;

      return {
        jobId: match.jobId,
        matchScore: match.matchScore,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        reviewed: existing ? Boolean(existing.reviewed) : false
      };
    });

    updatedMatches.sort((a, b) => b.matchScore - a.matchScore);

    resume.matchedJobs = updatedMatches.slice(0, 20);
    await resume.save();

    logger.info(`Updated matches for resume: ${resumeId}`, {
      previous: currentMatches.length,
      current: resume.matchedJobs.length,
      new: addedCount
    });

    return {
      success: true,
      resumeId,
      previousMatches: currentMatches.length,
      currentMatches: resume.matchedJobs.length,
      newMatches: addedCount
    };
  } catch (error) {
    logger.error('Error updating matches:', error);
    throw error;
  }
};

const MATCHING_HANDLERS = {
  'match-resume': (data) => matchResume(data.resumeId),
  'match-new-job': (data) => matchNewJob(data.jobId),
  'batch-match': (data) => batchMatch(data.limit),
  'update-matches': (data) => updateMatches(data.resumeId)
};

// Process matching jobs
matchingQueue.process(async (job) => {
  const { type, data = {} } = job.data || {};
  logger.info(`Processing matching job: ${type}`, { jobId: job.id });

  const handler = MATCHING_HANDLERS[type];
  if (!handler) {
    logger.warn(`Unknown matching type: ${type}`);
    return { success: false, error: 'Unknown matching type' };
  }

  try {
    return await handler(data);
  } catch (error) {
    logger.error(`Matching job failed: ${type}`, { jobId: job.id, error: error.message });
    throw error;
  }
});

matchingQueue.on('completed', (job, result) => {
  logger.info(`Matching job ${job.id} completed`, { result });
});

matchingQueue.on('failed', (job, err) => {
  logger.error(`Matching job ${job.id} failed`, { error: err.message });
});

/**
 * Add a matching job to the in-process queue.
 */
const addMatchingJob = async (type, data, options = {}) => {
  try {
    const job = await matchingQueue.add(
      { type, data },
      {
        attempts: 2,
        ...options
      }
    );

    logger.info(`Matching job queued: ${type}`, { jobId: job.id });
    return job;
  } catch (error) {
    logger.error('Failed to add matching job to queue', { error: error.message });
    throw error;
  }
};

/**
 * Schedule recurring matching tasks with node-cron.
 */
const scheduleMatching = async (options = {}) => {
  const scheduleOpts = { timezone: 'Africa/Addis_Ababa', ...options };

  matchingQueue.schedule(
    'batch-match-daily',
    '0 2 * * *',
    { type: 'batch-match', data: { limit: 100 } },
    scheduleOpts
  );

  matchingQueue.schedule(
    'update-matches-weekly',
    '0 3 * * 0',
    { type: 'batch-match', data: { limit: 200 } },
    scheduleOpts
  );
};

const stopScheduledMatching = () => {
  matchingQueue.stopSchedules();
};

module.exports = {
  matchingQueue,
  addMatchingJob,
  scheduleMatching,
  stopScheduledMatching
};
