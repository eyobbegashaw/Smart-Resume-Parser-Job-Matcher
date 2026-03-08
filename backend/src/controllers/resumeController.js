const Resume = require('../models/Resume');
const pdfParser = require('../services/pdfParser');
const aiParser = require('../services/aiParser');
const jobMatcher = require('../services/jobMatcher');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Upload and parse resume
 * @route   POST /api/resumes/upload
 * @access  Private
 */
exports.uploadResume = async (req, res, next) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file'
      });
    }

    const userId = req.user.id;
    const language = req.body.language || 'en';

    // Create resume record
    const resume = await Resume.create({
      userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing'
    });

    // Parse PDF
    const extracted = await pdfParser.extractText(req.file.buffer);
    
    // Update with raw text
    resume.rawText = extracted.text;
    await resume.save();

    // Parse with AI
    const parsedData = await aiParser.parseResume(extracted.text, language);
    
    // Analyze resume
    const analysis = await aiParser.analyzeResume(parsedData, language);

    // Update resume with parsed data
    resume.parsedData = parsedData;
    resume.analysis = analysis;
    resume.status = 'completed';
    await resume.save();

    // Find matching jobs (background process)
    jobMatcher.findMatchingJobs(parsedData, 10)
      .then(matches => {
        resume.matchedJobs = matches.map(m => ({
          jobId: m.jobId,
          matchScore: m.matchScore,
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills
        }));
        return resume.save();
      })
      .catch(err => logger.error('Background matching error:', err));

    res.status(200).json({
      success: true,
      data: {
        resumeId: resume._id,
        parsedData,
        analysis,
        message: language === 'am' 
          ? 'የሥራ መግለጫዎ በተሳካ ሁኔታ ተተንትኗል' 
          : 'Resume parsed successfully'
      }
    });

  } catch (error) {
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

    const Job = require('../models/Job');
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const language = req.body.language || 'en';
    const gapAnalysis = await aiParser.analyzeSkillGap(
      resume.parsedData.skills,
      job,
      language
    );

    res.status(200).json({
      success: true,
      data: gapAnalysis
    });
  } catch (error) {
    next(error);
  }
};