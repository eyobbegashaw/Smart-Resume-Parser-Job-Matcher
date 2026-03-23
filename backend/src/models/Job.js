const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true
  },


  
  company: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true
  },
  companyLogo: String,
  location: {
    type: String,
    required: [true, 'Please add a location'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a job description']
  },
  responsibilities: [String],
  requirements: [String],
  requiredSkills: [{
    name: String,
    importance: {
      type: String,
      enum: ['required', 'preferred'],
      default: 'required'
    }
  }],
  preferredSkills: [String],
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager'],
    default: 'Entry Level'
  },
  education: String,
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'ETB'
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'monthly'
    }
  },
  industry: String,
  applicationUrl: String,
  applicationEmail: String,
  postedDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ['manual', 'scraped', 'api'],
    default: 'manual'
  },
  sourceUrl: String
}, {
  timestamps: true
});

// Index for search
jobSchema.index({ title: 'text', description: 'text', company: 'text' });
jobSchema.index({ location: 1, jobType: 1, isActive: 1 });
jobSchema.index({ 'requiredSkills.name': 1 });

module.exports = mongoose.model('Job', jobSchema);
