module.exports = {
  // Application constants
  APP: {
    NAME: 'Resume Parser & Job Matcher',
    VERSION: '1.0.0',
    ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000
  },

  // User roles
  USER_ROLES: {
    USER: 'user',
    EMPLOYER: 'employer',
    ADMIN: 'admin'
  },

  // User status
  USER_STATUS: {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BANNED: 'banned'
  },

  // Job types
  JOB_TYPES: {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    REMOTE: 'Remote'
  },

  // Experience levels
  EXPERIENCE_LEVELS: {
    ENTRY: 'Entry Level',
    MID: 'Mid Level',
    SENIOR: 'Senior',
    LEAD: 'Lead',
    MANAGER: 'Manager'
  },

  // Education levels
  EDUCATION_LEVELS: {
    HIGH_SCHOOL: 'High School',
    DIPLOMA: 'Diploma',
    BACHELOR: 'Bachelor\'s Degree',
    MASTER: 'Master\'s Degree',
    PHD: 'PhD',
    CERTIFICATE: 'Certificate'
  },

  // Ethiopian cities/regions
  ETHIOPIAN_LOCATIONS: [
    'Addis Ababa',
    'Adama',
    'Bahir Dar',
    'Gondar',
    'Hawassa',
    'Mekelle',
    'Jimma',
    'Dire Dawa',
    'Debre Zeit',
    'Arba Minch',
    'Dessie',
    'Jijiga',
    'Shashamane',
    'Bishoftu',
    'Sodo',
    'Haramaya',
    'Dilla',
    'Nekemte',
    'Debre Markos',
    'Asosa',
    'Gambela',
    'Semera'
  ],

  // Common Ethiopian job industries
  INDUSTRIES: [
    'Technology',
    'Banking & Finance',
    'Education',
    'Healthcare',
    'Construction',
    'Manufacturing',
    'Agriculture',
    'Retail',
    'Hospitality',
    'Transportation',
    'Telecommunications',
    'NGO',
    'Government',
    'Consulting',
    'Real Estate',
    'Mining',
    'Energy',
    'Pharmaceuticals',
    'Insurance',
    'Media & Communications'
  ],

  // Common skills in Ethiopian job market
  COMMON_SKILLS: {
    HARD: [
      'JavaScript',
      'Python',
      'Java',
      'C++',
      'PHP',
      'React',
      'Node.js',
      'Angular',
      'Vue.js',
      'SQL',
      'MongoDB',
      'Excel',
      'QuickBooks',
      'Peachtree',
      'SAP',
      'Oracle',
      'AutoCAD',
      'SolidWorks',
      'SPSS',
      'STATA',
      'R',
      'MATLAB',
      'Adobe Suite',
      'Photoshop',
      'Illustrator',
      'WordPress',
      'Digital Marketing',
      'SEO',
      'Social Media Management',
      'Data Analysis',
      'Machine Learning',
      'Accounting',
      'Financial Analysis',
      'Project Management',
      'Microsoft Office',
      'Google Suite'
    ],
    SOFT: [
      'Communication',
      'Team Leadership',
      'Problem Solving',
      'Critical Thinking',
      'Time Management',
      'Adaptability',
      'Creativity',
      'Emotional Intelligence',
      'Conflict Resolution',
      'Negotiation',
      'Presentation Skills',
      'Customer Service',
      'Attention to Detail',
      'Organization',
      'Multitasking',
      'Decision Making',
      'Collaboration',
      'Work Ethic',
      'Flexibility',
      'Self-Motivation'
    ],
    LANGUAGES: [
      'Amharic',
      'English',
      'Afan Oromo',
      'Tigrinya',
      'Somali',
      'Arabic',
      'French',
      'Italian'
    ]
  },

  // Resume score thresholds
  RESUME_SCORES: {
    POOR: { min: 0, max: 40, label: 'Needs Improvement' },
    AVERAGE: { min: 41, max: 60, label: 'Average' },
    GOOD: { min: 61, max: 80, label: 'Good' },
    EXCELLENT: { min: 81, max: 100, label: 'Excellent' }
  },

  // Match score thresholds
  MATCH_SCORES: {
    LOW: { min: 0, max: 40, label: 'Low Match' },
    MEDIUM: { min: 41, max: 60, label: 'Medium Match' },
    HIGH: { min: 61, max: 80, label: 'High Match' },
    EXCELLENT: { min: 81, max: 100, label: 'Excellent Match' }
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50
  },

  // File upload limits
  UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['application/pdf'],
    MAX_FILES: 1
  },

  // Cache durations (in seconds)
  CACHE: {
    JOBS_LIST: 300, // 5 minutes
    JOB_DETAILS: 600, // 10 minutes
    USER_PROFILE: 300, // 5 minutes
    RESUME_ANALYSIS: 3600 // 1 hour
  },

  // API rate limits
  RATE_LIMITS: {
    API: { window: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
    AUTH: { window: 60 * 60 * 1000, max: 5 }, // 1 hour, 5 attempts
    UPLOAD: { window: 60 * 60 * 1000, max: 10 }, // 1 hour, 10 uploads
    SEARCH: { window: 60 * 1000, max: 30 } // 1 minute, 30 searches
  },

  // Email templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset',
    RESUME_ANALYZED: 'resume-analyzed',
    JOB_MATCH: 'job-match',
    APPLICATION_DEADLINE: 'application-deadline',
    CONTACT_FORM: 'contact-form'
  },

  // Notification types
  NOTIFICATION_TYPES: {
    JOB_MATCH: 'job_match',
    APPLICATION_UPDATE: 'application_update',
    DEADLINE_REMINDER: 'deadline_reminder',
    RESUME_ANALYZED: 'resume_analyzed',
    SYSTEM_UPDATE: 'system_update'
  },

  // Application status
  APPLICATION_STATUS: {
    SAVED: 'saved',
    APPLIED: 'applied',
    INTERVIEWING: 'interviewing',
    REJECTED: 'rejected',
    ACCEPTED: 'accepted'
  },

  // Error codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    UPLOAD_ERROR: 'UPLOAD_ERROR',
    PARSING_ERROR: 'PARSING_ERROR',
    AI_SERVICE_ERROR: 'AI_SERVICE_ERROR'
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    SERVER_ERROR: 500
  },

  // Response messages
  MESSAGES: {
    en: {
      WELCOME: 'Welcome to Resume Parser & Job Matcher',
      UPLOAD_SUCCESS: 'Resume uploaded successfully',
      ANALYSIS_COMPLETE: 'Resume analysis complete',
      PROFILE_UPDATED: 'Profile updated successfully',
      JOB_SAVED: 'Job saved successfully',
      JOB_REMOVED: 'Job removed from saved',
      PASSWORD_UPDATED: 'Password updated successfully',
      EMAIL_SENT: 'Email sent successfully',
      LOGOUT_SUCCESS: 'Logged out successfully'
    },
    am: {
      WELCOME: 'እንኳን ወደ ሬዚም ተንታኝ እና ሥራ አዛማጅ በደህና መጡ',
      UPLOAD_SUCCESS: 'ሬዚም በተሳካ ሁኔታ ተሰቅሏል',
      ANALYSIS_COMPLETE: 'የሬዚም ትንተና ተጠናቋል',
      PROFILE_UPDATED: 'መገለጫ በተሳካ ሁኔታ ተዘምኗል',
      JOB_SAVED: 'ሥራ በተሳካ ሁኔታ ተቀምጧል',
      JOB_REMOVED: 'ሥራ ከተቀመጡት ተወግዷል',
      PASSWORD_UPDATED: 'ይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል',
      EMAIL_SENT: 'ኢሜይል በተሳካ ሁኔታ ተልኳል',
      LOGOUT_SUCCESS: 'በተሳካ ሁኔታ ወጥተዋል'
    }
  }
};