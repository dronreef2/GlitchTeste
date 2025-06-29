const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const WebSocket = require('ws');
const cron = require('node-cron');
require('dotenv').config();

const logger = require('./utils/logger');
const config = require('./config');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');
const deployRoutes = require('./routes/deploy');
const servicesRoutes = require('./routes/services');
const configRoutes = require('./routes/config');
const backupRoutes = require('./routes/backup');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { metricsCollector } = require('./services/metrics');
const { healthChecker } = require('./services/health');
const { backupService } = require('./services/backup');

class PlatformDevOps {
    constructor() {
        this.app = express();
        this.server = null;
        this.wss = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupScheduledTasks();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Segurança
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));

        // CORS
        this.app.use(cors({
            origin: config.corsOrigin,
            credentials: true
        }));

        // Compressão
        this.app.use(compression());

        // Rate limiting
        this.app.use(rateLimiter);

        // Logging
        this.app.use(morgan('combined', { 
            stream: { write: message => logger.info(message.trim()) }
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Arquivos estáticos
        this.app.use('/static', express.static('public'));
    }

    setupRoutes() {
        // Rotas públicas
        this.app.use('/api/health', healthRoutes);
        this.app.use('/api/auth', authRoutes);

        // Rotas protegidas
        this.app.use('/api/metrics', authenticateToken, metricsRoutes);
        this.app.use('/api/deploy', authenticateToken, deployRoutes);
        this.app.use('/api/services', authenticateToken, servicesRoutes);
        this.app.use('/api/config', authenticateToken, configRoutes);
        this.app.use('/api/backup', authenticateToken, backupRoutes);

        // Rota principal
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Platform DevOps',
                version: config.appVersion,
                environment: config.nodeEnv,
                status: 'running',
                endpoints: {
                    health: '/api/health',
                    metrics: '/api/metrics',
                    deploy: '/api/deploy',
                    services: '/api/services',
                    config: '/api/config',
                    backup: '/api/backup',
                    auth: '/api/auth'
                },
                features: {
                    websocket: true,
                    monitoring: config.metricsEnabled,
                    backup: config.backupEnabled,
                    autoDeploy: config.autoDeploy
                }
            });
        });

        // Dashboard (se habilitado)
        if (config.features.apiDashboard) {
            this.app.get('/dashboard', (req, res) => {
                res.sendFile('dashboard.html', { root: 'public' });
            });
        }
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({ 
            port: config.websocketPort,
            perMessageDeflate: false
        });

        this.wss.on('connection', (ws, req) => {
            const clientIp = req.socket.remoteAddress;
            logger.info(`WebSocket connection established from ${clientIp}`);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    logger.error('Invalid WebSocket message:', error);
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });

            ws.on('close', () => {
                logger.info(`WebSocket connection closed from ${clientIp}`);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });

            // Enviar métricas em tempo real
            if (config.metricsEnabled) {
                this.startRealTimeMetrics(ws);
            }
        });

        logger.info(`WebSocket server listening on port ${config.websocketPort}`);
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                this.handleSubscription(ws, data.channel);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(ws, data.channel);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            default:
                ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
    }

    handleSubscription(ws, channel) {
        if (!ws.subscriptions) ws.subscriptions = new Set();
        ws.subscriptions.add(channel);
        ws.send(JSON.stringify({ 
            type: 'subscribed', 
            channel, 
            timestamp: Date.now() 
        }));
    }

    handleUnsubscription(ws, channel) {
        if (ws.subscriptions) {
            ws.subscriptions.delete(channel);
            ws.send(JSON.stringify({ 
                type: 'unsubscribed', 
                channel, 
                timestamp: Date.now() 
            }));
        }
    }

    startRealTimeMetrics(ws) {
        const interval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN && 
                ws.subscriptions && 
                ws.subscriptions.has('metrics')) {
                try {
                    const metrics = await metricsCollector.getCurrentMetrics();
                    ws.send(JSON.stringify({
                        type: 'metrics',
                        data: metrics,
                        timestamp: Date.now()
                    }));
                } catch (error) {
                    logger.error('Error sending metrics:', error);
                }
            }
        }, 5000);

        ws.on('close', () => clearInterval(interval));
    }

    setupScheduledTasks() {
        // Health check periódico
        if (config.healthCheckInterval) {
            cron.schedule('*/30 * * * * *', async () => {
                try {
                    await healthChecker.performChecks();
                } catch (error) {
                    logger.error('Scheduled health check failed:', error);
                }
            });
        }

        // Backup automático
        if (config.backupEnabled && config.backupSchedule) {
            cron.schedule(config.backupSchedule, async () => {
                try {
                    await backupService.performBackup();
                    logger.info('Scheduled backup completed successfully');
                } catch (error) {
                    logger.error('Scheduled backup failed:', error);
                }
            });
        }

        // Limpeza de logs antigos
        cron.schedule('0 2 * * *', () => {
            try {
                this.cleanupLogs();
            } catch (error) {
                logger.error('Log cleanup failed:', error);
            }
        });
    }

    cleanupLogs() {
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(__dirname, '../logs');
        
        if (fs.existsSync(logsDir)) {
            const files = fs.readdirSync(logsDir);
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < thirtyDaysAgo) {
                    fs.unlinkSync(filePath);
                    logger.info(`Deleted old log file: ${file}`);
                }
            });
        }
    }

    setupErrorHandling() {
        this.app.use(errorHandler);

        // Capturar erros não tratados
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            this.gracefulShutdown('SIGTERM');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Sinais de término
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }

    async start() {
        try {
            // Inicializar serviços
            await this.initializeServices();

            // Iniciar servidor
            this.server = this.app.listen(config.apiPort, () => {
                logger.info(`🚀 Platform DevOps server running on port ${config.apiPort}`);
                logger.info(`📊 Environment: ${config.nodeEnv}`);
                logger.info(`🔌 WebSocket server on port ${config.websocketPort}`);
                
                if (config.metricsEnabled) {
                    logger.info(`📈 Metrics enabled on port ${config.monitoringPort}`);
                }
            });

        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    async initializeServices() {
        // Inicializar coletor de métricas
        if (config.metricsEnabled) {
            await metricsCollector.initialize();
        }

        // Inicializar verificador de saúde
        await healthChecker.initialize();

        logger.info('All services initialized successfully');
    }

    async gracefulShutdown(signal) {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);

        // Fechar servidor WebSocket
        if (this.wss) {
            this.wss.close();
        }

        // Fechar servidor HTTP
        if (this.server) {
            this.server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        }

        // Forçar saída após 30 segundos
        setTimeout(() => {
            logger.error('Graceful shutdown timeout, forcing exit');
            process.exit(1);
        }, 30000);
    }
}

// Inicializar aplicação
const app = new PlatformDevOps();

if (require.main === module) {
    app.start();
}

module.exports = app;
