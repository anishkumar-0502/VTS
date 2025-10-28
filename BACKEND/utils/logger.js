const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logsDirectory = 'Log';
if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory, { recursive: true });
}

const logFilename = path.join(logsDirectory, 'VTSLog.log');
const ansiReset = '\x1B[0m';
const ansiGreen = '\x1B[32m';
const ansiRed = '\x1B[31m';
const ansiBlue = '\x1B[34m';
const ansiYellow = '\x1B[33m';
const ansiOrange = '\x1B[38;5;214m';
const ansiCyan = '\x1B[36m';

const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        success: 3,
        debug: 4,
        pingpong: 5,
        webhook: 6
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'orange',
        success: 'green',
        debug: 'blue',
        pingpong: 'cyan',
        webhook: 'magenta'
    },
};

const consoleFormat = winston.format.printf(({ level, message, timestamp }) => {
    let colorizedMessage = message;

    switch (level) {
        case 'info':
            colorizedMessage = `${ansiOrange}${message}${ansiReset}`;
            break;
        case 'error':
            colorizedMessage = `${ansiRed}${message}${ansiReset}`;
            break;
        case 'warn':
            colorizedMessage = `${ansiYellow}${message}${ansiReset}`;
            break;
        case 'success':
            colorizedMessage = `${ansiGreen}${message}${ansiReset}`;
            break;
        case 'debug':
            colorizedMessage = `${ansiBlue}${message}${ansiReset}`;
            break;
        case 'pingpong':
            colorizedMessage = `${ansiCyan}${message}${ansiReset}`;
            break;
        case 'webhook':
            colorizedMessage = `${ansiCyan}${message}${ansiReset}`;
            break;
    }

    return `${timestamp} [${level.toUpperCase()}]: ${colorizedMessage}`;
});

const fileFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
    levels: customLevels.levels,
    level: 'webhook',
    format: winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
                consoleFormat
            ),
        }),
        new winston.transports.File({
            filename: logFilename,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
                fileFormat
            ),
        }),
    ],
});

winston.addColors(customLevels.colors);

const loggerInfo = (message) => logger.info(message);
const loggerError = (message) => logger.error(message);
const loggerWarn = (message) => logger.warn(message);
const loggerSuccess = (message) => logger.log('success', message);
const loggerDebug = (message) => logger.log('debug', message);
const loggerPingPong = (message) => logger.log('pingpong', message);
const loggerWebhook = (message, data) => {
    if (data) {
        logger.log('webhook', `${message} - ${JSON.stringify(data)}`);
    } else {
        logger.log('webhook', message);
    }
};

module.exports = {
    loggerInfo,
    loggerError,
    loggerWarn,
    loggerSuccess,
    loggerDebug,
    loggerPingPong,
    loggerWebhook,
    error: loggerError,
    http: loggerInfo,
    warn: loggerWarn,
    info: loggerInfo
};
