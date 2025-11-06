const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const resourceMap = {
  '/drivers': 'DRIVER',
  '/end-users': 'PARENT',
  '/vehicles': 'VEHICLE',
  '/devices': 'DEVICE',
  '/trips': 'TRIP',
  '/routes': 'ROUTE',
  '/operators': 'OPERATOR',
  '/roles': 'ROLE',
  '/users': 'USER',
  '/webhook': 'TRACKING',
  '/telemetry': 'TRACKING'
};

const actionMap = {
  'POST': 'CREATE',
  'GET': 'READ',
  'PUT': 'UPDATE',
  'PATCH': 'UPDATE',
  'DELETE': 'DELETE'
};

const extractResourceType = (path) => {
  for (const [route, type] of Object.entries(resourceMap)) {
    if (path.includes(route)) {
      return type;
    }
  }
  return 'UNKNOWN';
};

const extractResourceId = (body, params, path) => {
  if (params.driverId) return params.driverId;
  if (params.userId) return params.userId;
  if (params.vehicleId) return params.vehicleId;
  if (params.deviceId) return params.deviceId;
  if (params.tripId) return params.tripId;
  if (params.routeId) return params.routeId;
  if (body && body._id) return body._id;
  if (body && body.id) return body.id;
  return null;
};

const shouldAudit = (method, path) => {
  const skipAuditEndpoints = ['/health', '/stats', '/analytics', '/profile', '/webhook', '/telemetry', '/', ''];
  const skipAudit = skipAuditEndpoints.some(endpoint => path === endpoint || path.includes(endpoint));
  
  if (skipAudit) return false;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true;
  if (method === 'GET' && path.includes('list')) return true;
  
  return false;
};

const auditTrailMiddleware = (req, res, next) => {
  const startTime = Date.now();

  const originalSend = res.send;
  res.send = function (data) {
    if (shouldAudit(req.method, req.path)) {
      logAudit({
        user_id: req.user?.id,
        user_email: req.user?.email,
        user_role: req.user?.role,
        operator_id: req.user?.operator_id,
        action: actionMap[req.method] || 'READ',
        resource_type: extractResourceType(req.path),
        resource_id: extractResourceId(req.body, req.params, req.path),
        resource_name: req.body?.name || req.body?.email || req.body?.vehicle_number,
        method: req.method,
        endpoint: req.path,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        status_code: res.statusCode,
        changes: {
          before: null,
          after: req.body
        },
        details: {
          query: req.query,
          params: req.params
        },
        duration_ms: Date.now() - startTime,
        error_message: res.statusCode >= 400 ? data : null
      }).catch(error => {
        logger.loggerError(`Failed to log audit trail: ${error.message}`);
      });
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

const logAudit = async (auditData) => {
  try {
    if (!auditData.user_id) {
      logger.loggerWarn('Audit log created without user_id');
      auditData.user_id = 'SYSTEM';
    }

    const auditLog = new AuditLog({
      ...auditData,
      timestamp: new Date()
    });

    await auditLog.save();
    logger.loggerDebug(`Audit logged: ${auditData.action} on ${auditData.resource_type}`);
  } catch (error) {
    logger.loggerError(`Error creating audit log: ${error.message}`);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { user_id, resource_type, action, start_date, end_date, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};

    if (req.user.role !== 'superadmin') {
      query.operator_id = req.user.operator_id;
    }

    if (user_id) query.user_id = user_id;
    if (resource_type) query.resource_type = resource_type;
    if (action) query.action = action;

    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ timestamp: -1 });

    res.status(200).json({
      error: false,
      message: 'Audit logs retrieved successfully',
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const { logId } = req.params;

    const log = await AuditLog.findById(logId);

    if (!log) {
      return res.status(404).json({
        error: true,
        message: 'Audit log not found'
      });
    }

    if (req.user.role !== 'superadmin' && log.operator_id !== req.user.operator_id) {
      return res.status(403).json({
        error: true,
        message: 'Unauthorized to view this audit log'
      });
    }

    res.status(200).json({
      error: false,
      message: 'Audit log retrieved successfully',
      data: log
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const query = {};
    if (req.user.role !== 'superadmin') {
      query.operator_id = req.user.operator_id;
    }

    if (start_date || end_date) {
      query.timestamp = {};
      if (start_date) query.timestamp.$gte = new Date(start_date);
      if (end_date) query.timestamp.$lte = new Date(end_date);
    }

    const stats = await AuditLog.aggregate([
      { $match: query },
      {
        $facet: {
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } }
          ],
          byResourceType: [
            { $group: { _id: '$resource_type', count: { $sum: 1 } } }
          ],
          byUser: [
            { $group: { _id: '$user_email', count: { $sum: 1 } } }
          ],
          totalRecords: [{ $count: 'count' }]
        }
      }
    ]);

    res.status(200).json({
      error: false,
      message: 'Audit log statistics retrieved successfully',
      data: {
        byAction: stats[0].byAction,
        byResourceType: stats[0].byResourceType,
        byUser: stats[0].byUser,
        totalRecords: stats[0].totalRecords[0]?.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const clearAuditLogs = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: true,
        message: 'Only superadmin can clear audit logs'
      });
    }

    const { daysOld = 90 } = req.body;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.loggerInfo(`Cleared ${result.deletedCount} audit logs older than ${daysOld} days`);

    res.status(200).json({
      error: false,
      message: `Cleared ${result.deletedCount} audit logs`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  auditTrailMiddleware,
  logAudit,
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  clearAuditLogs
};
