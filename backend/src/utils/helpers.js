const crypto = require('crypto');
const moment = require('moment');

class Helpers {
  /**
   * Generate random string
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate unique ID
   */
  static generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
  }

  /**
   * Hash data
   */
  static hashData(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Format date
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    return moment(date).format(format);
  }

  /**
   * Calculate time ago
   */
  static timeAgo(date) {
    return moment(date).fromNow();
  }

  /**
   * Calculate days difference
   */
  static daysBetween(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Extract keywords from text
   */
  static extractKeywords(text, minLength = 3) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length >= minLength);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Calculate match percentage between two arrays
   */
  static calculateMatchPercentage(array1, array2) {
    if (!array1.length || !array2.length) return 0;
    
    const set1 = new Set(array1.map(item => item.toLowerCase()));
    const set2 = new Set(array2.map(item => item.toLowerCase()));
    
    const matches = [...set1].filter(item => set2.has(item)).length;
    const percentage = (matches / set2.size) * 100;
    
    return Math.min(100, Math.round(percentage));
  }

  /**
   * Paginate array
   */
  static paginateArray(array, page = 1, limit = 10) {
    const start = (page - 1) * limit;
    const end = page * limit;
    
    return {
      data: array.slice(start, end),
      total: array.length,
      page,
      limit,
      pages: Math.ceil(array.length / limit)
    };
  }

  /**
   * Group array by key
   */
  static groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }

  /**
   * Remove duplicates from array
   */
  static uniqueArray(array, key = null) {
    if (!key) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  /**
   * Chunk array
   */
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge objects deeply
   */
  static deepMerge(target, source) {
    const output = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] instanceof Object && key in target) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
    
    return output;
  }

  /**
   * Sanitize object (remove null/undefined values)
   */
  static sanitizeObject(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null)
    );
  }

  /**
   * Convert to camelCase
   */
  static toCamelCase(str) {
    return str.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  }

  /**
   * Convert to snake_case
   */
  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Validate email
   */
  static isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Validate phone number
   */
  static isValidPhone(phone) {
    const regex = /^(\+251|0)[1-9]\d{8}$/;
    return regex.test(phone);
  }

  /**
   * Extract phone number from text
   */
  static extractPhoneNumber(text) {
    const regex = /(\+251|0)[1-9]\d{8}/g;
    return text.match(regex) || [];
  }

  /**
   * Extract email from text
   */
  static extractEmail(text) {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(regex) || [];
  }

  /**
   * Parse CSV string
   */
  static parseCSV(csvString, delimiter = ',') {
    const lines = csvString.split('\n');
    const headers = lines[0].split(delimiter);
    
    return lines.slice(1).map(line => {
      const values = line.split(delimiter);
      return headers.reduce((obj, header, i) => {
        obj[header.trim()] = values[i]?.trim();
        return obj;
      }, {});
    });
  }

  /**
   * Generate slug from string
   */
  static slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Truncate text
   */
  static truncateText(text, length = 100, suffix = '...') {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
  }

  /**
   * Highlight text
   */
  static highlightText(text, query, className = 'highlight') {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
  }

  /**
   * Calculate reading time
   */
  static readingTime(text, wordsPerMinute = 200) {
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate color from string
   */
  static stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * Sleep/delay
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function
   */
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await this.sleep(delay * attempt);
      }
    }
  }

  /**
   * Measure execution time
   */
  static async measureTime(fn) {
    const start = process.hrtime();
    const result = await fn();
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    return {
      result,
      duration: Math.round(duration * 100) / 100
    };
  }
}

module.exports = Helpers;