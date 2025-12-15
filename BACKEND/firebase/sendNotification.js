const { isInitialized, getMessaging } = require('../firebase/firebase-admin');
const User = require('../models/User');
const Device = require('../models/Device');
const Vehicle = require('../models/Vehicle');
const ScheduledTrip = require('../models/ScheduledTrip');
const Trip = require('../models/Trip');
const EndUser = require('../models/EndUser');
const { calculateDistance } = require('../utils/distanceUtils');
const {
  loggerNotification = console.log,
  loggerWarn = console.warn,
  loggerError = console.error,
  loggerInfo = console.info
} = require('../utils/logger') || {};

const MAX_TOKENS_PER_BATCH = 500;
const GEOFENCE_RADIUS_DEFAULT = 100;
const END_USER_ARRIVAL_RADIUS = 50;
const ROUTE_POINT_MATCH_RADIUS = 200;

const notificationTracker = new Map();

const getTrackerKey = (type, endUserId, tripId, identifier) => {
  return `${type}:${endUserId}:${tripId}:${identifier}`;
};

const isNotificationSent = (type, endUserId, tripId, identifier) => {
  const key = getTrackerKey(type, endUserId, tripId, identifier);
  return notificationTracker.has(key);
};

const markNotificationSent = (type, endUserId, tripId, identifier) => {
  const key = getTrackerKey(type, endUserId, tripId, identifier);
  notificationTracker.set(key, {
    sentAt: new Date(),
    type,
    endUserId,
    tripId,
    identifier
  });
};

const clearTripNotifications = (tripId) => {
  for (const [key] of notificationTracker.entries()) {
    if (key.includes(`:${tripId}:`)) {
      notificationTracker.delete(key);
    }
  }
};

