const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET);
    return token;
  } catch (error) {
    logger.loggerError('Token generation error', error.message);
    throw error;
  }
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.loggerWarn('Token verification error', error.message);
    throw error;
  }
};

const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    logger.loggerError('Token decode error', error.message);
    throw error;
  }
};

module.exports = { generateToken, verifyToken, decodeToken };
