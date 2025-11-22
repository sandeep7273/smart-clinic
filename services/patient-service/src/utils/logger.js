// define log levels
const winston = require("winston");
const config = require('../config');
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// define colors for each log level
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

// configure winston to use the defined colors
winston.addColors(logColors);

//create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        winston.format.printf((info => `${info.timestamp} [${config.serviceName}] ${info.level}: ${info.message}`))
    ),
    transports: [
        //write all logs to console
        new winston.transports.Console(),
        // write all logs with level 'error' to erro.log file
        new winston.transports.File({ filename: 'logs/error.log', level :'error'}),
        //write all logs to combined.log file
        new winston.transports.File({filename: 'logs/combined.log'}),
    ]
});


module.exports = logger;