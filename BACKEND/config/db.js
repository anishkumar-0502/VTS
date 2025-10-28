const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');
require('dotenv').config();

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'vts_db';

let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(url);
    try {
      await client.connect();
      logger.loggerSuccess('Connected to the database');
    } catch (error) {
      logger.loggerError(`Error connecting to the database: ${error}`);
      throw error;
    }
  }
  return client.db(dbName);
}

async function closeConnection() {
  try {
    if (client) {
      await client.close();
      logger.loggerInfo('Database connection closed successfully');
      client = null;
      return true;
    }
    return false;
  } catch (error) {
    logger.loggerError(`Error closing database connection: ${error.message}`);
    return false;
  }
}

function getClient() {
  return client;
}

module.exports = {
  connectToDatabase,
  closeConnection,
  getClient
};
