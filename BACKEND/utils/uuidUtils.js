const { v4: uuidv4 } = require('uuid');

const ENTITY_PREFIXES = {
  USER: 'USR',
  ROLE: 'ROL',
  DEVICE: 'DEV',
  VEHICLE: 'VEH',
  OPERATOR: 'OPR',
  DRIVER: 'DRV',
  TRIP: 'TRP',
  TRACKING_DATA: 'TRK',
  NOTIFICATION: 'NOT',
  END_USER: 'EUS',
  SCHEDULED_TRIP: 'SCHTRP',
  ROUTE_POINT: 'STP',
  STOP_CHECKLIST_ITEM: 'CHK',
  STOP_NOTE: 'SNT',
  STOP_INCIDENT: 'INC'
};

const generateEntityId = (prefix) => {
  if (!prefix) {
    throw new Error('Entity prefix is required');
  }
  return `${prefix}-${uuidv4()}`;
};

const generateUserId = () => generateEntityId(ENTITY_PREFIXES.USER);
const generateRoleId = () => generateEntityId(ENTITY_PREFIXES.ROLE);
const generateDeviceId = () => generateEntityId(ENTITY_PREFIXES.DEVICE);
const generateVehicleId = () => generateEntityId(ENTITY_PREFIXES.VEHICLE);
const generateOperatorId = () => generateEntityId(ENTITY_PREFIXES.OPERATOR);
const generateDriverId = () => generateEntityId(ENTITY_PREFIXES.DRIVER);
const generateTripId = () => generateEntityId(ENTITY_PREFIXES.TRIP);
const generateTrackingDataId = () => generateEntityId(ENTITY_PREFIXES.TRACKING_DATA);
const generateNotificationId = () => generateEntityId(ENTITY_PREFIXES.NOTIFICATION);
const generateEndUserId = () => generateEntityId(ENTITY_PREFIXES.END_USER);
const generateScheduledTripId = () => generateEntityId(ENTITY_PREFIXES.SCHEDULED_TRIP);
const generateRoutePointId = () => generateEntityId(ENTITY_PREFIXES.ROUTE_POINT);
const generateStopChecklistItemId = () => generateEntityId(ENTITY_PREFIXES.STOP_CHECKLIST_ITEM);
const generateStopNoteId = () => generateEntityId(ENTITY_PREFIXES.STOP_NOTE);
const generateStopIncidentId = () => generateEntityId(ENTITY_PREFIXES.STOP_INCIDENT);

module.exports = {
  generateEntityId,
  generateUserId,
  generateRoleId,
  generateDeviceId,
  generateVehicleId,
  generateOperatorId,
  generateDriverId,
  generateTripId,
  generateTrackingDataId,
  generateNotificationId,
  generateEndUserId,
  generateScheduledTripId,
  generateRoutePointId,
  generateStopChecklistItemId,
  generateStopNoteId,
  generateStopIncidentId,
  ENTITY_PREFIXES
};
