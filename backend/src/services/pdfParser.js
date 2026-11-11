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
    return pageData.getTextContent()
      .then(textContent => {
        let lastY = null;
        let text = '';

        for (const item of textContent.items) {
          const currentY = item.transform?.[5];
          if (lastY !== null && currentY !== undefined && Math.abs(lastY - currentY) > 2) {
            text += '\n';
          } else if (text && !text.endsWith('\n') && !text.endsWith(' ')) {
            text += ' ';
          }
          text += item.str;
          if (item.hasEOL) {
            text += '\n';
          }
          if (currentY !== undefined) {
            lastY = currentY;
          }
        }

        return text;
      });
  }

  /**
   * Clean extracted text while preserving line breaks and Ethiopic characters
   */
  cleanText(text) {
    if (typeof text !== 'string') return '';

    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract structured data from text using regex patterns
   * This is a fallback method if AI parsing fails
   */
  extractBasicInfo(text) {
    if (typeof text !== 'string' || !text.trim()) {
      return { emails: [], phones: [], possibleName: null };
    }

    const patterns = {
      email: /[\w.-]+@[\w.-]+\.\w+/g,
      phone: /(\+251|0)[1-9]\d{8}/g,
      name: /^([A-Za-z\u1200-\u137F]{2,}(?:[ \t]+[A-Za-z\u1200-\u137F]{2,})+)(?=[ \t]*$)/gm
    };

    return {
      emails: text.match(patterns.email) || [],
      phones: text.match(patterns.phone) || [],
      possibleName: text.match(patterns.name)?.[0] || null
    };
  }
}

module.exports = new PDFParserService();
