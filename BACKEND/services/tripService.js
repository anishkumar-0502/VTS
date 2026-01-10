const OnDemandTrip = require('../models/Trip');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const ScheduledTrip = require('../models/ScheduledTrip');
const TripHistory = require('../models/TripHistory');
const Vehicle = require('../models/Vehicle');
const TrackingData = require('../models/TrackingData');
const User = require('../models/User');
const Operator = require('../models/Operator');
const EndUser = require('../models/EndUser');
const { sendStopArrivalEmail } = require('../middlewares/emailer');
const firebaseService = require('./firebaseService');
const logger = require('../utils/logger');
const {
  generateRoutePointId,
  generateStopChecklistItemId,
  generateStopNoteId,
  generateStopIncidentId
} = require('../utils/uuidUtils');
const { NotificationQueueService } = require('./notificationQueueService');
const { CustomError } = require('../middlewares/errorHandler');

const normalizeIdentifier = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const buildVehicleMatchFilter = (value) => {
  const normalized = normalizeIdentifier(value);
  if (!normalized) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(normalized) },
        { vehicle_id: normalized }
      ]
    };
  }
  return { vehicle_id: normalized };
};

const buildTripMatchFilter = (value) => {
  const normalized = normalizeIdentifier(value);
  if (!normalized) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(normalized)) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(normalized) },
        { trip_id: normalized }
      ]
    };
  }
  return { trip_id: normalized };
};

const normalizeRoutePointsPayload = (routePoints) => {
  if (!Array.isArray(routePoints)) {
    return [];
  }

  return routePoints
    .filter((point) => point)
    .map((point, index) => {
      const pointObj = point && typeof point.toObject === 'function' ? point.toObject() : point;
      const normalized = { ...pointObj };
      normalized.stop_id = normalized.stop_id || generateRoutePointId();
      normalized.sequence =
        typeof normalized.sequence === 'number' && Number.isFinite(normalized.sequence)
          ? normalized.sequence
          : index + 1;
      normalized.order =
        typeof normalized.order === 'number' && Number.isFinite(normalized.order)
          ? normalized.order
          : index + 1;
      normalized.dwell_target_seconds =
        typeof normalized.dwell_target_seconds === 'number' && Number.isFinite(normalized.dwell_target_seconds)
          ? normalized.dwell_target_seconds
          : 120;
      normalized.sla_arrival_buffer_seconds =
        typeof normalized.sla_arrival_buffer_seconds === 'number' && Number.isFinite(normalized.sla_arrival_buffer_seconds)
          ? normalized.sla_arrival_buffer_seconds
          : 300;
      normalized.geofence_radius_meters =
        typeof normalized.geofence_radius_meters === 'number' && Number.isFinite(normalized.geofence_radius_meters)
          ? normalized.geofence_radius_meters
          : 100;
      const validStopStatuses = ['pending', 'approaching', 'arrived', 'departed', 'skipped', 'delayed'];
      if (!validStopStatuses.includes(normalized.status)) {
        normalized.status = 'pending';
      }
      normalized.delay_seconds =
        typeof normalized.delay_seconds === 'number' && Number.isFinite(normalized.delay_seconds)
          ? normalized.delay_seconds
          : 0;
      normalized.arrival_notified = typeof normalized.arrival_notified === 'boolean' ? normalized.arrival_notified : false;
      normalized.landmark = typeof normalized.landmark === 'string' ? normalized.landmark : null;
      normalized.approximate_reach_time = typeof normalized.approximate_reach_time === 'string' ? normalized.approximate_reach_time : null;
      const validStopStatusValues = ['pending', 'approaching', 'reached', 'departed', 'skipped', 'delayed'];
      normalized.stop_status = validStopStatusValues.includes(normalized.stop_status) ? normalized.stop_status : null;
      if (normalized.latitude !== undefined && normalized.latitude !== null) {
        const parsedLatitude = Number(normalized.latitude);
        normalized.latitude = Number.isFinite(parsedLatitude) ? parsedLatitude : null;
      }
      if (normalized.longitude !== undefined && normalized.longitude !== null) {
        const parsedLongitude = Number(normalized.longitude);
        normalized.longitude = Number.isFinite(parsedLongitude) ? parsedLongitude : null;
      }
      return normalized;
    });
};

const formatDateKey = (value) => {
  const base = value ? new Date(value) : new Date();
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    return fallback.toISOString().slice(0, 10);
  }
  return base.toISOString().slice(0, 10);
};

