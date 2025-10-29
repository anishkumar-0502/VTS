const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.loggerError('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  const response = {
    error: true,
    message,
    data: null,
    statusCode
  };

  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      stack: err.stack
    };
  }

  res.status(statusCode).json(response);
};

class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, CustomError };
