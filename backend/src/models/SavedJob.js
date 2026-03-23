const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: ['saved', 'applied', 'interviewing', 'rejected', 'accepted'],
    default: 'saved'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  applicationDate: Date,
  interviewDate: Date,
  reminders: [{
    date: Date,
    message: String,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate saves
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Index for querying user's saved jobs
savedJobSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SavedJob', savedJobSchema);
