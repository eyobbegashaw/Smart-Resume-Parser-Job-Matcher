const User = require('../models/User');
const Resume = require('../models/Resume');
const SavedJob = require('../models/SavedJob');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('resumes', 'fileName parsedData analysis.score createdAt')
      .populate('savedJobs');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, phone, location, bio, skills, preferences } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (bio) user.bio = bio;
    if (skills) user.skills = skills;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's resumes
 * @route   GET /api/users/resumes
 * @access  Private
 */
exports.getUserResumes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const resumes = await Resume.find({ userId: req.user.id })
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('fileName parsedData.name parsedData.skills analysis.score createdAt');

    const total = await Resume.countDocuments({ userId: req.user.id });

    res.status(200).json({
      success: true,
      count: resumes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: resumes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's saved jobs
 * @route   GET /api/users/saved-jobs
 * @access  Private
 */
exports.getSavedJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user.id };
    if (status) query.status = status;

    const savedJobs = await SavedJob.find(query)
      .populate({
        path: 'jobId',
        match: { isActive: true }
      })
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SavedJob.countDocuments(query);

    // Filter out jobs that are no longer active
    const filteredJobs = savedJobs.filter(job => job.jobId !== null);

    res.status(200).json({
      success: true,
      count: filteredJobs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: filteredJobs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save a job
 * @route   POST /api/users/saved-jobs/:jobId
 * @access  Private
 */
exports.saveJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { notes, tags } = req.body;

    // Check if already saved
    const existing = await SavedJob.findOne({
      userId: req.user.id,
      jobId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Job already saved'
      });
    }

    const savedJob = await SavedJob.create({
      userId: req.user.id,
      jobId,
      notes,
      tags,
      createdAt: new Date()
    });

    // Add to user's saved jobs
    await User.findByIdAndUpdate(req.user.id, {
      $push: { savedJobs: jobId }
    });

    res.status(201).json({
      success: true,
      data: savedJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update saved job status
 * @route   PUT /api/users/saved-jobs/:jobId
 * @access  Private
 */
exports.updateSavedJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { status, notes, tags, applicationDate, interviewDate } = req.body;

    const savedJob = await SavedJob.findOne({
      userId: req.user.id,
      jobId
    });

    if (!savedJob) {
      return res.status(404).json({
        success: false,
        error: 'Saved job not found'
      });
    }

    if (status) savedJob.status = status;
    if (notes !== undefined) savedJob.notes = notes;
    if (tags) savedJob.tags = tags;
    if (applicationDate) savedJob.applicationDate = applicationDate;
    if (interviewDate) savedJob.interviewDate = interviewDate;
    
    savedJob.updatedAt = new Date();
    await savedJob.save();

    res.status(200).json({
      success: true,
      data: savedJob
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove saved job
 * @route   DELETE /api/users/saved-jobs/:jobId
 * @access  Private
 */
exports.removeSavedJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await SavedJob.findOneAndDelete({
      userId: req.user.id,
      jobId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Saved job not found'
      });
    }

    // Remove from user's saved jobs
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { savedJobs: jobId }
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
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get resume stats
    const resumeStats = await Resume.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalResumes: { $sum: 1 },
          averageScore: { $avg: '$analysis.score' },
          highestScore: { $max: '$analysis.score' },
          lastUpload: { $max: '$createdAt' }
        }
      }
    ]);

    // Get saved jobs stats
    const savedJobsStats = await SavedJob.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get application stats
    const applicationStats = {
      saved: 0,
      applied: 0,
      interviewing: 0,
      rejected: 0,
      accepted: 0
    };

    savedJobsStats.forEach(stat => {
      applicationStats[stat._id] = stat.count;
    });

    // Get most common skills from resumes
    const skillsStats = await Resume.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $unwind: '$parsedData.skills.all' },
      {
        $group: {
          _id: '$parsedData.skills.all',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        resumes: resumeStats[0] || {
          totalResumes: 0,
          averageScore: 0,
          highestScore: 0
        },
        applications: applicationStats,
        topSkills: skillsStats.map(s => ({ name: s._id, count: s.count }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user preferences
 * @route   PUT /api/users/preferences
 * @access  Private
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const { language, darkMode, emailNotifications, jobAlerts } = req.body;

    const user = await User.findById(req.user.id);

    user.preferences = {
      ...user.preferences,
      language: language || user.preferences?.language,
      darkMode: darkMode !== undefined ? darkMode : user.preferences?.darkMode,
      emailNotifications: emailNotifications !== undefined ? emailNotifications : user.preferences?.emailNotifications,
      jobAlerts: jobAlerts !== undefined ? jobAlerts : user.preferences?.jobAlerts
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete all user data
    await Promise.all([
      Resume.deleteMany({ userId }),
      SavedJob.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
