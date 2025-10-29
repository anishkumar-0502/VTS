const logger = require('./logger');

class PhoneFormatter {
  static COUNTRY_CODES = {
    'IN': { code: '+91', regex: /^(\+91|0)?[6-9]\d{9}$/, length: 10 },
    'US': { code: '+1', regex: /^(\+1)?[2-9]\d{2}[2-9](?!11)\d{6}$/, length: 10 },
    'UK': { code: '+44', regex: /^(\+44|0)?[0-9]{10}$/, length: 10 },
    'AU': { code: '+61', regex: /^(\+61|0)?[2-9]\d{8}$/, length: 9 },
    'CA': { code: '+1', regex: /^(\+1)?[2-9]\d{2}[2-9](?!11)\d{6}$/, length: 10 }
  };

  static formatPhoneNumber(phoneNumber, countryCode = 'IN') {
    try {
      if (!phoneNumber) return null;

      const country = this.COUNTRY_CODES[countryCode];
      if (!country) {
        logger.loggerWarn(`Unknown country code: ${countryCode}`);
        return phoneNumber;
      }

      const cleaned = phoneNumber.replace(/\D/g, '');
      
      if (cleaned.startsWith('0')) {
        return `${country.code}${cleaned.substring(1)}`;
      }
      
      if (cleaned.startsWith(country.code.replace('+', ''))) {
        return `${country.code}${cleaned.substring(country.code.replace('+', '').length)}`;
      }
      
      if (cleaned.length === country.length) {
        return `${country.code}${cleaned}`;
      }

      if (cleaned.startsWith(country.code)) {
        return phoneNumber.startsWith('+') ? phoneNumber : `+${cleaned}`;
      }

      logger.loggerWarn(`Phone number does not match expected format for ${countryCode}: ${phoneNumber}`);
      return phoneNumber;
    } catch (error) {
      logger.loggerError(`Error formatting phone number: ${error.message}`);
      return phoneNumber;
    }
  }

  static validatePhoneNumber(phoneNumber, countryCode = 'IN') {
    try {
      if (!phoneNumber) return { valid: false, error: 'Phone number is required' };

      const country = this.COUNTRY_CODES[countryCode];
      if (!country) {
        return { valid: false, error: `Unknown country code: ${countryCode}` };
      }

      const cleaned = phoneNumber.replace(/\D/g, '');

      if (!country.regex.test(phoneNumber)) {
        return {
          valid: false,
          error: `Invalid phone number format for ${countryCode}. Expected ${country.length} digits.`
        };
      }

      return { valid: true };
    } catch (error) {
      logger.loggerError(`Error validating phone number: ${error.message}`);
      return { valid: false, error: error.message };
    }
  }

  static normalizePhoneNumber(phoneNumber, countryCode = 'IN') {
    try {
      const validation = this.validatePhoneNumber(phoneNumber, countryCode);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formatted = this.formatPhoneNumber(phoneNumber, countryCode);
      const cleaned = formatted.replace(/\D/g, '');

      return {
        raw: phoneNumber,
        formatted: formatted,
        e164: `+${cleaned}`,
        countryCode,
        valid: true
      };
    } catch (error) {
      logger.loggerError(`Error normalizing phone number: ${error.message}`);
      return {
        raw: phoneNumber,
        valid: false,
        error: error.message
      };
    }
  }

  static extractCountryCode(phoneNumber) {
    try {
      if (phoneNumber.startsWith('+')) {
        const code = phoneNumber.substring(0, 3);
        for (const [country, details] of Object.entries(this.COUNTRY_CODES)) {
          if (details.code === code) {
            return country;
          }
        }
      }
      return 'IN';
    } catch (error) {
      logger.loggerError(`Error extracting country code: ${error.message}`);
      return 'IN';
    }
  }

  static isMobileNumber(phoneNumber, countryCode = 'IN') {
    try {
      const validation = this.validatePhoneNumber(phoneNumber, countryCode);
      return validation.valid;
    } catch (error) {
      logger.loggerError(`Error checking if mobile number: ${error.message}`);
      return false;
    }
  }

  static formatForDisplay(phoneNumber, countryCode = 'IN') {
    try {
      const country = this.COUNTRY_CODES[countryCode];
      if (!country) return phoneNumber;

      const cleaned = phoneNumber.replace(/\D/g, '');
      
      if (countryCode === 'IN') {
        return `+91 ${cleaned.slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')}`;
      } else if (countryCode === 'US' || countryCode === 'CA') {
        return `+1 (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
      } else if (countryCode === 'UK') {
        return `+44 ${cleaned.slice(-10).replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}`;
      }

      return this.formatPhoneNumber(phoneNumber, countryCode);
    } catch (error) {
      logger.loggerError(`Error formatting phone for display: ${error.message}`);
      return phoneNumber;
    }
  }

  static validateBulkPhoneNumbers(phoneNumbers, countryCode = 'IN') {
    try {
      const results = {
        valid: [],
        invalid: []
      };

      for (const phone of phoneNumbers) {
        const validation = this.validatePhoneNumber(phone, countryCode);
        if (validation.valid) {
          results.valid.push(this.formatPhoneNumber(phone, countryCode));
        } else {
          results.invalid.push({
            phone,
            error: validation.error
          });
        }
      }

      return results;
    } catch (error) {
      logger.loggerError(`Error validating bulk phone numbers: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PhoneFormatter;
