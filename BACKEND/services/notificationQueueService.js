const Queue = require('bull');
const logger = require('../utils/logger');
const firebaseService = require('./firebaseService');
const User = require('../models/User');
const Trip = require('../models/Trip');

const notificationQueue = new Queue('notifications', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
  }
});

notificationQueue.process(10, async (job) => {
  const { type, userId, tripId, data } = job.data;
  
  logger.info(`Processing notification job: ${type} for user ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user || !user.fcm_tokens || user.fcm_tokens.length === 0) {
      logger.warn(`No FCM tokens for user ${userId}`);
      return;
    }

    switch (type) {
      case 'advance_pickup':
        await firebaseService.sendNotificationToUser(user.fcm_tokens, {
          title: `${data.studentName} Stop Approaching`,
          body: `Your child's vehicle is ${data.minutesBefore} minutes away from pickup stop`,
          data: {
            type: 'stop_approaching',
            tripId: tripId.toString(),
            studentName: data.studentName,
            stopName: data.stopName
          }
        });
        break;

      case 'advance_dropoff':
        await firebaseService.sendNotificationToUser(user.fcm_tokens, {
          title: `${data.studentName} Stop Approaching`,
          body: `Your child's vehicle is ${data.minutesBefore} minutes away from drop-off stop`,
          data: {
            type: 'stop_approaching',
            tripId: tripId.toString(),
            studentName: data.studentName,
            stopName: data.stopName
          }
        });
        break;

      case 'student_picked_up':
        await firebaseService.sendStudentNotificationToParents(user.fcm_tokens, 
          `${data.studentName} has been picked up`,
          {
            type: 'student_picked_up',
            tripId: tripId.toString(),
            studentName: data.studentName,
            stop: data.stop
          }
        );
        break;

      case 'student_dropped':
        await firebaseService.sendStudentNotificationToParents(user.fcm_tokens,
          `${data.studentName} has been dropped off`,
          {
            type: 'student_dropped',
            tripId: tripId.toString(),
            studentName: data.studentName,
            stop: data.stop
          }
        );
        break;

      case 'speed_alert':
        await firebaseService.sendSpeedAlertNotification(user.fcm_tokens,
          `Speed Alert: Vehicle exceeding ${data.speedLimit} km/h`,
          {
            currentSpeed: data.currentSpeed,
            speedLimit: data.speedLimit,
            tripId: tripId.toString()
          }
        );
        break;

      default:
        logger.warn(`Unknown notification type: ${type}`);
    }

    logger.info(`Notification job completed: ${type} for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Error processing notification job: ${error.message}`);
    throw error;
  }
});

