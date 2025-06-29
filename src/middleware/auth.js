const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        logger.security('Authentication failed', null, { 
            reason: 'No token provided',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }
    
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        
        logger.info('User authenticated', {
            userId: decoded.id,
            username: decoded.username,
            endpoint: req.path
        });
        
        next();
    } catch (error) {
        logger.security('Authentication failed', null, {
            reason: 'Invalid token',
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path
        });
        
        return res.status(403).json({
            error: 'Access denied',
            message: 'Invalid token'
        });
    }
};

// Middleware de autorização por role
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Authentication required'
            });
        }
        
        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        
        if (!hasRole) {
            logger.security('Authorization failed', req.user.username, {
                reason: 'Insufficient permissions',
                requiredRoles: roles,
                userRoles: userRoles,
                endpoint: req.path
            });
            
            return res.status(403).json({
                error: 'Access denied',
                message: 'Insufficient permissions'
            });
        }
        
        next();
    };
};

// Middleware para admin apenas
const adminOnly = authorizeRole(['admin']);

// Middleware para admin e operator
const adminOrOperator = authorizeRole(['admin', 'operator']);

// Middleware opcional de autenticação (não falha se não autenticado)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            req.user = decoded;
        } catch (error) {
            // Ignore invalid tokens in optional auth
            logger.debug('Optional auth failed:', error.message);
        }
    }
    
    next();
};

// Middleware para validar API Key
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'API key required'
        });
    }
    
    // Em produção, validar contra banco de dados
    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
    
    if (!validApiKeys.includes(apiKey)) {
        logger.security('API key authentication failed', null, {
            apiKey: apiKey.substring(0, 8) + '...',
            ip: req.ip,
            endpoint: req.path
        });
        
        return res.status(403).json({
            error: 'Access denied',
            message: 'Invalid API key'
        });
    }
    
    req.apiKey = apiKey;
    next();
};

// Utilitários para geração de tokens
const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || ['user']
    };
    
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: '24h',
        issuer: config.appName,
        audience: config.appName
    });
};

const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
        type: 'refresh'
    };
    
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: '7d',
        issuer: config.appName,
        audience: config.appName
    });
};

// Verificar se token está próximo do vencimento
const isTokenExpiringSoon = (token) => {
    try {
        const decoded = jwt.decode(token);
        const now = Math.floor(Date.now() / 1000);
        const expiration = decoded.exp;
        
        // Considerar "próximo do vencimento" se faltarem menos de 30 minutos
        return (expiration - now) < (30 * 60);
    } catch (error) {
        return true;
    }
};

// Blacklist de tokens (em produção, usar Redis)
const tokenBlacklist = new Set();

const blacklistToken = (token) => {
    tokenBlacklist.add(token);
    logger.security('Token blacklisted', null, { tokenHash: hashToken(token) });
};

const isTokenBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};

// Hash de token para logs seguros
const hashToken = (token) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
};

// Middleware para verificar tokens na blacklist
const checkBlacklist = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token && isTokenBlacklisted(token)) {
        logger.security('Blacklisted token used', null, {
            tokenHash: hashToken(token),
            ip: req.ip,
            endpoint: req.path
        });
        
        return res.status(401).json({
            error: 'Access denied',
            message: 'Token has been revoked'
        });
    }
    
    next();
};

module.exports = {
    authenticateToken,
    authorizeRole,
    adminOnly,
    adminOrOperator,
    optionalAuth,
    apiKeyAuth,
    generateToken,
    generateRefreshToken,
    isTokenExpiringSoon,
    blacklistToken,
    isTokenBlacklisted,
    checkBlacklist
};
