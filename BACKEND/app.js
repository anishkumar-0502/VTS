require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const logger = require('./utils/logger');
const SocketManager = require('./utils/socketManager');
const cacheService = require('./services/cacheService');
const { errorHandler } = require('./middlewares/errorHandler');
// const { apiLimiter } = require('./middlewares/rate-limit');
const { auditTrailMiddleware } = require('./middlewares/auditTrail');
const dbService = require('./config/db');
const { initializeDatabase } = require('./seeds/initializeDatabase');
const { setupSwaggerDocs } = require('./config/swagger');

const HTTP_PORT = process.env.HTTP_PORT || 8787;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'vts_db';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:8787',
    methods: ['GET', 'POST']
  }
});

const socketManager = new SocketManager(io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// app.use(apiLimiter);
app.use(auditTrailMiddleware);

app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  logger.loggerDebug(`[INCOMING] ${req.method} ${req.originalUrl} from ${clientIp}`);
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const fullPath = req.originalUrl || req.url || '/';
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const message = `${req.method} ${fullPath} | IP: ${clientIp} | Status: ${res.statusCode} | ${duration}ms | ${userAgent.substring(0, 50)}`;

    if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.loggerSuccess(message);
    } else if (res.statusCode >= 400 && res.statusCode < 500) {
      logger.loggerWarn(message);
    } else if (res.statusCode >= 500) {
      logger.loggerError(message);
    } else {
      logger.loggerInfo(message);
    }
  });
  next();
});

app.use((req, res, next) => {
  res.success = (data, message = 'Success') => res.json({ error: false, message, data });
  res.fail = (message = 'Something went wrong', statusCode = 500) => res.status(statusCode).json({ error: true, message });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: socketManager.getConnectedUsersCount()
  });
});

// Setup Swagger Documentation
setupSwaggerDocs(app);

// Serve favicon (simple ICO to eliminate 404 warnings)
app.get('/favicon.ico', (req, res) => {
  const favicon = Buffer.from('AAABAAEAEBAAAAEAIACoBAAARgAAACAgAAABACAAqAgAAE4BAAAwMAAAAQAgAKggAABGAQAA', 'base64');
  res.set('Content-Type', 'image/x-icon');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(favicon);
});

// Serve markdown documentation routes
app.get('/docs/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const allowedFiles = ['API_ROUTES.md', 'OPERATOR_FLOW_ANALYSIS.md', 'DRIVER_ROUTES_CLI.md', 'PARENT_ROUTES_CLI.md', 'OPERATOR_ROUTES_CLI.md', 'SUPERADMIN_ROUTES_CLI.md', 'ROLE_MATRIX.md', 'SYSTEM_FLOW.md'];

    if (!allowedFiles.includes(filename)) {
      return res.status(400).json({ error: true, message: 'Invalid documentation file' });
    }

    const filePath = path.join(__dirname, 'docs', filename);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.sendFile(filePath);
  } catch (error) {
    logger.loggerError(`Error serving documentation: ${error.message}`);
    res.status(500).json({ error: true, message: 'Failed to serve documentation' });
  }
});

app.use('/auth', require('./routes/authRoutes'));
app.use('/superadmin', require('./routes/superadminRoutes'));
app.use('/operator', require('./routes/operatorRoutes'));
app.use('/driver', require('./routes/driverRoutes'));
app.use('/parent', require('./routes/parentRoutes'));
app.use('/webhook', require('./routes/webhookRoutes'));

app.use('*', (req, res) => {
  logger.loggerWarn(`404 Not Found: ${req.method} ${req.url} from ${req.ip}`);
  res.status(404).json({ error: true, message: 'Route not found' });
});

app.use(errorHandler);

const startServer = (server, port, name) => {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      logger.loggerDebug(`${name} listening on port ${port}`);
      resolve();
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.loggerError(`${name} failed to start: Port ${port} is already in use`);
      } else {
        logger.loggerError(`${name} failed to start: ${err.message}`);
      }
      reject(err);
    });
  });
};

const startServers = async () => {
  try {
    logger.loggerDebug('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME
    });
    logger.loggerSuccess('MongoDB connection established.');

    await dbService.connectToDatabase();
    logger.loggerDebug('MongoClient connection pool initialized.');

    await cacheService.initialize();
    logger.loggerInfo('Redis cache service initialized.');

    await initializeDatabase();

    await startServer(httpServer, HTTP_PORT, 'HTTP Server');

    logger.loggerInfo('All servers started successfully.');
    logger.loggerInfo(`WebSocket server ready on /socket.io`);
    logger.loggerInfo(`Health check: http://localhost:${HTTP_PORT}/health`);
    logger.loggerInfo(`🎯 Swagger API Documentation: http://localhost:${HTTP_PORT}/api-docs`);
    logger.loggerInfo(`📋 API Spec (JSON): http://localhost:${HTTP_PORT}/api-docs.json`);
    logger.loggerInfo(`📖 Markdown Documentation: http://localhost:${HTTP_PORT}/docs/API_ROUTES.md`);
  } catch (error) {
    logger.loggerError(`Failed to start servers: ${error.message}`);
    await shutdown();
    process.exit(1);
  }
};

let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) {
    logger.loggerInfo('Shutdown already in progress, ignoring additional signal.');
    return;
  }
  isShuttingDown = true;

  logger.loggerInfo('⚠ Initiating server shutdown...');

  try {
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          logger.loggerError(`HTTP server close error: ${err.message}`);
          return reject(err);
        }
        logger.loggerInfo('HTTP server closed.');
        resolve();
      });
    });

    if (io) {
      io.close();
      logger.loggerInfo('Socket.io server closed.');
    }

    try {
      await cacheService.close();
      logger.loggerInfo('Redis cache service closed.');
    } catch (err) {
      logger.loggerError(`Failed to close cache service: ${err.message}`);
    }

    try {
      await dbService.closeConnection();
      logger.loggerInfo('MongoClient connection closed.');
    } catch (err) {
      logger.loggerError(`Failed to close MongoClient connection: ${err.message}`);
    }

    try {
      await mongoose.disconnect();
      logger.loggerInfo('Mongoose connection closed.');
    } catch (err) {
      logger.loggerError(`Failed to close Mongoose connection: ${err.message}`);
    }

    logger.loggerInfo('All servers and connections closed successfully.');
    process.exit(0);
  } catch (error) {
    logger.loggerError(`Shutdown failed: ${error.message}`);
    process.exit(1);
  }
};

const handleSignal = (signal) => {
  logger.loggerInfo(`Received ${signal}. Starting shutdown...`);
  shutdown();
};

process.removeAllListeners('SIGINT');
process.removeAllListeners('SIGTERM');

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.loggerError(`Uncaught Exception: ${err.message}`);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.loggerError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  shutdown();
});

startServers();

global.socketManager = socketManager;

module.exports = { app, httpServer, io, socketManager };
