const Resume = require('../models/Resume');
const User = require('../models/User');
const Job = require('../models/Job');
const pdfParser = require('../services/pdfParser');
const aiParser = require('../services/aiParser');
const jobMatcher = require('../services/jobMatcher');
const logger = require('../utils/logger');

const DAILY_RESUME_LIMIT = 5;

/**
 * @desc    Upload and parse resume
 * @route   POST /api/resumes/upload
 * @access  Private
 */
exports.uploadResume = async (req, res, next) => {
  const startTime = Date.now();
  let resume = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file'
      });
    }

    const userId = req.user.id;
    const language = req.body.language === 'am' ? 'am' : 'en';

    // Enforce 5-resumes-per-day limit
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const todayCount = await Resume.countDocuments({
      userId,
      createdAt: { $gte: startOfToday }
    });

    if (todayCount >= DAILY_RESUME_LIMIT) {
      return res.status(429).json({
        success: false,
        error: language === 'am'
          ? 'የዕለታዊ ገደብ ላይ ደርሰዋል (በቀን 5 ሲቪ ብቻ)። እባክዎ ተጨማሪ ሲቪዎችን ለመተንተን ነገ ይመለሱ።'
          : 'Daily limit reached (5/5 resumes analyzed today). Please return tomorrow to analyze more resumes.',
        dailyQuota: {
          limit: DAILY_RESUME_LIMIT,
          used: todayCount,
          remaining: 0,
          resetsAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    }

    // Create resume record
    resume = await Resume.create({
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing'
    });

    // Parse PDF
    const extracted = await pdfParser.extractText(req.file.buffer);
    resume.rawText = extracted.text;
    await resume.save();

    // Parse and analyze (with seamless fallback)
    let parsedData;
    try {
      parsedData = await aiParser.parseResume(extracted.text, language);
    } catch (parseErr) {
      logger.warn('AI parsing threw unexpected error, utilizing fallback parser:', parseErr);
      parsedData = aiParser.fallbackParseResume(extracted.text, language);
    }

    let analysis;
    try {
      analysis = await aiParser.analyzeResume(parsedData, language);
    } catch (analysisErr) {
      logger.warn('AI analysis threw unexpected error, utilizing fallback analyzer:', analysisErr);
      analysis = aiParser.fallbackAnalyzeResume(parsedData, language);
    }

    resume.parsedData = parsedData;
    resume.analysis = analysis;
    resume.status = 'completed';
    resume.processingTime = Date.now() - startTime;

    // Find matching jobs cleanly before final save
    try {
      const matches = await jobMatcher.findMatchingJobs(parsedData, 10);
      resume.matchedJobs = matches.map(m => ({
        jobId: m.jobId,
        matchScore: m.matchScore,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills
      }));
    } catch (matchErr) {
      logger.error('Job matching error during upload:', matchErr);
    }

    await resume.save();

    // Link resume to user profile
    await User.findByIdAndUpdate(userId, {
      $addToSet: { resumes: resume._id }
    });

    const updatedTodayCount = todayCount + 1;

    res.status(200).json({
      success: true,
      data: {
        resumeId: resume._id,
        parsedData: resume.parsedData,
        analysis: resume.analysis,
        matchedJobs: resume.matchedJobs,
        dailyQuota: {
          limit: DAILY_RESUME_LIMIT,
          used: updatedTodayCount,
          remaining: Math.max(0, DAILY_RESUME_LIMIT - updatedTodayCount),
          resetsAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
        },
        message: language === 'am'
          ? 'የሥራ መግለጫዎ በተሳካ ሁኔታ ተተንትኗል'
          : 'Resume parsed successfully'
      }
    });
  } catch (error) {
    if (resume) {
      resume.status = 'failed';
      resume.processingTime = Date.now() - startTime;
      await resume.save().catch(saveErr => logger.error('Failed to mark resume as failed:', saveErr));
    }
    logger.error('Upload error:', error);
    next(error);
  }
};

/**
 * @desc    Get resume by ID
 * @route   GET /api/resumes/:id
 * @access  Private
 */
exports.getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('matchedJobs.jobId');

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's resumes
 * @route   GET /api/resumes
 * @access  Private
 */
exports.getUserResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id })
      .sort('-createdAt')
      .select('-rawText');

    res.status(200).json({
      success: true,
      count: resumes.length,
      data: resumes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete resume
 * @route   DELETE /api/resumes/:id
 * @access  Private
 */
exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { resumes: resume._id }
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Analyze skill gap for specific job
 * @route   POST /api/resumes/:id/analyze-gap/:jobId
 * @access  Private
 */
exports.analyzeSkillGap = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    if (resume.status !== 'completed' || !resume.parsedData?.skills) {
      return res.status(400).json({
        success: false,
        error: 'Resume has not been parsed yet'
      });
    }

    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const language = req.body.language === 'am' ? 'am' : 'en';
    let gapAnalysis;
    try {
      gapAnalysis = await aiParser.analyzeSkillGap(
        resume.parsedData.skills,
        job,
        language
      );
    } catch (gapErr) {
      logger.warn('Skill gap analysis threw unexpected error, utilizing fallback:', gapErr);
      gapAnalysis = aiParser.fallbackAnalyzeSkillGap(
        resume.parsedData.skills,
        job,
        language
      );
    }

    res.status(200).json({
      success: true,
      data: gapAnalysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's daily resume analysis quota (5 per day limit)
 * @route   GET /api/resumes/daily-quota
 * @access  Private
 */
exports.getDailyQuota = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const todayCount = await Resume.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: startOfToday }
    });

    const DAILY_LIMIT = DAILY_RESUME_LIMIT;
    res.status(200).json({
      success: true,
      data: {
        limit: DAILY_LIMIT,
        used: todayCount,
        remaining: Math.max(0, DAILY_LIMIT - todayCount),
        resetsAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    next(error);
  }
};
