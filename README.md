# README.md

```markdown
# Smart Resume Parser & Job Matcher

An AI-powered tool that helps Ethiopian students and fresh graduates understand their job market value by extracting skills from their CVs and matching them with relevant job opportunities.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.2.0-61dafb)

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Key Features in Detail](#-key-features-in-detail)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## 🎯 Overview

Smart Resume Parser & Job Matcher addresses the critical gap between Ethiopian graduates and the job market. Many graduates struggle to understand how their academic knowledge translates to job requirements. This tool provides:

- **AI-powered resume parsing** that extracts skills, experience, and education
- **Intelligent job matching** based on extracted skills
- **Skill gap analysis** to identify areas for improvement
- **Resume scoring** with actionable feedback
- **Bilingual support** (English and Amharic)

## ✨ Features

### Core Functionality
- 📄 **Resume Upload & Parsing**: Upload PDF resumes and extract key information
- 🔍 **Skill Analysis**: Identify both hard skills (Python, Accounting) and soft skills (Team Leadership, Communication)
- 🤖 **AI-Powered**: Uses Google's Gemini AI for intelligent parsing and analysis
- 🎯 **Job Matching**: Find relevant job postings from Ethiopian job sites
- 📊 **Skill Gap Analysis**: Identify missing skills for desired job roles
- 📈 **Resume Scoring**: Get a score (0-100) with improvement suggestions
- 🌐 **Bilingual Interface**: Full Amharic and English language support

### User Experience
- 🎨 **Professional UI**: Clean, corporate style that inspires confidence
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 🔄 **Drag-and-Drop**: Simple file upload with progress tracking
- 🏷️ **Visual Skills**: Skills displayed as tags/badges
- 💼 **Job Cards**: Matching jobs with match percentages

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **React Router 6** - Navigation
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Dropzone** - File upload
- **React Hot Toast** - Notifications
- **React Icons** - Icon library
- **Chart.js** - Data visualization
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Passport** - OAuth strategies
- **Multer** - File upload
- **PDF-Parse** - PDF text extraction
- **Google Generative AI** - Gemini AI integration
- **Bull** - Queue management
- **Redis** - Caching and queues
- **Winston** - Logging
- **Nodemailer** - Email service
- **Cheerio** - Web scraping

## 📁 Project Structure

```
project-5-resume-parser/
├── backend/                 # Backend server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration files
│   │   ├── jobs/           # Queue jobs
│   │   └── server.js       # Entry point
│   ├── tests/              # Backend tests
│   └── package.json
│
├── frontend/                # Frontend React app
│   ├── public/             # Static files
│   └── src/
│       ├── components/      # React components
│       │   ├── common/      # Reusable components
│       │   ├── auth/        # Authentication components
│       │   ├── upload/      # File upload components
│       │   ├── analysis/    # Resume analysis components
│       │   ├── jobs/        # Job-related components
│       │   ├── profile/     # User profile components
│       │   ├── dashboard/   # Dashboard components
│       │   └── landing/     # Landing page components
│       ├── pages/           # Page components
│       ├── hooks/           # Custom React hooks
│       ├── context/         # React context providers
│       ├── services/        # API services
│       ├── utils/           # Utility functions
│       ├── translations/    # i18n translations
│       └── styles/          # CSS styles
│   └── package.json
│
├── docker/                   # Docker configuration
├── scripts/                  # Utility scripts
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB >= 5.0
- Redis >= 6.0 (optional, for queues)
- Google Gemini API key

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/project-5-resume-parser.git
cd project-5-resume-parser
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# Add your MongoDB URI, Gemini API key, etc.

# Start development server
npm run dev
```

#### 3. Frontend Setup
```bash
cd frontend
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

#### 4. Database Setup
```bash
# Ensure MongoDB is running
# Seed initial job data (optional)
cd backend
npm run db:seed
```

#### 5. Access the application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs (development only)

## 🔧 Environment Variables

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/resume_parser

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@resumeparser.et

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Contact Email
CONTACT_EMAIL=contact@resumeparser.et
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GA_ID=your-google-analytics-id
```

## 📚 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/google` | Google OAuth login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Update password |
| POST | `/api/auth/forgot-password` | Request password reset |
| PUT | `/api/auth/reset-password/:token` | Reset password |
| POST | `/api/auth/logout` | Logout user |

