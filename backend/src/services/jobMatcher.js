const logger = require('../utils/logger');
const Job = require('../models/Job');

class JobMatcherService {
  /**
   * Calculate match score between resume and job
   */
  calculateMatchScore(resumeSkills, jobSkills) {
    if (!resumeSkills || !jobSkills || !jobSkills.length) {
      return 0;
    }

    const resumeSkillSet = new Set(resumeSkills.map(s => s.toLowerCase()));
    const jobSkillSet = new Set(jobSkills.map(s => s.toLowerCase()));
    
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
      const { skills = {}, experience = [] } = resumeData;
      const allSkills = [...(skills.hard || []), ...(skills.soft || [])];
      
      // Calculate experience level
      const totalExperience = this.calculateTotalExperience(experience);
      const experienceLevel = this.determineExperienceLevel(totalExperience);

      // Find potential matches
      const jobs = await Job.find({ 
        isActive: true,
        expiryDate: { $gt: new Date() }
      }).limit(50); // Limit initial search for performance

      const matches = await Promise.all(
        jobs.map(async job => {
          const requiredSkills = job.requiredSkills?.map(s => 
            typeof s === 'string' ? s : s.name
          ) || [];
          
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
            job: job
          };
        })
      );

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
    return experience.reduce((total, exp) => {
      if (exp.duration) {
        const years = this.parseDuration(exp.duration);
        return total + years;
      }
      return total;
    }, 0);
  }

  /**
   * Parse duration string to years
   */
  parseDuration(duration) {
    const yearMatch = duration.match(/(\d+)\s*years?/i);
    if (yearMatch) return parseInt(yearMatch[1]);

    const monthMatch = duration.match(/(\d+)\s*months?/i);
    if (monthMatch) return parseInt(monthMatch[1]) / 12;

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
    const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase()));
    return jobSkills.filter(skill => 
      resumeSet.has(skill.toLowerCase())
    );
  }

  /**
   * Get missing skills
   */
  getMissingSkills(resumeSkills, jobSkills) {
    const resumeSet = new Set(resumeSkills.map(s => s.toLowerCase()));
    return jobSkills.filter(skill => 
      !resumeSet.has(skill.toLowerCase())
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
