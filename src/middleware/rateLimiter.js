const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// Store para rate limiting em memória (em produção, usar Redis)
const rateLimitStore = new Map();

// Rate limiter básico
const rateLimiter = rateLimit({
    windowMs: config.rateLimiting.windowMs, // 15 minutos
    max: config.rateLimiting.max, // máximo 100 requests por janela
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.rateLimiting.windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
        logger.security('Rate limit exceeded', req.user?.username || 'anonymous', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            method: req.method
        });
        
        res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(config.rateLimiting.windowMs / 1000)
        });
    }
});

// Rate limiter rigoroso para endpoints sensíveis
const strictRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 requests por janela
    message: {
        error: 'Too many requests',
        message: 'Strict rate limit exceeded. Please try again later.',
        retryAfter: 900 // 15 minutos
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.security('Strict rate limit exceeded', req.user?.username || 'anonymous', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            method: req.method
        });
        
        res.status(429).json({
            error: 'Too many requests',
            message: 'Strict rate limit exceeded. Please try again later.',
            retryAfter: 900
        });
    }
});

// Rate limiter para login
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas de login por IP
    skipSuccessfulRequests: true, // não contar requests bem-sucedidos
    message: {
        error: 'Too many login attempts',
        message: 'Too many failed login attempts. Please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.security('Login rate limit exceeded', null, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            username: req.body?.username || 'unknown'
        });
        
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'Too many failed login attempts. Please try again later.',
            retryAfter: 900
        });
    }
});

// Rate limiter customizado por usuário
const createUserRateLimiter = (windowMs = 60000, max = 30) => {
    return (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const key = `user:${userId}`;
        const now = Date.now();
        
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            
            // Limpar entrada após a janela de tempo
            setTimeout(() => {
                rateLimitStore.delete(key);
            }, windowMs);
            
            return next();
        }
        
        const userData = rateLimitStore.get(key);
        
        if (now > userData.resetTime) {
            // Reset da janela de tempo
            userData.count = 1;
            userData.resetTime = now + windowMs;
            return next();
        }
        
        if (userData.count >= max) {
            logger.security('User rate limit exceeded', req.user?.username || 'anonymous', {
                userId,
                ip: req.ip,
                endpoint: req.path,
                count: userData.count,
                max
            });
            
            return res.status(429).json({
                error: 'Too many requests',
                message: 'User rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((userData.resetTime - now) / 1000)
            });
        }
        
        userData.count++;
        next();
    };
};

// Rate limiter para API
const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // máximo 60 requests por minuto
    message: {
        error: 'API rate limit exceeded',
        message: 'API rate limit exceeded. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar API key se disponível, senão IP
        return req.apiKey || req.ip;
    },
    handler: (req, res) => {
        logger.security('API rate limit exceeded', req.user?.username || 'anonymous', {
            apiKey: req.apiKey ? req.apiKey.substring(0, 8) + '...' : null,
            ip: req.ip,
            endpoint: req.path
        });
        
        res.status(429).json({
            error: 'API rate limit exceeded',
            message: 'API rate limit exceeded. Please try again later.',
            retryAfter: 60
        });
    }
});

// Rate limiter para deploy
const deployRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // máximo 3 deploys por 5 minutos
    message: {
        error: 'Deploy rate limit exceeded',
        message: 'Deploy rate limit exceeded. Please wait before trying again.',
        retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.security('Deploy rate limit exceeded', req.user?.username || 'anonymous', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        
        res.status(429).json({
            error: 'Deploy rate limit exceeded',
            message: 'Deploy rate limit exceeded. Please wait before trying again.',
            retryAfter: 300
        });
    }
});

// Middleware para bypass de rate limiting (para usuários privilegiados)
const bypassRateLimit = (req, res, next) => {
    if (req.user && req.user.roles && req.user.roles.includes('admin')) {
        req.skipRateLimit = true;
    }
    next();
};

// Limpeza periódica do store
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Limpar a cada minuto

module.exports = {
    rateLimiter,
    strictRateLimiter,
    loginRateLimiter,
    apiRateLimiter,
    deployRateLimiter,
    createUserRateLimiter,
    bypassRateLimit
};
