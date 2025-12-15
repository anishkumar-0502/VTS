require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');

const FCM_TOKEN_REGEX = /^[a-zA-Z0-9_\-:]{100,}$/;

const isValidFCMToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length < 100) return false;
  return FCM_TOKEN_REGEX.test(trimmed);
};

async function cleanupInvalidTokens() {
  try {
    const mongoUri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/') +
      (process.env.MONGODB_DB_NAME || 'vts-db');

    logger.loggerInfo(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    logger.loggerInfo('Connected to MongoDB');

    const users = await User.find({
      fcm_tokens: { $exists: true, $ne: [] }
    });

    logger.loggerInfo(`Found ${users.length} users with FCM tokens`);

    let totalRemoved = 0;
    let usersUpdated = 0;

    for (const user of users) {
      const originalCount = user.fcm_tokens.length;
      const validTokens = user.fcm_tokens.filter(token => isValidFCMToken(token));
      const removed = originalCount - validTokens.length;

      if (removed > 0) {
        user.fcm_tokens = validTokens;
        user.fcm_token = validTokens.length > 0 ? validTokens[0] : null;
        await user.save();

        totalRemoved += removed;
        usersUpdated++;

        const removedTokens = user.fcm_tokens.slice(0, removed).map(t => `${String(t).slice(0, 10)}...`);
        logger.loggerInfo(
          `User ${user.user_id}: Removed ${removed}/${originalCount} invalid tokens`
        );
      }
    }

    logger.loggerInfo(`\n${'='.repeat(60)}`);
    logger.loggerInfo(`✅ Cleanup Complete`);
    logger.loggerInfo(`${'='.repeat(60)}`);
    logger.loggerInfo(`Users updated: ${usersUpdated}`);
    logger.loggerInfo(`Total invalid tokens removed: ${totalRemoved}`);
    logger.loggerInfo(`${'='.repeat(60)}\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.loggerError(`Error during cleanup: ${error.message}`);
    logger.loggerError(error);
    process.exit(1);
  }
}

cleanupInvalidTokens();
