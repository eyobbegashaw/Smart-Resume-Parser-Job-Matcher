const Job = require('../models/Job');
const logger = require('../utils/logger');

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all jobs with filtering
 * @route   GET /api/jobs
 * @access  Public
 */
exports.getJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      jobType,
      experienceLevel,
      skill,
      company,
      minSalary,
      maxSalary
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    // Build query
    const query = { isActive: true };

    if (search) {
      query.$text = { $search: String(search).trim() };
    }

    if (location) {
      query.location = new RegExp(escapeRegex(location), 'i');
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (skill) {
      query['requiredSkills.name'] = new RegExp(`^${escapeRegex(skill)}$`, 'i');
    }

    if (company) {
      query.company = new RegExp(escapeRegex(company), 'i');
    }

    if (minSalary !== undefined && !isNaN(Number(minSalary))) {
      query['salary.max'] = { $gte: Number(minSalary) };
    }

    if (maxSalary !== undefined && !isNaN(Number(maxSalary))) {
      query['salary.min'] = { $lte: Number(maxSalary) };
    }

    // Execute query with pagination
    const jobs = await Job.find(query)
      .sort({ postedDate: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit);

    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single job
 * @route   GET /api/jobs/:id
 * @access  Public
 */
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create job
 * @route   POST /api/jobs
 * @access  Private (Admin only)
 */
exports.createJob = async (req, res, next) => {
  try {
    const job = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update job
 * @route   PUT /api/jobs/:id
 * @access  Private (Admin only)
 */
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete job
 * @route   DELETE /api/jobs/:id
 * @access  Private (Admin only)
 */
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
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
 * @desc    Get recommended jobs for user
 * @route   GET /api/jobs/recommended
 * @access  Private
 */
exports.getRecommendedJobs = async (req, res, next) => {
  try {
    // Get user's latest resume
    const Resume = require('../models/Resume');
    const latestResume = await Resume.findOne({ 
      userId: req.user.id,
      status: 'completed'
    }).sort('-createdAt');

    if (!latestResume || !latestResume.matchedJobs.length) {
      // Return general recommendations
      const jobs = await Job.find({ isActive: true })
        .sort({ postedDate: -1 })
        .limit(10);
      
      return res.status(200).json({
        success: true,
        data: jobs
      });
    }

    // Populate matched jobs
    await latestResume.populate('matchedJobs.jobId');

    const recommended = latestResume.matchedJobs
      .filter(m => m.jobId && m.jobId.isActive !== false)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(m => ({
        ...m.jobId.toObject(),
        matchScore: m.matchScore,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills
      }));

    res.status(200).json({
      success: true,
      data: recommended
    });
  } catch (error) {
    next(error);
  }
};