const buildPlannedStartDate = (dateKey, timeString) => {
  const safeKey = dateKey || formatDateKey();
  const [hoursRaw, minutesRaw] = typeof timeString === 'string' ? timeString.split(':') : [];
  const base = new Date(`${safeKey}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    base.setTime(Date.now());
    base.setHours(0, 0, 0, 0);
  }
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  base.setHours(Number.isFinite(hours) ? hours : 0);
  base.setMinutes(Number.isFinite(minutes) ? minutes : 0);
  base.setSeconds(0, 0);
  return base;
};

const formatStopLocation = (location) => {
  if (!location || typeof location !== 'object') {
    return null;
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return {
    name: location.name || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  };
};

const buildPlannedTimeline = (routePoints, plannedStartTime) => {
  if (!routePoints.length) {
    return [];
  }
  let cursor = plannedStartTime ? new Date(plannedStartTime.getTime()) : null;
  return routePoints.map((point) => {
    const entry = { ...point };
    if (!cursor) {
      entry.planned_arrival_time = null;
      entry.planned_departure_time = null;
      return entry;
    }
    const arrival = new Date(cursor.getTime());
    entry.planned_arrival_time = arrival;
    const dwellSeconds = Number.isFinite(entry.dwell_target_seconds) ? entry.dwell_target_seconds : 120;
    const departure = new Date(arrival.getTime() + dwellSeconds * 1000);
    entry.planned_departure_time = departure;
    const bufferSeconds = Number.isFinite(entry.sla_arrival_buffer_seconds) ? entry.sla_arrival_buffer_seconds : 0;
    cursor = new Date(departure.getTime() + bufferSeconds * 1000);
    return entry;
  });
};

const buildPassengerManifest = async (vehicleId) => {
  if (!vehicleId) {
    return [];
  }

  const vehicle = await Vehicle.findOne({ vehicle_id: vehicleId })
    .select('end_user_ids')
    .lean();

  if (!vehicle) {
    return [];
  }

  const endUserIds = Array.isArray(vehicle.end_user_ids) ? vehicle.end_user_ids.filter(Boolean) : [];
  if (!endUserIds.length) {
    return [];
  }

  const endUsers = await EndUser.find({ end_user_id: { $in: endUserIds } })
    .select('end_user_id user_id pickup_location dropoff_location')
    .lean();

  if (!endUsers.length) {
    return [];
  }

  const userIds = endUsers.map((endUser) => endUser.user_id).filter(Boolean);
  const users = userIds.length
    ? await User.find({ user_id: { $in: userIds } })
        .select('user_id name phone_number email')
        .lean()
    : [];

  const userMap = new Map(users.map((record) => [record.user_id, record]));

  return endUsers.map((endUser) => {
    const userRecord = userMap.get(endUser.user_id) || {};
    const phoneValue = userRecord.phone_number;
    const phoneString =
      phoneValue !== undefined && phoneValue !== null && !Number.isNaN(Number(phoneValue))
        ? String(phoneValue)
        : null;

    return {
      user_id: endUser.user_id,
      name: userRecord.name || null,
      phone_number: phoneString,
      pickup_stop: formatStopLocation(endUser.pickup_location),
      drop_stop: formatStopLocation(endUser.dropoff_location),
      parent_contact: userRecord.email || null
    };
  });
};

const findVehicleByIdentifier = async (identifier) => {
  const filter = buildVehicleMatchFilter(identifier);
  if (!filter) {
    return null;
  }
  const vehicle = await Vehicle.findOne(filter).lean();
  if (!vehicle) {
    return null;
  }
  return vehicle;
};

const findDriverByUserId = async (userId) => {
  const driver = await User.findOne({ user_id: userId }).lean();
  if (!driver) {
    return null;
  }
  return driver;
};

const findOperatorById = async (operatorId) => {
  const operator = await Operator.findOne({ operator_id: operatorId }).select('operator_id').lean();
  if (!operator) {
    return null;
  }
  return operator;
};

class TripService {
  static normalizeRoutePoints(routePoints) {
    return normalizeRoutePointsPayload(routePoints);
  }

  static calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const distanceKm = this.calculateHaversineDistance(lat1, lon1, lat2, lon2);
    return Number.isFinite(distanceKm) ? distanceKm * 1000 : Infinity;
  }

  static calculateDelaySeconds(stop, actualTimestamp) {
    if (!stop || !stop.planned_arrival_time) {
      return 0;
    }
    const planned = new Date(stop.planned_arrival_time);
    const actual = actualTimestamp instanceof Date ? actualTimestamp : new Date(actualTimestamp);
    if (Number.isNaN(planned.getTime()) || Number.isNaN(actual.getTime())) {
      return 0;
    }
    return Math.round((actual.getTime() - planned.getTime()) / 1000);
  }

  static buildRoutePointSummary(stop, index = 0, trip = null) {
    if (!stop) {
      return null;
    }
    const summary = {
      stop_id: stop.stop_id,
      name: stop.name,
      sequence: typeof stop.sequence === 'number' ? stop.sequence : index + 1,
      order: typeof stop.order === 'number' ? stop.order : index + 1,
      status: stop.status,
      planned_arrival_time: stop.planned_arrival_time,
      planned_departure_time: stop.planned_departure_time,
      actual_arrival_time: stop.actual_arrival_time,
      actual_departure_time: stop.actual_departure_time,
      delay_seconds: typeof stop.delay_seconds === 'number' ? stop.delay_seconds : 0,
      arrival_notified: !!stop.arrival_notified,
      latitude: stop.latitude,
      longitude: stop.longitude,
      landmark: stop.landmark || null,
      approximate_reach_time: stop.approximate_reach_time || null,
      stop_status: stop.stop_status || null,
      checklist: Array.isArray(stop.checklist)
        ? stop.checklist.map((item) => (item?.toObject?.() ? item.toObject() : item))
        : [],
      photo_notes: Array.isArray(stop.photo_notes)
        ? stop.photo_notes.map((note) => (note?.toObject?.() ? note.toObject() : note))
        : [],
      incidents: Array.isArray(stop.incidents)
        ? stop.incidents.map((incident) => (incident?.toObject?.() ? incident.toObject() : incident))
        : [],
      required_actions_completed: !!stop.required_actions_completed
    };
    if (trip) {
      const blockers = this.evaluateStopDepartureBlockers(trip, stop).blockers;
      summary.blockers = blockers;
    }
    return summary;
  }

  static refreshStopCompletionState(stop) {
    if (!stop) {
      return;
    }
    if (!Array.isArray(stop.checklist)) {
      stop.checklist = [];
    }
    stop.required_actions_completed = stop.checklist.every(
      (item) => item && (!item.required || item.completed)
    );
  }

  static evaluateStopDepartureBlockers(trip, stop) {
    if (!trip || !stop) {
      return { blocked: false, blockers: [] };
    }
    const blockers = [];
    if (Array.isArray(stop.checklist)) {
      stop.checklist.forEach((item) => {
        if (item && item.required && !item.completed) {
          blockers.push({
            type: 'checklist',
            item_id: item.item_id,
            label: item.label || null
          });
        }
      });
    }
    const tolerance = Number.isFinite(stop.geofence_radius_meters) ? stop.geofence_radius_meters : 100;
    if (Array.isArray(trip.passengers) && trip.passengers.length) {
      trip.passengers.forEach((passenger) => {
        if (!passenger) {
          return;
        }
        const passengerId =
          typeof passenger.user_id === 'string'
            ? passenger.user_id
            : passenger.user_id?.toString?.() ?? null;
        const incidents = Array.isArray(stop.incidents) ? stop.incidents : [];
        const hasPickupOverride = incidents.some(
          (incident) =>
            incident &&
            incident.resolves_blocker &&
            incident.passenger_id &&
            passengerId &&
            incident.passenger_id === passengerId &&
            (!incident.type || incident.type === 'pickup_exception' || incident.type === 'general_override')
        );
        const hasDropoffOverride = incidents.some(
          (incident) =>
            incident &&
            incident.resolves_blocker &&
            incident.passenger_id &&
            passengerId &&
            incident.passenger_id === passengerId &&
            (!incident.type || incident.type === 'dropoff_exception' || incident.type === 'general_override')
        );
        if (
          this.locationMatchesStop(passenger.pickup_stop, stop, tolerance) &&
          !passenger.picked_up &&
          !hasPickupOverride
        ) {
          blockers.push({
            type: 'passenger_pickup',
            passenger_id: passengerId,
            passenger_name: passenger.name || null
          });
        }
        if (
          this.locationMatchesStop(passenger.drop_stop, stop, tolerance) &&
          !passenger.dropped &&
          !hasDropoffOverride
        ) {
          blockers.push({
            type: 'passenger_dropoff',
            passenger_id: passengerId,
            passenger_name: passenger.name || null
          });
        }
      });
    }
    return {
      blocked: blockers.length > 0,
      blockers
    };
  }

  static emitStopEvent(trip, stop, phase, index) {
    if (!global.socketManager || !trip || !stop) {
      return;
    }
    const tripId = trip.trip_id || (trip._id ? trip._id.toString() : null);
    if (!tripId) {
      return;
    }
    const payload = {
      tripId,
      stop: this.buildRoutePointSummary(stop, index),
      phase,
      timestamp: new Date()
    };
    global.socketManager.emitToTrip(tripId, `stop_${phase}`, payload);
    if (trip.operator_id) {
      global.socketManager.emitToOperator(trip.operator_id, `stop_${phase}`, payload);
    }
  }

  static async notifyStopArrival(trip, stop, index, timestamp) {
    try {
      if (!trip || !stop) {
        return false;
      }
      const passengers = Array.isArray(trip.passengers) ? trip.passengers : [];
      if (!passengers.length) {
        return true;
      }
      const tolerance = Number.isFinite(stop.geofence_radius_meters) ? stop.geofence_radius_meters : 100;
      let arrivalDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (Number.isNaN(arrivalDate.getTime())) {
        arrivalDate = new Date();
      }
      const tripId = trip.trip_id || (trip._id ? trip._id.toString() : null);
      const stopSummary = this.buildRoutePointSummary(stop, index, trip);
      const parentCache = new Map();
      const resolveParent = async (email) => {
        if (!email || typeof email !== 'string') {
          return null;
        }
        const normalized = email.trim().toLowerCase();
        if (!normalized) {
          return null;
        }
        if (parentCache.has(normalized)) {
          return parentCache.get(normalized);
        }
        const parent = await User.findOne({ email: normalized }).select('user_id name fcm_tokens email');
        parentCache.set(normalized, parent);
        return parent;
      };
      const notificationTargets = [];
      passengers.forEach((passenger) => {
        if (!passenger) {
          return;
        }
        const pickupMatch = this.locationMatchesStop(passenger.pickup_stop, stop, tolerance);
        const dropMatch = this.locationMatchesStop(passenger.drop_stop, stop, tolerance);
        if (pickupMatch && !passenger.picked_up) {
          notificationTargets.push({ passenger, direction: 'pickup' });
        }
        if (dropMatch && passenger.picked_up && !passenger.dropped) {
          notificationTargets.push({ passenger, direction: 'dropoff' });
        }
      });
      if (!notificationTargets.length) {
        return true;
      }
      for (const entry of notificationTargets) {
        const passenger = entry.passenger;
        const direction = entry.direction;
        const parentEmail = typeof passenger.parent_contact === 'string' ? passenger.parent_contact.trim() : null;
        const passengerId =
          typeof passenger.user_id === 'string'
            ? passenger.user_id
            : passenger.user_id?.toString?.() ?? null;
        if (parentEmail) {
          await sendStopArrivalEmail(parentEmail, passenger.name, stop.name, direction, arrivalDate);
        }
        const parentUser = parentEmail ? await resolveParent(parentEmail) : null;
        const payload = {
          tripId,
          stop: stopSummary,
          direction,
          passenger: {
            user_id: passengerId,
            name: passenger.name || null
          },
          timestamp: arrivalDate.toISOString()
        };
        if (global.socketManager && parentUser?._id) {
          global.socketManager.emitToParent(parentUser._id.toString(), 'stop_reached', payload);
        }
        if (
          parentUser &&
          Array.isArray(parentUser.fcm_tokens) &&
          parentUser.fcm_tokens.length &&
          firebaseService &&
          typeof firebaseService.sendMulticast === 'function'
        ) {
          const passengerName = passenger.name || 'Passenger';
          const stopName = stop.name || 'the stop';
          const title = direction === 'pickup' ? 'Pickup stop reached' : 'Drop-off stop reached';
          const body =
            direction === 'pickup'
              ? `${passengerName}'s pickup stop ${stopName} has been reached.`
              : `${passengerName}'s drop-off stop ${stopName} has been reached.`;
          const data = {
            type: direction === 'pickup' ? 'stop_reached_pickup' : 'stop_reached_dropoff',
            tripId: tripId || '',
            stopId: stop.stop_id || '',
            passengerId: passengerId || '',
            direction,
            timestamp: arrivalDate.toISOString()
          };
          await firebaseService.sendMulticast(parentUser.fcm_tokens, title, body, data);
        }
      }
      return true;
    } catch (error) {
      logger.loggerError(`Error notifying stop arrival: ${error.message}`);
      return false;
    }
  }

  static hasExistingAnomaly(trip, type, passengerId, stopId) {
    if (!Array.isArray(trip?.anomalies)) {
      return false;
    }
    return trip.anomalies.some((anomaly) =>
      anomaly && anomaly.type === type && anomaly.passenger_id === passengerId && anomaly.stop_id === stopId
    );
  }

  static normalizeStopName(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : null;
  }

  static locationMatchesStop(location, stop, toleranceMeters = 100) {
    if (!location || !stop) {
      return false;
    }
    const stopLat = Number(stop.latitude);
    const stopLon = Number(stop.longitude);
    const locLat = Number(location.latitude);
    const locLon = Number(location.longitude);
    if (
      Number.isFinite(stopLat) &&
      Number.isFinite(stopLon) &&
      Number.isFinite(locLat) &&
      Number.isFinite(locLon)
    ) {
      const distance = this.calculateDistanceMeters(stopLat, stopLon, locLat, locLon);
      return distance <= toleranceMeters;
    }
    const stopName = this.normalizeStopName(stop.name);
    const locationName = this.normalizeStopName(location.name);
    return !!stopName && stopName === locationName;
  }

  static recordPassengerAnomalies(trip, stop, timestamp) {
    if (!trip || !stop || !Array.isArray(trip.passengers) || !trip.passengers.length) {
      return [];
    }
    if (!Array.isArray(trip.anomalies)) {
      trip.anomalies = [];
    }
    const tolerance = Number.isFinite(stop.geofence_radius_meters) ? stop.geofence_radius_meters : 100;
    const createdAt = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const anomalies = [];
    const ensureAnomaly = (type, passenger, message, severity) => {
      if (!passenger?.user_id || this.hasExistingAnomaly(trip, type, passenger.user_id, stop.stop_id)) {
        return;
      }
      const entry = {
        type,
        passenger_id: passenger.user_id,
        stop_id: stop.stop_id,
        message,
        severity,
        created_at: createdAt
      };
      trip.anomalies.push(entry);
      anomalies.push(entry);
    };

    trip.passengers.forEach((passenger) => {
      if (!passenger) {
        return;
      }
      const name = passenger.name || 'Passenger';
      if (this.locationMatchesStop(passenger.pickup_stop, stop, tolerance)) {
        if (!passenger.picked_up) {
          ensureAnomaly('missed_pickup', passenger, `${name} not picked up`, 'critical');
        } else if (passenger.parent_contact && !passenger.parent_confirmed_pickup) {
          ensureAnomaly('pending_parent_pickup_confirmation', passenger, `${name} pickup confirmation pending`, 'warning');
        }
      }

      if (this.locationMatchesStop(passenger.drop_stop, stop, tolerance)) {
        if (!passenger.dropped) {
          ensureAnomaly('missed_dropoff', passenger, `${name} not dropped off`, 'critical');
        } else if (passenger.parent_contact && !passenger.parent_confirmed_dropoff) {
          ensureAnomaly('pending_parent_dropoff_confirmation', passenger, `${name} drop-off confirmation pending`, 'warning');
        }
      }
    });

    if (anomalies.length) {
      trip.markModified('anomalies');
    }

    return anomalies;
  }

  static async resolveTripStopContext({ tripId, stopId, driverId }) {
    const filter = buildTripMatchFilter(tripId);
    if (!filter) {
      throw new CustomError('Trip ID is required', 400);
    }
    if (!stopId) {
      throw new CustomError('Stop ID is required', 400);
    }
    const query = { ...filter, driver_id: driverId };
    const trip = await OnDemandTrip.findOne(query);
    if (!trip) {
      throw new CustomError('Trip not found', 404);
    }
    const routePoints = Array.isArray(trip.route_points) ? trip.route_points : [];
    const stopIndex = routePoints.findIndex((point) => point && point.stop_id === stopId);
    if (stopIndex === -1) {
      throw new CustomError('Stop not found', 404);
    }
    const stop = routePoints[stopIndex];
    return { trip, stop, stopIndex };
  }

  static async updateStopChecklistItem({ tripId, stopId, driverId, item }) {
    if (!item || typeof item !== 'object') {
      throw new CustomError('Checklist item payload is required', 400);
    }
    const { trip, stop, stopIndex } = await this.resolveTripStopContext({ tripId, stopId, driverId });
    if (!Array.isArray(stop.checklist)) {
      stop.checklist = [];
    }
    const normalizedLabel =
      typeof item.label === 'string' && item.label.trim() ? item.label.trim() : null;
    const lookupId = item.itemId || item.item_id;
    let checklistItem = null;
    if (lookupId) {
      checklistItem = stop.checklist.find((entry) => entry && entry.item_id === lookupId);
    }
    if (!checklistItem && normalizedLabel) {
      const target = normalizedLabel.toLowerCase();
      checklistItem = stop.checklist.find(
        (entry) =>
          entry &&
          typeof entry.label === 'string' &&
          entry.label.trim().toLowerCase() === target
      );
    }
    if (!checklistItem && !normalizedLabel) {
      throw new CustomError('Checklist label or itemId is required', 400);
    }
    if (!checklistItem) {
      checklistItem = {
        item_id: generateStopChecklistItemId(),
        label: normalizedLabel,
        required: item.required === undefined ? true : !!item.required,
        completed: false,
        completed_at: null,
        completed_by: null,
        notes: item.notes !== undefined && item.notes !== null ? String(item.notes) : null
      };
      stop.checklist.push(checklistItem);
    } else {
      if (normalizedLabel !== null) {
        checklistItem.label = normalizedLabel;
      }
      if (item.required !== undefined) {
        checklistItem.required = !!item.required;
      }
      if (item.notes !== undefined) {
        checklistItem.notes = item.notes !== null ? String(item.notes) : null;
      }
    }
    if (item.completed !== undefined) {
      checklistItem.completed = !!item.completed;
      if (checklistItem.completed) {
        checklistItem.completed_at = new Date();
        checklistItem.completed_by = driverId;
      } else {
        checklistItem.completed_at = null;
        checklistItem.completed_by = null;
      }
    }
    this.refreshStopCompletionState(stop);
    trip.markModified('route_points');
    await trip.save();
    const stopSummary = this.buildRoutePointSummary(stop, stopIndex, trip);
    const blockers = this.evaluateStopDepartureBlockers(trip, stop).blockers;
    return {
      tripId: trip.trip_id || (trip._id ? trip._id.toString() : null),
      stop: stopSummary,
      blockers
    };
  }

  static async addStopPhotoNote({ tripId, stopId, driverId, photoUrl, caption }) {
    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      throw new CustomError('Photo URL is required', 400);
    }
    const { trip, stop, stopIndex } = await this.resolveTripStopContext({ tripId, stopId, driverId });
    if (!Array.isArray(stop.photo_notes)) {
      stop.photo_notes = [];
    }
    const note = {
      note_id: generateStopNoteId(),
      photo_url: photoUrl.trim(),
      caption: caption !== undefined && caption !== null ? String(caption) : null,
      created_by: driverId,
      created_at: new Date()
    };
    stop.photo_notes.push(note);
    this.refreshStopCompletionState(stop);
    trip.markModified('route_points');
    await trip.save();
    const stopSummary = this.buildRoutePointSummary(stop, stopIndex, trip);
    const blockers = this.evaluateStopDepartureBlockers(trip, stop).blockers;
    return {
      tripId: trip.trip_id || (trip._id ? trip._id.toString() : null),
      stop: stopSummary,
      note,
      blockers
    };
  }

  static async recordStopIncident({
    tripId,
    stopId,
    driverId,
    type,
    severity,
    description,
    passengerId,
    photoUrls,
    resolvesBlocker,
    resolved,
    resolutionNotes
  }) {
    const { trip, stop, stopIndex } = await this.resolveTripStopContext({ tripId, stopId, driverId });
    if (!Array.isArray(stop.incidents)) {
      stop.incidents = [];
    }
    const normalizedSeverity = ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning';
    const incident = {
      incident_id: generateStopIncidentId(),
      type: typeof type === 'string' && type.trim() ? type.trim() : null,
      severity: normalizedSeverity,
      description: description !== undefined && description !== null ? String(description) : null,
      passenger_id: passengerId ? String(passengerId) : null,
      photo_urls: Array.isArray(photoUrls)
        ? photoUrls.filter((url) => typeof url === 'string' && url).map((url) => url.trim())
        : [],
      resolves_blocker: !!resolvesBlocker,
      resolved: !!resolved,
      resolved_at: resolved ? new Date() : null,
      resolution_notes:
        resolutionNotes !== undefined && resolutionNotes !== null ? String(resolutionNotes) : null,
      created_by: driverId,
      created_at: new Date()
    };
    stop.incidents.push(incident);
    this.refreshStopCompletionState(stop);
    trip.markModified('route_points');
    await trip.save();
    const stopSummary = this.buildRoutePointSummary(stop, stopIndex, trip);
    const blockers = this.evaluateStopDepartureBlockers(trip, stop).blockers;
    return {
      tripId: trip.trip_id || (trip._id ? trip._id.toString() : null),
      stop: stopSummary,
      incident,
      blockers
    };
  }

  static async processLocationUpdate(payload) {
    const {
      tripId,
      driverId,
      operatorId,
      latitude,
      longitude,
      speed,
      heading,
      deviceId,
      recordedAt
    } = payload;

    if (typeof latitude !== 'number' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new CustomError('Latitude is required', 400);
    }
    if (typeof longitude !== 'number' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new CustomError('Longitude is required', 400);
    }

    const timestampRaw = recordedAt instanceof Date ? recordedAt : recordedAt ? new Date(recordedAt) : new Date();
    const timestamp = Number.isNaN(timestampRaw.getTime()) ? new Date() : timestampRaw;
    const speedValue = Number.isFinite(speed) ? speed : 0;
    const headingValue = Number.isFinite(heading) ? heading : null;
    const stationary = speedValue <= 1;

    const statusFilter = { status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] } };

    let query;
    if (tripId) {
      query = { ...buildTripMatchFilter(tripId), ...statusFilter };
    } else if (driverId) {
      query = { driver_id: driverId, ...statusFilter };
      if (operatorId) {
        query.operator_id = operatorId;
      }
    } else {
      throw new CustomError('Trip identifier or driver context is required', 400);
    }

    const trip = tripId
      ? await OnDemandTrip.findOne(query)
      : await OnDemandTrip.findOne(query).sort({ start_time: -1 });

    if (!trip) {
      throw new CustomError('Active trip not found for location update', 404);
    }

    const tripIdentifier = trip.trip_id || (trip._id ? trip._id.toString() : null);
    const vehicle = trip.vehicle_id ? await Vehicle.findOne(buildVehicleMatchFilter(trip.vehicle_id)) : null;

    const resolvedDeviceId =
      (typeof deviceId === 'string' && deviceId.trim()) ||
      (vehicle && typeof vehicle.assigned_device_id === 'string' && vehicle.assigned_device_id.trim()) ||
      trip.vehicle_id ||
      driverId ||
      tripIdentifier;

    if (resolvedDeviceId) {
      try {
        await TrackingData.create({
          device_id: resolvedDeviceId,
          vehicle_id: trip.vehicle_id || null,
          trip_id: tripIdentifier,
          latitude,
          longitude,
          speed: speedValue,
          course: headingValue ?? undefined,
          timestamp
        });
      } catch (error) {
        logger.loggerWarn(`Tracking data insert failed for trip ${tripIdentifier}: ${error.message}`);
      }
    }

    const routePoints = Array.isArray(trip.route_points) ? trip.route_points : [];
    if (!Number.isInteger(trip.current_stop_index) || trip.current_stop_index < 0) {
      trip.current_stop_index = 0;
    }
    let routePointsModified = false;
    let currentStopSummary = null;
    let anomalies = [];
    let blockers = [];
    let vehicleStatus = stationary ? 'at_stop' : 'en_route';
    let nextStatus = vehicleStatus;
    let shouldNotifyStopArrival = false;

    if (!Array.isArray(trip.anomalies)) {
      trip.anomalies = [];
    }

    if (routePoints.length) {
      let currentIndex = Number.isInteger(trip.current_stop_index) ? trip.current_stop_index : 0;
      if (currentIndex < 0) {
        currentIndex = 0;
      }
      while (currentIndex < routePoints.length && routePoints[currentIndex]?.status === 'departed') {
        currentIndex += 1;
      }

      const currentStop = routePoints[currentIndex] || null;

      if (
        currentStop &&
        currentStop.latitude !== undefined &&
        currentStop.latitude !== null &&
        currentStop.longitude !== undefined &&
        currentStop.longitude !== null
      ) {
        const previousCompletionState = currentStop.required_actions_completed;
        this.refreshStopCompletionState(currentStop);
        if (previousCompletionState !== currentStop.required_actions_completed) {
          routePointsModified = true;
        }
        const stopLat = Number(currentStop.latitude);
        const stopLon = Number(currentStop.longitude);
        const radius = Number.isFinite(currentStop.geofence_radius_meters) ? currentStop.geofence_radius_meters : 100;
        const distance = this.calculateDistanceMeters(stopLat, stopLon, latitude, longitude);
        const delaySeconds = this.calculateDelaySeconds(currentStop, timestamp);
        const bufferSeconds = Number.isFinite(currentStop.sla_arrival_buffer_seconds)
          ? currentStop.sla_arrival_buffer_seconds
          : 0;
        const isDelayed = delaySeconds > bufferSeconds;

        if (distance <= radius) {
          const needsArrivalNotification = !currentStop.arrival_notified;
          if (currentStop.status !== 'arrived') {
            currentStop.actual_arrival_time = timestamp;
            currentStop.delay_seconds = delaySeconds;
            currentStop.status = 'arrived';
            trip.current_stop_index = currentIndex;
            routePointsModified = true;
            this.emitStopEvent(trip, currentStop, 'arrived', currentIndex);
          } else if (currentStop.delay_seconds !== delaySeconds) {
            currentStop.delay_seconds = delaySeconds;
            routePointsModified = true;
          }
          if (needsArrivalNotification) {
            shouldNotifyStopArrival = true;
          }
          const evaluation = this.evaluateStopDepartureBlockers(trip, currentStop);
          blockers = evaluation.blockers;
          currentStopSummary = this.buildRoutePointSummary(currentStop, currentIndex, trip);
          nextStatus = isDelayed ? 'delayed' : 'at_stop';
          vehicleStatus = isDelayed ? 'delayed' : 'at_stop';
        } else if (currentStop.status === 'arrived' && distance > radius * 1.5) {
          if (currentStop.delay_seconds !== delaySeconds) {
            currentStop.delay_seconds = delaySeconds;
            routePointsModified = true;
          }
          const evaluation = this.evaluateStopDepartureBlockers(trip, currentStop);
          if (evaluation.blocked) {
            blockers = evaluation.blockers;
            currentStopSummary = this.buildRoutePointSummary(currentStop, currentIndex, trip);
            nextStatus = isDelayed ? 'delayed' : 'at_stop';
            vehicleStatus = isDelayed ? 'delayed' : 'at_stop';
          } else {
            currentStop.actual_departure_time = timestamp;
            currentStop.status = 'departed';
            trip.current_stop_index = currentIndex + 1;
            routePointsModified = true;
            this.emitStopEvent(trip, currentStop, 'departed', currentIndex);
            anomalies = this.recordPassengerAnomalies(trip, currentStop, timestamp);
            currentStopSummary = this.buildRoutePointSummary(currentStop, currentIndex, trip);
            blockers = [];

            let nextIndex = trip.current_stop_index;
            while (nextIndex < routePoints.length && routePoints[nextIndex]?.status === 'departed') {
              nextIndex += 1;
            }
            if (nextIndex < routePoints.length) {
              const nextStop = routePoints[nextIndex];
              if (nextStop && nextStop.status === 'pending') {
                nextStop.status = 'approaching';
                routePointsModified = true;
              }
              trip.current_stop_index = nextIndex;
            }
            nextStatus = isDelayed ? 'delayed' : 'en_route';
            vehicleStatus = isDelayed ? 'delayed' : 'en_route';
          }
        } else if (distance <= radius * 3 && currentStop.status === 'pending') {
          currentStop.status = 'approaching';
          trip.current_stop_index = currentIndex;
          currentStopSummary = this.buildRoutePointSummary(currentStop, currentIndex, trip);
          routePointsModified = true;
          nextStatus = 'en_route';
          vehicleStatus = 'en_route';
        } else {
          currentStopSummary = this.buildRoutePointSummary(currentStop, currentIndex, trip);
          if (isDelayed && currentStop.status !== 'departed') {
            nextStatus = 'delayed';
            vehicleStatus = 'delayed';
          }
        }
      }

      if (shouldNotifyStopArrival && !currentStop.arrival_notified) {
        const notified = await this.notifyStopArrival(trip, currentStop, currentIndex, timestamp);
        if (notified) {
          currentStop.arrival_notified = true;
          routePointsModified = true;
        }
      }
    }

    if (currentStopSummary && Array.isArray(currentStopSummary.blockers)) {
      blockers = currentStopSummary.blockers;
    }

    trip.status = nextStatus;
    trip.last_location = {
      latitude,
      longitude,
      speed: speedValue,
      heading: headingValue,
      recorded_at: timestamp
    };
    trip.markModified('last_location');

    if (routePointsModified) {
      trip.markModified('route_points');
    }

    await trip.save();

    const vehicleUpdate = {
      latitude,
      longitude,
      speed: speedValue,
      last_update: timestamp,
      current_status: vehicleStatus
    };
    if (headingValue !== null) {
      vehicleUpdate.bearing = headingValue;
    }

    if (vehicle) {
      Object.assign(vehicle, vehicleUpdate);
      await vehicle.save();
    } else if (trip.vehicle_id) {
      await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(trip.vehicle_id), vehicleUpdate);
    }

    if (global.socketManager && tripIdentifier) {
      const payloadData = {
        tripId: tripIdentifier,
        vehicleId: trip.vehicle_id,
        latitude,
        longitude,
        speed: speedValue,
        heading: headingValue,
        status: trip.status,
        timestamp
      };
      global.socketManager.emitToTrip(tripIdentifier, 'vehicle_location', payloadData);
      if (trip.operator_id) {
        global.socketManager.emitToOperator(trip.operator_id, 'vehicle_location', payloadData);
      }
      if (trip.vehicle_id) {
        global.socketManager.broadcastVehicleStatus(trip.vehicle_id, vehicleStatus);
      }
    }

    return {
      tripId: tripIdentifier,
      status: trip.status,
      vehicleStatus,
      current_stop_index: trip.current_stop_index || 0,
      stop: currentStopSummary,
      delay_seconds: currentStopSummary ? currentStopSummary.delay_seconds : 0,
      anomalies,
      blockers
    };
  }

  static async ensurePlannedTripForScheduledTrip(scheduledTrip, targetDate) {
    const source = scheduledTrip?.toObject?.() ?? scheduledTrip;
    if (!source || !source.scheduled_trip_id) {
      return null;
    }

    const dateKey = typeof targetDate === 'string' && targetDate ? targetDate : formatDateKey(targetDate);

    const existingTrip = await Trip.findOne({
      scheduled_trip_id: source.scheduled_trip_id,
      planned_date: dateKey
    });

    if (existingTrip) {
      return existingTrip.toObject ? existingTrip.toObject() : existingTrip;
    }

    const plannedStartTime = buildPlannedStartDate(dateKey, source.scheduled_start_time);
    const normalizedRoutePoints = normalizeRoutePointsPayload(source.route_points);
    const plannedRoutePoints = buildPlannedTimeline(normalizedRoutePoints, plannedStartTime);
    const passengers = await buildPassengerManifest(source.vehicle_id);
    const plannedEndReference = plannedRoutePoints.length
      ? plannedRoutePoints[plannedRoutePoints.length - 1].planned_departure_time
      : null;
    const plannedEndTime = plannedEndReference || plannedStartTime;

    const payload = {
      scheduled_trip_id: source.scheduled_trip_id,
      vehicle_id: source.vehicle_id,
      driver_id: source.driver_id,
      operator_id: source.operator_id,
      route_name: source.route_name,
      start_location: source.start_location,
      end_location: source.end_location,
      trip_period: source.trip_period,
      status: 'planned',
      planned_date: dateKey,
      planned_start_time: plannedStartTime,
      planned_end_time: plannedEndTime,
      start_time: plannedStartTime,
      route_points: plannedRoutePoints,
      passengers,
      total_passengers: passengers.length
    };

    const trip = new Trip(payload);
    await trip.save();
    return trip.toObject();
  }

  static async ensurePlannedTripsForScheduledTrips(scheduledTrips, targetDate) {
    if (!Array.isArray(scheduledTrips) || !scheduledTrips.length) {
      return [];
    }

    const plannedTrips = [];

    for (const scheduledTrip of scheduledTrips) {
      try {
        const plannedTrip = await this.ensurePlannedTripForScheduledTrip(scheduledTrip, targetDate);
        if (plannedTrip) {
          plannedTrips.push(plannedTrip);
        }
      } catch (error) {
        logger.loggerError(`Error ensuring planned trip: ${error.message}`);
      }
    }

    return plannedTrips;
  }

  static async startTrip(tripData) {
    try {
      const vehicle = await findVehicleByIdentifier(tripData.vehicle_id);

      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const driver = await findDriverByUserId(tripData.driver_id);
      if (!driver) {
        throw new CustomError('Driver not found', 404);
      }

      const requestedOperatorId = tripData.operator_id || driver.operator_id;
      const operator = requestedOperatorId ? await findOperatorById(requestedOperatorId) : null;
      if (!operator) {
        throw new CustomError('Operator not found', 404);
      }

      const vehicleOperatorId = vehicle.operator_id;
      const driverOperatorId = driver.operator_id;

      if (!vehicleOperatorId) {
        throw new CustomError('Vehicle is not linked to any operator', 409);
      }

      if (!driverOperatorId) {
        throw new CustomError('Driver is not linked to any operator', 409);
      }

      if (driverOperatorId !== vehicleOperatorId) {
        throw new CustomError('Driver and vehicle belong to different operators', 409);
      }

      if (operator.operator_id !== vehicleOperatorId) {
        throw new CustomError('Authenticated operator does not match vehicle operator', 403);
      }

      const normalizedRoutePoints = normalizeRoutePointsPayload(tripData.route_points);

      const tripPayload = {
        ...tripData,
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver.user_id,
        operator_id: vehicleOperatorId,
        start_time: new Date(),
        status: 'en_route'
      };

      if (normalizedRoutePoints.length) {
        tripPayload.route_points = normalizedRoutePoints;
      } else {
        delete tripPayload.route_points;
      }

      const trip = new OnDemandTrip(tripPayload);

      await trip.save();
      await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicle.vehicle_id), { current_status: 'en_route', current_trip_id: trip.trip_id });
      logger.loggerInfo(`Trip started: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error starting trip: ${error.message}`);
      throw error;
    }
  }

  static async getTripByIdentifier(tripIdentifier, options = {}) {
    const filter = buildTripMatchFilter(tripIdentifier);
    if (!filter) {
      throw new CustomError('Trip ID is required', 400);
    }
    let query = OnDemandTrip.findOne(filter);
    if (options.populate) {
      const populateItems = Array.isArray(options.populate) ? options.populate : [options.populate];
      for (const populateItem of populateItems) {
        query = query.populate(populateItem);
      }
    }
    if (options.select) {
      query = query.select(options.select);
    }
    if (options.lean) {
      query = query.lean();
    }
    const trip = await query;
    if (!trip) {
      throw new CustomError('Trip not found', 404);
    }
    return trip;
  }

  static async getTripById(tripId) {
    return this.getTripByIdentifier(tripId, {
      populate: ['vehicle_id', 'driver_id', 'operator_id']
    });
  }

  static async getAllTrips(filters = {}) {
    try {
      const query = {};
      if (filters.vehicle_id) query.vehicle_id = filters.vehicle_id;
      if (filters.driver_id) query.driver_id = filters.driver_id;
      if (filters.operator_id) query.operator_id = filters.operator_id;
      if (filters.status) query.status = filters.status;

      const trips = await OnDemandTrip.find(query)
        .populate('vehicle_id')
        .populate('driver_id')
        .populate('operator_id')
        .sort({ start_time: -1 });
      return trips;
    } catch (error) {
      logger.loggerError(`Error fetching trips: ${error.message}`);
      throw error;
    }
  }

  static async endTrip(tripId, endData) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);

      const completionTimestamp = new Date();
      trip.end_time = completionTimestamp;
      trip.end_location = endData.end_location;
      trip.status = 'completed';
      trip.distance_traveled = endData.distance_traveled;
      trip.duration = (trip.end_time - trip.start_time) / (1000 * 60);

      if (!trip.vehicle_id && vehicleIdentifier) {
        trip.vehicle_id = vehicleIdentifier;
      }

      await trip.save();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const completedDateKey = completionTimestamp.toISOString().slice(0, 10);
      const completedDay = dayNames[completionTimestamp.getUTCDay()];
      const tripSnapshot = trip.toObject();
      await TripHistory.findOneAndUpdate(
        { trip_id: trip.trip_id },
        {
          trip_id: trip.trip_id,
          scheduled_trip_id: trip.scheduled_trip_id || null,
          driver_id: trip.driver_id,
          vehicle_id: trip.vehicle_id,
          operator_id: trip.operator_id,
          route_name: trip.route_name,
          planned_date: trip.planned_date || null,
          trip_period: tripSnapshot.trip_period || null,
          start_time: trip.start_time,
          end_time: trip.end_time,
          start_location: trip.start_location,
          end_location: trip.end_location,
          completed_date: completedDateKey,
          completed_day: completedDay,
          distance_traveled: trip.distance_traveled,
          duration: trip.duration,
          snapshot: tripSnapshot,
          status: 'completed',
          source_type: trip.scheduled_trip_id ? 'scheduled' : 'on_demand'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (trip.scheduled_trip_id) {
        const scheduledId = normalizeIdentifier(trip.scheduled_trip_id);
        if (scheduledId) {
          await ScheduledTrip.updateOne(
            { scheduled_trip_id: scheduledId },
            {
              status: 'completed',
              last_completed_on: completedDateKey,
              last_status_change_at: completionTimestamp
            }
          );
        }
      }
      if (vehicleIdentifier) {
        await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicleIdentifier), { current_status: 'idle' });
      }
      logger.loggerInfo(`Trip ended: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error ending trip: ${error.message}`);
      throw error;
    }
  }

  static async cancelTrip(tripId, reason) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        {
          status: 'cancelled',
          end_time: new Date()
        },
        { new: true }
      );

      if (trip) {
        const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);
        if (vehicleIdentifier) {
          await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicleIdentifier), { current_status: 'idle' });
        }
      }

      logger.loggerInfo(`Trip cancelled: ${trip._id} - Reason: ${reason}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error cancelling trip: ${error.message}`);
      throw error;
    }
  }

  static async addStop(tripId, stopData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { stops: stopData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      return trip;
    } catch (error) {
      logger.loggerError(`Error adding stop: ${error.message}`);
      throw error;
    }
  }

  static async recordSpeedViolation(tripId, violationData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { speed_violations: violationData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      logger.loggerInfo(`Speed violation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording speed violation: ${error.message}`);
      throw error;
    }
  }

  static async recordRouteDeviation(tripId, deviationData) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOneAndUpdate(
        filter,
        { $push: { route_deviations: deviationData } },
        { new: true }
      );
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }
      logger.loggerInfo(`Route deviation recorded for trip: ${tripId}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error recording route deviation: ${error.message}`);
      throw error;
    }
  }

  static async getTripAnalytics(tripId) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      const vehicleIdentifier = normalizeIdentifier(trip.vehicle_id);

      const trackingData = await TrackingData.find({ trip_id: tripId }).sort({ timestamp: 1 });

      const analytics = {
        trip_id: trip._id,
        vehicle_id: vehicleIdentifier || trip.vehicle_id,
        driver_id: trip.driver_id,
        start_time: trip.start_time,
        end_time: trip.end_time,
        duration_minutes: trip.duration,
        distance_traveled: trip.distance_traveled,
        average_speed: trip.average_speed,
        max_speed: trip.max_speed,
        speed_violations_count: trip.speed_violations?.length || 0,
        route_deviations_count: trip.route_deviations?.length || 0,
        total_stops: trip.stops?.length || 0,
        tracking_points: trackingData.length
      };

      return analytics;
    } catch (error) {
      logger.loggerError(`Error fetching trip analytics: ${error.message}`);
      throw error;
    }
  }

  static async getActiveTrips() {
    try {
      const trips = await OnDemandTrip.find({ status: { $in: ['active', 'en_route', 'at_stop', 'delayed'] } })
        .populate('vehicle_id')
        .populate('driver_id')
        .populate('operator_id');
      return trips;
    } catch (error) {
      logger.loggerError(`Error fetching active trips: ${error.message}`);
      throw error;
    }
  }

  static async scheduleAdvanceNotifications(tripId, notificationAdvanceMinutes = 5) {
    try {
      const filter = buildTripMatchFilter(tripId);
      if (!filter) {
        throw new CustomError('Trip ID is required', 400);
      }
      const trip = await OnDemandTrip.findOne(filter).populate('passengers.user_id');
      if (!trip) {
        throw new CustomError('Trip not found', 404);
      }

      logger.loggerInfo(`Scheduling advance notifications for trip ${tripId} (${notificationAdvanceMinutes} mins before)`);

      const results = [];
      for (const passenger of trip.passengers) {
        try {
          const parentUser = await User.findOne({ email: passenger.parent_contact });
          if (!parentUser) {
            logger.loggerWarn(`No parent user found for passenger contact: ${passenger.parent_contact}`);
            continue;
          }

          const pickupJob = await NotificationQueueService.schedulePickupNotification(
            tripId,
            parentUser._id,
            notificationAdvanceMinutes,
            passenger.name,
            passenger.pickup_stop?.name || 'Pickup Stop'
          );

          const dropoffJob = await NotificationQueueService.scheduleDropoffNotification(
            tripId,
            parentUser._id,
            notificationAdvanceMinutes,
            passenger.name,
            passenger.drop_stop?.name || 'Drop Stop'
          );

          results.push({
            passengerId: passenger.user_id._id,
            passengerName: passenger.name,
            pickupJobId: pickupJob.id,
            dropoffJobId: dropoffJob.id
          });
        } catch (error) {
          logger.loggerError(`Error scheduling notifications for passenger ${passenger.name}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      logger.loggerError(`Error scheduling advance notifications: ${error.message}`);
      throw error;
    }
  }

  static async checkGeofenceViolations(tripId, currentLocation) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) throw new CustomError('Trip not found', 404);

      const violations = [];
      const geofenceRadius = 100;

      for (const passenger of trip.passengers) {
        const parentUser = await User.findOne({ email: passenger.parent_contact });
        if (!parentUser || !parentUser.geofence) continue;

        const { latitude: gfLat, longitude: gfLng, radius = geofenceRadius } = parentUser.geofence;
        const { latitude: currentLat, longitude: currentLng } = currentLocation;

        const distance = this.calculateHaversineDistance(
          gfLat, gfLng,
          currentLat, currentLng
        );

        if (distance > radius && !passenger.geofence_exit_alert_sent) {
          violations.push({
            passengerId: passenger.user_id,
            passengerName: passenger.name,
            parentId: parentUser._id,
            distanceFromGeofence: distance,
            geofenceRadius: radius,
            currentLocation
          });

          passenger.geofence_exit_alert_sent = true;
        }
      }

      if (violations.length > 0) {
        await trip.save();
        logger.loggerInfo(`Geofence violations detected for trip ${tripId}: ${violations.length}`);

        if (global.socketManager) {
          for (const violation of violations) {
            global.socketManager.emitToParent(
              violation.parentId.toString(),
              'geofence_alert',
              {
                tripId: trip._id,
                studentName: violation.passengerName,
                message: `Your child's vehicle has exited the geofence boundary`,
                currentLocation: violation.currentLocation,
                distance: violation.distanceFromGeofence.toFixed(2),
                timestamp: new Date()
              }
            );
          }
        }
      }

      return violations;
    } catch (error) {
      logger.loggerError(`Error checking geofence violations: ${error.message}`);
      throw error;
    }
  }

  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return distanceKm;
  }

  static async sendStudentNotificationToParent(tripId, passengerId, status) {
    try {
      const trip = await this.getTripByIdentifier(tripId);
      if (!trip) throw new CustomError('Trip not found', 404);

      const passenger = trip.passengers.find(p => p.user_id.toString() === passengerId.toString());
      if (!passenger) throw new CustomError('Passenger not found', 404);

      const parentUser = await User.findOne({ email: passenger.parent_contact });
      if (!parentUser || !parentUser.fcm_tokens || parentUser.fcm_tokens.length === 0) {
        logger.loggerWarn(`No FCM tokens for parent of passenger ${passengerId}`);
        return;
      }

      if (status === 'picked_up' && !passenger.notification_sent_before_pickup) {
        await NotificationQueueService.scheduleStudentPickupNotification(
          tripId,
          parentUser._id,
          passenger.name,
          passenger.pickup_stop
        );
        passenger.notification_sent_before_pickup = true;
      } else if (status === 'dropped' && !passenger.notification_sent_before_dropoff) {
        await NotificationQueueService.scheduleStudentDropoffNotification(
          tripId,
          parentUser._id,
          passenger.name,
          passenger.drop_stop
        );
        passenger.notification_sent_before_dropoff = true;
      }

      await trip.save();
      logger.loggerInfo(`Sent ${status} notification for passenger ${passengerId}`);
    } catch (error) {
      logger.loggerError(`Error sending student notification: ${error.message}`);
      throw error;
    }
  }

  static async startTripFromScheduled(data) {
    try {
      const { scheduledTrip, driver_id, operator_id } = data;

      const vehicle = await findVehicleByIdentifier(scheduledTrip.vehicle_id);
      if (!vehicle) {
        throw new CustomError('Vehicle not found', 404);
      }

      const normalizedRoutePoints = normalizeRoutePointsPayload(scheduledTrip.route_points);
      const todayKey = formatDateKey(new Date());
      const plannedUpdate = {
        status: 'en_route',
        start_time: new Date(),
        driver_id,
        operator_id,
        vehicle_id: vehicle.vehicle_id
      };

      if (normalizedRoutePoints.length) {
        plannedUpdate.route_points = normalizedRoutePoints;
      }

      const existingPlannedTrip = await Trip.findOneAndUpdate(
        { scheduled_trip_id: scheduledTrip.scheduled_trip_id, planned_date: todayKey },
        plannedUpdate,
        { new: true }
      );

      if (existingPlannedTrip) {
        await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicle.vehicle_id), { current_status: 'en_route', current_trip_id: existingPlannedTrip.trip_id });
        logger.loggerInfo(`Trip started from scheduled trip: ${existingPlannedTrip._id}`);
        return existingPlannedTrip;
      }

      const tripPayload = {
        vehicle_id: vehicle.vehicle_id,
        driver_id: driver_id,
        operator_id: operator_id,
        route_name: scheduledTrip.route_name,
        start_location: scheduledTrip.start_location,
        end_location: scheduledTrip.end_location,
        start_time: new Date(),
        trip_period: scheduledTrip.trip_period,
        scheduled_trip_id: scheduledTrip.scheduled_trip_id,
        planned_date: todayKey,
        status: 'en_route',
        passengers: await buildPassengerManifest(vehicle.vehicle_id)
      };

      if (normalizedRoutePoints.length) {
        tripPayload.route_points = normalizedRoutePoints;
      }
      
      tripPayload.total_passengers = tripPayload.passengers.length;

      const trip = new OnDemandTrip(tripPayload);
      await trip.save();
      await Vehicle.findOneAndUpdate(buildVehicleMatchFilter(vehicle.vehicle_id), { current_status: 'en_route', current_trip_id: trip.trip_id });

      logger.loggerInfo(`Trip started from scheduled trip: ${trip._id}`);
      return trip;
    } catch (error) {
      logger.loggerError(`Error starting trip from scheduled: ${error.message}`);
      throw error;
    }
  }
}

module.exports = TripService;
