const logger = require('../utils/logger');
const Job = require('../models/Job');

class JobMatcherService {
  /**
   * Calculate match score between resume and job
   */
  calculateMatchScore(resumeSkills, jobSkills) {
    if (!Array.isArray(resumeSkills) || !Array.isArray(jobSkills) || !jobSkills.length) {
      return 0;
    }

    const resumeSkillSet = new Set(
      resumeSkills.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().toLowerCase())
    );
    const jobSkillSet = new Set(
      jobSkills.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim().toLowerCase())
    );

    if (!jobSkillSet.size) return 0;

    let matches = 0;
    jobSkillSet.forEach(skill => {
      if (resumeSkillSet.has(skill)) {
        matches++;
      }
    });

    // Calculate percentage based on job requirements
    const matchPercentage = (matches / jobSkillSet.size) * 100;
    return Math.round(matchPercentage);
  }

  /**
   * Find matching jobs for a resume
   */
  async findMatchingJobs(resumeData, limit = 10) {
    try {
      const safeData = resumeData || {};
      const skills = safeData.skills || {};
      const experience = Array.isArray(safeData.experience) ? safeData.experience : [];

      const rawSkills = [
        ...(Array.isArray(skills.hard) ? skills.hard : []),
        ...(Array.isArray(skills.soft) ? skills.soft : []),
        ...(Array.isArray(skills.all) ? skills.all : [])
      ].filter(s => typeof s === 'string' && s.trim());

      const seen = new Set();
      const allSkills = rawSkills.filter(s => {
        const lower = s.trim().toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });

      // Calculate experience level
      const totalExperience = this.calculateTotalExperience(experience);
      const experienceLevel = this.determineExperienceLevel(totalExperience);

      // Find potential active matches (including jobs without an expiryDate)
      const now = new Date();
      const jobs = await Job.find({
        isActive: true,
        $or: [
          { expiryDate: { $gt: now } },
          { expiryDate: null },
          { expiryDate: { $exists: false } }
        ]
      }).limit(50);

      const matches = jobs.map(job => {
        const requiredSkills = (job.requiredSkills || [])
          .map(s => (typeof s === 'string' ? s : s?.name))
          .filter(s => typeof s === 'string' && s.trim());

        const matchScore = this.calculateMatchScore(allSkills, requiredSkills);

        // Boost score based on experience level match
        const experienceBoost = this.getExperienceBoost(
          experienceLevel,
          job.experienceLevel
        );

        const finalScore = Math.min(100, matchScore + experienceBoost);

        return {
          jobId: job._id,
          matchScore: finalScore,
          matchedSkills: this.getMatchedSkills(allSkills, requiredSkills),
          missingSkills: this.getMissingSkills(allSkills, requiredSkills),
          job
        };
      });

      // Sort by match score and return top matches
      return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error) {
      logger.error('Job matching error:', error);
      throw new Error('Failed to find matching jobs');
    }
  }

  /**
   * Calculate total years of experience
   */
  calculateTotalExperience(experience) {
    if (!Array.isArray(experience)) return 0;

    return experience.reduce((total, exp) => {
      if (!exp) return total;

      let years = 0;
      if (exp.duration) {
        years = this.parseDuration(exp.duration);
      }
      if (years === 0 && exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        }
      }
      return total + years;
    }, 0);
  }

  /**
   * Parse duration string to years (supports explicit units and year ranges like "2020-2022" or "2021 - Present")
   */
  parseDuration(duration) {
    if (typeof duration !== 'string') return 0;

    let totalYears = 0;
    const yearMatch = duration.match(/(\d+(?:\.\d+)?)\s*years?/i);
    if (yearMatch) {
      totalYears += parseFloat(yearMatch[1]);
    }

    const monthMatch = duration.match(/(\d+(?:\.\d+)?)\s*months?/i);
    if (monthMatch) {
      totalYears += parseFloat(monthMatch[1]) / 12;
    }

    if (totalYears > 0) {
      return totalYears;
    }

    const rangeMatch = duration.match(/(\b(?:19|20)\d{2}\b)\s*[-–to]+\s*(\b(?:19|20)\d{2}\b|present|current|now)/i);
    if (rangeMatch) {
      const startYear = parseInt(rangeMatch[1], 10);
      const endRaw = rangeMatch[2].toLowerCase();
      const endYear = ['present', 'current', 'now'].includes(endRaw)
        ? new Date().getFullYear()
        : parseInt(endRaw, 10);
      if (endYear >= startYear) {
        return Math.max(0.5, endYear - startYear);
      }
    }

    return 0;
  }

  /**
   * Determine experience level
   */
  determineExperienceLevel(years) {
    if (years < 1) return 'Entry Level';
    if (years < 3) return 'Mid Level';
    if (years < 6) return 'Senior';
    if (years < 10) return 'Lead';
    return 'Manager';
  }

  /**
   * Get experience boost based on level match
   */
  getExperienceBoost(resumeLevel, jobLevel) {
    const levels = ['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager'];
    const resumeIndex = levels.indexOf(resumeLevel);
    const jobIndex = levels.indexOf(jobLevel);
    
    if (resumeIndex === jobIndex) return 15;
    if (Math.abs(resumeIndex - jobIndex) === 1) return 5;
    return 0;
  }

  /**
   * Get matched skills
   */
  getMatchedSkills(resumeSkills, jobSkills) {
    if (!Array.isArray(resumeSkills) || !Array.isArray(jobSkills)) return [];
    const resumeSet = new Set(
      resumeSkills.filter(s => typeof s === 'string').map(s => s.trim().toLowerCase())
    );
    return jobSkills.filter(skill =>
      typeof skill === 'string' && resumeSet.has(skill.trim().toLowerCase())
    );
  }

  /**
   * Get missing skills
   */
  getMissingSkills(resumeSkills, jobSkills) {
    if (!Array.isArray(jobSkills)) return [];
    const safeResume = Array.isArray(resumeSkills) ? resumeSkills : [];
    const resumeSet = new Set(
      safeResume.filter(s => typeof s === 'string').map(s => s.trim().toLowerCase())
    );
    return jobSkills.filter(skill =>
      typeof skill === 'string' && !resumeSet.has(skill.trim().toLowerCase())
    );
  }

  /**
   * Batch update job matches for all pending resumes
   */
  async batchUpdateMatches() {
    const Resume = require('../models/Resume');
    
    try {
      const resumes = await Resume.find({ 
        status: 'completed',
        'matchedJobs.0': { $exists: false }
      }).limit(10);

      for (const resume of resumes) {
        const matches = await this.findMatchingJobs(resume.parsedData, 5);
        
        resume.matchedJobs = matches.map(m => ({
          jobId: m.jobId,
          matchScore: m.matchScore,
          matchedSkills: m.matchedSkills,
          missingSkills: m.missingSkills
        }));

        await resume.save();
      }

      logger.info(`Batch updated ${resumes.length} resumes`);
    } catch (error) {
      logger.error('Batch update error:', error);
    }
  }
}

module.exports = new JobMatcherService();