notificationQueue.on('completed', (job) => {
  logger.debug(`Notification job completed: ${job.id}`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job failed: ${job.id} - ${err.message}`);
});

class NotificationQueueService {
  static async schedulePickupNotification(tripId, parentId, minutesBefore, studentName, stopName) {
    try {
      const trip = await Trip.findById(tripId);
      if (!trip) throw new Error('Trip not found');

      const now = new Date();
      const delayMs = (minutesBefore * 60 * 1000);
      
      const job = await notificationQueue.add(
        {
          type: 'advance_pickup',
          userId: parentId,
          tripId,
          data: { studentName, stopName, minutesBefore }
        },
        {
          delay: delayMs,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          jobId: `pickup_${tripId}_${parentId}_${minutesBefore}min`
        }
      );

      logger.info(`Scheduled pickup notification: Job ${job.id} for ${minutesBefore} mins before pickup`);
      return job;
    } catch (error) {
      logger.error(`Error scheduling pickup notification: ${error.message}`);
      throw error;
    }
  }

  static async scheduleDropoffNotification(tripId, parentId, minutesBefore, studentName, stopName) {
    try {
      const trip = await Trip.findById(tripId);
      if (!trip) throw new Error('Trip not found');

      const delayMs = (minutesBefore * 60 * 1000);
      
      const job = await notificationQueue.add(
        {
          type: 'advance_dropoff',
          userId: parentId,
          tripId,
          data: { studentName, stopName, minutesBefore }
        },
        {
          delay: delayMs,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          jobId: `dropoff_${tripId}_${parentId}_${minutesBefore}min`
        }
      );

      logger.info(`Scheduled dropoff notification: Job ${job.id} for ${minutesBefore} mins before dropoff`);
      return job;
    } catch (error) {
      logger.error(`Error scheduling dropoff notification: ${error.message}`);
      throw error;
    }
  }

  static async scheduleStudentPickupNotification(tripId, parentId, studentName, stop) {
    try {
      const job = await notificationQueue.add(
        {
          type: 'student_picked_up',
          userId: parentId,
          tripId,
          data: { studentName, stop }
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          priority: 'high'
        }
      );

      logger.info(`Queued student pickup notification: Job ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Error queueing pickup notification: ${error.message}`);
      throw error;
    }
  }

  static async scheduleStudentDropoffNotification(tripId, parentId, studentName, stop) {
    try {
      const job = await notificationQueue.add(
        {
          type: 'student_dropped',
          userId: parentId,
          tripId,
          data: { studentName, stop }
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          priority: 'high'
        }
      );

      logger.info(`Queued student dropoff notification: Job ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Error queueing dropoff notification: ${error.message}`);
      throw error;
    }
  }

  static async scheduleSpeedAlert(tripId, parentId, currentSpeed, speedLimit) {
    try {
      const job = await notificationQueue.add(
        {
          type: 'speed_alert',
          userId: parentId,
          tripId,
          data: { currentSpeed, speedLimit }
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: true,
          priority: 'high'
        }
      );

      logger.info(`Queued speed alert notification: Job ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Error queueing speed alert: ${error.message}`);
      throw error;
    }
  }

  static async scheduleAdvanceNotificationsForTrip(tripId, minutesBefore = 5) {
    try {
      const trip = await Trip.findById(tripId).populate('passengers.user_id');
      if (!trip) throw new Error('Trip not found');

      const vehicleRoute = trip.route_points || [];
      
      for (const passenger of trip.passengers) {
        if (!passenger.user_id) continue;

        const parentUser = await User.findOne({ email: passenger.parent_contact });
        if (!parentUser) continue;

        const pickupStop = passenger.pickup_stop;
        const dropStop = passenger.drop_stop;

        if (pickupStop && minutesBefore > 0) {
          await this.schedulePickupNotification(
            tripId,
            parentUser._id,
            minutesBefore,
            passenger.name,
            pickupStop.name || 'Pickup Stop'
          );
        }

        if (dropStop && minutesBefore > 0) {
          await this.scheduleDropoffNotification(
            tripId,
            parentUser._id,
            minutesBefore,
            passenger.name,
            dropStop.name || 'Drop Stop'
          );
        }
      }

      logger.info(`Scheduled advance notifications for trip ${tripId}`);
      return { success: true, passengersNotified: trip.passengers.length };
    } catch (error) {
      logger.error(`Error scheduling advance notifications: ${error.message}`);
      throw error;
    }
  }

  static async cancelNotificationJob(jobId) {
    try {
      const job = await notificationQueue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Cancelled notification job: ${jobId}`);
      }
    } catch (error) {
      logger.error(`Error cancelling notification job: ${error.message}`);
      throw error;
    }
  }

  static async getQueueStats() {
    try {
      const counts = await notificationQueue.getJobCounts();
      return counts;
    } catch (error) {
      logger.error(`Error getting queue stats: ${error.message}`);
      throw error;
    }
  }

  static async closeQueue() {
    try {
      await notificationQueue.close();
      logger.info('Notification queue closed');
    } catch (error) {
      logger.error(`Error closing notification queue: ${error.message}`);
    }
  }
}

module.exports = { NotificationQueueService, notificationQueue };
