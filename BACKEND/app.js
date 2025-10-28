require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const path = require('path');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const SocketManager = require('./utils/socketManager');
const { errorHandler } = require('./middlewares/errorHandler');
const dbService = require('./config/db');

const HTTP_PORT = process.env.HTTP_PORT || 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || '*',
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
});
app.use(apiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.loggerInfo(`${req.method} ${req.url} from ${req.ip} - ${res.statusCode} (${duration}ms)`);
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

app.use('/webhook', require('./routes/webhook'));

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
    await dbService.connectToDatabase();
    logger.loggerDebug('Database connection established.');

    await startServer(httpServer, HTTP_PORT, 'HTTP Server');

    logger.loggerInfo('All servers started successfully.');
    logger.loggerInfo(`WebSocket server ready on /socket.io`);
    logger.loggerInfo(`Health check: http://localhost:${HTTP_PORT}/health`);
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
      await dbService.closeConnection();
      logger.loggerInfo('Database connection closed.');
    } catch (err) {
      logger.loggerError(`Failed to close database connection: ${err.message}`);
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