### Resume Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes/upload` | Upload and parse resume |
| GET | `/api/resumes` | Get user's resumes |
| GET | `/api/resumes/:id` | Get resume by ID |
| DELETE | `/api/resumes/:id` | Delete resume |
| POST | `/api/resumes/:id/analyze-gap/:jobId` | Analyze skill gap |

### Job Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | Get jobs with filters |
| GET | `/api/jobs/:id` | Get job by ID |
| GET | `/api/jobs/recommended` | Get recommended jobs |
| POST | `/api/jobs` | Create job (admin) |
| PUT | `/api/jobs/:id` | Update job (admin) |
| DELETE | `/api/jobs/:id` | Delete job (admin) |

### User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| GET | `/api/users/resumes` | Get user's resumes |
| GET | `/api/users/saved-jobs` | Get saved jobs |
| POST | `/api/users/saved-jobs/:jobId` | Save job |
| PUT | `/api/users/saved-jobs/:jobId` | Update saved job |
| DELETE | `/api/users/saved-jobs/:jobId` | Remove saved job |
| GET | `/api/users/stats` | Get user statistics |
| PUT | `/api/users/preferences` | Update preferences |
| DELETE | `/api/users/account` | Delete account |

## 💾 Database Schema

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  authProvider: String,
  googleId: String,
  savedJobs: [ObjectId],
  resumes: [ObjectId],
  preferences: {
    language: String,
    darkMode: Boolean,
    emailNotifications: Boolean,
    jobAlerts: Boolean
  },
  createdAt: Date
}
```

### Resume Model
```javascript
{
  userId: ObjectId,
  fileName: String,
  parsedData: {
    name: String,
    email: String,
    phone: String,
    education: [{
      degree: String,
      institution: String,
      graduationYear: Number
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
      responsibilities: [String],
      achievements: [String]
    }],
    languages: [String]
  },
  analysis: {
    score: Number,
    feedback: [{
      category: String,
      message: String,
      suggestion: String,
      severity: String
    }],
    strengths: [String],
    weaknesses: [String]
  },
  matchedJobs: [{
    jobId: ObjectId,
    matchScore: Number,
    matchedSkills: [String],
    missingSkills: [String]
  }],
  createdAt: Date
}
```

### Job Model
```javascript
{
  title: String,
  company: String,
  location: String,
  description: String,
  requiredSkills: [{
    name: String,
    importance: String
  }],
  preferredSkills: [String],
  jobType: String,
  experienceLevel: String,
  salary: {
    min: Number,
    max: Number,
    currency: String,
    period: String
  },
  applicationUrl: String,
  postedDate: Date,
  expiryDate: Date,
  isActive: Boolean,
  source: String
}
```

## 🔑 Key Features in Detail

### 1. AI-Powered Resume Parsing
- Uses Google Gemini AI to extract structured information from PDF resumes
- Identifies education, work experience, skills, and languages
- Distinguishes between hard skills and soft skills
- Handles Ethiopian-specific content (institutions, locations)

### 2. Bilingual Support
- Full Amharic and English translations
- UI language toggle
- AI responses in selected language
- Amharic font support (Noto Sans Ethiopic)

### 3. Job Matching Algorithm
- Skill-based matching with weighted scoring
- Experience level consideration
- Location-based filtering
- Match percentage calculation
- Visual representation of matched and missing skills

### 4. Skill Gap Analysis
- Compares resume skills with job requirements
- Identifies missing required skills
- Suggests learning resources
- Provides actionable recommendations

### 5. Resume Scoring
- Comprehensive scoring algorithm
- Category-based evaluation
- Actionable improvement tips
- Visual score gauge

### 6. User Dashboard
- Profile management
- Resume history
- Saved jobs tracking
- Application status tracking
- Analytics and insights

### 7. Background Jobs
- Email notifications (welcome, password reset, job matches)
- Automated job matching
- Deadline reminders
- Weekly job recommendations

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Email**: eyobbegashaw@gmail.com
- **Website**: https://eyobbegashaw.vercel.app
- **GitHub**: [@eyobbegashaw](https://github.com/eyobbegashaw)
 

## 🙏 Acknowledgments

- Google Gemini AI for powerful language models
- Ethiopian job portals for job data
- Beta testers from Ethiopian universities
- Open source community for amazing tools

---

**Built with ❤️ for Ethiopian graduates and job seekers**
```
