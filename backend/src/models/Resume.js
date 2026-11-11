const mongoose = require('mongoose');


const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: Number,
  mimeType: String,
  parsedData: {
    name: String,
    email: String,
    phone: String,
    education: [{
      degree: String,
      institution: String,
      graduationYear: Number,
      field: String
    }],
    skills: {
      hard: [String],
      soft: [String],
      all: [String]
    },
    experience: [{
      company: String,
      role: String,
      duration: String,
      startDate: Date,
      endDate: Date,
      responsibilities: [String],
      achievements: [String]
    }],
    languages: [{
      name: String,
      proficiency: String
    }],
    summary: String,
    location: String
  },
  rawText: {
    type: String,
    select: false // Don't return by default
  },
  analysis: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    feedback: [{
      category: String,
      message: String,
      suggestion: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    strengths: [String],
    weaknesses: [String]
  },
  matchedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    matchScore: Number,
    matchedSkills: [String],
    missingSkills: [String],
    reviewed: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingTime: Number
}, {
  timestamps: true
});

// Keep parsedData.skills.all synchronized with hard and soft skills
resumeSchema.pre('save', function(next) {
  const skills = this.parsedData?.skills;
  if (skills) {
    const hard = Array.isArray(skills.hard) ? skills.hard : [];
    const soft = Array.isArray(skills.soft) ? skills.soft : [];
    const existingAll = Array.isArray(skills.all) ? skills.all : [];
    const combined = [...hard, ...soft, ...existingAll]
      .filter(s => typeof s === 'string' && s.trim())
      .map(s => s.trim());

    const seen = new Set();
    skills.all = combined.filter(skill => {
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  next();
});

// Index for faster queries
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ 'matchedJobs.jobId': 1 });

module.exports = mongoose.model('Resume', resumeSchema);
