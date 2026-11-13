process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const database = require('../src/config/database');
const User = require('../src/models/User');
const Resume = require('../src/models/Resume');
const Job = require('../src/models/Job');
const aiParser = require('../src/services/aiParser');
const pdfParser = require('../src/services/pdfParser');
const jobMatcher = require('../src/services/jobMatcher');
const scraperService = require('../src/services/scraperService');
const emailService = require('../src/services/emailService');
const Helpers = require('../src/utils/helpers');
const translator = require('../src/utils/translators');
const Validators = require('../src/utils/validators');
const { customValidators } = require('../src/middleware/validation');

describe('Database, Models, Services & Utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database (MongoDB Atlas readiness)', () => {
    test('throws clear error when MONGODB_URI is missing', async () => {
      const prevUri = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;
      await expect(database.connect()).rejects.toThrow(/MONGODB_URI/i);
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
    });

    test('throws clear error when MONGODB_URI contains unreplaced template placeholders', async () => {
      const prevUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://<db_username>:secret@ac-shard-00-00.mongodb.net:27017/?ssl=true';
      await expect(database.connect()).rejects.toThrow(/<db_username>|placeholder/i);
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
      else delete process.env.MONGODB_URI;
    });

    test('connects using Atlas-compatible options without deprecated flags', async () => {
      const prevUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster0.mongodb.net/resume_parser?retryWrites=true&w=majority';

      const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue({
        connection: { host: 'cluster0.mongodb.net', name: 'resume_parser' }
      });

      await database.connect();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      const [uri, options] = connectSpy.mock.calls[0];
      expect(uri).toMatch(/^mongodb\+srv:\/\//);
      expect(options.useNewUrlParser).toBeUndefined();
      expect(options.useUnifiedTopology).toBeUndefined();
      expect(options.autoIndex).toBe(true);
      expect(options.serverSelectionTimeoutMS).toBeGreaterThanOrEqual(10000);

      database.isConnected = false;
      if (prevUri !== undefined) process.env.MONGODB_URI = prevUri;
      else delete process.env.MONGODB_URI;
    });
  });

  describe('User & Resume Models', () => {
    test('User schema supports Google OAuth without password, modern emails, and extended fields', () => {
      const googleUser = new User({
        name: 'Abebe Kebede',
        email: 'abebe+jobs@example.academy',
        authProvider: 'google',
        googleId: '12345',
        role: 'admin',
        phone: '+251911223344',
        bio: 'Software engineer',
        skills: ['Node.js'],
        preferences: { language: 'am', darkMode: true, emailNotifications: false, jobAlerts: true }
      });

      const validationErr = googleUser.validateSync();
      expect(validationErr).toBeUndefined();
      expect(googleUser.role).toBe('admin');
      expect(googleUser.preferences.emailNotifications).toBe(false);
    });

    test('User.matchPassword safely returns false when password is absent', async () => {
      const googleUser = new User({
        name: 'Sara',
        email: 'sara@example.com',
        authProvider: 'google'
      });
      await expect(googleUser.matchPassword('secret123')).resolves.toBe(false);
    });

    test('Resume pre-save populates skills.all cleanly without duplicates', async () => {
      const resume = new Resume({
        userId: new mongoose.Types.ObjectId(),
        fileName: 'cv.pdf',
        parsedData: {
          skills: {
            hard: ['JavaScript', 'Node.js'],
            soft: ['Communication', 'javascript']
          }
        }
      });

      await new Promise((resolve, reject) => {
        resume.schema.s.hooks.execPre('save', resume, [], (err) => (err ? reject(err) : resolve()));
      });

      expect(resume.parsedData.skills.all).toEqual(['JavaScript', 'Node.js', 'Communication']);
    });
  });

  describe('AIParserService & PDFParserService', () => {
    test('parseAIResponse handles fenced JSON and trailing text', () => {
      const raw = 'Here is the extracted data:\n```json\n{"name":"Dawit","skills":{"hard":["Python"],"soft":["Teamwork"]}}\n```\nHope this helps!';
      const parsed = aiParser.parseAIResponse(raw);
      expect(parsed.name).toBe('Dawit');
      expect(parsed.skills.hard).toEqual(['Python']);
    });

    test('normalizeParsedResume handles non-numeric graduationYear and populates skills.all', () => {
      const normalized = aiParser.normalizeParsedResume({
        name: 'Hanna Tesfaye',
        education: [
          { degree: 'BSc', institution: 'AAU', graduationYear: '2022', field: 'CS' },
          { degree: 'MSc', institution: 'AASTU', graduationYear: 'Present', field: 'AI' }
        ],
        skills: {
          hard: ['React', 'TypeScript'],
          soft: ['Leadership', 'react']
        },
        languages: ['Amharic', { name: 'English', proficiency: 'Fluent' }]
      });

      expect(normalized.education[0].graduationYear).toBe(2022);
      expect(normalized.education[1].graduationYear).toBeUndefined();
      expect(normalized.skills.all).toEqual(['React', 'TypeScript', 'Leadership']);
      expect(normalized.languages).toEqual([
        { name: 'Amharic', proficiency: 'Unknown' },
        { name: 'English', proficiency: 'Fluent' }
      ]);
    });

    test('buildAnalysisPrompt includes Amharic instruction when language is am', () => {
      const prompt = aiParser.buildAnalysisPrompt({ name: 'Test' }, 'am');
      expect(prompt).toContain('በአማርኛ');
    });

    test('PDFParserService.cleanText preserves newlines for extractBasicInfo', () => {
      const cleaned = pdfParser.cleanText('Abebe Bikila\r\naddis@example.com\r\n+251911223344');
      const info = pdfParser.extractBasicInfo(cleaned);
      expect(info.possibleName).toBe('Abebe Bikila');
      expect(info.emails).toEqual(['addis@example.com']);
      expect(info.phones).toEqual(['+251911223344']);
    });

    test('fallbackParseResume extracts Ethiopian resume details (AAU, Bole, React, Node.js, Amharic)', () => {
      const sampleText = `
        Dawit Bekele
        dawit.dev@example.com
        +251911223344
        Addis Ababa, Ethiopia

        Professional Summary
        Senior Full Stack Developer with 4 years building fintech and telebirr integrations.

        Education
        Bachelor of Science (BSc) in Software Engineering
        Addis Ababa University (AAU), 2021

        Experience
        Senior Software Engineer
        Commercial Bank of Ethiopia (CBE)
        2021 - Present
        - Built microservices and payment workflows

        Skills
        React, Node.js, TypeScript, MongoDB, Docker, Telebirr, Communication, Problem Solving

        Languages
        English, Amharic
      `;

      const parsed = aiParser.fallbackParseResume(sampleText, 'en');
      expect(parsed.name).toBe('Dawit Bekele');
      expect(parsed.email).toBe('dawit.dev@example.com');
      expect(parsed.phone).toBe('+251911223344');
      expect(parsed.location).toBe('Addis Ababa, Ethiopia');
      expect(parsed.education).toHaveLength(1);
      expect(parsed.education[0].institution).toContain('Addis Ababa University');
      expect(parsed.education[0].graduationYear).toBe(2021);
      expect(parsed.skills.hard).toContain('React');
      expect(parsed.skills.hard).toContain('Node.js');
      expect(parsed.skills.hard).toContain('Telebirr');
      expect(parsed.skills.soft).toContain('Problem Solving');
      expect(parsed.skills.all).toContain('React');
      expect(parsed.languages.map(l => l.name)).toEqual(expect.arrayContaining(['Amharic', 'English']));
    });

    test('fallbackAnalyzeResume generates bilingual ATS feedback in English and Amharic', () => {
      const sampleData = {
        name: 'Sara Tesfaye',
        email: 'sara@example.com',
        phone: '+251922334455',
        location: 'Hawassa, Ethiopia',
        education: [{ degree: 'BSc', institution: 'Hawassa University', graduationYear: 2022 }],
        skills: { hard: ['Python', 'Django', 'PostgreSQL'], soft: ['Teamwork'], all: ['Python', 'Django', 'PostgreSQL', 'Teamwork'] },
        experience: [{ role: 'Backend Developer', company: 'Tech', duration: '2022 - Present' }]
      };

      const enAnalysis = aiParser.fallbackAnalyzeResume(sampleData, 'en');
      expect(enAnalysis.score).toBeGreaterThanOrEqual(60);
      expect(enAnalysis.strengths.length).toBeGreaterThan(0);
      expect(enAnalysis.feedback.length).toBeGreaterThan(0);
      expect(enAnalysis.feedback[0]).toHaveProperty('category');

      const amAnalysis = aiParser.fallbackAnalyzeResume(sampleData, 'am');
      expect(amAnalysis.score).toBe(enAnalysis.score);
      expect(amAnalysis.strengths[0]).toMatch(/[\u1200-\u137F]/);
    });

    test('fallbackAnalyzeSkillGap computes matches and missing requirements', () => {
      const targetJob = {
        requiredSkills: [{ name: 'React' }, { name: 'Node.js' }, { name: 'MongoDB' }],
        preferredSkills: [{ name: 'Docker' }]
      };
      const resumeSkills = { hard: ['React', 'Node.js'], soft: [] };

      const gap = aiParser.fallbackAnalyzeSkillGap(resumeSkills, targetJob, 'en');
      expect(gap.matchedSkills).toEqual(['React', 'Node.js']);
      expect(gap.missingRequired).toEqual(['MongoDB']);
      expect(gap.missingPreferred).toEqual(['Docker']);
      expect(gap.recommendations.length).toBeGreaterThan(0);
    });

    test('parseResume and analyzeResume gracefully fallback when Gemini throws (e.g. 404 or network)', async () => {
      jest.spyOn(aiParser, 'hasApiKey').mockReturnValue(true);
      jest.spyOn(aiParser, 'getModel').mockReturnValue({
        generateContent: jest.fn().mockRejectedValue(new Error('[GoogleGenerativeAI Error]: [404 Not Found]'))
      });

      const parsed = await aiParser.parseResume('Abebe Kebede\nabebe@example.com\n+251911000000\nSoftware Engineer\nPython, React');
      expect(parsed.name).toBe('Abebe Kebede');
      expect(parsed.email).toBe('abebe@example.com');
      expect(parsed.skills.all).toContain('Python');

      const analysis = await aiParser.analyzeResume(parsed, 'en');
      expect(analysis.score).toBeGreaterThanOrEqual(40);
      expect(analysis.strengths.length).toBeGreaterThan(0);
    });

    test('fallbackParseResume leaves missing fields as undefined/empty without hardcoded placeholder data', () => {
      const minimalText = 'Abebe Kebede\nabebe@example.com\nPython, Docker';
      const parsed = aiParser.fallbackParseResume(minimalText, 'en');

      expect(parsed.name).toBe('Abebe Kebede');
      expect(parsed.email).toBe('abebe@example.com');
      expect(parsed.phone).toBeUndefined();
      expect(parsed.location).toBeUndefined();
      expect(parsed.summary).toBeUndefined();
      expect(parsed.education).toEqual([]);
      expect(parsed.experience).toEqual([]);
      expect(parsed.skills.all).toEqual(['Python', 'Docker']);
      expect(JSON.stringify(parsed)).not.toContain('Enterprise Technology Solutions');
      expect(JSON.stringify(parsed)).not.toContain('Digital Services');
      expect(JSON.stringify(parsed)).not.toContain('Addis Ababa, Ethiopia');
    });
  });

  describe('JobMatcherService, ScraperService & EmailService', () => {
    test('JobMatcherService parses year ranges and combined durations', () => {
      expect(jobMatcher.parseDuration('2020-2022')).toBe(2);
      expect(jobMatcher.parseDuration('1 year 6 months')).toBeCloseTo(1.5);
    });

    test('JobMatcherService.findMatchingJobs includes jobs without expiryDate and handles null fields', async () => {
      const findSpy = jest.spyOn(Job, 'find').mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            title: 'Junior Dev',
            experienceLevel: 'Entry Level',
            requiredSkills: [{ name: 'JavaScript' }, { name: 'Node.js' }]
          }
        ])
      });

      const matches = await jobMatcher.findMatchingJobs({
        skills: { hard: ['JavaScript'], soft: null },
        experience: null
      });

      expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
        $or: expect.any(Array)
      }));
      expect(matches).toHaveLength(1);
      expect(matches[0].matchScore).toBe(65); // 50% skill match + 15 entry level boost
      expect(matches[0].matchedSkills).toEqual(['JavaScript']);
      expect(matches[0].missingSkills).toEqual(['Node.js']);
    });

    test('ScraperService extracts Job-compatible skills without false substring matches and multi-comma salaries', () => {
      const skills = scraperService.extractSkills('Looking for JavaScript and C++ developers');
      expect(skills).toEqual([
        { name: 'JavaScript', importance: 'required' },
        { name: 'C++', importance: 'required' }
      ]);

      const salary = scraperService.extractSalary('15,000 - 1,250,000 ETB');
      expect(salary).toEqual({ min: 15000, max: 1250000, currency: 'ETB', period: 'monthly' });
    });

    test('EmailService omits undefined salary range and escapes HTML', () => {
      const service = emailService;
      const html = service.escapeHtml('<script>alert(1)</script>');
      expect(html).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(service.renderTemplate('Hi {{name}}, {{name}}', { name: 'Kebede' })).toBe('Hi Kebede, Kebede');
    });
  });

  describe('Utils & Validation', () => {
    test('customValidators.isPDF works without ReferenceError', () => {
      expect(customValidators.isPDF('resume.PDF')).toBe(true);
      expect(customValidators.isPDF('resume.docx')).toBe(false);
    });

    test('Helpers.deepMerge preserves arrays/Dates and stringToColor is non-negative', () => {
      const merged = Helpers.deepMerge(
        { tags: ['a'], nested: { x: 1 } },
        { tags: ['b'], nested: { y: 2 } }
      );
      expect(merged.tags).toEqual(['b']);
      expect(merged.nested).toEqual({ x: 1, y: 2 });

      expect(Helpers.stringToColor('test-string')).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
      expect(Helpers.highlightText('Learn C++ today', 'C++')).toBe(
        'Learn <span class="highlight">C++</span> today'
      );
    });

    test('Translator.t supports request-scoped language without mutating global state', () => {
      translator.setLanguage('en');
      expect(translator.t('days_ago', { days: 3 }, 'am')).toBe('ከ3 ቀናት በፊት');
      expect(translator.language).toBe('en');
    });

    test('Validators safely reject invalid types', () => {
      expect(Validators.isEmail(null)).toBe(false);
      expect(Validators.isValidGraduationYear('Present')).toBe(false);
      expect(Validators.isValidGraduationYear(2023)).toBe(true);
      expect(Validators.isValidAge('invalid-date')).toBe(false);
    });
  });
});
