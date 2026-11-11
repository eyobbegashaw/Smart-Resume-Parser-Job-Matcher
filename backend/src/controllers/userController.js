const mongoose = require('mongoose');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
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
      .select('-password -refreshToken')
      .populate('resumes', 'fileName parsedData analysis.score createdAt')
      .populate('savedJobs');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

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
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) user.skills = skills;
    if (preferences && typeof preferences === 'object') {
      const existingPrefs = user.preferences?.toObject?.() || user.preferences || {};
      user.preferences = { ...existingPrefs, ...preferences };
    }

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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const resumes = await Resume.find({ userId: req.user.id })
      .sort('-createdAt')
      .limit(limit)
      .skip((page - 1) * limit)
      .select('fileName parsedData.name parsedData.skills analysis.score status createdAt');

    const total = await Resume.countDocuments({ userId: req.user.id });

    res.status(200).json({
      success: true,
      count: resumes.length,
      total,
      page,
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
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const activeJobIds = await Job.find({ isActive: true }).distinct('_id');
    const query = { userId: req.user.id, jobId: { $in: activeJobIds } };
    if (status) query.status = status;

    const savedJobs = await SavedJob.find(query)
      .populate('jobId')
      .sort('-createdAt')
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await SavedJob.countDocuments(query);

    res.status(200).json({
      success: true,
      count: savedJobs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: savedJobs
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { jobId } = req.params;
    const { notes, tags, status } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

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
      status: status || 'saved',
      notes,
      tags
    });

    // Add to user's saved jobs without duplicating
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { savedJobs: jobId }
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

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
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    // Get resume stats
    const resumeStats = await Resume.aggregate([
      { $match: { userId: userObjectId } },
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
      { $match: { userId: userObjectId } },
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
      { $match: { userId: userObjectId } },
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { language, darkMode, emailNotifications, jobAlerts } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const existingPrefs = user.preferences?.toObject?.() || user.preferences || {};

    user.preferences = {
      ...existingPrefs,
      language: language || existingPrefs.language,
      darkMode: darkMode !== undefined ? darkMode : existingPrefs.darkMode,
      emailNotifications: emailNotifications !== undefined ? emailNotifications : existingPrefs.emailNotifications,
      jobAlerts: jobAlerts !== undefined ? jobAlerts : existingPrefs.jobAlerts
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
