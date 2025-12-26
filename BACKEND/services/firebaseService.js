const { isInitialized, getMessaging } = require('../firebase/firebase-admin');
const { sendFCMv1Multicast } = require('../firebase/fcm-v1');
const logger = require('../utils/logger');
const GPSNotificationService = require('../firebase/sendNotification');

const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!isInitialized()) {
      logger.loggerWarn('Firebase not initialized, skipping notification');
      return false;
    }

    const messaging = getMessaging();
    if (!messaging) {
      logger.loggerWarn('Firebase messaging unavailable');
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

    const response = await messaging.send(message);
    logger.loggerInfo(`Notification sent successfully: ${response}`);
    return true;
  } catch (error) {
    logger.loggerError(`Error sending notification: ${error.message}`);
    return false;
  }
};

const sendMulticast = async (fcmTokens, title, body, data = {}) => {
  try {
    if (!fcmTokens || fcmTokens.length === 0) {
      logger.loggerWarn('⚠️ FCM v1: No FCM tokens provided');
      return { successCount: 0, failureCount: 0 };
    }

    logger.loggerInfo(`🔄 Switching to FCM v1 API (Dashboard-tracked)`);
    const result = await sendFCMv1Multicast(fcmTokens, title, body, data);

    return {
      successCount: result.successCount,
      failureCount: result.failureCount
    };
  } catch (error) {
    logger.loggerError(`❌ FCM v1 Error: ${error.message}`);
    return { successCount: 0, failureCount: fcmTokens?.length || 0 };
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

const sendCurrentStopNotification = async (parentFcmTokens, studentName, currentStop, vehicleNumber) => {
  try {
    if (!parentFcmTokens || parentFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const title = `Current Stop - ${studentName}`;
    const body = `Your child is currently at: ${currentStop?.name || 'Unknown Stop'}`;
    
    const data = {
      type: 'current_stop',
      studentName,
      stopName: currentStop?.name || 'Unknown',
      stopLocation: JSON.stringify({
        latitude: currentStop?.latitude,
        longitude: currentStop?.longitude
      }),
      vehicleNumber,
      timestamp: new Date().toISOString()
    };

    return await sendMulticast(parentFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending current stop notification: ${error.message}`);
    return { successCount: 0, failureCount: parentFcmTokens?.length || 0 };
  }
};

const sendNextStopNotification = async (parentFcmTokens, studentName, nextStop, vehicleNumber) => {
  try {
    if (!parentFcmTokens || parentFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const title = `Next Stop - ${studentName}`;
    const body = `Next stop: ${nextStop?.name || 'Unknown Stop'}`;
    
    const data = {
      type: 'next_stop',
      studentName,
      stopName: nextStop?.name || 'Unknown',
      stopLocation: JSON.stringify({
        latitude: nextStop?.latitude,
        longitude: nextStop?.longitude
      }),
      vehicleNumber,
      timestamp: new Date().toISOString()
    };

    return await sendMulticast(parentFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending next stop notification: ${error.message}`);
    return { successCount: 0, failureCount: parentFcmTokens?.length || 0 };
  }
};

const sendTripStatusNotification = async (parentFcmTokens, studentName, status, additionalInfo = {}) => {
  try {
    if (!parentFcmTokens || parentFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    let title = '';
    let body = '';

    switch (status) {
      case 'trip_started':
        title = `Trip Started - ${studentName}`;
        body = `Your child's trip has started`;
        break;
      case 'approaching_stop':
        title = `Approaching Stop - ${studentName}`;
        body = `Bus is approaching: ${additionalInfo.stopName || 'next stop'}`;
        break;
      case 'on_the_way':
        title = `On the Way - ${studentName}`;
        body = `Your child is on the way. ETA: ${additionalInfo.eta || 'Shortly'}`;
        break;
      case 'trip_completed':
        title = `Trip Completed - ${studentName}`;
        body = `Your child's trip has been completed`;
        break;
      case 'trip_delayed':
        title = `Trip Delayed - ${studentName}`;
        body = `Trip is delayed by ${additionalInfo.delayMinutes || 'a few'} minutes`;
        break;
      default:
        title = `Trip Update - ${studentName}`;
        body = `Trip status: ${status}`;
    }
    
    const data = {
      type: status,
      studentName,
      timestamp: new Date().toISOString(),
      ...Object.entries(additionalInfo).reduce((acc, [key, value]) => {
        if (typeof value === 'object') {
          acc[key] = JSON.stringify(value);
        } else {
          acc[key] = String(value);
        }
        return acc;
      }, {})
    };

    return await sendMulticast(parentFcmTokens, title, body, data);
  } catch (error) {
    logger.loggerError(`Error sending trip status notification: ${error.message}`);
    return { successCount: 0, failureCount: parentFcmTokens?.length || 0 };
  }
};

const tripLiveUpdateTracker = new Map();

const generateTripStatusHash = (tripData) => {
  const currentStopName = tripData.currentStop?.name || 'N/A';
  const nextStopName = tripData.nextStop?.name || 'N/A';
  const distanceBucket = Math.round((tripData.distanceToNextStop || 0) / 100) * 100;
  return `${currentStopName}|${nextStopName}|${distanceBucket}`;
};

const sendTripLiveUpdateNotification = async (parentFcmTokens, studentName, tripData, endUserId, tripId) => {
  try {
    if (!parentFcmTokens || parentFcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const now = new Date();
    const tripKey = `${endUserId || 'unknown'}:${tripId || 'unknown'}`;
    const currentStatusHash = generateTripStatusHash(tripData);
    const lastSentData = tripLiveUpdateTracker.get(tripKey);
    const lastStatusHash = lastSentData?.statusHash;

    if (lastStatusHash === currentStatusHash) {
      logger.loggerInfo(`⏭ Trip status unchanged for ${endUserId}/${tripId} (${currentStatusHash}), skipping notification`);
      return { successCount: 0, failureCount: 0, isDuplicate: true };
    }

    const title = `Live Trip Update - ${studentName}`;
    const body = `Bus is en route. Current location: ${tripData.currentLocation?.address || 'On route'}`;
    
    const routePointsData = Array.isArray(tripData.route_points) 
      ? tripData.route_points.map(point => ({
          stop_id: point.stop_id || '',
          name: point.name || '',
          latitude: point.latitude || 0,
          longitude: point.longitude || 0,
          landmark: point.landmark || '',
          approximate_reach_time: point.approximate_reach_time || '',
          geofence_radius_meters: point.geofence_radius_meters || 100,
          stop_status: point.stop_status || null,
          sequence: point.sequence || 0,
          order: point.order || 0
        }))
      : [];
    
    const data = {
      type: 'trip_live_update',
      studentName,
      currentLocation: JSON.stringify(tripData.currentLocation),
      currentStop: tripData.currentStop?.name || 'N/A',
      nextStop: tripData.nextStop?.name || 'N/A',
      vehicleNumber: tripData.vehicleNumber || 'N/A',
      distanceToNextStop: tripData.distanceToNextStop?.toString() || 'N/A',
      eta: tripData.eta || 'N/A',
      route_points: JSON.stringify(routePointsData),
      timestamp: now.toISOString()
    };

    logger.loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.loggerInfo(`📤 SENDING TRIP LIVE UPDATE NOTIFICATION`);
    logger.loggerInfo(`   User: ${endUserId}`);
    logger.loggerInfo(`   Trip: ${tripId}`);
    logger.loggerInfo(`   Status Change: ${lastStatusHash || 'INITIAL'} → ${currentStatusHash}`);
    logger.loggerInfo(`   Title: "${title}"`);
    logger.loggerInfo(`   Body: "${body}"`);
    logger.loggerInfo(`   FCM Tokens: ${parentFcmTokens.length}`);
    logger.loggerInfo(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const result = await sendMulticast(parentFcmTokens, title, body, data);

    logger.loggerInfo(`📊 FIREBASE RESPONSE FOR TRIP UPDATE:`);
    logger.loggerInfo(`   Success Count: ${result.successCount}`);
    logger.loggerInfo(`   Failure Count: ${result.failureCount}`);
    logger.loggerInfo(`   Total Attempted: ${parentFcmTokens.length}`);

    if (result.successCount > 0) {
      tripLiveUpdateTracker.set(tripKey, {
        sentAt: now,
        type: 'trip_live_update',
        endUserId,
        tripId,
        statusHash: currentStatusHash
      });
      logger.loggerInfo(`✅ SUCCESS - Notification delivered to ${result.successCount}/${parentFcmTokens.length} tokens`);
      logger.loggerInfo(`✅ Status tracked: ${currentStatusHash}`);
    } else {
      logger.loggerError(`❌ FAILED - No successful deliveries. Check FCM tokens.`);
    }

    return result;
  } catch (error) {
    logger.loggerError(`Error sending trip live update notification: ${error.message}`);
    return { successCount: 0, failureCount: parentFcmTokens?.length || 0 };
  }
};

module.exports = {
  sendNotification,
  sendMulticast,
  sendStudentNotificationToParents,
  sendSpeedAlertNotification,
  sendSOSNotification,
  sendCurrentStopNotification,
  sendNextStopNotification,
  sendTripStatusNotification,
  sendTripLiveUpdateNotification
};
