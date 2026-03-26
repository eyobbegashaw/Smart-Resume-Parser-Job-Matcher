const validator = require('validator');

class Validators {
  /**
   * Validate email
   */
  static isEmail(email) {
    return validator.isEmail(email);
  }

  /**
   * Validate Ethiopian phone number
   */
  static isEthiopianPhone(phone) {
    const regex = /^(\+251|0)[1-9]\d{8}$/;
    return regex.test(phone);
  }

  /**
   * Validate password strength
   */
  static isStrongPassword(password) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return regex.test(password);
  }

  /**
   * Validate URL
   */
  static isURL(url) {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  }

  /**
   * Validate Ethiopian location
   */
  static isEthiopianLocation(location) {
    const cities = [
      'addis ababa', 'adama', 'bahir dar', 'gondar', 'hawassa',
      'mekelle', 'jimma', 'dire dawa', 'debre zeit', 'arba minch',
      'dessie', 'jijiga', 'shashamane', 'bishoftu', 'sodo',
      'haramaya', 'dilla', 'nekemte', 'debre markos', 'asosa',
      'gambela', 'semera'
    ];
    
    const lowerLocation = location.toLowerCase();
    return cities.some(city => lowerLocation.includes(city));
  }

  /**
   * Validate Ethiopian salary range
   */
  static isValidEthiopianSalary(min, max) {
    // Typical salary ranges in Ethiopia (in ETB)
    const minSalary = 500;
    const maxSalary = 200000;
    
    if (min && (min < minSalary || min > maxSalary)) return false;
    if (max && (max < minSalary || max > maxSalary)) return false;
    if (min && max && min > max) return false;
    
    return true;
  }

  /**
   * Validate job experience level
   */
  static isValidExperienceLevel(level) {
    const levels = ['Entry Level', 'Mid Level', 'Senior', 'Lead', 'Manager'];
    return levels.includes(level);
  }

  /**
   * Validate job type
   */
  static isValidJobType(type) {
    const types = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
    return types.includes(type);
  }

  /**
   * Validate education level
   */
  static isValidEducationLevel(level) {
    const levels = [
      'High School', 'Diploma', 'Bachelor\'s Degree', 
      'Master\'s Degree', 'PhD', 'Certificate'
    ];
    return levels.includes(level);
  }

  /**
   * Validate graduation year
   */
  static isValidGraduationYear(year) {
    const currentYear = new Date().getFullYear();
    const minYear = 1970;
    return year >= minYear && year <= currentYear + 5;
  }

  /**
   * Validate Ethiopian company tin number
   */
  static isValidTinNumber(tin) {
    // Ethiopian TIN format: 10 digits
    const regex = /^\d{10}$/;
    return regex.test(tin);
  }

  /**
   * Validate Ethiopian business license number
   */
  static isValidLicenseNumber(license) {
    // Ethiopian business license format: 2 letters + 8 digits
    const regex = /^[A-Z]{2}\d{8}$/;
    return regex.test(license);
  }

  /**
   * Validate resume file
   */
  static isValidResumeFile(file) {
    if (!file) return false;
    
    const validTypes = ['application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return validTypes.includes(file.mimetype) && file.size <= maxSize;
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id) {
    return validator.isMongoId(id);
  }

  /**
   * Validate date
   */
  static isValidDate(date) {
    return validator.isDate(date);
  }

  /**
   * Validate future date
   */
  static isFutureDate(date) {
    const inputDate = new Date(date);
    const now = new Date();
    return inputDate > now;
  }

  /**
   * Validate age (for job applications)
   */
  static isValidAge(birthDate, minAge = 18, maxAge = 65) {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minAge && age - 1 <= maxAge;
    }
    
    return age >= minAge && age <= maxAge;
  }

  /**
   * Validate JSON
   */
  static isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Ethiopian region
   */
  static isValidEthiopianRegion(region) {
    const regions = [
      'Tigray', 'Afar', 'Amhara', 'Oromia', 'Somali',
      'Benishangul-Gumuz', 'SNNPR', 'Gambela', 'Harari',
      'Addis Ababa', 'Dire Dawa', 'Sidama', 'South West'
    ];
    
    return regions.includes(region);
  }

  /**
   * Validate Ethiopian education institution
   */
  static isValidEthiopianInstitution(institution) {
    const universities = [
      'addis ababa university', 'aau', 'aastu', 'bahir dar university',
      'mekelle university', 'jimma university', 'haramaya university',
      'gondar university', 'hawassa university', 'arba minch university',
      'adama science and technology', 'dire dawa university',
      'debre berhan university', 'wollo university', 'semera university'
    ];
    
    const lowerInstitution = institution.toLowerCase();
    return universities.some(uni => lowerInstitution.includes(uni));
  }

  /**
   * Validate Ethiopian tax rate
   */
  static isValidTaxRate(rate) {
    // Ethiopian tax rates: 0-35%
    return rate >= 0 && rate <= 35;
  }

  /**
   * Validate batch of data
   */
  static validateBatch(data, rules) {
    const errors = [];
    
    Object.keys(rules).forEach(field => {
      const value = data[field];
      const fieldRules = rules[field];
      
      fieldRules.forEach(rule => {
        if (rule.required && !value) {
          errors.push(`${field} is required`);
        }
        
        if (value && rule.validate) {
          const isValid = rule.validate(value);
          if (!isValid) {
            errors.push(rule.message || `${field} is invalid`);
          }
        }
        
        if (value && rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        
        if (value && rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be less than ${rule.maxLength} characters`);
        }
        
        if (value && rule.pattern && !rule.pattern.test(value)) {
          errors.push(rule.message || `${field} has invalid format`);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input
   */
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return validator.escape(input.trim());
    }
    return input;
  }

  /**
   * Sanitize object
   */
  static sanitizeObject(obj) {
    const sanitized = {};
    
    Object.keys(obj).forEach(key => {
      sanitized[key] = this.sanitizeInput(obj[key]);
    });
    
    return sanitized;
  }

  /**
   * Validate array of skills
   */
  static validateSkills(skills) {
    if (!Array.isArray(skills)) return false;
    
    return skills.every(skill => 
      typeof skill === 'string' && 
      skill.length >= 2 && 
      skill.length <= 50
    );
  }

  /**
   * Validate Ethiopian job posting
   */
  static validateEthiopianJob(job) {
    const requiredFields = ['title', 'company', 'location', 'description', 'jobType'];
    
    for (const field of requiredFields) {
      if (!job[field]) {
        return { isValid: false, error: `${field} is required` };
      }
    }
    
    if (!this.isValidJobType(job.jobType)) {
      return { isValid: false, error: 'Invalid job type' };
    }
    
    if (!this.isEthiopianLocation(job.location)) {
      return { isValid: false, error: 'Invalid Ethiopian location' };
    }
    
    if (job.salary && !this.isValidEthiopianSalary(job.salary.min, job.salary.max)) {
      return { isValid: false, error: 'Invalid salary range' };
    }
    
    return { isValid: true };
  }
}

module.exports = Validators;
