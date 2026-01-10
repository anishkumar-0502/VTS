const mongoose = require('mongoose');
const {
  generateTripId,
  generateRoutePointId,
  generateStopChecklistItemId,
  generateStopNoteId,
  generateStopIncidentId
} = require('../utils/uuidUtils');

const normalizeRoutePoints = (routePoints) => {
  if (!Array.isArray(routePoints)) {
    return [];
  }

  return routePoints
    .filter((point) => point)
    .map((point, index) => {
      const data = point ? point.toObject?.() ?? point : {};
      if (!data.stop_id) {
        data.stop_id = generateRoutePointId();
      }
      data.sequence = typeof data.sequence === 'number' ? data.sequence : index + 1;
      data.order = typeof data.order === 'number' ? data.order : index + 1;
      data.dwell_target_seconds = typeof data.dwell_target_seconds === 'number' ? data.dwell_target_seconds : 120;
      data.sla_arrival_buffer_seconds = typeof data.sla_arrival_buffer_seconds === 'number' ? data.sla_arrival_buffer_seconds : 300;
      data.geofence_radius_meters =
        typeof data.geofence_radius_meters === 'number' && Number.isFinite(data.geofence_radius_meters)
          ? data.geofence_radius_meters
          : 100;
      data.landmark = typeof data.landmark === 'string' ? data.landmark : null;
      data.approximate_reach_time = typeof data.approximate_reach_time === 'string' ? data.approximate_reach_time : null;
      data.stop_status = typeof data.stop_status === 'string' ? data.stop_status : null;
      if (!data.status) {
        data.status = 'pending';
      }
      if (typeof data.delay_seconds !== 'number' || Number.isNaN(data.delay_seconds)) {
        data.delay_seconds = 0;
      }
      data.arrival_notified = typeof data.arrival_notified === 'boolean' ? data.arrival_notified : false;

      if (!Array.isArray(data.checklist)) {
        data.checklist = [];
      } else {
        data.checklist = data.checklist
          .filter(Boolean)
          .map((item) => {
            const itemData = item ? item.toObject?.() ?? item : {};
            if (!itemData.item_id) {
              itemData.item_id = generateStopChecklistItemId();
            }
            itemData.label = typeof itemData.label === 'string' ? itemData.label : null;
            itemData.required = itemData.required === undefined ? true : !!itemData.required;
            itemData.completed = !!itemData.completed;
            if (!itemData.completed) {
              itemData.completed_at = null;
              itemData.completed_by = null;
            } else {
              itemData.completed_at = itemData.completed_at ? new Date(itemData.completed_at) : new Date();
              itemData.completed_by = typeof itemData.completed_by === 'string' ? itemData.completed_by : null;
            }
            itemData.notes = itemData.notes !== undefined && itemData.notes !== null ? String(itemData.notes) : null;
            return itemData;
          });
      }

      if (!Array.isArray(data.photo_notes)) {
        data.photo_notes = [];
      } else {
        data.photo_notes = data.photo_notes
          .filter(Boolean)
          .map((note) => {
            const noteData = note ? note.toObject?.() ?? note : {};
            if (!noteData.note_id) {
              noteData.note_id = generateStopNoteId();
            }
            noteData.photo_url = typeof noteData.photo_url === 'string' ? noteData.photo_url : null;
            noteData.caption = typeof noteData.caption === 'string' ? noteData.caption : null;
            noteData.created_by = typeof noteData.created_by === 'string' ? noteData.created_by : null;
            noteData.created_at = noteData.created_at ? new Date(noteData.created_at) : new Date();
            return noteData;
          });
      }

      if (!Array.isArray(data.incidents)) {
        data.incidents = [];
      } else {
        data.incidents = data.incidents
          .filter(Boolean)
          .map((incident) => {
            const incidentData = incident ? incident.toObject?.() ?? incident : {};
            if (!incidentData.incident_id) {
              incidentData.incident_id = generateStopIncidentId();
            }
            incidentData.type = typeof incidentData.type === 'string' ? incidentData.type : null;
            incidentData.severity = ['info', 'warning', 'critical'].includes(incidentData.severity)
              ? incidentData.severity
              : 'warning';
            incidentData.description =
              typeof incidentData.description === 'string' ? incidentData.description : null;
            incidentData.passenger_id =
              typeof incidentData.passenger_id === 'string' ? incidentData.passenger_id : null;
            incidentData.photo_urls = Array.isArray(incidentData.photo_urls)
              ? incidentData.photo_urls.filter((url) => typeof url === 'string')
              : [];
            incidentData.resolves_blocker = !!incidentData.resolves_blocker;
            incidentData.resolved = !!incidentData.resolved;
            incidentData.resolved_at = incidentData.resolved_at ? new Date(incidentData.resolved_at) : null;
            incidentData.resolution_notes =
              typeof incidentData.resolution_notes === 'string' ? incidentData.resolution_notes : null;
            incidentData.created_by = typeof incidentData.created_by === 'string' ? incidentData.created_by : null;
            incidentData.created_at = incidentData.created_at ? new Date(incidentData.created_at) : new Date();
            return incidentData;
          });
      }

      data.required_actions_completed = data.checklist.every((item) => !item.required || item.completed);

      return data;
    });
};

