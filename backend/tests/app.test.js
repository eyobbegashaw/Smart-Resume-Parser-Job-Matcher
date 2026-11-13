process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
delete process.env.GEMINI_API_KEY;

const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/server');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Resume = require('../src/models/Resume');
const SavedJob = require('../src/models/SavedJob');

describe('Backend App & Route Integration (mocked DB)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /health returns 200 OK without Redis', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Server is running');
    expect(res.body.redis).toBeUndefined();
  });

  test('Unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Route not found');
  });

  test('Malformed JSON returns 400 instead of 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "bad-json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Protected routes reject unauthenticated requests with 401', async () => {
    const endpoints = [
      ['get', '/api/auth/me'],
      ['get', '/api/users/profile'],
      ['get', '/api/users/stats'],
      ['get', '/api/resumes'],
      ['get', '/api/jobs/recommended']
    ];

    for (const [method, endpoint] of endpoints) {
      const res = await request(app)[method](endpoint);
      expect(res.status).toBe(401);
    }
  });

  test('POST /api/jobs enforces admin role via User.role', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: userId,
        id: userId,
        role: 'user',
        status: 'active'
      })
    });

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Job' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/auth/preferences works via mounted userController.updatePreferences', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    const mockUser = {
      _id: userId,
      id: userId,
      role: 'user',
      status: 'active',
      preferences: {
        language: 'en',
        darkMode: false,
        emailNotifications: true,
        jobAlerts: true,
        toObject() {
          return {
            language: this.language,
            darkMode: this.darkMode,
            emailNotifications: this.emailNotifications,
            jobAlerts: this.jobAlerts
          };
        }
      },
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(User, 'findById')
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(mockUser) })
      .mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .put('/api/auth/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ language: 'am', darkMode: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.language).toBe('am');
    expect(res.body.data.darkMode).toBe(true);
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });

  test('GET /api/users/stats executes aggregation using valid ObjectId', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });
    jest.spyOn(Resume, 'aggregate')
      .mockResolvedValueOnce([{ totalResumes: 2, averageScore: 80, highestScore: 90 }])
      .mockResolvedValueOnce([{ _id: 'JavaScript', count: 2 }]);
    jest.spyOn(Resume, 'countDocuments').mockResolvedValue(1);
    jest.spyOn(SavedJob, 'aggregate').mockResolvedValueOnce([{ _id: 'saved', count: 3 }]);

    const res = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resumes.totalResumes).toBe(2);
    expect(res.body.data.dailyQuota.limit).toBe(5);
    expect(res.body.data.dailyQuota.used).toBe(1);
    expect(res.body.data.dailyQuota.remaining).toBe(4);
    expect(res.body.data.applications.saved).toBe(3);
    expect(res.body.data.topSkills).toEqual([{ name: 'JavaScript', count: 2 }]);
  });

  test('GET /api/jobs/recommended safely filters out deleted (null) matched jobs', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });

    const validJobDoc = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Backend Developer',
      isActive: true,
      toObject() {
        return { _id: this._id, title: this.title, isActive: this.isActive };
      }
    };

    const mockResume = {
      matchedJobs: [
        { jobId: null, matchScore: 95, matchedSkills: ['Node.js'], missingSkills: [] },
        { jobId: validJobDoc, matchScore: 80, matchedSkills: ['JavaScript'], missingSkills: ['Docker'] }
      ],
      populate: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(Resume, 'findOne').mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockResume)
    });

    const res = await request(app)
      .get('/api/jobs/recommended')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Backend Developer');
    expect(res.body.data[0].matchScore).toBe(80);
  });

  test('GET /api/jobs escapes special regex characters in location/company filters', async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue([])
    };
    jest.spyOn(Job, 'find').mockReturnValue(findChain);
    jest.spyOn(Job, 'countDocuments').mockResolvedValue(0);

    const res = await request(app).get('/api/jobs?location=Addis+(Bole)&company=C%2B%2B');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/resumes/upload rejects non-PDF uploads with 400 via handleMulterError', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });

    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('not a pdf'), {
        filename: 'resume.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/Only PDF files are allowed/i);
  });

  test('POST /api/resumes/upload successfully parses resume and returns 200 even without external AI', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    const pdfParser = require('../src/services/pdfParser');
    const jobMatcher = require('../src/services/jobMatcher');

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });
    jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue({});
    jest.spyOn(Resume, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(jobMatcher, 'findMatchingJobs').mockResolvedValue([]);

    jest.spyOn(pdfParser, 'extractText').mockResolvedValue({
      text: 'Dawit Bekele\ndawit@example.com\n+251911223344\nAddis Ababa\nSoftware Engineer\nReact, Node.js, MongoDB\nAAU BSc 2021\nEnglish, Amharic'
    });

    const mockResume = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      fileName: 'my_resume.pdf',
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Resume, 'create').mockResolvedValue(mockResume);

    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('%PDF-1.4 mock pdf content'), {
        filename: 'my_resume.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.parsedData.name).toBe('Dawit Bekele');
    expect(res.body.data.parsedData.email).toBe('dawit@example.com');
    expect(res.body.data.parsedData.skills.all).toContain('React');
    expect(res.body.data.analysis.score).toBeGreaterThan(0);
    expect(res.body.data.message).toBe('Resume parsed successfully');
    expect(res.body.data.dailyQuota).toEqual(expect.objectContaining({
      limit: 5,
      used: 1,
      remaining: 4
    }));
  });

  test('GET /api/resumes/daily-quota returns current daily quota usage and limit', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });
    jest.spyOn(Resume, 'countDocuments').mockResolvedValue(2);

    const res = await request(app)
      .get('/api/resumes/daily-quota')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(expect.objectContaining({
      limit: 5,
      used: 2,
      remaining: 3
    }));
    expect(res.body.data.resetsAt).toBeDefined();
  });

  test('POST /api/resumes/upload blocks with 429 when daily upload quota of 5 is exceeded', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: userId, id: userId, role: 'user', status: 'active' })
    });
    jest.spyOn(Resume, 'countDocuments').mockResolvedValue(5);

    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('%PDF-1.4 mock pdf content'), {
        filename: 'my_resume.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/limit/i);
    expect(res.body.dailyQuota).toEqual(expect.objectContaining({
      limit: 5,
      used: 5,
      remaining: 0
    }));
  });

  test('rateLimiter and background queues operate in-process without Redis', async () => {
    const rateLimiter = require('../src/middleware/rateLimiter');
    const {
      addEmailJob,
      scheduleRecurringEmails,
      stopScheduledEmails
    } = require('../src/jobs/emailQueue');
    const {
      addMatchingJob,
      scheduleMatching,
      stopScheduledMatching
    } = require('../src/jobs/matchingQueue');

    expect(typeof rateLimiter.apiLimiter).toBe('function');
    expect(typeof rateLimiter.createRateLimiter({ prefix: 'custom:', max: 10 })).toBe('function');

    const emailJob = await addEmailJob('monthly-newsletter', {});
    const emailResult = await emailJob.finished();
    expect(emailResult.success).toBe(true);
    expect(emailResult.skipped).toBe(true);

    const matchingJob = await addMatchingJob('unknown-test-type', {});
    const matchingResult = await matchingJob.finished();
    expect(matchingResult.success).toBe(false);

    await scheduleRecurringEmails({ scheduled: false });
    await scheduleMatching({ scheduled: false });
    stopScheduledEmails();
    stopScheduledMatching();
  });
});
