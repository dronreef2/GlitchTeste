const winston = require('winston');
const path = require('path');
const config = require('../config');

// Criar diretório de logs se não existir
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Configurar formatação
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Configurar transports
const transports = [
    // Console
    new winston.transports.Console({
        level: config.logLevel,
        format: consoleFormat
    }),

    // Arquivo de erro
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 5
    }),

    // Arquivo combinado
    new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 10
    }),

    // Arquivo de acesso
    new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'info',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 7
    })
];

// Criar logger
const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    defaultMeta: { 
        service: config.appName,
        version: config.appVersion,
        environment: config.nodeEnv
    },
    transports
});

// Adicionar métodos personalizados
logger.request = (req, res, responseTime) => {
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        contentLenght: res.get('Content-Length')
    });
};

logger.deploy = (action, environment, details) => {
    logger.info('Deploy Action', {
        action,
        environment,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.metrics = (metrics) => {
    logger.info('Metrics Collected', {
        metrics,
        timestamp: new Date().toISOString()
    });
};

logger.health = (service, status, details) => {
    logger.info('Health Check', {
        service,
        status,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.backup = (action, status, details) => {
    logger.info('Backup Operation', {
        action,
        status,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.security = (event, user, details) => {
    logger.warn('Security Event', {
        event,
        user,
        details,
        timestamp: new Date().toISOString()
    });
};

// Tratamento de erros não capturados
logger.on('error', (error) => {
    console.error('Logger error:', error);
});

module.exports = logger;
