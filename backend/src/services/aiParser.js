const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIParserService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Parse resume text using Gemini AI
   * @param {string} resumeText - Extracted text from resume
   * @param {string} language - Response language ('en' or 'am')
   * @returns {Promise<Object>} Parsed resume data
   */
  async parseResume(resumeText, language = 'en') {
    try {
      const prompt = this.buildResumePrompt(resumeText, language);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseAIResponse(text);
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
      const prompt = this.buildAnalysisPrompt(resumeData, language);
      
      const result = await this.model.generateContent(prompt);
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
  buildAnalysisPrompt(resumeData, language) {
    return `
    Analyze this resume data and provide a score and feedback.
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
   * Parse AI response
   */
  parseAIResponse(text) {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  parseAnalysisResponse(text) {
    return this.parseAIResponse(text);
  }

  /**
   * Generate skill gap analysis
   */
  async analyzeSkillGap(resumeSkills, targetJob, language = 'en') {
    const prompt = `
    Compare these skills with job requirements and identify gaps.
    
    Resume Skills:
    ${JSON.stringify(resumeSkills)}
    
    Job Requirements:
    ${JSON.stringify(targetJob.requiredSkills)}
    
    Preferred Skills:
    ${JSON.stringify(targetJob.preferredSkills)}
    
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
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return this.parseAIResponse(response.text());
    } catch (error) {
      logger.error('Skill gap analysis error:', error);
      throw new Error('Failed to analyze skill gap');
    }
  }
}

module.exports = new AIParserService();