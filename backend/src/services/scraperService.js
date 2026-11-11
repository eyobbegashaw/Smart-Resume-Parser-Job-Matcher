const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const Job = require('../models/Job');

class ScraperService {
  constructor() {
    this.sources = [
      {
        name: 'EthioJobs',
        baseUrl: 'https://www.ethiojobs.net',
        searchUrl: '/search-results-jobs',
        enabled: true
      },
      {
        name: 'Ezega',
        baseUrl: 'https://www.ezega.com',
        searchUrl: '/Jobs/Search',
        enabled: true
      },
      {
        name: 'LinkedIn Ethiopia',
        baseUrl: 'https://www.linkedin.com',
        searchUrl: '/jobs/search',
        enabled: true,
        requiresAuth: true
      }
    ];
  }

  /**
   * Start scraping all enabled sources
   */
  async scrapeAllSources() {
    const results = [];
    
    for (const source of this.sources) {
      if (source.enabled) {
        try {
          logger.info(`Starting scrape for ${source.name}`);
          const jobs = await this.scrapeSource(source);
          results.push({
            source: source.name,
            count: jobs.length,
            jobs
          });
          
          // Save jobs to database
          await this.saveJobs(jobs, source.name);
          
          logger.info(`Completed scrape for ${source.name}: ${jobs.length} jobs found`);
        } catch (error) {
          logger.error(`Error scraping ${source.name}:`, error);
          results.push({
            source: source.name,
            error: error.message,
            count: 0
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Scrape a specific source
   */
  async scrapeSource(source) {
    switch (source.name) {
      case 'EthioJobs':
        return await this.scrapeEthioJobs(source);
      case 'Ezega':
        return await this.scrapeEzega(source);
      case 'LinkedIn Ethiopia':
        return await this.scrapeLinkedIn(source);
      default:
        return [];
    }
  }

  /**
   * Scrape EthioJobs
   */
  async scrapeEthioJobs(source) {
    try {
      const response = await axios.get(`${source.baseUrl}${source.searchUrl}`, {
        params: {
          keywords: '',
          location: 'Ethiopia',
          page: 1
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      $('.job-listing-item').each((i, element) => {
        const applyHref = $(element).find('a.apply-link').attr('href');
        const sourceHref = $(element).find('a').attr('href');

        const job = {
          title: $(element).find('.job-title').text().trim(),
          company: $(element).find('.company-name').text().trim(),
          location: $(element).find('.location').text().trim(),
          description: $(element).find('.description').text().trim(),
          postedDate: this.parseDate($(element).find('.posted-date').text().trim()),
          applicationUrl: this.resolveUrl(applyHref, source.baseUrl),
          jobType: this.detectJobType($(element).find('.job-type').text().trim()),
          experienceLevel: this.detectExperienceLevel($(element).find('.experience').text().trim()),
          requiredSkills: this.extractSkills($(element).find('.skills').text().trim()),
          source: 'scraped',
          sourceName: 'EthioJobs',
          sourceUrl: this.resolveUrl(sourceHref, source.baseUrl)
        };

        if (this.validateJob(job)) {
          jobs.push(job);
        }
      });

      return jobs;
    } catch (error) {
      logger.error('EthioJobs scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape Ezega
   */
  async scrapeEzega(source) {
    try {
      const response = await axios.get(`${source.baseUrl}${source.searchUrl}`, {
        params: {
          country: 'Ethiopia',
          action: 'search'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const jobs = [];

      $('.job-row').each((i, element) => {
        const applyHref = $(element).find('a.apply-now').attr('href');
        const sourceHref = $(element).find('a').attr('href');

        const job = {
          title: $(element).find('.job-title').text().trim(),
          company: $(element).find('.company-name').text().trim(),
          location: $(element).find('.job-location').text().trim(),
          description: $(element).find('.job-description').text().trim(),
          postedDate: this.parseDate($(element).find('.job-date').text().trim()),
          salary: this.extractSalary($(element).find('.job-salary').text().trim()),
          applicationUrl: this.resolveUrl(applyHref, source.baseUrl),
          jobType: this.detectJobType($(element).find('.job-type').text().trim()),
          requiredSkills: this.extractSkills($(element).find('.job-skills').text().trim()),
          source: 'scraped',
          sourceName: 'Ezega',
          sourceUrl: this.resolveUrl(sourceHref, source.baseUrl)
        };

        if (this.validateJob(job)) {
          jobs.push(job);
        }
      });

      return jobs;
    } catch (error) {
      logger.error('Ezega scraping error:', error);
      return [];
    }
  }

  /**
   * Scrape LinkedIn (simplified - would need OAuth in production)
   */
  async scrapeLinkedIn(source) {
    // LinkedIn scraping requires authentication
    // This is a simplified version - in production, you'd use LinkedIn API
    return [];
  }

  /**
   * Save scraped jobs to database
   */
  async saveJobs(jobs, sourceName) {
    let saved = 0;
    let updated = 0;

    for (const jobData of jobs) {
      try {
        const cleanData = { ...jobData };
        if (!cleanData.salary) {
          delete cleanData.salary;
        }

        const existingJob = await Job.findOne({
          title: cleanData.title,
          company: cleanData.company,
          source: 'scraped',
          sourceName
        });

        if (existingJob) {
          await Job.findByIdAndUpdate(existingJob._id, {
            ...cleanData,
            source: 'scraped',
            sourceName
          });
          updated++;
        } else {
          await Job.create({
            ...cleanData,
            source: 'scraped',
            sourceName,
            postedDate: cleanData.postedDate || new Date(),
            isActive: true
          });
          saved++;
        }
      } catch (error) {
        logger.error('Error saving scraped job:', error);
      }
    }

    logger.info(`Scraped jobs from ${sourceName}: ${saved} new, ${updated} updated`);
    return { saved, updated };
  }

  /**
   * Utility: Resolve potentially relative URLs against base URL
   */
  resolveUrl(href, baseUrl) {
    if (!href) return undefined;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  /**
   * Utility: Parse date string
   */
  parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    // Handle relative dates (e.g., "2 days ago")
    const daysAgo = dateStr.match(/(\d+)\s+days?\s+ago/i);
    if (daysAgo) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(daysAgo[1], 10));
      return date;
    }

    // Handle specific dates
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Utility: Detect job type from text
   */
  detectJobType(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('full')) return 'Full-time';
    if (lower.includes('part')) return 'Part-time';
    if (lower.includes('contract')) return 'Contract';
    if (lower.includes('intern')) return 'Internship';
    if (lower.includes('remote')) return 'Remote';
    return 'Full-time';
  }

  /**
   * Utility: Detect experience level
   */
  detectExperienceLevel(text) {
    const lower = (text || '').toLowerCase();
    if (lower.includes('entry') || lower.includes('junior') || lower.includes('0-2')) return 'Entry Level';
    if (lower.includes('mid') || lower.includes('intermediate') || lower.includes('3-5')) return 'Mid Level';
    if (lower.includes('senior') || lower.includes('6-8')) return 'Senior';
    if (lower.includes('lead') || lower.includes('9-12')) return 'Lead';
    if (lower.includes('manager') || lower.includes('director') || lower.includes('13+')) return 'Manager';
    return 'Entry Level';
  }

  /**
   * Utility: Extract skills from text as Job.requiredSkills subdocuments
   */
  extractSkills(text) {
    if (!text) return [];

    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js',
      'Accounting', 'Excel', 'QuickBooks', 'Management',
      'Communication', 'Leadership', 'Problem Solving',
      'Amharic', 'English', 'Microsoft Office', 'Data Analysis'
    ];

    const found = [];
    for (const skill of commonSkills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}(?=$|[^a-zA-Z0-9])`, 'i');
      if (boundaryRegex.test(text)) {
        found.push({ name: skill, importance: 'required' });
      }
    }

    return found;
  }

  /**
   * Utility: Extract salary information
   */
  extractSalary(text) {
    if (!text) return undefined;

    const salaryRegex = /(\d[\d,]*(?:\.\d+)?)\s*[-–]\s*(\d[\d,]*(?:\.\d+)?)\s*(ETB|birr|Br)?/i;
    const match = text.match(salaryRegex);

    if (match) {
      return {
        min: parseFloat(match[1].replace(/,/g, '')),
        max: parseFloat(match[2].replace(/,/g, '')),
        currency: 'ETB',
        period: 'monthly'
      };
    }

    return undefined;
  }

  /**
   * Utility: Validate job data
   */
  validateJob(job) {
    return job.title && 
           job.company && 
           job.location && 
           job.description &&
           job.title.length > 0 &&
           job.company.length > 0;
  }
}

module.exports = new ScraperService();
