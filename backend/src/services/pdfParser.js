const pdf = require('pdf-parse');
const logger = require('../utils/logger');

class PDFParserService {
  /**
   * Extract text from PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer, {
        // Options to improve parsing
        max: 0, // No page limit
        pagerender: this.customPageRenderer
      });
      
      return {
        text: this.cleanText(data.text),
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      logger.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Custom page renderer for better text extraction
   */
  customPageRenderer(pageData) {
    // You can add custom rendering logic here if needed
    return pageData.getTextContent()
      .then(textContent => {
        let text = '';
        textContent.items.forEach(item => {
          text += item.str + ' ';
        });
        return text;
      });
  }

  /**
   * Clean extracted text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\x20-\x7E\x0A\x0D\u1200-\u137F]/g, '') // Keep ASCII and Ethiopic characters
      .trim();
  }

  /**
   * Extract structured data from text using regex patterns
   * This is a fallback method if AI parsing fails
   */
  extractBasicInfo(text) {
    const patterns = {
      email: /[\w.-]+@[\w.-]+\.\w+/g,
      phone: /(\+251|0)[1-9]\d{8}/g,
      name: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gm
    };

    return {
      emails: text.match(patterns.email) || [],
      phones: text.match(patterns.phone) || [],
      possibleName: text.match(patterns.name)?.[0] || null
    };
  }
}

module.exports = new PDFParserService();