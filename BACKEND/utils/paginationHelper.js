const logger = require('./logger');

class PaginationHelper {
  static DEFAULT_LIMIT = 10;
  static MAX_LIMIT = 100;

  static isPaginationRequested(query) {
    return query.page !== undefined || query.limit !== undefined;
  }

  static getPaginationParams(query) {
    try {
      const isPaginated = this.isPaginationRequested(query);
      
      if (!isPaginated) {
        return {
          page: null,
          limit: null,
          skip: 0,
          isPaginated: false,
          sort: query.sort || '-createdAt'
        };
      }

      let page = parseInt(query.page) || 1;
      let limit = parseInt(query.limit) || this.DEFAULT_LIMIT;

      if (page < 1) page = 1;
      if (limit < 1) limit = this.DEFAULT_LIMIT;
      if (limit > this.MAX_LIMIT) limit = this.MAX_LIMIT;

      const skip = (page - 1) * limit;

      return {
        page,
        limit,
        skip,
        isPaginated: true,
        sort: query.sort || '-createdAt'
      };
    } catch (error) {
      logger.loggerError(`Error parsing pagination params: ${error.message}`);
      return {
        page: 1,
        limit: this.DEFAULT_LIMIT,
        skip: 0,
        isPaginated: true,
        sort: '-createdAt'
      };
    }
  }

  static formatPaginatedResponse(data, total, page, limit) {
    try {
      if (page === null || limit === null) {
        return { data };
      }

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize: limit,
          totalRecords: total,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        }
      };
    } catch (error) {
      logger.loggerError(`Error formatting paginated response: ${error.message}`);
      return { data };
    }
  }

  static formatResponse(data, isPaginated = true, total = 0, page = null, limit = null) {
    if (!isPaginated) {
      return { data };
    }
    return this.formatPaginatedResponse(data, total, page, limit);
  }

  static getSortObject(sortString) {
    try {
      if (!sortString) return { createdAt: -1 };

      const sortObj = {};
      const fields = sortString.split(',');

      for (const field of fields) {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          sortObj[trimmed.substring(1)] = -1;
        } else {
          sortObj[trimmed] = 1;
        }
      }

      return sortObj;
    } catch (error) {
      logger.loggerError(`Error creating sort object: ${error.message}`);
      return { createdAt: -1 };
    }
  }

  static validatePaginationParams(req) {
    const errors = [];

    if (req.query.page && (isNaN(req.query.page) || parseInt(req.query.page) < 1)) {
      errors.push('Page must be a positive integer');
    }

    if (req.query.limit && (isNaN(req.query.limit) || parseInt(req.query.limit) < 1)) {
      errors.push('Limit must be a positive integer');
    }

    if (req.query.limit && parseInt(req.query.limit) > this.MAX_LIMIT) {
      errors.push(`Limit cannot exceed ${this.MAX_LIMIT}`);
    }

    return errors;
  }

  static createPaginationMiddleware() {
    return (req, res, next) => {
      const errors = this.validatePaginationParams(req);
      if (errors.length > 0) {
        return res.status(400).json({
          error: true,
          message: 'Pagination validation failed',
          errors
        });
      }

      req.pagination = this.getPaginationParams(req.query);
      req.isPaginated = req.pagination.isPaginated;
      next();
    };
  }
}

module.exports = PaginationHelper;
