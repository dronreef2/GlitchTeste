const logger = require('../utils/logger');
const config = require('../config');

// Middleware de tratamento de erros
const errorHandler = (err, req, res, next) => {
    // Se response já foi enviada, passar para o próximo error handler
    if (res.headersSent) {
        return next(err);
    }
    
    // Log do erro
    logger.error('Error Handler:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user?.username || 'anonymous'
    });
    
    // Determinar status code
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let details = {};
    
    // Tratamento específico por tipo de erro
    switch (err.name) {
        case 'ValidationError':
            statusCode = 400;
            message = 'Validation Error';
            details = formatValidationErrors(err);
            break;
            
        case 'CastError':
            statusCode = 400;
            message = 'Invalid ID format';
            details = { field: err.path, value: err.value };
            break;
            
        case 'MongoError':
        case 'MongoServerError':
            statusCode = 500;
            message = 'Database Error';
            if (err.code === 11000) {
                statusCode = 409;
                message = 'Duplicate Entry';
                details = formatDuplicateKeyError(err);
            }
            break;
            
        case 'JsonWebTokenError':
            statusCode = 401;
            message = 'Invalid Token';
            break;
            
        case 'TokenExpiredError':
            statusCode = 401;
            message = 'Token Expired';
            break;
            
        case 'SyntaxError':
            if (err.message.includes('JSON')) {
                statusCode = 400;
                message = 'Invalid JSON';
            }
            break;
            
        case 'MulterError':
            statusCode = 400;
            message = 'File Upload Error';
            details = { code: err.code, field: err.field };
            break;
            
        default:
            // Manter status e message originais para outros erros
            break;
    }
    
    // Construir resposta de erro
    const errorResponse = {
        error: true,
        status: statusCode,
        message: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    };
    
    // Adicionar detalhes se disponíveis
    if (Object.keys(details).length > 0) {
        errorResponse.details = details;
    }
    
    // Em desenvolvimento, incluir stack trace
    if (config.nodeEnv === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.originalError = err.message;
    }
    
    // Incluir request ID se disponível
    if (req.requestId) {
        errorResponse.requestId = req.requestId;
    }
    
    // Responder com erro
    res.status(statusCode).json(errorResponse);
};

// Middleware para erros 404
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.path}`);
    error.statusCode = 404;
    
    logger.warn('404 Not Found:', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.status(404).json({
        error: true,
        status: 404,
        message: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET /api/health',
            'GET /api/metrics',
            'POST /api/auth/login',
            'GET /api/services',
            'POST /api/deploy',
            'GET /api/config',
            'POST /api/backup'
        ]
    });
};

// Wrapper para async handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Middleware para capturar erros não tratados
const uncaughtErrorHandler = () => {
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', {
            error: err.message,
            stack: err.stack
        });
        
        // Graceful shutdown
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', {
            reason: reason,
            promise: promise
        });
        
        // Graceful shutdown
        process.exit(1);
    });
};

// Utilitários para formatação de erros
const formatValidationErrors = (err) => {
    const errors = {};
    
    if (err.errors) {
        Object.keys(err.errors).forEach(field => {
            errors[field] = err.errors[field].message;
        });
    }
    
    return errors;
};

const formatDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    return {
        field: field,
        value: value,
        message: `${field} '${value}' already exists`
    };
};

// Middleware de timeout
const timeoutHandler = (timeout = 30000) => {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            const error = new Error('Request Timeout');
            error.statusCode = 408;
            next(error);
        }, timeout);
        
        // Limpar timeout quando response for enviada
        res.on('finish', () => {
            clearTimeout(timer);
        });
        
        next();
    };
};

// Middleware para adicionar request ID
const requestIdHandler = (req, res, next) => {
    req.requestId = generateRequestId();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

// Gerar ID único para request
const generateRequestId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Middleware para CORS errors
const corsErrorHandler = (err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            error: true,
            status: 403,
            message: 'CORS Policy Violation',
            details: 'Request blocked by CORS policy',
            timestamp: new Date().toISOString()
        });
    }
    
    next(err);
};

// Middleware para rate limit errors
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.message && err.message.includes('rate limit')) {
        return res.status(429).json({
            error: true,
            status: 429,
            message: 'Rate Limit Exceeded',
            details: 'Too many requests, please try again later',
            retryAfter: 60,
            timestamp: new Date().toISOString()
        });
    }
    
    next(err);
};

// Classe para erros customizados
class AppError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// Função para criar erros comuns
const createError = {
    badRequest: (message = 'Bad Request', details = {}) => {
        return new AppError(message, 400, details);
    },
    
    unauthorized: (message = 'Unauthorized', details = {}) => {
        return new AppError(message, 401, details);
    },
    
    forbidden: (message = 'Forbidden', details = {}) => {
        return new AppError(message, 403, details);
    },
    
    notFound: (message = 'Not Found', details = {}) => {
        return new AppError(message, 404, details);
    },
    
    conflict: (message = 'Conflict', details = {}) => {
        return new AppError(message, 409, details);
    },
    
    internal: (message = 'Internal Server Error', details = {}) => {
        return new AppError(message, 500, details);
    }
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    uncaughtErrorHandler,
    timeoutHandler,
    requestIdHandler,
    corsErrorHandler,
    rateLimitErrorHandler,
    AppError,
    createError
};
