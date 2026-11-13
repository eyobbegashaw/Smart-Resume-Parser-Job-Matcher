const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

// Technical / Hard skills dictionary
const TECH_SKILLS = [
  // Programming & Scripting
  { name: 'JavaScript', regex: /\b(?:javascript|js)\b/i },
  { name: 'TypeScript', regex: /\b(?:typescript|ts)\b/i },
  { name: 'Python', regex: /\bpython(?:3)?\b/i },
  { name: 'Java', regex: /\bjava\b(?!script)/i },
  { name: 'C++', regex: /(?:\bc\+\+|\bcpp\b)/i },
  { name: 'C#', regex: /(?:\bc#|\bcsharp\b)/i },
  { name: '.NET', regex: /(?:\.net(?:\s*core)?|\bdotnet\b)/i },
  { name: 'Go', regex: /\b(?:golang|go\s+programming)\b/i },
  { name: 'Rust', regex: /\brust\b/i },
  { name: 'PHP', regex: /\bphp\b/i },
  { name: 'Ruby', regex: /\bruby\b/i },
  { name: 'Swift', regex: /\bswift\b/i },
  { name: 'Kotlin', regex: /\bkotlin\b/i },
  { name: 'Dart', regex: /\bdart\b/i },
  { name: 'SQL', regex: /\bsql\b/i },
  { name: 'HTML5', regex: /\bhtml5?\b/i },
  { name: 'CSS3', regex: /\bcss3?\b/i },
  { name: 'Bash', regex: /\b(?:bash|shell\s*script(?:ing)?)\b/i },

  // Frameworks & Libraries
  { name: 'React', regex: /\breact(?:\.js)?\b/i },
  { name: 'Next.js', regex: /\bnext(?:\.js)?\b/i },
  { name: 'Vue.js', regex: /\bvue(?:\.js)?\b/i },
  { name: 'Angular', regex: /\bangular(?:\.js)?\b/i },
  { name: 'Node.js', regex: /\bnode(?:\.js)?\b/i },
  { name: 'Express.js', regex: /\bexpress(?:\.js)?\b/i },
  { name: 'NestJS', regex: /\bnest(?:\.js)?\b/i },
  { name: 'Django', regex: /\bdjango\b/i },
  { name: 'Flask', regex: /\bflask\b/i },
  { name: 'FastAPI', regex: /\bfastapi\b/i },
  { name: 'Spring Boot', regex: /\bspring(?:\s*boot)?\b/i },
  { name: 'Laravel', regex: /\blaravel\b/i },
  { name: 'Flutter', regex: /\bflutter\b/i },
  { name: 'React Native', regex: /\breact[\s-]native\b/i },
  { name: 'Tailwind CSS', regex: /\btailwind(?:\s*css)?\b/i },
  { name: 'Bootstrap', regex: /\bbootstrap\b/i },
  { name: 'Redux', regex: /\bredux\b/i },

  // Databases & Storage
  { name: 'MongoDB', regex: /\bmongodb\b/i },
  { name: 'PostgreSQL', regex: /\b(?:postgresql|postgres)\b/i },
  { name: 'MySQL', regex: /\bmysql\b/i },
  { name: 'Redis', regex: /\bredis\b/i },
  { name: 'SQLite', regex: /\bsqlite\b/i },
  { name: 'Firebase', regex: /\bfirebase\b/i },

  // Cloud & DevOps & Tools
  { name: 'Docker', regex: /\bdocker\b/i },
  { name: 'Kubernetes', regex: /\b(?:kubernetes|k8s)\b/i },
  { name: 'AWS', regex: /\b(?:aws|amazon\s+web\s+services)\b/i },
  { name: 'Google Cloud', regex: /\b(?:gcp|google\s+cloud)\b/i },
  { name: 'Azure', regex: /\b(?:azure|microsoft\s+azure)\b/i },
  { name: 'Git', regex: /\bgit(?:hub|lab)?\b/i },
  { name: 'Linux', regex: /\b(?:linux|ubuntu|debian|centos)\b/i },
  { name: 'CI/CD', regex: /\bci[\s/]?cd\b/i },
  { name: 'REST API', regex: /\b(?:rest(?:\s*api)?|restful)\b/i },
  { name: 'GraphQL', regex: /\bgraphql\b/i },
  { name: 'Microservices', regex: /\bmicroservices?\b/i },

  // Data & Machine Learning
  { name: 'Machine Learning', regex: /\bmachine\s+learning\b/i },
  { name: 'Deep Learning', regex: /\bdeep\s+learning\b/i },
  { name: 'TensorFlow', regex: /\btensorflow\b/i },
  { name: 'PyTorch', regex: /\bpytorch\b/i },
  { name: 'Pandas', regex: /\bpandas\b/i },

  // Fintech & Telecom integrations
  { name: 'Telebirr', regex: /\btelebirr\b/i },
  { name: 'CBE Birr', regex: /\bcbe\s*birr\b/i },
  { name: 'Chapa', regex: /\bchapa\b/i },
  { name: 'SantimPay', regex: /\bsantim\s*pay\b/i },
  { name: 'ArifPay', regex: /\barif\s*pay\b/i }
];

// Soft skills dictionary
const SOFT_SKILLS = [
  { name: 'Communication', regex: /\bcommunication\b/i },
  { name: 'Teamwork', regex: /\bteam(?:work|\s*player)\b/i },
  { name: 'Leadership', regex: /\bleadership\b/i },
  { name: 'Problem Solving', regex: /\bproblem[\s-]solving\b/i },
  { name: 'Critical Thinking', regex: /\bcritical\s+thinking\b/i },
  { name: 'Time Management', regex: /\btime\s+management\b/i },
  { name: 'Adaptability', regex: /\badaptab(?:ility|le)\b/i },
  { name: 'Collaboration', regex: /\bcollaborat(?:ion|ive)\b/i },
  { name: 'Project Management', regex: /\bproject\s+management\b/i },
  { name: 'Attention to Detail', regex: /\battention\s+to\s+detail\b/i },
  { name: 'Fast Learner', regex: /\b(?:fast|quick)\s+learner\b/i },
  { name: 'Agile & Scrum', regex: /\b(?:agile|scrum)\b/i }
];

// Ethiopian & Regional Academic Institutions
const ETHIOPIAN_INSTITUTIONS = [
  { name: 'Addis Ababa University (AAU)', regex: /\b(?:addis\s+ababa\s+university|aau|አዲስ\s*አበባ\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Addis Ababa Science and Technology University (AASTU)', regex: /\b(?:addis\s+ababa\s+science\s+and\s+technology\s+university|aastu|አአሳይቴክ)\b/i },
  { name: 'Adama Science and Technology University (ASTU)', regex: /\b(?:adama\s+science\s+and\s+technology\s+university|astu)\b/i },
  { name: 'Jimma University (JU)', regex: /\b(?:jimma\s+university|ju|ጅማ\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Hawassa University (HU)', regex: /\b(?:hawassa\s+university|hu|ሐዋሳ\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Bahir Dar University (BDU)', regex: /\b(?:bahir\s+dar\s+university|bdu|ባህር\s*ዳር\s*ዩኒቨርሲቲ)\b/i },
  { name: 'University of Gondar (UoG)', regex: /\b(?:university\s+of\s+gondar|gondar\s+university|ጎንደር\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Haramaya University', regex: /\b(?:haramaya\s+university|ሐረማያ\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Mekelle University', regex: /\b(?:mekelle\s+university|መቐለ\s*ዩኒቨርሲቲ)\b/i },
  { name: 'Arba Minch University', regex: /\barba\s+minch\s+university\b/i },
  { name: 'Dilla University', regex: /\bdilla\s+university\b/i },
  { name: 'Debre Berhan University', regex: /\bdebre\s+berhan\s+university\b/i },
  { name: 'Debre Markos University', regex: /\bdebre\s+markos\s+university\b/i },
  { name: 'Wolaita Sodo University', regex: /\bwolaita\s+sodo\s+university\b/i },
  { name: 'Wollo University', regex: /\bwollo\s+university\b/i },
  { name: 'ALX Africa', regex: /\b(?:alx(?:\s+africa)?|holberton)\b/i },
  { name: 'HilCoE School of Computer Science', regex: /\bhilcoe\b/i },
  { name: 'Unity University', regex: /\bunity\s+university\b/i },
  { name: 'St. Mary\'s University', regex: /\bst\.?\s*mary(?:'s)?\s+university\b/i },
  { name: 'Rift Valley University', regex: /\brift\s+valley\s+university\b/i }
];

const DEGREE_PATTERNS = [
  { degree: 'Doctor of Philosophy (PhD)', regex: /\b(?:ph\.?d|doctor\s+of\s+philosophy|ዶክትሬት)\b/i },
  { degree: 'Master of Science (MSc)', regex: /\b(?:m\.?sc|master\s+of\s+science|የማስተርስ\s*ዲግሪ|የሁለተኛ\s*ዲግሪ)\b/i },
  { degree: 'Master of Arts (MA)', regex: /\b(?:m\.?a\b|master\s+of\s+arts)\b/i },
  { degree: 'Master of Business Administration (MBA)', regex: /\bm\.?b\.?a\b/i },
  { degree: 'Bachelor of Science (BSc)', regex: /\b(?:b\.?sc|bachelor\s+of\s+science|የመጀመሪያ\s*ዲግሪ)\b/i },
  { degree: 'Bachelor of Arts (BA)', regex: /\b(?:b\.?a\b|bachelor\s+of\s+arts)\b/i },
  { degree: 'Bachelor Degree', regex: /\bbachelor(?:'s)?\b/i },
  { degree: 'Diploma', regex: /\b(?:diploma|ዲፕሎማ)\b/i },
  { degree: 'Certificate', regex: /\b(?:certificate|certification|ሰርተፊኬት)\b/i }
];

const FIELD_PATTERNS = [
  { field: 'Computer Science', regex: /\bcomputer\s+science\b/i },
  { field: 'Software Engineering', regex: /\bsoftware\s+engineering\b/i },
  { field: 'Information Technology', regex: /\binformation\s+technology\b/i },
  { field: 'Information Systems', regex: /\binformation\s+systems\b/i },
  { field: 'Electrical and Computer Engineering', regex: /\belectrical(?:\s+and\s+computer)?\s+engineering\b/i },
  { field: 'Data Science', regex: /\bdata\s+science\b/i },
  { field: 'Civil Engineering', regex: /\bcivil\s+engineering\b/i },
  { field: 'Mechanical Engineering', regex: /\bmechanical\s+engineering\b/i },
  { field: 'Accounting and Finance', regex: /\b(?:accounting|finance)\b/i },
  { field: 'Business Administration', regex: /\bbusiness\s+administration\b/i },
  { field: 'Economics', regex: /\beconomics\b/i },
  { field: 'Management', regex: /\bmanagement\b/i }
];

const COMMON_ROLES = [
  { title: 'Senior Full Stack Developer', regex: /\bsenior\s+full[\s-]stack\s+developer\b/i },
  { title: 'Full Stack Developer', regex: /\bfull[\s-]stack\s+developer\b/i },
  { title: 'Senior Frontend Developer', regex: /\bsenior\s+front[\s-]end\s+developer\b/i },
  { title: 'Frontend Developer', regex: /\bfront[\s-]end\s+developer\b/i },
  { title: 'Senior Backend Developer', regex: /\bsenior\s+back[\s-]end\s+developer\b/i },
  { title: 'Backend Developer', regex: /\bback[\s-]end\s+developer\b/i },
  { title: 'Senior Software Engineer', regex: /\bsenior\s+software\s+engineer\b/i },
  { title: 'Software Engineer', regex: /\bsoftware\s+engineer\b/i },
  { title: 'Junior Software Engineer', regex: /\bjunior\s+software\s+engineer\b/i },
  { title: 'Mobile Developer', regex: /\bmobile(?:\s+application)?\s+developer\b/i },
  { title: 'DevOps Engineer', regex: /\bdevops\s+engineer\b/i },
  { title: 'Cloud Engineer', regex: /\bcloud\s+engineer\b/i },
  { title: 'Data Analyst', regex: /\bdata\s+analyst\b/i },
  { title: 'Data Scientist', regex: /\bdata\s+scientist\b/i },
  { title: 'QA Engineer', regex: /\b(?:qa|quality\s+assurance)\s+engineer\b/i },
  { title: 'UI/UX Designer', regex: /\bui[\s/]?ux\s+designer\b/i },
  { title: 'Project Manager', regex: /\bproject\s+manager\b/i },
  { title: 'IT Specialist', regex: /\bit\s+specialist\b/i },
  { title: 'Software Engineering Intern', regex: /\b(?:software|engineering)?\s*intern\b/i }
];

const ETHIOPIAN_COMPANIES = [
  { name: 'Ethio Telecom', regex: /\bethio\s*telecom\b/i },
  { name: 'Safaricom Ethiopia', regex: /\bsafaricom(?:\s+ethiopia)?\b/i },
  { name: 'Commercial Bank of Ethiopia (CBE)', regex: /\b(?:commercial\s+bank\s+of\s+ethiopia|cbe)\b/i },
  { name: 'Dashen Bank', regex: /\bdashen\s+bank\b/i },
  { name: 'Awash Bank', regex: /\bawash\s+bank\b/i },
  { name: 'Bank of Abyssinia', regex: /\bbank\s+of\s+abyssinia\b/i },
  { name: 'Gebeya Inc.', regex: /\bgebeya\b/i },
  { name: '1888EC', regex: /\b1888ec\b/i },
  { name: 'Apposit LLC', regex: /\bapposit\b/i },
  { name: 'iCog Labs', regex: /\bicog\s+labs\b/i },
  { name: 'Deliver Addis', regex: /\bdeliver\s+addis\b/i },
  { name: 'Chapa Financial Technologies', regex: /\bchapa\b/i },
  { name: 'SantimPay', regex: /\bsantim\s*pay\b/i },
  { name: 'ArifPay', regex: /\barif\s*pay\b/i },
  { name: 'EagleLion System Technology', regex: /\beagle\s*lion\b/i },
  { name: 'Afriwork', regex: /\bafriwork\b/i },
  { name: 'Ethiopian Airlines', regex: /\bethiopian\s+airlines\b/i },
  { name: 'Ministry of Innovation and Technology (MInT)', regex: /\b(?:ministry\s+of\s+innovation\s+and\s+technology|mint)\b/i },
  { name: 'INSA', regex: /\b(?:insa|information\s+network\s+security\s+administration)\b/i }
];

const ETHIOPIAN_LOCATIONS = [
  { display: 'Addis Ababa, Ethiopia', regex: /\b(?:addis\s+ababa|finfinne|አዲስ\s*አበባ)\b/i },
  { display: 'Hawassa, Ethiopia', regex: /\b(?:hawassa|awassa|ሐዋሳ)\b/i },
  { display: 'Bahir Dar, Ethiopia', regex: /\b(?:bahir\s+dar|ባህር\s*ዳር)\b/i },
  { display: 'Dire Dawa, Ethiopia', regex: /\b(?:dire\s+dawa|ድሬዳዋ)\b/i },
  { display: 'Adama, Ethiopia', regex: /\b(?:adama|nazret|አዳማ)\b/i },
  { display: 'Mekelle, Ethiopia', regex: /\b(?:mekelle|መቐለ)\b/i },
  { display: 'Gondar, Ethiopia', regex: /\b(?:gondar|ጎንደር)\b/i },
  { display: 'Jimma, Ethiopia', regex: /\b(?:jimma|ጅማ)\b/i },
  { display: 'Bishoftu, Ethiopia', regex: /\b(?:bishoftu|debre\s+zeit|ቢሾፍቱ)\b/i },
  { display: 'Dessie, Ethiopia', regex: /\b(?:dessie|ደሴ)\b/i },
  { display: 'Harar, Ethiopia', regex: /\b(?:harar|ሐረር)\b/i }
];

const LANGUAGES_MAP = [
  { name: 'Amharic', regex: /\b(?:amharic|አማርኛ)\b/i, defaultProficiency: 'Native / Bilingual' },
  { name: 'English', regex: /\b(?:english|እንግሊዝኛ)\b/i, defaultProficiency: 'Fluent / Professional' },
  { name: 'Afaan Oromo', regex: /\b(?:afaan\s*oromoo?|oromo|ኦሮምኛ)\b/i, defaultProficiency: 'Fluent' },
  { name: 'Tigrinya', regex: /\b(?:tigrinya|ትግርኛ)\b/i, defaultProficiency: 'Fluent' },
  { name: 'Somali', regex: /\b(?:somali|ሶማሊኛ)\b/i, defaultProficiency: 'Fluent' },
  { name: 'French', regex: /\b(?:french|ፈረንሳይኛ)\b/i, defaultProficiency: 'Intermediate' },
  { name: 'Arabic', regex: /\b(?:arabic|አረብኛ)\b/i, defaultProficiency: 'Intermediate' }
];

class AIParserService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Check whether a usable Gemini API key is configured
   */
  hasApiKey() {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    return Boolean(key && !key.includes('your-gemini-api-key') && key.length > 10);
  }

  /**
   * Lazily initialize Gemini model so requiring this module does not crash when API key is unset
   */
  getModel() {
    if (!this.hasApiKey()) {
      throw new Error('GEMINI_API_KEY is required');
    }

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
    }

    if (!this.model) {
      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    return this.model;
  }

  /**
   * Parse resume text using Gemini AI with fallback
   * @param {string} resumeText - Extracted text from resume
   * @param {string} language - Response language ('en' or 'am')
   * @returns {Promise<Object>} Parsed resume data
   */
  async parseResume(resumeText, language = 'en') {
    const rawText = typeof resumeText === 'string' ? resumeText : '';

    if (this.hasApiKey()) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = this.buildResumePrompt(rawText, language);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          const parsed = this.parseAIResponse(text);
          return this.normalizeParsedResume(parsed);
        }
      } catch (error) {
        logger.warn(
          `AI parsing failed (${error.message || error}); using local parser`
        );
      }
    }

    return this.fallbackParseResume(rawText, language);
  }

  /**
   * Analyze resume and provide score and feedback with fallback
   */
  async analyzeResume(resumeData, language = 'en') {
    const safeData = resumeData && typeof resumeData === 'object' ? resumeData : {};

    if (this.hasApiKey()) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = this.buildAnalysisPrompt(safeData, language);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          return this.parseAnalysisResponse(text);
        }
      } catch (error) {
        logger.warn(
          `AI analysis failed (${error.message || error}); using local analyzer`
        );
      }
    }

    return this.fallbackAnalyzeResume(safeData, language);
  }

  /**
   * Generate skill gap analysis with fallback
   */
  async analyzeSkillGap(resumeSkills, targetJob, language = 'en') {
    if (this.hasApiKey()) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = this.buildSkillGapPrompt(resumeSkills, targetJob, language);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return this.parseAIResponse(response.text());
        }
      } catch (error) {
        logger.warn(
          `AI skill gap analysis failed (${error.message || error}); using local gap analyzer`
        );
      }
    }

    return this.fallbackAnalyzeSkillGap(resumeSkills, targetJob, language);
  }

  /**
   * Build resume parsing prompt
   */
  buildResumePrompt(resumeText, language) {
    const instruction = language === 'am' 
      ? 'መልስህን በአማርኛ ስጥ' 
      : 'Provide the response in English';

    return `
    Extract information from this resume and return a structured JSON object.
    ${instruction}
    
    Resume text:
    ${resumeText}
    
    Return a JSON object with the following structure:
    {
      "name": "Full name",
      "email": "Email address",
      "phone": "Phone number",
      "location": "City/Region",
      "summary": "Professional summary",
      "education": [
        {
          "degree": "Degree name",
          "institution": "University/College",
          "graduationYear": "Year",
          "field": "Field of study"
        }
      ],
      "skills": {
        "hard": ["skill1", "skill2"],
        "soft": ["skill1", "skill2"]
      },
      "experience": [
        {
          "company": "Company name",
          "role": "Job title",
          "duration": "Duration (e.g., '2020-2022')",
          "responsibilities": ["resp1", "resp2"],
          "achievements": ["achievement1", "achievement2"]
        }
      ],
      "languages": [
        {
          "name": "Language",
          "proficiency": "Proficiency level"
        }
      ]
    }
    
    Important:
    - Never invent or fabricate placeholder data. If information is not in the resume text, set it to null or empty array.
    `;
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(resumeData, language = 'en') {
    const instruction = language === 'am'
      ? 'መልስህን በአማርኛ ስጥ (Keep JSON keys in English, write feedback messages, suggestions, strengths, and weaknesses in Amharic)'
      : 'Provide the response in English';

    return `
    Analyze this resume data and provide a score and feedback.
    ${instruction}
    
    Resume Data:
    ${JSON.stringify(resumeData, null, 2)}
    
    Return a JSON object with:
    {
      "score": number (0-100),
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "feedback": [
        {
          "category": "Education/Experience/Skills/Format",
          "message": "Feedback message",
          "suggestion": "Improvement suggestion",
          "severity": "low/medium/high"
        }
      ]
    }
    
    Important: Base feedback strictly on the actual resume data provided.
    `;
  }

  /**
   * Build skill gap prompt
   */
  buildSkillGapPrompt(resumeSkills, targetJob, language = 'en') {
    const instruction = language === 'am'
      ? 'መልስህን በአማርኛ ስጥ (Keep JSON keys in English, write recommendations in Amharic)'
      : 'Provide the response in English';

    return `
    Compare these skills with job requirements and identify gaps.
    ${instruction}
    
    Resume Skills:
    ${JSON.stringify(resumeSkills || {})}
    
    Job Requirements:
    ${JSON.stringify(targetJob?.requiredSkills || [])}
    
    Preferred Skills:
    ${JSON.stringify(targetJob?.preferredSkills || [])}
    
    Return JSON:
    {
      "matchedSkills": ["skill1", "skill2"],
      "missingRequired": ["skill3", "skill4"],
      "missingPreferred": ["skill5", "skill6"],
      "recommendations": ["course1", "resource2"],
      "matchPercentage": number
    }
    `;
  }

  /**
   * Parse AI response safely
   */
  parseAIResponse(text) {
    try {
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Empty AI response');
      }

      const cleaned = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end > start) {
          return JSON.parse(cleaned.slice(start, end + 1));
        }
      }

      throw new Error('No valid JSON found in response');
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Normalize parsed resume payload without placeholder pollution
   */
  normalizeParsedResume(data) {
    const safe = data && typeof data === 'object' ? data : {};
    const skillsObj = safe.skills && typeof safe.skills === 'object' ? safe.skills : {};

    const toStringArray = (arr) =>
      Array.isArray(arr)
        ? arr.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
        : [];

    const hard = toStringArray(skillsObj.hard);
    const soft = toStringArray(skillsObj.soft);
    const seen = new Set();
    const all = [...hard, ...soft].filter(skill => {
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const education = Array.isArray(safe.education)
      ? safe.education
          .filter(edu => edu && typeof edu === 'object')
          .map(edu => {
            const yearNum = parseInt(String(edu.graduationYear ?? '').match(/\b(19|20)\d{2}\b/)?.[0] || '', 10);
            return {
              degree: edu.degree ? String(edu.degree).trim() : undefined,
              institution: edu.institution ? String(edu.institution).trim() : undefined,
              graduationYear: Number.isInteger(yearNum) ? yearNum : undefined,
              field: edu.field ? String(edu.field).trim() : undefined
            };
          })
          .filter(edu => edu.degree || edu.institution || edu.field)
      : [];

    const experience = Array.isArray(safe.experience)
      ? safe.experience
          .filter(exp => exp && typeof exp === 'object')
          .map(exp => ({
            company: exp.company ? String(exp.company).trim() : undefined,
            role: exp.role ? String(exp.role).trim() : undefined,
            duration: exp.duration ? String(exp.duration).trim() : undefined,
            responsibilities: toStringArray(exp.responsibilities),
            achievements: toStringArray(exp.achievements)
          }))
          .filter(exp => exp.role || exp.company)
      : [];

    const languages = Array.isArray(safe.languages)
      ? safe.languages
          .map(lang =>
            typeof lang === 'string'
              ? { name: lang.trim(), proficiency: 'Unknown' }
              : lang && typeof lang === 'object' && lang.name
                ? { name: String(lang.name).trim(), proficiency: lang.proficiency ? String(lang.proficiency).trim() : 'Fluent' }
                : null
          )
          .filter(lang => lang && lang.name)
      : [];

    return {
      name: safe.name ? String(safe.name).trim() : undefined,
      email: safe.email ? String(safe.email).trim() : undefined,
      phone: safe.phone ? String(safe.phone).trim() : undefined,
      location: safe.location ? String(safe.location).trim() : undefined,
      summary: safe.summary ? String(safe.summary).trim() : undefined,
      education,
      skills: { hard, soft, all },
      experience,
      languages
    };
  }

  parseAnalysisResponse(text) {
    const parsed = this.parseAIResponse(text);
    const score = typeof parsed.score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.score)))
      : 0;
    const validSeverities = new Set(['low', 'medium', 'high']);

    return {
      score,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).filter(Boolean) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String).filter(Boolean) : [],
      feedback: Array.isArray(parsed.feedback)
        ? parsed.feedback
            .filter(item => item && typeof item === 'object')
            .map(item => ({
              category: item.category ? String(item.category).trim() : 'General',
              message: item.message ? String(item.message).trim() : '',
              suggestion: item.suggestion ? String(item.suggestion).trim() : '',
              severity: validSeverities.has(String(item.severity).toLowerCase())
                ? String(item.severity).toLowerCase()
                : 'medium'
            }))
            .filter(item => item.message || item.suggestion)
        : []
    };
  }

  // =========================================================================
  // Authentic Fallback Parser & Analyzer (No hardcoded placeholder data)
  // =========================================================================

  /**
   * Deterministic rule-based resume parsing fallback strictly from text
   */
  fallbackParseResume(resumeText, language = 'en') {
    const text = typeof resumeText === 'string' ? resumeText : '';
    const name = this.extractName(text);
    const email = this.extractEmail(text);
    const phone = this.extractPhone(text);
    const location = this.extractLocation(text);
    const skills = this.extractSkills(text);
    const education = this.extractEducation(text);
    const experience = this.extractExperience(text);
    const languages = this.extractLanguages(text);
    const summary = this.extractSummary(text);

    const raw = {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      summary: summary || undefined,
      education,
      skills,
      experience,
      languages
    };

    return this.normalizeParsedResume(raw);
  }

  extractName(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const ignoreWords = /^(curriculum\s+vitae|resume|cv|personal\s+details|profile|summary|contact\s+info|page\s+\d+|የህይወት\s*ታሪክ)$/i;

    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const line = lines[i];
      if (ignoreWords.test(line)) continue;
      if (line.includes('@') || /https?:\/\/|www\./i.test(line)) continue;
      if (/(\+251|0)[1-9]\d{8}/.test(line)) continue;

      const labelMatch = line.match(/^(?:name|full\s*name|ሙሉ\s*ስም)\s*[:\-]\s*([A-Za-z\u1200-\u137F\s.'-]+)$/i);
      if (labelMatch) {
        const candidate = labelMatch[1].trim();
        if (candidate.length >= 3 && candidate.length <= 60) return candidate;
      }

      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4) {
        const isNameLike = words.every(w =>
          /^[A-Z][a-zA-Z.'-]{1,20}$/.test(w) || /^[\u1200-\u137F]{2,20}$/.test(w)
        );
        if (isNameLike) {
          return words.join(' ');
        }
      }
    }
    return undefined;
  }

  extractEmail(text) {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].trim() : undefined;
  }

  extractPhone(text) {
    const ethMatch = text.match(/(?:\+251|251|0)[\s.-]?(?:9\d{1}|7\d{1})[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (ethMatch) {
      let cleaned = ethMatch[0].replace(/[\s.-]/g, '');
      if (cleaned.startsWith('0')) cleaned = '+251' + cleaned.slice(1);
      else if (cleaned.startsWith('251')) cleaned = '+' + cleaned;
      return cleaned;
    }
    const genericMatch = text.match(/(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b/);
    return genericMatch ? genericMatch[0].trim() : undefined;
  }

  extractLocation(text) {
    for (const loc of ETHIOPIAN_LOCATIONS) {
      if (loc.regex.test(text)) {
        return loc.display;
      }
    }
    return undefined;
  }

  extractSummary(text) {
    if (!text || typeof text !== 'string') return undefined;

    const summaryHeader = /(?:summary|professional\s+summary|career\s+summary|profile|about\s+me|career\s+objective|objective|የሙያ\s*ማጠቃለያ|ስለ\s*እኔ)[:\s]*/i;
    const match = text.match(summaryHeader);
    if (match) {
      const start = match.index + match[0].length;
      const snippet = text.slice(start, start + 600);
      const lines = snippet.split('\n').map(l => l.trim()).filter(Boolean);
      const paragraphs = [];
      for (const line of lines) {
        if (/^(experience|education|skills|work\s+history|projects|certifications|languages|የሥራ\s*ልምድ|ትምህርት|ክህሎቶች)/i.test(line)) {
          break;
        }
        paragraphs.push(line);
        if (paragraphs.join(' ').length > 250) break;
      }
      if (paragraphs.length > 0) {
        return paragraphs.join(' ').slice(0, 350).trim();
      }
    }

    return undefined;
  }

  extractSkills(text) {
    const hard = [];
    const soft = [];
    const seen = new Set();

    for (const item of TECH_SKILLS) {
      if (item.regex.test(text)) {
        const key = item.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          hard.push(item.name);
        }
      }
    }

    for (const item of SOFT_SKILLS) {
      if (item.regex.test(text)) {
        const key = item.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          soft.push(item.name);
        }
      }
    }

    const all = [...hard, ...soft];
    return { hard, soft, all };
  }

  extractEducation(text) {
    const educationList = [];
    if (!text || typeof text !== 'string') return educationList;

    const eduHeaderRegex = /(?:education|academic\s+background|qualifications|ትምህርት)[:\s]*/i;
    const headerMatch = text.match(eduHeaderRegex);

    let sectionText = text;
    if (headerMatch) {
      const start = headerMatch.index + headerMatch[0].length;
      const nextSectionRegex = /\n\s*(?:experience|skills|projects|certifications|languages|publications|references|የሥራ\s*ልምድ|ክህሎቶች)[:\s]*/i;
      const nextMatch = text.slice(start).match(nextSectionRegex);
      const end = nextMatch ? start + nextMatch.index : text.length;
      sectionText = text.slice(start, end);
    }

    const foundInstitutions = [];
    for (const inst of ETHIOPIAN_INSTITUTIONS) {
      if (inst.regex.test(sectionText)) {
        foundInstitutions.push(inst.name);
      }
    }

    const yearMatches = sectionText.match(/\b(19|20)\d{2}\b/g) || [];
    const recentYears = yearMatches.map(Number).sort((a, b) => b - a);

    let degreeFound = undefined;
    for (const deg of DEGREE_PATTERNS) {
      if (deg.regex.test(sectionText)) {
        degreeFound = deg.degree;
        break;
      }
    }

    let fieldFound = undefined;
    for (const f of FIELD_PATTERNS) {
      if (f.regex.test(sectionText)) {
        fieldFound = f.field;
        break;
      }
    }

    if (foundInstitutions.length > 0) {
      foundInstitutions.forEach((instName, index) => {
        educationList.push({
          degree: degreeFound || undefined,
          institution: instName,
          graduationYear: recentYears[index] || undefined,
          field: fieldFound || undefined
        });
      });
    } else if (degreeFound || fieldFound) {
      educationList.push({
        degree: degreeFound || undefined,
        institution: undefined,
        graduationYear: recentYears[0] || undefined,
        field: fieldFound || undefined
      });
    }

    return educationList;
  }

  extractExperience(text) {
    const experiences = [];
    if (!text || typeof text !== 'string') return experiences;

    const expHeaderRegex = /(?:work\s+experience|professional\s+experience|employment\s+history|experience|የሥራ\s*ልምድ)[:\s]*/i;
    const headerMatch = text.match(expHeaderRegex);

    let sectionText = text;
    if (headerMatch) {
      const start = headerMatch.index + headerMatch[0].length;
      const nextSectionRegex = /\n\s*(?:education|skills|projects|certifications|languages|publications|references|ትምህርት|ክህሎቶች)[:\s]*/i;
      const nextMatch = text.slice(start).match(nextSectionRegex);
      const end = nextMatch ? start + nextMatch.index : text.length;
      sectionText = text.slice(start, end);
    }

    const lines = sectionText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentExp = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      let matchedRole = null;
      for (const r of COMMON_ROLES) {
        if (r.regex.test(line)) {
          matchedRole = r.title;
          break;
        }
      }

      if (!matchedRole) {
        const titleRegex = /^(?:Senior|Junior|Lead|Principal|Chief|Staff)?\s*(?:Software|Frontend|Backend|Full[\s-]Stack|Mobile|DevOps|Cloud|Data|QA|Web|Systems?|Network|IT|Project|Product)?\s*(?:Developer|Engineer|Architect|Specialist|Manager|Designer|Analyst|Consultant|Intern)\b/i;
        const tm = line.match(titleRegex);
        if (tm && line.length < 60) {
          matchedRole = line.replace(/[-–|,].*$/, '').trim();
        }
      }

      const durationRegex = /\b((?:19|20)\d{2})\s*[-–to]+\s*((?:19|20)\d{2}|present|current|now)\b/i;
      const durMatch = line.match(durationRegex) || (lines[i + 1] ? lines[i + 1].match(durationRegex) : null);

      let matchedCompany = null;
      for (const c of ETHIOPIAN_COMPANIES) {
        if (c.regex.test(line)) {
          matchedCompany = c.name;
          break;
        }
      }

      if (matchedRole || (durMatch && !currentExp)) {
        if (currentExp && (currentExp.role || currentExp.company)) {
          experiences.push(currentExp);
        }

        let compStr = matchedCompany || undefined;
        if (!compStr && line.includes(' at ')) {
          const parts = line.split(/\s+at\s+/i);
          if (parts[1]) compStr = parts[1].replace(/[-–|,].*$/, '').trim();
        } else if (!compStr && line.includes(' - ') && !durMatch) {
          const parts = line.split(/\s+-\s+/);
          if (parts[1]) compStr = parts[1].trim();
        }

        currentExp = {
          role: matchedRole || undefined,
          company: compStr,
          duration: durMatch ? durMatch[0] : undefined,
          responsibilities: [],
          achievements: []
        };
        continue;
      }

      if (currentExp) {
        if (durMatch && !currentExp.duration) {
          currentExp.duration = durMatch[0];
          continue;
        }

        if (/^[•\-*–—]\s*/.test(line) || /^(developed|designed|implemented|built|managed|led|created|maintained|collaborated|tested|organized|የሠራ|የተሳተፈ)/i.test(line)) {
          const cleanLine = line.replace(/^[•\-*–—]\s*/, '').trim();
          if (cleanLine.length > 5 && cleanLine.length < 300) {
            if (/^(achieved|increased|reduced|awarded|recognized|saved)/i.test(cleanLine)) {
              currentExp.achievements.push(cleanLine);
            } else {
              currentExp.responsibilities.push(cleanLine);
            }
          }
        } else if (!currentExp.company && matchedCompany) {
          currentExp.company = matchedCompany;
        } else if (!currentExp.company && line.length < 50 && !line.includes('@') && !line.includes('http') && !durMatch) {
          if (currentExp.responsibilities.length === 0) {
            currentExp.company = line;
          }
        }
      }
    }

    if (currentExp && (currentExp.role || currentExp.company)) {
      experiences.push(currentExp);
    }

    return experiences;
  }

  extractLanguages(text) {
    const list = [];
    if (!text || typeof text !== 'string') return list;

    const seen = new Set();
    for (const l of LANGUAGES_MAP) {
      if (l.regex.test(text)) {
        const key = l.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ name: l.name, proficiency: l.defaultProficiency });
        }
      }
    }

    const hasEthiopic = /[\u1200-\u137F]/.test(text);
    if ((hasEthiopic || /\bethiopia\b/i.test(text)) && !seen.has('amharic')) {
      list.push({ name: 'Amharic', proficiency: 'Native / Bilingual' });
      seen.add('amharic');
    }

    return list;
  }

  /**
   * Deterministic rule-based ATS resume analysis strictly based on actual data
   */
  fallbackAnalyzeResume(parsedData, language = 'en') {
    const safe = parsedData && typeof parsedData === 'object' ? parsedData : {};
    const isAm = language === 'am';

    let score = 0;

    if (safe.name) score += 10;
    if (safe.email) score += 10;
    if (safe.phone) score += 10;
    if (safe.location) score += 5;
    if (safe.summary && safe.summary.length > 20) score += 10;

    const skillsCount = safe.skills?.all?.length || 0;
    if (skillsCount >= 8) score += 20;
    else if (skillsCount >= 4) score += 15;
    else if (skillsCount >= 1) score += 8;

    const expCount = Array.isArray(safe.experience) ? safe.experience.length : 0;
    if (expCount >= 2) score += 20;
    else if (expCount === 1) score += 14;

    const eduCount = Array.isArray(safe.education) ? safe.education.length : 0;
    if (eduCount >= 1) {
      score += 10;
      if (safe.education[0]?.degree || safe.education[0]?.institution) {
        score += 5;
      }
    }

    const langCount = Array.isArray(safe.languages) ? safe.languages.length : 0;
    if (langCount >= 2) score += 5;
    else if (langCount === 1) score += 3;

    score = Math.max(15, Math.min(95, Math.round(score)));

    const strengths = [];
    const weaknesses = [];
    const feedback = [];

    // Dynamically derive strengths from actual contents
    if (safe.name && safe.email) {
      strengths.push(
        isAm
          ? `የዕውቂያ መረጃ ተካቷል (${safe.email})`
          : `Direct contact email verified (${safe.email}).`
      );
    }
    if (safe.phone) {
      strengths.push(
        isAm
          ? `ተደራሽ የስልክ ቁጥር ተካትቷል (${safe.phone})`
          : `Direct telephone contact included (${safe.phone}).`
      );
    }
    if (safe.summary) {
      strengths.push(
        isAm
          ? 'የሙያ ማጠቃለያ ተካትቷል'
          : 'Professional executive summary included.'
      );
    }
    if (skillsCount > 0) {
      strengths.push(
        isAm
          ? `${skillsCount} ተፈላጊ ክህሎቶች በሲቪው ውስጥ ተለይተዋል`
          : `${skillsCount} verified technical and professional skills extracted.`
      );
    }
    if (eduCount > 0) {
      const eduInfo = safe.education.map(e => e.degree || e.institution).filter(Boolean).join(', ');
      strengths.push(
        isAm
          ? `የትምህርት ዝግጅት መረጃ ተመዝግቧል ${eduInfo ? `(${eduInfo})` : ''}`
          : `Academic credentials documented ${eduInfo ? `(${eduInfo})` : ''}.`
      );
    }
    if (expCount > 0) {
      strengths.push(
        isAm
          ? `${expCount} የሥራ ልምድ ዝርዝር ተመዝግቧል`
          : `Documented employment history (${expCount} position${expCount > 1 ? 's' : ''}).`
      );
    }
    if (langCount >= 2) {
      strengths.push(
        isAm
          ? `የተለያዩ ቋንቋዎችን የመጠቀም ብቃት (${safe.languages.map(l => l.name).join(', ')})`
          : `Multilingual capability detected (${safe.languages.map(l => l.name).join(', ')}).`
      );
    }

    // Dynamically derive weaknesses and actionable feedback from missing sections
    if (!safe.email || !safe.phone) {
      weaknesses.push(
        isAm
          ? 'የስልክ ቁጥር ወይም የኢሜይል አድራሻ አልተሟላም'
          : 'Incomplete direct contact details (phone or email).'
      );
      feedback.push({
        category: 'Format',
        message: isAm ? 'የዕውቂያ መረጃ ማሟላት' : 'Incomplete contact details',
        suggestion: isAm ? 'ስልክ ቁጥር እና ሙያዊ ኢሜይል በሲቪው አናት ላይ ያካትቱ' : 'Ensure your telephone number and email address appear at the top of the resume.',
        severity: 'high'
      });
    }

    if (!safe.summary) {
      weaknesses.push(
        isAm
          ? 'የሙያ ማጠቃለያ ወይም ዓላማ አልተካተተም'
          : 'Missing professional summary or career objective.'
      );
      feedback.push({
        category: 'Format',
        message: isAm ? 'የሙያ ማጠቃለያ ማከል' : 'Add professional summary',
        suggestion: isAm ? 'የ2-3 ዓረፍተ ነገር አጭር የሙያ ማጠቃለያ ያክሉ' : 'Include a 2-3 sentence summary outlining your core strengths and background.',
        severity: 'medium'
      });
    }

    if (skillsCount < 5) {
      weaknesses.push(
        isAm
          ? 'የተዘረዘሩ የክህሎት ዓይነቶች ውስን ናቸው'
          : 'Low skill count detected; add more relevant tools and technologies.'
      );
      feedback.push({
        category: 'Skills',
        message: isAm ? 'የክህሎት ዝርዝር ማሳደግ' : 'Expand skill inventory',
        suggestion: isAm ? 'የተካኗቸውን ቴክኖሎጂዎችና መሳሪያዎች በዝርዝር ያካትቱ' : 'List all technical tools, programming languages, and frameworks relevant to target roles.',
        severity: 'medium'
      });
    }

    if (eduCount === 0) {
      weaknesses.push(
        isAm
          ? 'የትምህርት ታሪክ አልተገኘም'
          : 'No academic qualifications detected.'
      );
      feedback.push({
        category: 'Education',
        message: isAm ? 'የትምህርት መረጃ ማካተት' : 'Include education history',
        suggestion: isAm ? 'የተማሩበትን ተቋም፣ የዲግሪ ዓይነት እና የተመረቁበትን ዓመት ያክሉ' : 'Add your university degree, field of study, and graduation year.',
        severity: 'medium'
      });
    }

    if (expCount === 0) {
      weaknesses.push(
        isAm
          ? 'የሥራ ልምድ ወይም የተግባር ፕሮጀክት አልተገኘም'
          : 'No professional work history or projects detected.'
      );
      feedback.push({
        category: 'Experience',
        message: isAm ? 'የሥራ ልምድ ወይም ፕሮጀክቶችን ማከል' : 'Add practical experience',
        suggestion: isAm ? 'የሠሯቸውን ፕሮጀክቶች፣ ልምምዶች ወይም የቀድሞ የሥራ ድርሻዎችን ያካትቱ' : 'Add previous positions, internships, or GitHub software projects.',
        severity: 'high'
      });
    } else {
      feedback.push({
        category: 'Experience',
        message: isAm ? 'ውጤቶችን በቁጥር ማስደገፍ' : 'Quantify achievements',
        suggestion: isAm ? 'በሥራ ልምድዎ ውስጥ ያከናወኗቸውን ውጤቶች በቁጥር ወይም በመቶኛ ያሳዩ' : 'Highlight achievements using metrics (e.g., % improved, users served, load time reduced).',
        severity: 'low'
      });
    }

    return {
      score,
      strengths,
      weaknesses,
      feedback
    };
  }

  /**
   * Deterministic rule-based skill gap analysis fallback
   */
  fallbackAnalyzeSkillGap(resumeSkills, targetJob, language = 'en') {
    const rawResumeSkills = [
      ...(Array.isArray(resumeSkills?.hard) ? resumeSkills.hard : []),
      ...(Array.isArray(resumeSkills?.soft) ? resumeSkills.soft : []),
      ...(Array.isArray(resumeSkills?.all) ? resumeSkills.all : []),
      ...(Array.isArray(resumeSkills) ? resumeSkills : [])
    ].filter(s => typeof s === 'string' && s.trim());

    const resumeSkillSet = new Set(rawResumeSkills.map(s => s.trim().toLowerCase()));

    const normalizeJobSkills = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map(item => (typeof item === 'string' ? item : item?.name))
        .filter(item => typeof item === 'string' && item.trim())
        .map(item => item.trim());

    const required = normalizeJobSkills(targetJob?.requiredSkills);
    const preferred = normalizeJobSkills(targetJob?.preferredSkills);

    const matchedSkills = [];
    const missingRequired = [];
    const missingPreferred = [];

    required.forEach(skill => {
      if (resumeSkillSet.has(skill.toLowerCase())) {
        matchedSkills.push(skill);
      } else {
        missingRequired.push(skill);
      }
    });

    preferred.forEach(skill => {
      if (resumeSkillSet.has(skill.toLowerCase())) {
        if (!matchedSkills.includes(skill)) matchedSkills.push(skill);
      } else {
        missingPreferred.push(skill);
      }
    });

    const matchPercentage = Math.round((matchedSkills.length / Math.max(required.length + preferred.length, 1)) * 100);

    const isAm = language === 'am';
    const recommendations = [];

    if (missingRequired.length > 0) {
      recommendations.push(
        isAm
          ? `የሚከተሉትን ዋና መስፈርቶች ይለማመዱ፦ ${missingRequired.slice(0, 4).join(', ')}`
          : `Prioritize gaining hands-on proficiency in core required skills: ${missingRequired.slice(0, 4).join(', ')}`
      );
    }
    if (missingPreferred.length > 0) {
      recommendations.push(
        isAm
          ? `ተመራጭ ክህሎቶችን ማዳበር፦ ${missingPreferred.slice(0, 3).join(', ')}`
          : `Strengthen candidate positioning with preferred tools: ${missingPreferred.slice(0, 3).join(', ')}`
      );
    }
    if (matchedSkills.length > 0) {
      recommendations.push(
        isAm
          ? `ያሏቸው ${matchedSkills.length} ክህሎቶች ለዚህ የሥራ መደብ በቀጥታ የሚዛመዱ ናቸው።`
          : `Your verified profile covers ${matchedSkills.length} key requirements for this position.`
      );
    }

    return {
      matchedSkills,
      missingRequired,
      missingPreferred,
      recommendations,
      matchPercentage: Math.min(100, Math.max(10, matchPercentage))
    };
  }
}

module.exports = new AIParserService();
