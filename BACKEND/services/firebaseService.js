const admin = require('firebase-admin');
const logger = require('../utils/logger');

let initialized = false;

const initializeFirebase = () => {
  try {
    if (!initialized) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
        './config/firebase-service-account.json';
      
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      initialized = true;
      logger.loggerInfo('Firebase initialized successfully');
    }
  } catch (error) {
    logger.loggerWarn(`Firebase initialization skipped: ${error.message}`);
  }
};

const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!initialized) {
      logger.loggerWarn('Firebase not initialized, skipping notification');
      return false;
    }

    if (!fcmToken) {
      logger.loggerWarn('FCM token not provided');
      return false;
    }

    const message = {
      notification: {
        title,
        body
      },
      data,
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    logger.loggerInfo(`Notification sent successfully: ${response}`);
    return true;
  } catch (error) {
    logger.loggerError(`Error sending notification: ${error.message}`);
    return false;
  }
};

const sendMulticast = async (fcmTokens, title, body, data = {}) => {
  try {
    if (!initialized) {
      logger.loggerWarn('Firebase not initialized, skipping notifications');
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      logger.loggerWarn('No FCM tokens provided');
      return { successCount: 0, failureCount: 0 };
    }

    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens: fcmTokens
    };

    const response = await admin.messaging().sendMulticast(message);
    logger.loggerInfo(`Multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    logger.loggerError(`Error sending multicast: ${error.message}`);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
};

const sendStudentNotificationToParents = async (parentFcmTokens, studentName, status, location) => {
  try {
    if (!parentFcmTokens || parentFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const statusText = status === 'picked_up' ? 'picked up' : 'dropped off';
    const title = `${studentName} ${statusText}`;
    const body = `Your child has been ${statusText} at ${location?.name || 'the stop'}`;
    
    const data = {
      type: `student_${status}`,
      studentName,
      location: JSON.stringify(location),
      timestamp: new Date().toISOString()
    };

    return await sendMulticast(parentFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending student notification: ${error.message}`);
    return { successCount: 0, failureCount: parentFcmTokens?.length || 0 };
  }
};

const sendSpeedAlertNotification = async (adminFcmTokens, driverName, speed, speedLimit) => {
  try {
    if (!adminFcmTokens || adminFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const title = 'Speed Limit Exceeded';
    const body = `Driver ${driverName} is speeding: ${speed} km/h (limit: ${speedLimit} km/h)`;
    
    const data = {
      type: 'speed_alert',
      driverName,
      currentSpeed: speed.toString(),
      speedLimit: speedLimit.toString(),
      timestamp: new Date().toISOString()
    };

    return await sendMulticast(adminFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending speed alert: ${error.message}`);
    return { successCount: 0, failureCount: adminFcmTokens?.length || 0 };
  }
};

const sendSOSNotification = async (adminFcmTokens, driverName, location) => {
  try {
    if (!adminFcmTokens || adminFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const title = 'SOS Alert - Driver Emergency';
    const body = `Driver ${driverName} has activated SOS at location: ${location?.address || 'Unknown'}`;
    
    const data = {
      type: 'sos_alert',
      driverName,
      location: JSON.stringify(location),
      timestamp: new Date().toISOString()
    };

    return await sendMulticast(adminFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending SOS notification: ${error.message}`);
    return { successCount: 0, failureCount: adminFcmTokens?.length || 0 };
  }
};

module.exports = {
  initializeFirebase,
  sendNotification,
  sendMulticast,
  sendStudentNotificationToParents,
  sendSpeedAlertNotification,
  sendSOSNotification
};