const stopChecklistItemSchema = new mongoose.Schema(
  {
    item_id: {
      type: String,
      default: generateStopChecklistItemId
    },
    label: {
      type: String,
      default: null
    },
    required: {
      type: Boolean,
      default: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: Date,
    completed_by: String,
    notes: {
      type: String,
      default: null
    }
  },
  { _id: false }
);

const stopPhotoNoteSchema = new mongoose.Schema(
  {
    note_id: {
      type: String,
      default: generateStopNoteId
    },
    photo_url: {
      type: String,
      default: null
    },
    caption: {
      type: String,
      default: null
    },
    created_by: {
      type: String,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const stopIncidentSchema = new mongoose.Schema(
  {
    incident_id: {
      type: String,
      default: generateStopIncidentId
    },
    type: {
      type: String,
      default: null
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning'
    },
    description: {
      type: String,
      default: null
    },
    passenger_id: {
      type: String,
      default: null
    },
    photo_urls: {
      type: [String],
      default: []
    },
    resolves_blocker: {
      type: Boolean,
      default: false
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolved_at: Date,
    resolution_notes: {
      type: String,
      default: null
    },
    created_by: {
      type: String,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const routePointSchema = new mongoose.Schema(
  {
    stop_id: {
      type: String,
      default: generateRoutePointId
    },
    name: {
      type: String,
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    sequence: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    },
    dwell_target_seconds: {
      type: Number,
      default: 120
    },
    sla_arrival_buffer_seconds: {
      type: Number,
      default: 300
    },
    geofence_radius_meters: {
      type: Number,
      default: 100
    },
    planned_arrival_time: Date,
    planned_departure_time: Date,
    actual_arrival_time: Date,
    actual_departure_time: Date,
    status: {
      type: String,
      enum: ['pending', 'approaching', 'arrived', 'departed', 'skipped', 'delayed'],
      default: 'pending'
    },
    delay_seconds: {
      type: Number,
      default: 0
    },
    checklist: {
      type: [stopChecklistItemSchema],
      default: []
    },
    photo_notes: {
      type: [stopPhotoNoteSchema],
      default: []
    },
    incidents: {
      type: [stopIncidentSchema],
      default: []
    },
    arrival_notified: {
      type: Boolean,
      default: false
    },
    required_actions_completed: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const onDemandTripSchema = new mongoose.Schema(
  {
    trip_id: {
      type: String,
      default: generateTripId,
      unique: true,
      required: true
    },
    vehicle_id: {
      type: String,
      ref: 'Vehicle',
      required: true
    },
    driver_id: {
      type: String,
      ref: 'User',
      required: true
    },
    operator_id: {
      type: String,
      ref: 'Operator',
      required: true
    },
    route_name: String,
    scheduled_trip_id: {
      type: String,
      ref: 'ScheduledTrip',
      default: null
    },
    planned_date: {
      type: String,
      index: true,
      default: null
    },
    planned_start_time: Date,
    planned_end_time: Date,
    start_time: {
      type: Date,
      required: true
    },
    end_time: Date,
    start_location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    end_location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    distance_traveled: Number,
    duration: Number,
    average_speed: Number,
    max_speed: Number,
    status: {
      type: String,
      enum: ['planned', 'active', 'en_route', 'at_stop', 'delayed', 'completed', 'cancelled'],
      default: 'active'
    },
    total_passengers: Number,
    stops: [
      {
        name: String,
        latitude: Number,
        longitude: Number,
        arrival_time: Date,
        departure_time: Date,
        passengers_boarded: Number,
        passengers_alighted: Number
      }
    ],
    fuel_consumed: Number,
    speed_violations: [
      {
        timestamp: Date,
        speed: Number,
        speed_limit: Number,
        location: {
          latitude: Number,
          longitude: Number
        }
      }
    ],
    route_deviations: [
      {
        timestamp: Date,
        expected_location: {
          latitude: Number,
          longitude: Number
        },
        actual_location: {
          latitude: Number,
          longitude: Number
        },
        deviation_meters: Number
      }
    ],
    passengers: [
      {
        user_id: {
          type: String,
          ref: 'User'
        },
        name: String,
        phone_number: String,
        pickup_stop: {
          name: String,
          latitude: Number,
          longitude: Number
        },
        drop_stop: {
          name: String,
          latitude: Number,
          longitude: Number
        },
        picked_up: {
          type: Boolean,
          default: false
        },
        picked_up_time: Date,
        dropped: {
          type: Boolean,
          default: false
        },
        dropped_time: Date,
        parent_contact: String,
        parent_confirmed_pickup: {
          type: Boolean,
          default: false
        },
        parent_pickup_confirmation_time: Date,
        parent_confirmed_dropoff: {
          type: Boolean,
          default: false
        },
        parent_dropoff_confirmation_time: Date,
        notification_sent_before_pickup: {
          type: Boolean,
          default: false
        },
        notification_sent_before_dropoff: {
          type: Boolean,
          default: false
        },
        geofence_exit_alert_sent: {
          type: Boolean,
          default: false
        }
      }
    ],
    route_points: {
      type: [routePointSchema],
      default: []
    },
    current_stop_index: {
      type: Number,
      default: 0
    },
    last_location: {
      latitude: Number,
      longitude: Number,
      speed: Number,
      heading: Number,
      recorded_at: Date
    },
    anomalies: {
      type: [
        {
          type: {
            type: String
          },
          passenger_id: String,
          stop_id: String,
          message: String,
          severity: {
            type: String,
            enum: ['info', 'warning', 'critical'],
            default: 'warning'
          },
          created_at: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },
    selected_start_point: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    selected_end_point: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    speed_alarm_enabled: {
      type: Boolean,
      default: true
    },
    speed_limit: {
      type: Number,
      default: 60
    }
  },
  { timestamps: true, id: false }
);

onDemandTripSchema.pre('validate', function (next) {
  this.route_points = normalizeRoutePoints(this.route_points);
  next();
});

onDemandTripSchema.pre('save', function (next) {
  if (!this.trip_id) {
    this.trip_id = generateTripId();
  }
  this.route_points = normalizeRoutePoints(this.route_points);
  next();
});

onDemandTripSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

onDemandTripSchema.set('toObject', {
  virtuals: true,
  transform: (_, ret) => {
    ret.trip_id = ret.trip_id || ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

module.exports = mongoose.model('Trip', onDemandTripSchema, 'on_demand_trips');
