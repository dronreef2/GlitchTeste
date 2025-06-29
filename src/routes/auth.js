const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const config = require('../config');
const logger = require('../utils/logger');
const { generateToken, generateRefreshToken, blacklistToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// Usuários mockados (em produção, usar banco de dados)
const users = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@platform-devops.com',
        password: '$2b$12$LQv3c1yqBwEHFLhgUQJbXOq0Xw.qQm9K7Zf8YVQJKzF8uWE2LqKxG', // password123
        roles: ['admin', 'operator', 'user'],
        active: true,
        createdAt: new Date(),
        lastLogin: null
    },
    {
        id: 2,
        username: 'operator',
        email: 'operator@platform-devops.com',
        password: '$2b$12$LQv3c1yqBwEHFLhgUQJbXOq0Xw.qQm9K7Zf8YVQJKzF8uWE2LqKxG', // password123
        roles: ['operator', 'user'],
        active: true,
        createdAt: new Date(),
        lastLogin: null
    },
    {
        id: 3,
        username: 'user',
        email: 'user@platform-devops.com',
        password: '$2b$12$LQv3c1yqBwEHFLhgUQJbXOq0Xw.qQm9K7Zf8YVQJKzF8uWE2LqKxG', // password123
        roles: ['user'],
        active: true,
        createdAt: new Date(),
        lastLogin: null
    }
];

// Login
router.post('/login', loginRateLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Missing credentials',
                message: 'Username and password are required'
            });
        }
        
        // Buscar usuário
        const user = users.find(u => u.username === username || u.email === username);
        
        if (!user) {
            logger.security('Login attempt failed', username, {
                reason: 'User not found',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Username or password incorrect'
            });
        }
        
        if (!user.active) {
            logger.security('Login attempt failed', username, {
                reason: 'Account disabled',
                ip: req.ip
            });
            
            return res.status(401).json({
                error: 'Account disabled',
                message: 'Your account has been disabled'
            });
        }
        
        // Verificar senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            logger.security('Login attempt failed', username, {
                reason: 'Invalid password',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Username or password incorrect'
            });
        }
        
        // Atualizar último login
        user.lastLogin = new Date();
        
        // Gerar tokens
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        
        logger.info('User logged in successfully', {
            userId: user.id,
            username: user.username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles,
                lastLogin: user.lastLogin
            },
            tokens: {
                accessToken: token,
                refreshToken: refreshToken,
                expiresIn: '24h'
            }
        });
        
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: 'Internal server error'
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            blacklistToken(token);
            logger.info('User logged out', {
                tokenHash: require('crypto').createHash('sha256').update(token).digest('hex').substring(0, 16)
            });
        }
        
        res.json({
            message: 'Logout successful'
        });
        
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: 'Internal server error'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                error: 'Missing refresh token',
                message: 'Refresh token is required'
            });
        }
        
        // Verificar refresh token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, config.jwtSecret);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                error: 'Invalid token type',
                message: 'Invalid refresh token'
            });
        }
        
        // Buscar usuário
        const user = users.find(u => u.id === decoded.id);
        
        if (!user || !user.active) {
            return res.status(401).json({
                error: 'User not found',
                message: 'Invalid refresh token'
            });
        }
        
        // Gerar novo access token
        const newToken = generateToken(user);
        
        logger.info('Token refreshed', {
            userId: user.id,
            username: user.username
        });
        
        res.json({
            accessToken: newToken,
            expiresIn: '24h'
        });
        
    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(401).json({
            error: 'Token refresh failed',
            message: 'Invalid or expired refresh token'
        });
    }
});

// Verificar token
router.get('/verify', (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                valid: false,
                message: 'No token provided'
            });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwtSecret);
        
        res.json({
            valid: true,
            user: {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                roles: decoded.roles
            },
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
        
    } catch (error) {
        res.status(401).json({
            valid: false,
            message: 'Invalid or expired token'
        });
    }
});

// Alterar senha
router.post('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Access token required'
            });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwtSecret);
        
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Missing passwords',
                message: 'Current and new passwords are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: 'Weak password',
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Buscar usuário
        const user = users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }
        
        // Verificar senha atual
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            logger.security('Password change failed', user.username, {
                reason: 'Invalid current password',
                ip: req.ip
            });
            
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }
        
        // Hash da nova senha
        const hashedNewPassword = await bcrypt.hash(newPassword, config.bcryptRounds);
        
        // Atualizar senha
        user.password = hashedNewPassword;
        
        logger.info('Password changed successfully', {
            userId: user.id,
            username: user.username,
            ip: req.ip
        });
        
        res.json({
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            error: 'Password change failed',
            message: 'Internal server error'
        });
    }
});

// Perfil do usuário
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Access token required'
            });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwtSecret);
        
        const user = users.find(u => u.id === decoded.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles,
                active: user.active,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get profile',
            message: 'Internal server error'
        });
    }
});

module.exports = router;
