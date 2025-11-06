const logger = require('./logger');

class QueryOptimizer {
  static FIELD_SELECTIONS = {
    user: {
      minimal: 'user_id email name role_id status',
      summary: 'user_id email name phone_number role_id status createdAt',
      full: '-password -fcm_tokens'
    },
    driver: {
      minimal: 'user_id name email phone_number assigned_vehicle_id',
      summary: 'user_id name email phone_number assigned_vehicle_id license_number current_trip_id status',
      full: '-password'
    },
    parent: {
      minimal: 'user_id name email phone_number',
      summary: 'user_id name email phone_number address status',
      full: '-password'
    },
    vehicle: {
      minimal: '_id vehicle_number vehicle_type',
      summary: '_id vehicle_number vehicle_type capacity current_status assigned_drivers',
      full: 'all'
    },
    trip: {
      minimal: '_id vehicle_id driver_id status start_time',
      summary: '_id vehicle_id driver_id status start_time end_time passengers route_name',
      full: 'all'
    },
    device: {
      minimal: '_id device_id device_type status',
      summary: '_id device_id device_type status vehicle_id battery_level last_signal',
      full: 'all'
    },
    trackingData: {
      minimal: 'vehicle_id latitude longitude timestamp',
      summary: 'vehicle_id latitude longitude speed heading timestamp',
      full: 'all'
    },
    operator: {
      minimal: '_id operator_name email status',
      summary: '_id operator_name email phone_number address status',
      full: 'all'
    }
  };

  static POPULATE_OPTIONS = {
    tripWithDetails: {
      path: 'vehicle_id',
      select: '_id vehicle_number vehicle_type capacity',
      options: { lean: true }
    },
    tripWithDriver: {
      path: 'driver_id',
      select: 'user_id name phone_number',
      options: { lean: true }
    },
    vehicleWithDriver: {
      path: 'assigned_drivers',
      select: 'user_id name phone_number',
      options: { lean: true }
    },
    deviceWithVehicle: {
      path: 'vehicle_id',
      select: '_id vehicle_number vehicle_type',
      options: { lean: true }
    }
  };

  static getFieldSelection(resource, level = 'summary') {
    const selection = this.FIELD_SELECTIONS[resource];
    if (!selection) {
      logger.loggerWarn(`No field selection found for resource: ${resource}`);
      return {};
    }

    return selection[level] || selection.summary;
  }

  static buildOptimizedQuery(model, query = {}, resource, level = 'summary') {
    try {
      const fieldSelection = this.getFieldSelection(resource, level);
      let mongooseQuery = model.find(query);

      if (fieldSelection && fieldSelection !== 'all') {
        mongooseQuery = mongooseQuery.select(fieldSelection);
      }

      return mongooseQuery;
    } catch (error) {
      logger.loggerError(`Error building optimized query: ${error.message}`);
      return model.find(query);
    }
  }

  static async fetchWithOptimization(model, query, resource, populateOptions = [], level = 'summary') {
    try {
      const fieldSelection = this.getFieldSelection(resource, level);
      let mongooseQuery = model.find(query);

      if (fieldSelection && fieldSelection !== 'all') {
        mongooseQuery = mongooseQuery.select(fieldSelection);
      }

      for (const populate of populateOptions) {
        mongooseQuery = mongooseQuery.populate(populate);
      }

      const results = await mongooseQuery.lean().exec();
      return results;
    } catch (error) {
      logger.loggerError(`Error in optimized fetch: ${error.message}`);
      throw error;
    }
  }

  static async fetchSingleWithOptimization(model, query, resource, populateOptions = [], level = 'summary') {
    try {
      const fieldSelection = this.getFieldSelection(resource, level);
      let mongooseQuery = model.findOne(query);

      if (fieldSelection && fieldSelection !== 'all') {
        mongooseQuery = mongooseQuery.select(fieldSelection);
      }

      for (const populate of populateOptions) {
        mongooseQuery = mongooseQuery.populate(populate);
      }

      const result = await mongooseQuery.lean().exec();
      return result;
    } catch (error) {
      logger.loggerError(`Error fetching single document: ${error.message}`);
      throw error;
    }
  }

