const express = require('express');
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');
const config = require('../config');
const logger = require('../utils/logger');

// Status dos serviços mockados
const services = {
    'platform-devops': {
        name: 'Platform DevOps API',
        status: 'running',
        port: config.apiPort,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        health: 'healthy'
    },
    'websocket': {
        name: 'WebSocket Server',
        status: 'running',
        port: config.websocketPort,
        health: 'healthy'
    },
    'monitoring': {
        name: 'Monitoring Service',
        status: config.metricsEnabled ? 'running' : 'disabled',
        port: config.monitoringPort,
        health: config.metricsEnabled ? 'healthy' : 'disabled'
    },
    'database': {
        name: 'Database Connection',
        status: 'running', // Seria verificado em produção
        health: 'healthy'
    },
    'cache': {
        name: 'Redis Cache',
        status: 'running', // Seria verificado em produção
        health: 'healthy'
    }
};

// Listar todos os serviços
router.get('/', (req, res) => {
    const servicesList = Object.entries(services).map(([key, service]) => ({
        id: key,
        ...service,
        lastCheck: new Date().toISOString()
    }));
    
    const runningServices = servicesList.filter(s => s.status === 'running').length;
    const totalServices = servicesList.length;
    
    res.json({
        summary: {
            total: totalServices,
            running: runningServices,
            stopped: totalServices - runningServices,
            healthy: servicesList.filter(s => s.health === 'healthy').length
        },
        services: servicesList,
        timestamp: new Date().toISOString()
    });
});

// Status de um serviço específico
router.get('/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`,
            availableServices: Object.keys(services)
        });
    }
    
    const service = services[serviceId];
    
    res.json({
        id: serviceId,
        ...service,
        lastCheck: new Date().toISOString(),
        system: {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version
        }
    });
});

// Reiniciar serviço
router.post('/:serviceId/restart', (req, res) => {
    const { serviceId } = req.params;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`
        });
    }
    
    // Simular reinicialização
    services[serviceId].status = 'restarting';
    
    setTimeout(() => {
        services[serviceId].status = 'running';
        services[serviceId].health = 'healthy';
        logger.info(`Service ${serviceId} restarted`);
    }, 3000);
    
    logger.info(`Service restart requested`, {
        serviceId,
        user: req.user?.username || 'system'
    });
    
    res.json({
        message: `Service ${serviceId} restart initiated`,
        service: services[serviceId]
    });
});

// Parar serviço
router.post('/:serviceId/stop', (req, res) => {
    const { serviceId } = req.params;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`
        });
    }
    
    services[serviceId].status = 'stopped';
    services[serviceId].health = 'stopped';
    
    logger.info(`Service stopped`, {
        serviceId,
        user: req.user?.username || 'system'
    });
    
    res.json({
        message: `Service ${serviceId} stopped`,
        service: services[serviceId]
    });
});

// Iniciar serviço
router.post('/:serviceId/start', (req, res) => {
    const { serviceId } = req.params;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`
        });
    }
    
    services[serviceId].status = 'running';
    services[serviceId].health = 'healthy';
    
    logger.info(`Service started`, {
        serviceId,
        user: req.user?.username || 'system'
    });
    
    res.json({
        message: `Service ${serviceId} started`,
        service: services[serviceId]
    });
});

// Verificar saúde de todos os serviços
router.get('/health/all', async (req, res) => {
    try {
        const healthChecks = {};
        
        for (const [serviceId, service] of Object.entries(services)) {
            healthChecks[serviceId] = await checkServiceHealth(serviceId, service);
        }
        
        const allHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');
        
        res.json({
            overall: allHealthy ? 'healthy' : 'degraded',
            services: healthChecks,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            error: 'Health check failed',
            message: error.message
        });
    }
});

// Logs de um serviço
router.get('/:serviceId/logs', (req, res) => {
    const { serviceId } = req.params;
    const { lines = 100, follow = false } = req.query;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`
        });
    }
    
    // Simular logs (em produção, ler arquivos de log reais)
    const mockLogs = Array.from({ length: parseInt(lines) }, (_, i) => ({
        timestamp: new Date(Date.now() - (i * 1000)).toISOString(),
        level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
        message: `Log entry ${lines - i} for service ${serviceId}`,
        service: serviceId
    })).reverse();
    
    if (follow === 'true') {
        // Para logs em tempo real, usar WebSocket
        res.json({
            message: 'Use WebSocket for real-time logs',
            endpoint: `/ws/logs/${serviceId}`,
            logs: mockLogs.slice(-10) // Últimas 10 entradas
        });
    } else {
        res.json({
            service: serviceId,
            logs: mockLogs,
            count: mockLogs.length
        });
    }
});