/**
 * Split array into chunks
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

class GPSNotificationService {
  /**
   * Send notification to one user (supports many tokens)
   */
  static async sendLocationUpdateNotification(
    fcmTokens,
    latitude,
    longitude,
    speedKmh,
    userData = {}
  ) {
    const userId =
      userData?.userId || userData?.endUserId || userData?.id || 'unknown';

    try {
      if (!isInitialized()) {
        loggerWarn('Firebase not initialized — skipping notification');
        return {
          successCount: 0,
          failureCount: fcmTokens?.length || 0,
          userId
        };
      }

      if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
        loggerWarn(`No FCM tokens for user ${userId}`);
        return { successCount: 0, failureCount: 0, userId };
      }

      

      const messaging = getMessaging();
      if (!messaging) {
        loggerWarn('Firebase messaging unavailable');
        return { successCount: 0, failureCount: fcmTokens.length, userId };
      }

      const title = 'Live Location Update';
      const body = `Your vehicle is moving at ${String(speedKmh)} km/h`;

      const data = {
        latitude: String(latitude),
        longitude: String(longitude),
        speed: String(speedKmh),
        timestamp: new Date().toISOString()
      };

      // Split tokens into batches
      const tokenBatches = chunkArray(fcmTokens, MAX_TOKENS_PER_BATCH);

      let totalSuccess = 0;
      let totalFailure = 0;

      // Each batch
      for (const tokens of tokenBatches) {
        const message = {
          tokens,
          notification: { title, body },
          data
        };

        /**
         * Firebase Admin v13+  
         * ❗ MUST use sendEachForMulticast()
         */
        const resp = await messaging.sendEachForMulticast(message);

        // Count success/failures
        const successes = resp.responses.filter(r => r.success).length;
        const failures = resp.responses.filter(r => !r.success).length;

        totalSuccess += successes;
        totalFailure += failures;

        loggerInfo(
          `FCM batch for ${userId}: ${successes}/${tokens.length} succeeded, ${failures} failed`
        );

        if (failures > 0) {
          const failedTokens = resp.responses
            .map((r, i) => ({ ok: r.success, token: tokens[i], error: r.error }))
            .filter(x => !x.ok);

          const failedTokensToRemove = failedTokens.map(x => x.token);
          const failedTokensInfo = failedTokens.map(x => ({
            tokenPrefix: String(x.token).slice(0, 10),
            error: x.error?.message || x.error
          }));

          loggerWarn(`Invalid tokens for ${userId}: ${JSON.stringify(failedTokensInfo)}`);

          if (failedTokensToRemove.length > 0) {
            try {
              await User.findOneAndUpdate(
                { user_id: userId },
                { $pull: { fcm_tokens: { $in: failedTokensToRemove } } }
              );
              loggerInfo(
                `Removed ${failedTokensToRemove.length} invalid tokens for user ${userId}`
              );
            } catch (cleanupError) {
              loggerError(
                `Error removing invalid tokens for ${userId}: ${cleanupError.message}`
              );
            }
          }
        }
      }

      // Success log
      if (totalSuccess > 0) {
        loggerNotification(
          `✅ SENT ${totalSuccess}/${fcmTokens.length} GPS notifications to ${userId}`,
          { title, body }
        );
      }

      if (totalFailure > 0) {
        loggerWarn(
          `⚠️ ${totalFailure} notifications failed for user ${userId}`
        );
      }

      return { successCount: totalSuccess, failureCount: totalFailure, userId };
    } catch (error) {
      loggerError(
        `❌ Error sending GPS notification to ${userId}: ${
          error?.message || error
        }`
      );
      return {
        successCount: 0,
        failureCount: Array.isArray(fcmTokens) ? fcmTokens.length : 0,
        userId
      };
    }
  }

  static async sendVehicleApproachingStopNotification(locationFrame) {
    try {
      const trackerId = locationFrame.tracker_id;
      const frameLatitude = locationFrame.latitude;
      const frameLongitude = locationFrame.longitude;
      const speedKmh = locationFrame.speed_kmh || 0;

      if (!trackerId || frameLatitude === undefined || frameLongitude === undefined) {
        loggerWarn('Invalid location frame - missing tracker_id or coordinates');
        return { successCount: 0, failureCount: 0, error: 'Invalid frame data' };
      }

      const device = await Device.findOne({
        $or: [
          { tracker_id: trackerId },
          { device_id: trackerId }
        ]
      }).lean();

      if (!device) {
        loggerWarn(`Device not found for tracker_id: ${trackerId}`);
        return { successCount: 0, failureCount: 0, error: 'Device not registered' };
      }

      const vehicleId = device.assigned_vehicle_id;
      if (!vehicleId) {
        loggerInfo(`Device ${trackerId} has no assigned vehicle`);
        return { successCount: 0, failureCount: 0, error: 'No assigned vehicle' };
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: vehicleId })
        .select('end_user_ids current_trip_id vehicle_number')
        .lean();

      if (!vehicle || !vehicle.current_trip_id) {
        loggerInfo(`Vehicle ${vehicleId} has no active trip`);
        return { successCount: 0, failureCount: 0, error: 'No active trip' };
      }

      let trip = await ScheduledTrip.findOne({
        scheduled_trip_id: vehicle.current_trip_id
      })
      .select('route_points trip_type')
      .lean();

      if (!trip) {
        trip = await Trip.findOne({
          trip_id: vehicle.current_trip_id
        })
        .select('route_points')
        .lean();
      }

      if (!trip || !Array.isArray(trip.route_points) || trip.route_points.length === 0) {
        loggerInfo(`No route points found for trip ${vehicle.current_trip_id}`);
        return { successCount: 0, failureCount: 0, error: 'No route points' };
      }

      if (!Array.isArray(vehicle.end_user_ids) || vehicle.end_user_ids.length === 0) {
        loggerInfo(`Vehicle ${vehicleId} has no assigned end users`);
        return { successCount: 0, failureCount: 0, error: 'No end users' };
      }

      const tripType = trip.trip_type || 'pickup';
      let totalSuccess = 0;
      let totalFailure = 0;
      const notificationResults = [];

      for (const endUserId of vehicle.end_user_ids) {
        try {
          const endUser = await EndUser.findOne({ end_user_id: endUserId })
            .select('user_id pickup_location dropoff_location')
            .lean();

          if (!endUser || !endUser.user_id) {
            continue;
          }

          const targetLocation = tripType === 'pickup' ? endUser.pickup_location : endUser.dropoff_location;

          if (!targetLocation || targetLocation.latitude === undefined || targetLocation.longitude === undefined) {
            loggerWarn(`No valid ${tripType} location for end user ${endUserId}`);
            continue;
          }

          const matchedRoutePoint = trip.route_points.find(point => {
            if (!point.latitude || !point.longitude) return false;
            const distance = calculateDistance(
              point.latitude,
              point.longitude,
              targetLocation.latitude,
              targetLocation.longitude
            );
            return distance <= ROUTE_POINT_MATCH_RADIUS;
          });

          if (!matchedRoutePoint) {
            continue;
          }

          const vehicleToRoutePointDistance = calculateDistance(
            frameLatitude,
            frameLongitude,
            matchedRoutePoint.latitude,
            matchedRoutePoint.longitude
          );

          if (vehicleToRoutePointDistance <= GEOFENCE_RADIUS_DEFAULT) {
            const alreadySent = isNotificationSent('vehicle_approaching_stop', endUserId, vehicle.current_trip_id, matchedRoutePoint.stop_id);
            if (alreadySent) {
              loggerInfo(`Notification already sent for ${endUserId} at stop ${matchedRoutePoint.stop_id}`);
              continue;
            }

            const parentUser = await User.findOne({ user_id: endUser.user_id })
              .select('fcm_tokens name')
              .lean();

            if (!parentUser || !Array.isArray(parentUser.fcm_tokens) || parentUser.fcm_tokens.length === 0) {
              loggerWarn(`Parent user ${endUser.user_id} has no FCM tokens`);
              continue;
            }

            const stopInfo = matchedRoutePoint.name
              ? `${matchedRoutePoint.name} (Stop ${matchedRoutePoint.sequence || 1})`
              : `Stop ${matchedRoutePoint.sequence || 1}`;

            const title = tripType === 'pickup' ? 'Vehicle Approaching Pick-up' : 'Vehicle Approaching Drop-off';
            const body = `The vehicle is approaching your ${tripType} location at ${stopInfo}`;

            const data = {
              notificationType: 'vehicle_approaching_stop',
              vehicleLatitude: String(frameLatitude),
              vehicleLongitude: String(frameLongitude),
              speed: String(speedKmh),
              targetLatitude: String(targetLocation.latitude),
              targetLongitude: String(targetLocation.longitude),
              stopId: matchedRoutePoint.stop_id || '',
              stopName: matchedRoutePoint.name || stopInfo,
              stopSequence: String(matchedRoutePoint.sequence || 1),
              stopLatitude: String(matchedRoutePoint.latitude),
              stopLongitude: String(matchedRoutePoint.longitude),
              tripType: tripType,
              vehicleNumber: vehicle.vehicle_number || vehicleId,
              distance: String(vehicleToRoutePointDistance.toFixed(2)),
              endUserId: endUserId,
              timestamp: new Date().toISOString()
            };

            const tokenBatches = chunkArray(parentUser.fcm_tokens, MAX_TOKENS_PER_BATCH);

            for (const tokens of tokenBatches) {
              const message = {
                tokens,
                notification: { title, body },
                data
              };

              const resp = await getMessaging().sendEachForMulticast(message);

              const successes = resp.responses.filter(r => r.success).length;
              const failures = resp.responses.filter(r => !r.success).length;

              totalSuccess += successes;
              totalFailure += failures;

              if (successes > 0) {
                markNotificationSent('vehicle_approaching_stop', endUserId, vehicle.current_trip_id, matchedRoutePoint.stop_id);
              }

              notificationResults.push({
                endUserId,
                parentName: parentUser.name,
                successes,
                failures,
                notificationType: 'vehicle_approaching_stop',
                stopId: matchedRoutePoint.stop_id,
                stopName: matchedRoutePoint.name || stopInfo,
                stopSequence: matchedRoutePoint.sequence || 1
              });

              loggerInfo(
                `Vehicle approaching stop notification for ${endUserId}: ${successes}/${tokens.length} succeeded`
              );

              if (failures > 0) {
                const failedTokens = resp.responses
                  .map((r, i) => ({ ok: r.success, token: tokens[i], error: r.error }))
                  .filter(x => !x.ok);

                const failedTokensToRemove = failedTokens.map(x => x.token);

                if (failedTokensToRemove.length > 0) {
                  try {
                    await User.findOneAndUpdate(
                      { user_id: endUser.user_id },
                      { $pull: { fcm_tokens: { $in: failedTokensToRemove } } }
                    );
                    loggerInfo(
                      `Removed ${failedTokensToRemove.length} invalid tokens for user ${endUser.user_id}`
                    );
                  } catch (cleanupError) {
                    loggerError(
                      `Error removing invalid tokens for ${endUser.user_id}: ${cleanupError.message}`
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          loggerError(`Error processing end user ${endUserId}: ${error.message}`);
          totalFailure += 1;
        }
      }

      if (totalSuccess > 0) {
        loggerNotification(
          `✅ Vehicle approaching stop notifications sent: ${totalSuccess} delivered`,
          { results: notificationResults }
        );
      }

      return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        trackerId,
        vehicleId,
        notificationType: 'vehicle_approaching_stop',
        results: notificationResults
      };
    } catch (error) {
      loggerError(
        `❌ Error sending vehicle approaching stop notification: ${error.message}`
      );
      return {
        successCount: 0,
        failureCount: 0,
        error: error.message
      };
    }
  }

  static async sendEndUserArrivalNotification(endUserLocationData) {
    try {
      const endUserId = endUserLocationData.end_user_id;
      const userLatitude = endUserLocationData.latitude;
      const userLongitude = endUserLocationData.longitude;

      if (!endUserId || userLatitude === undefined || userLongitude === undefined) {
        loggerWarn('Invalid end user location data - missing end_user_id or coordinates');
        return { successCount: 0, failureCount: 0, error: 'Invalid data' };
      }

      const endUser = await EndUser.findOne({ end_user_id: endUserId })
        .select('user_id pickup_location dropoff_location assigned_vehicle_id')
        .lean();

      if (!endUser || !endUser.user_id) {
        loggerWarn(`End user not found: ${endUserId}`);
        return { successCount: 0, failureCount: 0, error: 'End user not found' };
      }

      const parentUser = await User.findOne({ user_id: endUser.user_id })
        .select('fcm_tokens name')
        .lean();

      if (!parentUser || !Array.isArray(parentUser.fcm_tokens) || parentUser.fcm_tokens.length === 0) {
        loggerWarn(`Parent user ${endUser.user_id} has no FCM tokens`);
        return { successCount: 0, failureCount: 0, error: 'No parent FCM tokens' };
      }

      let arrivalType = null;
      let targetLocation = null;
      let distanceToTarget = null;

      const pickupDistance = endUser.pickup_location && endUser.pickup_location.latitude && endUser.pickup_location.longitude
        ? calculateDistance(userLatitude, userLongitude, endUser.pickup_location.latitude, endUser.pickup_location.longitude)
        : Infinity;

      const dropoffDistance = endUser.dropoff_location && endUser.dropoff_location.latitude && endUser.dropoff_location.longitude
        ? calculateDistance(userLatitude, userLongitude, endUser.dropoff_location.latitude, endUser.dropoff_location.longitude)
        : Infinity;

      if (pickupDistance <= END_USER_ARRIVAL_RADIUS) {
        arrivalType = 'pickup';
        targetLocation = endUser.pickup_location;
        distanceToTarget = pickupDistance;
      } else if (dropoffDistance <= END_USER_ARRIVAL_RADIUS) {
        arrivalType = 'dropoff';
        targetLocation = endUser.dropoff_location;
        distanceToTarget = dropoffDistance;
      }

      if (!arrivalType) {
        loggerInfo(`End user ${endUserId} not near pickup or dropoff location`);
        return { successCount: 0, failureCount: 0, error: 'Not near target location' };
      }

      const vehicleId = endUser.assigned_vehicle_id;

      if (!vehicleId) {
        loggerInfo(`End user ${endUserId} has no assigned vehicle`);
        return { successCount: 0, failureCount: 0, error: 'No assigned vehicle' };
      }

      const alreadyNotified = isNotificationSent('child_reached_location', endUserId, vehicleId, arrivalType);
      if (alreadyNotified) {
        loggerInfo(`Child arrival notification already sent for ${endUserId} (${arrivalType})`);
        return { successCount: 0, failureCount: 0, error: 'Already notified' };
      }

      const vehicle = await Vehicle.findOne({ vehicle_id: vehicleId })
        .select('current_trip_id vehicle_number')
        .lean();

      if (!vehicle || !vehicle.current_trip_id) {
        loggerInfo(`Vehicle ${vehicleId} has no active trip`);
        return { successCount: 0, failureCount: 0, error: 'No active trip' };
      }

      let trip = await ScheduledTrip.findOne({
        scheduled_trip_id: vehicle.current_trip_id
      })
      .select('route_points trip_type')
      .lean();

      if (!trip) {
        trip = await Trip.findOne({
          trip_id: vehicle.current_trip_id
        })
        .select('route_points')
        .lean();
      }

      if (!trip || !Array.isArray(trip.route_points) || trip.route_points.length === 0) {
        loggerInfo(`No route points found for trip ${vehicle.current_trip_id}`);
        return { successCount: 0, failureCount: 0, error: 'No route points' };
      }

      const matchedStop = trip.route_points.find(point => {
        if (!point.latitude || !point.longitude) return false;
        const distance = calculateDistance(
          targetLocation.latitude,
          targetLocation.longitude,
          point.latitude,
          point.longitude
        );
        return distance <= GEOFENCE_RADIUS_DEFAULT;
      });

      const stopInfo = matchedStop
        ? {
            stopId: matchedStop.stop_id,
            stopName: matchedStop.name || `Stop ${matchedStop.sequence || 1}`,
            stopSequence: matchedStop.sequence || 1,
            stopLatitude: matchedStop.latitude,
            stopLongitude: matchedStop.longitude,
            dwellTime: matchedStop.dwell_target_seconds || 120
          }
        : {
            stopId: 'unknown',
            stopName: `${arrivalType.charAt(0).toUpperCase() + arrivalType.slice(1)} Location`,
            stopSequence: 'N/A',
            stopLatitude: targetLocation.latitude,
            stopLongitude: targetLocation.longitude,
            dwellTime: 0
          };

      const title = arrivalType === 'pickup' ? 'Child Reached Pickup Location' : 'Child Reached Dropoff Location';
      const body = `Your child has reached ${stopInfo.stopName}. Vehicle arriving soon.`;

      const data = {
        notificationType: 'child_reached_location',
        endUserId: endUserId,
        arrivalType: arrivalType,
        userLatitude: String(userLatitude),
        userLongitude: String(userLongitude),
        stopId: stopInfo.stopId,
        stopName: stopInfo.stopName,
        stopSequence: String(stopInfo.stopSequence),
        stopLatitude: String(stopInfo.stopLatitude),
        stopLongitude: String(stopInfo.stopLongitude),
        vehicleNumber: vehicle.vehicle_number || vehicleId,
        dwellTime: String(stopInfo.dwellTime),
        distance: String(distanceToTarget.toFixed(2)),
        timestamp: new Date().toISOString()
      };

      const tokenBatches = chunkArray(parentUser.fcm_tokens, MAX_TOKENS_PER_BATCH);
      let totalSuccess = 0;
      let totalFailure = 0;

      for (const tokens of tokenBatches) {
        const message = {
          tokens,
          notification: { title, body },
          data
        };

        const resp = await getMessaging().sendEachForMulticast(message);

        const successes = resp.responses.filter(r => r.success).length;
        const failures = resp.responses.filter(r => !r.success).length;

        totalSuccess += successes;
        totalFailure += failures;

        if (successes > 0) {
          markNotificationSent('child_reached_location', endUserId, vehicleId, arrivalType);
        }

        loggerInfo(
          `End user arrival notification for ${endUserId}: ${successes}/${tokens.length} succeeded`
        );

        if (failures > 0) {
          const failedTokens = resp.responses
            .map((r, i) => ({ ok: r.success, token: tokens[i], error: r.error }))
            .filter(x => !x.ok);

          const failedTokensToRemove = failedTokens.map(x => x.token);

          if (failedTokensToRemove.length > 0) {
            try {
              await User.findOneAndUpdate(
                { user_id: endUser.user_id },
                { $pull: { fcm_tokens: { $in: failedTokensToRemove } } }
              );
              loggerInfo(
                `Removed ${failedTokensToRemove.length} invalid tokens for parent ${endUser.user_id}`
              );
            } catch (cleanupError) {
              loggerError(
                `Error removing invalid tokens for ${endUser.user_id}: ${cleanupError.message}`
              );
            }
          }
        }
      }

      if (totalSuccess > 0) {
        loggerNotification(
          `✅ End user arrival notification sent: ${totalSuccess} delivered`,
          { endUserId, stopInfo, arrivalType }
        );
      }

      return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        endUserId,
        vehicleId,
        arrivalType,
        stopInfo
      };
    } catch (error) {
      loggerError(
        `❌ Error sending end user arrival notification: ${error.message}`
      );
      return {
        successCount: 0,
        failureCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Bulk notifications
   */
  // static async sendBulkLocationNotifications(recipientList = []) {
  //   try {
  //     if (!Array.isArray(recipientList) || recipientList.length === 0) {
  //       loggerWarn('Empty recipient list for bulk notifications');
  //       return [];
  //     }

  //     loggerNotification(
  //       `📤 Sending batch notifications to ${recipientList.length} users`
  //     );

  //     const results = [];
  //     let totalSuccess = 0;
  //     let totalFailure = 0;

  //     for (const rec of recipientList) {
  //       const { fcmTokens, latitude, longitude, speedKmh, userData } = rec;

  //       const result =
  //         await GPSNotificationService.sendLocationUpdateNotification(
  //           fcmTokens,
  //           latitude,
  //           longitude,
  //           speedKmh,
  //           userData
  //         );

  //       results.push(result);
  //       totalSuccess += result.successCount;
  //       totalFailure += result.failureCount;
  //     }

  //     loggerNotification(
  //       `✨ Bulk completed: ${totalSuccess} sent, ${totalFailure} failed`
  //     );

  //     return results;
  //   } catch (error) {
  //     loggerError(
  //       `Bulk GPS notification error: ${error?.message || error}`
  //     );
  //     throw error;
  //   }
  // }
  static clearTripNotifications(tripId) {
    clearTripNotifications(tripId);
    loggerInfo(`Cleared all notifications for trip ${tripId}`);
  }

  static getNotificationTracker() {
    return notificationTracker;
  }
}

module.exports = GPSNotificationService;