  static buildPaginatedQuery(model, query, resource, skip, limit, sort = { createdAt: -1 }, level = 'summary') {
    try {
      const fieldSelection = this.getFieldSelection(resource, level);
      let mongooseQuery = model.find(query);

      if (fieldSelection && fieldSelection !== 'all') {
        mongooseQuery = mongooseQuery.select(fieldSelection);
      }

      mongooseQuery = mongooseQuery
        .skip(skip)
        .limit(limit)
        .sort(sort);

      return mongooseQuery;
    } catch (error) {
      logger.loggerError(`Error building paginated query: ${error.message}`);
      return model.find(query).skip(skip).limit(limit).sort(sort);
    }
  }

  static createAggregationPipeline(resource, filters = {}, skip = 0, limit = 10, sort = { createdAt: -1 }) {
    const pipeline = [];

    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }

    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const fieldSelection = this.FIELD_SELECTIONS[resource];
    if (fieldSelection && fieldSelection.summary !== 'all') {
      const fields = {};
      const selections = fieldSelection.summary.split(' ');
      selections.forEach(sel => {
        fields[sel] = 1;
      });
      pipeline.push({ $project: fields });
    }

    return pipeline;
  }

  static async performAggregation(model, pipeline) {
    try {
      const results = await model.aggregate(pipeline).exec();
      return results;
    } catch (error) {
      logger.loggerError(`Aggregation error: ${error.message}`);
      throw error;
    }
  }

  static getOptimalPopulateStrategy(resource) {
    const strategies = {
      trip: [
        { path: 'vehicle_id', select: '_id vehicle_number vehicle_type capacity' },
        { path: 'driver_id', select: 'user_id name phone_number email' }
      ],
      vehicle: [
        { path: 'assigned_drivers', select: 'user_id name phone_number' },
        { path: 'operator_id', select: '_id operator_name' }
      ],
      device: [
        { path: 'vehicle_id', select: '_id vehicle_number' },
        { path: 'operator_id', select: '_id operator_name' }
      ],
      user: [
        { path: 'assigned_vehicle_id', select: '_id vehicle_number' }
      ]
    };

    return strategies[resource] || [];
  }

  static async fetchWithOptimalPopulate(model, query, resource, level = 'summary') {
    try {
      const fieldSelection = this.getFieldSelection(resource, level);
      const populateStrategy = this.getOptimalPopulateStrategy(resource);

      let mongooseQuery = model.findOne(query);

      if (fieldSelection && fieldSelection !== 'all') {
        mongooseQuery = mongooseQuery.select(fieldSelection);
      }

      for (const popStrategy of populateStrategy) {
        mongooseQuery = mongooseQuery.populate(popStrategy);
      }

      const result = await mongooseQuery.exec();
      return result;
    } catch (error) {
      logger.loggerError(`Error fetching with optimal populate: ${error.message}`);
      throw error;
    }
  }

  static countWithOptimization(model, query = {}) {
    try {
      return model.countDocuments(query);
    } catch (error) {
      logger.loggerError(`Error counting documents: ${error.message}`);
      throw error;
    }
  }

  static createIndexRecommendations(resource) {
    const recommendations = {
      user: [
        { fields: { email: 1 }, options: { unique: true } },
        { fields: { operator_id: 1, role_id: 1, status: 1 } },
        { fields: { createdAt: -1 } }
      ],
      vehicle: [
        { fields: { operator_id: 1, status: 1 } },
        { fields: { vehicle_number: 1 }, options: { unique: true } },
        { fields: { current_status: 1 } }
      ],
      trip: [
        { fields: { driver_id: 1, status: 1 } },
        { fields: { vehicle_id: 1, status: 1 } },
        { fields: { start_time: -1 } },
        { fields: { operator_id: 1, start_time: -1 } }
      ],
      trackingData: [
        { fields: { vehicle_id: 1, timestamp: -1 } },
        { fields: { timestamp: -1 } }
      ]
    };

    return recommendations[resource] || [];
  }
}

module.exports = QueryOptimizer;