// Métricas de um serviço
router.get('/:serviceId/metrics', (req, res) => {
    const { serviceId } = req.params;
    
    if (!services[serviceId]) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service ${serviceId} not found`
        });
    }
    
    const service = services[serviceId];
    
    // Gerar métricas mockadas
    const metrics = {
        service: serviceId,
        name: service.name,
        status: service.status,
        uptime: serviceId === 'platform-devops' ? process.uptime() : Math.random() * 3600,
        memory: serviceId === 'platform-devops' ? process.memoryUsage() : {
            rss: Math.floor(Math.random() * 100) * 1024 * 1024,
            heapTotal: Math.floor(Math.random() * 50) * 1024 * 1024,
            heapUsed: Math.floor(Math.random() * 30) * 1024 * 1024
        },
        cpu: {
            usage: Math.random() * 100,
            loadAverage: os.loadavg()
        },
        network: {
            connections: Math.floor(Math.random() * 100),
            requests: Math.floor(Math.random() * 1000),
            errors: Math.floor(Math.random() * 10)
        },
        timestamp: new Date().toISOString()
    };
    
    res.json(metrics);
});

// Listar processos do sistema
router.get('/system/processes', (req, res) => {
    exec('ps aux', (error, stdout, stderr) => {
        if (error) {
            logger.error('Failed to get processes:', error);
            return res.status(500).json({
                error: 'Failed to get processes',
                message: error.message
            });
        }
        
        const lines = stdout.split('\n').filter(line => line.trim());
        const processes = lines.slice(1).map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 11) {
                return {
                    user: parts[0],
                    pid: parts[1],
                    cpu: parts[2],
                    memory: parts[3],
                    vsz: parts[4],
                    rss: parts[5],
                    tty: parts[6],
                    stat: parts[7],
                    start: parts[8],
                    time: parts[9],
                    command: parts.slice(10).join(' ')
                };
            }
            return null;
        }).filter(p => p !== null);
        
        res.json({
            processes: processes.slice(0, 50), // Limitar a 50 processos
            total: processes.length,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                uptime: os.uptime(),
                loadavg: os.loadavg()
            }
        });
    });
});

// Portas em uso
router.get('/system/ports', (req, res) => {
    exec('netstat -tuln', (error, stdout, stderr) => {
        if (error) {
            // Fallback para sistemas que não têm netstat
            return res.json({
                knownPorts: {
                    [config.apiPort]: 'Platform DevOps API',
                    [config.websocketPort]: 'WebSocket Server',
                    [config.monitoringPort]: 'Monitoring Service'
                },
                message: 'Unable to scan system ports'
            });
        }
        
        const lines = stdout.split('\n').filter(line => line.includes(':'));
        const ports = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                const address = parts[3];
                const [host, port] = address.split(':');
                return {
                    protocol: parts[0],
                    address: host,
                    port: port,
                    state: parts[5] || 'LISTEN'
                };
            }
            return null;
        }).filter(p => p !== null);
        
        res.json({
            ports,
            knownServices: {
                [config.apiPort]: 'Platform DevOps API',
                [config.websocketPort]: 'WebSocket Server',
                [config.monitoringPort]: 'Monitoring Service'
            }
        });
    });
});

// Função auxiliar para verificar saúde do serviço
async function checkServiceHealth(serviceId, service) {
    return new Promise((resolve) => {
        // Simular verificação de saúde
        setTimeout(() => {
            const isHealthy = service.status === 'running' && Math.random() > 0.05;
            
            resolve({
                status: isHealthy ? 'healthy' : 'unhealthy',
                responseTime: Math.floor(Math.random() * 100) + 10,
                lastCheck: new Date().toISOString(),
                details: {
                    status: service.status,
                    port: service.port,
                    memory: service.memory,
                    uptime: service.uptime
                }
            });
        }, Math.random() * 500 + 100);
    });
}

module.exports = router;
