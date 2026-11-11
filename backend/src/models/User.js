const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },

  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [
      function () {
        return this.authProvider === 'local';
      },
      'Please add a password'
    ],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'employer', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: String,
  avatar: String,
  phone: String,
  location: String,
  bio: {
    type: String,
    maxlength: 500
  },
  skills: [String],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpire: {
    type: Date,
    select: false
  },
  emailVerificationOtp: {
    type: String,
    select: false
  },
  emailVerificationOtpExpire: {
    type: Date,
    select: false
  },
  emailVerificationOtpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  emailVerificationOtpResendAt: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  resetPasswordOtp: {
    type: String,
    select: false
  },
  resetPasswordOtpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  resetPasswordResendAt: {
    type: Date,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  resumes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume'
  }],
  preferences: {
    language: {
      type: String,
      enum: ['en', 'am'],
      default: 'en'
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    jobAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password || !enteredPassword) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
