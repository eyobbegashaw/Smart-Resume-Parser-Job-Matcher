const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIParserService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Lazily initialize Gemini model so requiring this module does not crash when API key is unset
   */
  getModel() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (!this.model) {
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }

    return this.model;
  }

  /**
   * Parse resume text using Gemini AI
   * @param {string} resumeText - Extracted text from resume
   * @param {string} language - Response language ('en' or 'am')
   * @returns {Promise<Object>} Parsed resume data
   */
  async parseResume(resumeText, language = 'en') {
    try {
      const model = this.getModel();
      const prompt = this.buildResumePrompt(resumeText, language);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const parsed = this.parseAIResponse(text);
      return this.normalizeParsedResume(parsed);
    } catch (error) {
      logger.error('AI parsing error:', error);
      throw new Error('Failed to parse resume with AI');
    }
  }

  /**
   * Analyze resume and provide score and feedback
   */
  async analyzeResume(resumeData, language = 'en') {
    try {
      const model = this.getModel();
      const prompt = this.buildAnalysisPrompt(resumeData, language);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseAnalysisResponse(text);
    } catch (error) {
      logger.error('AI analysis error:', error);
      throw new Error('Failed to analyze resume');
    }
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
      "summary": "Professional summary (2-3 sentences)",
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
          "proficiency": "Native/Fluent/Intermediate/Basic"
        }
      ]
    }
    
    Important: 
    - For Ethiopian resumes, recognize local institutions (AAU, AASTU, etc.)
    - Identify both technical and soft skills relevant to Ethiopian job market
    - If information is missing, use null or empty array
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
    Consider the Ethiopian job market context.
    
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
    
    Consider:
    - Completeness of information
    - Relevance to Ethiopian job market
    - Format and presentation
    - Quantifiable achievements
    - Language proficiency (including Amharic if mentioned)
    `;
  }

  /**
   * Parse AI response safely (strips markdown code fences and extracts JSON)
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
        // Fallback: extract outermost JSON object
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
   * Normalize AI parsed resume payload to match Resume schema types
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
              degree: edu.degree || undefined,
              institution: edu.institution || undefined,
              graduationYear: Number.isInteger(yearNum) ? yearNum : undefined,
              field: edu.field || undefined
            };
          })
      : [];

    const experience = Array.isArray(safe.experience)
      ? safe.experience
          .filter(exp => exp && typeof exp === 'object')
          .map(exp => ({
            company: exp.company || undefined,
            role: exp.role || undefined,
            duration: exp.duration || undefined,
            responsibilities: toStringArray(exp.responsibilities),
            achievements: toStringArray(exp.achievements)
          }))
      : [];

    const languages = Array.isArray(safe.languages)
      ? safe.languages
          .map(lang =>
            typeof lang === 'string'
              ? { name: lang.trim(), proficiency: 'Unknown' }
              : lang && typeof lang === 'object'
                ? { name: lang.name, proficiency: lang.proficiency }
                : null
          )
          .filter(lang => lang && lang.name)
      : [];

    return {
      name: safe.name || undefined,
      email: safe.email || undefined,
      phone: safe.phone || undefined,
      location: safe.location || undefined,
      summary: safe.summary || undefined,
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
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
      feedback: Array.isArray(parsed.feedback)
        ? parsed.feedback
            .filter(item => item && typeof item === 'object')
            .map(item => ({
              category: item.category ? String(item.category) : 'General',
              message: item.message ? String(item.message) : '',
              suggestion: item.suggestion ? String(item.suggestion) : '',
              severity: validSeverities.has(String(item.severity).toLowerCase())
                ? String(item.severity).toLowerCase()
                : 'medium'
            }))
        : []
    };
  }

  /**
   * Generate skill gap analysis
   */
  async analyzeSkillGap(resumeSkills, targetJob, language = 'en') {
    const instruction = language === 'am'
      ? 'መልስህን በአማርኛ ስጥ (Keep JSON keys in English, write recommendations in Amharic)'
      : 'Provide the response in English';

    const prompt = `
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

    try {
      const model = this.getModel();
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return this.parseAIResponse(response.text());
    } catch (error) {
      logger.error('Skill gap analysis error:', error);
      throw new Error('Failed to analyze skill gap');
    }
  }
}

module.exports = new AIParserService();
